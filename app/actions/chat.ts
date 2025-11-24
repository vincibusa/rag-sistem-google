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
  fileUris: string[],
  documentSessionId?: string | null
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

    // Save user message with document session id if present
    const userMessage = await addMessage(notebookId, 'user', content, fileUris, supabase, documentSessionId || undefined)

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
  fileUris: string[],
  documentSessionId?: string | null
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

    let fullResponse = ''

    for await (const chunk of streamChatResponse(messages, fileUris, documentContext)) {
      fullResponse += chunk
      yield chunk
    }

    // Save assistant message after streaming completes
    await addMessage(notebookId, 'assistant', fullResponse, fileUris, supabase, documentSessionId || undefined)
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
