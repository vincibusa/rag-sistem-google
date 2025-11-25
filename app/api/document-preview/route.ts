import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')
    const accessToken = searchParams.get('accessToken')
    const documentSessionId = searchParams.get('documentSessionId')

    console.log('🔍 document-preview API - Request received:', {
      userId,
      documentSessionId,
      hasAccessToken: !!accessToken
    })

    if (!userId || !accessToken || !documentSessionId) {
      console.log('🔍 document-preview API - Missing required fields')
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const supabase = createServerSupabaseClient(accessToken)

    // Verify document session ownership
    const { data: session } = await supabase
      .from('document_sessions')
      .select('*')
      .eq('id', documentSessionId)
      .single()

    console.log('🔍 document-preview API - Session verification:', {
      foundSession: !!session,
      sessionUserId: session?.user_id,
      requestedUserId: userId,
      sessionStatus: session?.status
    })

    if (!session || session.user_id !== userId) {
      console.log('🔍 document-preview API - Forbidden access')
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Create a ReadableStream that will stream document updates
    const readable = new ReadableStream({
      async start(controller) {
        try {
          const encoder = new TextEncoder()

          console.log('🔍 document-preview API - Starting polling for updates')

          // Poll for document updates
          const pollInterval = setInterval(async () => {
            try {
              // Get latest session data
              const { data: latestSession } = await supabase
                .from('document_sessions')
                .select('*')
                .eq('id', documentSessionId)
                .single()

              console.log('🔍 document-preview API - Polling iteration:', {
                hasLatestSession: !!latestSession,
                sessionStatus: latestSession?.status,
                hasCurrentCompiledContent: !!latestSession?.current_compiled_content
              })

              if (latestSession) {
                // Check for changes that should trigger updates
                const updates = []

                // Check for new compiled content
                if (latestSession.current_compiled_content !== session.current_compiled_content) {
                  updates.push({
                    type: 'compilation_update',
                    content: latestSession.current_compiled_content,
                    timestamp: new Date().toISOString(),
                  })
                }

                // Check for field completion status changes
                if (latestSession.field_completion_status !== session.field_completion_status) {
                  updates.push({
                    type: 'field_status_update',
                    status: latestSession.field_completion_status,
                    timestamp: new Date().toISOString(),
                  })
                }

                // Check for user edits
                if (latestSession.user_edits !== session.user_edits) {
                  updates.push({
                    type: 'user_edit_update',
                    edits: latestSession.user_edits,
                    timestamp: new Date().toISOString(),
                  })
                }

                // Check for new comments
                if (latestSession.comments !== session.comments) {
                  updates.push({
                    type: 'comment_update',
                    comments: latestSession.comments,
                    timestamp: new Date().toISOString(),
                  })
                }

                // Send updates if any
                if (updates.length > 0) {
                  for (const update of updates) {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify(update)}\n\n`))
                  }
                }

                // Update session reference for next comparison
                Object.assign(session, latestSession)
              }

              // Stop polling if session is completed or cancelled
              if (latestSession?.status !== 'active') {
                clearInterval(pollInterval)
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                  type: 'session_completed',
                  status: latestSession?.status,
                  timestamp: new Date().toISOString(),
                })}\n\n`))
                controller.close()
              }
            } catch (error) {
              console.error('Error polling for updates:', error)
            }
          }, 1000) // Poll every second

          // Cleanup on stream close
          req.signal.addEventListener('abort', () => {
            clearInterval(pollInterval)
            controller.close()
          })

        } catch (error) {
          console.error('Error in document preview stream:', error)
          controller.error(error)
        }
      },
    })

    return new NextResponse(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control',
      },
    })
  } catch (error) {
    console.error('Error in document preview API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Helper function to update document session with real-time data
export async function updateDocumentSession(
  supabase: any,
  documentSessionId: string,
  updates: {
    current_compiled_content?: string
    field_completion_status?: any
    user_edits?: any
    comments?: any
  }
) {
  const { data, error } = await supabase
    .from('document_sessions')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', documentSessionId)
    .select()
    .single()

  if (error) {
    console.error('Error updating document session:', error)
    throw error
  }

  return data
}

export async function POST(req: NextRequest) {
  try {
    const { userId, accessToken, documentSessionId, fieldId, content, action } = await req.json()

    console.log('🔍 document-preview POST - User edit received:', {
      userId,
      documentSessionId,
      fieldId,
      hasContent: !!content,
      action
    })

    if (!userId || !accessToken || !documentSessionId || !fieldId) {
      console.log('🔍 document-preview POST - Missing required fields')
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const supabase = createServerSupabaseClient(accessToken)

    // Verify document session ownership
    const { data: session } = await supabase
      .from('document_sessions')
      .select('*')
      .eq('id', documentSessionId)
      .single()

    if (!session || session.user_id !== userId) {
      console.log('🔍 document-preview POST - Forbidden access')
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get current user edits
    const currentUserEdits = (session.user_edits as Record<string, any>) || {}
    let updatedUserEdits = { ...currentUserEdits }

    // Handle different actions
    switch (action) {
      case 'update':
        if (content !== undefined) {
          updatedUserEdits[fieldId] = {
            content,
            timestamp: new Date().toISOString(),
            fieldId,
            userId
          }
        }
        break

      case 'bulk_update':
        if (content !== undefined) {
          try {
            const bulkEdits = JSON.parse(content)
            updatedUserEdits = { ...bulkEdits }
            // Add timestamps to bulk edits
            Object.keys(updatedUserEdits).forEach(fieldId => {
              if (!updatedUserEdits[fieldId].timestamp) {
                updatedUserEdits[fieldId].timestamp = new Date().toISOString()
              }
              if (!updatedUserEdits[fieldId].userId) {
                updatedUserEdits[fieldId].userId = userId
              }
            })
          } catch (parseError) {
            console.error('Error parsing bulk edits:', parseError)
            return NextResponse.json(
              { error: 'Invalid bulk edits format' },
              { status: 400 }
            )
          }
        }
        break

      case 'delete':
        delete updatedUserEdits[fieldId]
        break

      case 'clear':
        updatedUserEdits = {}
        break

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }

    // Update document session with new user edits
    const { data: updatedSession, error } = await supabase
      .from('document_sessions')
      .update({
        user_edits: updatedUserEdits,
        updated_at: new Date().toISOString(),
      })
      .eq('id', documentSessionId)
      .select()
      .single()

    if (error) {
      console.error('Error updating user edits:', error)
      return NextResponse.json(
        { error: 'Failed to update user edits' },
        { status: 500 }
      )
    }

    console.log('🔍 document-preview POST - User edit saved successfully:', {
      fieldId,
      action,
      totalUserEdits: Object.keys(updatedUserEdits).length
    })

    return NextResponse.json({
      success: true,
      userEdits: updatedUserEdits
    })

  } catch (error) {
    console.error('Error in document preview POST API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}