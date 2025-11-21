'use server'

import { createServerSupabaseClient } from '@/lib/supabase-server'
import { addMessage, getNotebookMessages } from '@/lib/supabase'
import { streamChatResponse } from '@/lib/gemini'
import { Message } from '@/lib/types'

export async function sendMessageAction(
  userId: string,
  accessToken: string,
  notebookId: string,
  content: string,
  fileUris: string[]
): Promise<Message> {
  try {
    const supabase = createServerSupabaseClient(accessToken)

    // Verify notebook ownership
    const { data: notebook } = await supabase
      .from('notebooks')
      .select('user_id')
      .eq('id', notebookId)
      .single()

    if (!notebook || notebook.user_id !== userId) {
      throw new Error('Not authorized to send messages to this notebook')
    }

    // Save user message
    const userMessage = await addMessage(notebookId, 'user', content, fileUris, supabase)

    return userMessage
  } catch (error) {
    console.error('Error sending message:', error)
    throw error
  }
}

export async function* streamChatResponseAction(
  userId: string,
  accessToken: string,
  notebookId: string,
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  fileUris: string[]
) {
  try {
    const supabase = createServerSupabaseClient(accessToken)

    // Verify notebook ownership
    const { data: notebook } = await supabase
      .from('notebooks')
      .select('user_id')
      .eq('id', notebookId)
      .single()

    if (!notebook || notebook.user_id !== userId) {
      throw new Error('Not authorized to access this notebook')
    }

    let fullResponse = ''

    for await (const chunk of streamChatResponse(messages, fileUris)) {
      fullResponse += chunk
      yield chunk
    }

    // Save assistant message after streaming completes
    await addMessage(notebookId, 'assistant', fullResponse, fileUris, supabase)
  } catch (error) {
    console.error('Error streaming chat response:', error)
    throw error
  }
}

export async function getMessagesAction(
  userId: string,
  accessToken: string,
  notebookId: string
): Promise<Message[]> {
  try {
    const supabase = createServerSupabaseClient(accessToken)

    // Verify notebook ownership
    const { data: notebook } = await supabase
      .from('notebooks')
      .select('user_id')
      .eq('id', notebookId)
      .single()

    if (!notebook || notebook.user_id !== userId) {
      throw new Error('Not authorized to access this notebook')
    }

    const messages = await getNotebookMessages(notebookId)
    return messages
  } catch (error) {
    console.error('Error fetching messages:', error)
    throw error
  }
}
