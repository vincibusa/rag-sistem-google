'use client'

import { create } from 'zustand'
import { Message } from '@/lib/types'
import type { Tables } from '@/lib/database.types'

type DocumentSession = Tables<'document_sessions'>

interface ChatStore {
  messages: Message[]
  isLoading: boolean
  isStreaming: boolean
  error: string | null
  documentSession: DocumentSession | null

  setMessages: (messages: Message[]) => void
  addMessage: (message: Message) => void
  updateLastMessage: (content: string) => void
  setLoading: (loading: boolean) => void
  setStreaming: (streaming: boolean) => void
  setError: (error: string | null) => void
  clearError: () => void
  clearMessages: () => void
  setDocumentSession: (session: DocumentSession | null) => void
  updateDocumentSessionContent: (compiledContent: string) => void
  clearDocumentSession: () => void
}

export const useChatStore = create<ChatStore>((set) => ({
  messages: [],
  isLoading: false,
  isStreaming: false,
  error: null,
  documentSession: null,

  setMessages: (messages) => set({ messages }),
  addMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, message],
    })),
  updateLastMessage: (content) =>
    set((state) => {
      const newMessages = [...state.messages]
      if (newMessages.length > 0) {
        newMessages[newMessages.length - 1] = {
          ...newMessages[newMessages.length - 1],
          content,
        }
      }
      return { messages: newMessages }
    }),
  setLoading: (loading) => set({ isLoading: loading }),
  setStreaming: (streaming) => set({ isStreaming: streaming }),
  setError: (error) => set({ error }),
  clearError: () => set({ error: null }),
  clearMessages: () => set({ messages: [] }),
  setDocumentSession: (session) => set({ documentSession: session }),
  updateDocumentSessionContent: (compiledContent) =>
    set((state) => {
      if (!state.documentSession) return state
      return {
        documentSession: {
          ...state.documentSession,
          compiled_content: compiledContent,
          updated_at: new Date().toISOString(),
        },
      }
    }),
  clearDocumentSession: () => set({ documentSession: null }),
}))
