import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  try {
    const { userId, accessToken, notebookId, messageId, content } = await req.json()

    if (!userId || !accessToken || !notebookId || !messageId || !content) {
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

    // Verify message belongs to this notebook
    const { data: message } = await supabase
      .from('messages')
      .select('id, notebook_id')
      .eq('id', messageId)
      .eq('notebook_id', notebookId)
      .single()

    if (!message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 })
    }

    // Update the message
    const { error: updateError } = await supabase
      .from('messages')
      .update({
        content: content,
        updated_at: new Date().toISOString(),
      })
      .eq('id', messageId)

    if (updateError) {
      console.error('Error updating message:', updateError)
      return NextResponse.json(
        { error: 'Failed to update message' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in message update API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
