import { NextRequest, NextResponse } from 'next/server'
import { streamChatResponse } from '@/lib/gemini'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { mergeUserEditsWithCompiledContent } from '@/lib/document-merge'

export async function POST(req: NextRequest) {
  try {
    const { userId, accessToken, notebookId, messages, fileSearchStoreNames, documentSessionId, mode } = await req.json()

    if (!userId || !accessToken || !notebookId || !messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const chatMode = mode === 'compilation' ? 'compilation' : 'rag'
    console.log('🎯 Chat mode:', chatMode)

    const supabase = createServerSupabaseClient(accessToken)

    // Verify notebook ownership
    const { data: notebook } = await supabase
      .from('notebooks')
      .select('user_id')
      .eq('id', notebookId)
      .single()

    if (!notebook || notebook.user_id !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get document context if documentSessionId is provided
    let documentContext = undefined
    if (documentSessionId) {
      const { data: session } = await supabase
        .from('document_sessions')
        .select('*')
        .eq('id', documentSessionId)
        .single()

      if (session && session.user_id === userId) {
        // Merge user edits with compiled content so AI sees user modifications
        const userEdits = (session.user_edits || {}) as Record<string, any>
        const documentStructure = session.document_structure as any
        const baseContent = session.compiled_content || session.extracted_text

        const mergeResult = mergeUserEditsWithCompiledContent(baseContent, userEdits, documentStructure)

        console.log(
          `🔄 Document context prepared: ${mergeResult.appliedEdits}/${mergeResult.totalFields} user edits applied`
        )

        documentContext = {
          fileName: session.original_file_name,
          fileType: session.file_type,
          extractedText: session.extracted_text,
          compiledContent: mergeResult.mergedContent || undefined,
        }
      }
    }

    // Get extracted entities for this notebook
    const { data: entities } = await supabase
      .from('document_entities')
      .select('*')
      .eq('notebook_id', notebookId)
      .order('created_at', { ascending: false })

    console.log('🔍 Chat Request Debug:')
    console.log('- Notebook ID:', notebookId)
    console.log('- File Search Stores:', fileSearchStoreNames)
    console.log('- Entities found:', entities?.length || 0)
    if (entities && entities.length > 0) {
      console.log('- First entity:', JSON.stringify(entities[0], null, 2))
    }

    // Create a ReadableStream that will stream the response
    const readable = new ReadableStream({
      async start(controller) {
        try {
          const encoder = new TextEncoder()
          let compiledContent = ''
          let lastStatusUpdate = ''

          const contextToPass = chatMode === 'compilation' ? documentContext : undefined

          for await (const chunk of streamChatResponse(messages, fileSearchStoreNames || [], contextToPass, entities || [])) {
            if (typeof chunk === 'string') {
              compiledContent += chunk

              // In RAG mode: stream content directly to client
              if (chatMode === 'rag') {
                controller.enqueue(encoder.encode(chunk))
              }

              // Update document session with real-time compilation progress
              if (chatMode === 'compilation' && documentSessionId && compiledContent.length > 0) {
                try {
                  await supabase
                    .from('document_sessions')
                    .update({
                      current_compiled_content: compiledContent,
                      updated_at: new Date().toISOString(),
                    })
                    .eq('id', documentSessionId)
                } catch (updateError) {
                  console.error('Error updating document session:', updateError)
                  // Continue streaming even if update fails
                }
              }

              // Extract status updates from compiled content for chat display (ONLY in compilation mode)
              if (chatMode === 'compilation') {
                const statusUpdate = extractStatusUpdate(compiledContent, lastStatusUpdate)
                if (statusUpdate && statusUpdate !== lastStatusUpdate) {
                  lastStatusUpdate = statusUpdate
                  controller.enqueue(encoder.encode(`[PROGRESS]${statusUpdate}\n`))
                }
              }
            }
          }

          // Final update with completed content
          if (chatMode === 'compilation' && documentSessionId && compiledContent.length > 0) {
            try {
              await supabase
                .from('document_sessions')
                .update({
                  compiled_content: compiledContent,
                  current_compiled_content: compiledContent,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', documentSessionId)
            } catch (updateError) {
              console.error('Error finalizing document session:', updateError)
            }
          }

          // Send final status message ONLY for document compilation
          if (chatMode === 'compilation') {
            controller.enqueue(encoder.encode('[PROGRESS]✅ Document compilation completed. Check the preview for the full compiled content.\n'))
          }
          controller.close()
        } catch (error) {
          controller.error(error)
        }
      },
    })

    return new NextResponse(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (error) {
    console.error('Error in chat API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Extract status updates from compiled content for chat display
 * Returns status-only messages like "Processing field X..." instead of full content
 */
function extractStatusUpdate(compiledContent: string, lastStatusUpdate: string): string | null {
  // Look for progress indicators in the compiled content
  const progressPatterns = [
    /Processed (\d+)\/(\d+) fields/, // "Processed 10/50 fields"
    /Compiling field:?\s*([^\n]+)/i, // "Compiling field: Personal Information"
    /Processing section:?\s*([^\n]+)/i, // "Processing section: Header"
    /Filling field:?\s*([^\n]+)/i, // "Filling field: Name"
    /Working on:?\s*([^\n]+)/i, // "Working on: Address section"
  ]

  // Look for completion indicators
  const completionPatterns = [
    /--- END OF DOCUMENT ---/,
    /COMPILATION REPORT/,
    /Fields filled: (\d+)/,
    /Fields missing: (\d+)/,
  ]

  // Check for progress updates
  for (const pattern of progressPatterns) {
    const match = compiledContent.match(pattern)
    if (match) {
      const status = match[0].trim()
      if (status !== lastStatusUpdate) {
        return `🔄 ${status}`
      }
    }
  }

  // Check for completion updates
  for (const pattern of completionPatterns) {
    const match = compiledContent.match(pattern)
    if (match) {
      const status = match[0].trim()
      if (status !== lastStatusUpdate) {
        return `✅ ${status}`
      }
    }
  }

  // If no specific patterns found, but content has grown significantly, provide generic update
  const contentLength = compiledContent.length
  if (contentLength > 500 && !lastStatusUpdate.includes('Processing')) {
    return '🔄 Processing document structure...'
  }

  if (contentLength > 1000 && !lastStatusUpdate.includes('Compiling')) {
    return '🔄 Compiling document fields...'
  }

  return null
}
