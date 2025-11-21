import { NextRequest, NextResponse } from 'next/server'
import { streamChatResponse } from '@/lib/gemini'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  try {
    const { userId, accessToken, notebookId, messages, fileSearchStoreNames } = await req.json()

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

    // Create a ReadableStream that will stream the response
    const readable = new ReadableStream({
      async start(controller) {
        try {
          const encoder = new TextEncoder()
          for await (const chunk of streamChatResponse(messages, fileSearchStoreNames || [])) {
            if (typeof chunk === 'string') {
              controller.enqueue(encoder.encode(chunk))
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
