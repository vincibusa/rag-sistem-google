import { NextRequest, NextResponse } from 'next/server'
import { streamChatResponse } from '@/lib/gemini'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  try {
    const { userId, accessToken, notebookId, messages, fileSearchStoreNames, documentSessionId } = await req.json()

    if (!userId || !accessToken || !notebookId || !messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

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
        documentContext = {
          fileName: session.original_file_name,
          fileType: session.file_type,
          extractedText: session.extracted_text,
          compiledContent: session.compiled_content || undefined,
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

          for await (const chunk of streamChatResponse(messages, fileSearchStoreNames || [], documentContext, entities || [])) {
            if (typeof chunk === 'string') {
              compiledContent += chunk
              controller.enqueue(encoder.encode(chunk))

              // Update document session with real-time compilation progress
              if (documentSessionId && compiledContent.length > 0) {
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
            }
          }

          // Final update with completed content
          if (documentSessionId && compiledContent.length > 0) {
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
