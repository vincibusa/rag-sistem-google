'use client'

import { create } from 'zustand'
import { Message } from '@/lib/types'
import type { Tables } from '@/lib/database.types'

type DocumentSession = Tables<'document_sessions'>

interface Comment {
  id: string
  fieldId: string
  content: string
  author: 'user' | 'ai'
  createdAt: string
  resolved: boolean
}

interface DocumentPreviewState {
  isVisible: boolean
  currentDocument: DocumentSession | null
  previewMode: 'text' | 'visual'
  splitRatio: number // 0.4 for 40% document, 60% chat
  isCollapsed: boolean
  activeField: string | null
  userEdits: Map<string, string>
  comments: Comment[]
}

interface ChatStore {
  messages: Message[]
  isLoading: boolean
  isStreaming: boolean
  error: string | null
  documentSession: DocumentSession | null
  editingMessageId: string | null
  documentPreview: DocumentPreviewState

  setMessages: (messages: Message[]) => void
  addMessage: (message: Message) => void
  updateLastMessage: (content: string) => void
  updateMessage: (messageId: string, content: string) => void
  deleteMessage: (messageId: string) => void
  setLoading: (loading: boolean) => void
  setStreaming: (streaming: boolean) => void
  setError: (error: string | null) => void
  clearError: () => void
  clearMessages: () => void
  setDocumentSession: (session: DocumentSession | null) => void
  updateDocumentSessionContent: (compiledContent: string) => void
  clearDocumentSession: () => void
  setEditingMessageId: (messageId: string | null) => void

  // Document Preview Actions
  setDocumentPreviewVisible: (visible: boolean) => void
  setPreviewDocument: (document: DocumentSession | null) => void
  setPreviewMode: (mode: 'text' | 'visual') => void
  setSplitRatio: (ratio: number) => void
  setPreviewCollapsed: (collapsed: boolean) => void
  setActiveField: (fieldId: string | null) => void
  updateUserEdit: (fieldId: string, content: string) => void
  removeUserEdit: (fieldId: string) => void
  clearUserEdits: () => void
  addComment: (comment: Omit<Comment, 'id' | 'createdAt'>) => void
  updateComment: (commentId: string, updates: Partial<Comment>) => void
  deleteComment: (commentId: string) => void
  resolveComment: (commentId: string) => void
}

export const useChatStore = create<ChatStore>((set) => ({
  messages: [],
  isLoading: false,
  isStreaming: false,
  error: null,
  documentSession: null,
  editingMessageId: null,
  documentPreview: {
    isVisible: false,
    currentDocument: null,
    previewMode: 'text',
    splitRatio: 0.4,
    isCollapsed: false,
    activeField: null,
    userEdits: new Map(),
    comments: [],
  },

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
  updateMessage: (messageId, content) =>
    set((state) => ({
      messages: state.messages.map((msg) =>
        msg.id === messageId ? { ...msg, content } : msg
      ),
    })),
  deleteMessage: (messageId) =>
    set((state) => ({
      messages: state.messages.filter((msg) => msg.id !== messageId),
    })),
  setLoading: (loading) => set({ isLoading: loading }),
  setStreaming: (streaming) => set({ isStreaming: streaming }),
  setError: (error) => set({ error }),
  clearError: () => set({ error: null }),
  clearMessages: () => set({ messages: [] }),
  setDocumentSession: (session) => {
    console.log('🔍 chat-store - setDocumentSession called:', {
      hasSession: !!session,
      sessionId: session?.id,
      fileName: session?.original_file_name
    })
    set({ documentSession: session })
  },
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
  setEditingMessageId: (messageId) => set({ editingMessageId: messageId }),

  // Document Preview Actions
  setDocumentPreviewVisible: (visible) => {
    console.log('🔍 chat-store - setDocumentPreviewVisible called:', visible)
    set((state) => ({
      documentPreview: {
        ...state.documentPreview,
        isVisible: visible,
      },
    }))
  },
  setPreviewDocument: (document) => {
    console.log('🔍 chat-store - setPreviewDocument called:', {
      hasDocument: !!document,
      documentId: document?.id,
      fileName: document?.original_file_name
    })
    set((state) => ({
      documentPreview: {
        ...state.documentPreview,
        currentDocument: document,
      },
    }))
  },
  setPreviewMode: (mode) =>
    set((state) => ({
      documentPreview: {
        ...state.documentPreview,
        previewMode: mode,
      },
    })),
  setSplitRatio: (ratio) =>
    set((state) => ({
      documentPreview: {
        ...state.documentPreview,
        splitRatio: ratio,
      },
    })),
  setPreviewCollapsed: (collapsed) =>
    set((state) => ({
      documentPreview: {
        ...state.documentPreview,
        isCollapsed: collapsed,
      },
    })),
  setActiveField: (fieldId) =>
    set((state) => ({
      documentPreview: {
        ...state.documentPreview,
        activeField: fieldId,
      },
    })),
  updateUserEdit: (fieldId, content) =>
    set((state) => {
      const newUserEdits = new Map(state.documentPreview.userEdits)
      newUserEdits.set(fieldId, content)
      return {
        documentPreview: {
          ...state.documentPreview,
          userEdits: newUserEdits,
        },
      }
    }),
  removeUserEdit: (fieldId) =>
    set((state) => {
      const newUserEdits = new Map(state.documentPreview.userEdits)
      newUserEdits.delete(fieldId)
      return {
        documentPreview: {
          ...state.documentPreview,
          userEdits: newUserEdits,
        },
      }
    }),
  clearUserEdits: () =>
    set((state) => ({
      documentPreview: {
        ...state.documentPreview,
        userEdits: new Map(),
      },
    })),
  addComment: (comment) =>
    set((state) => {
      const newComment: Comment = {
        ...comment,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
      }
      return {
        documentPreview: {
          ...state.documentPreview,
          comments: [...state.documentPreview.comments, newComment],
        },
      }
    }),
  updateComment: (commentId, updates) =>
    set((state) => ({
      documentPreview: {
        ...state.documentPreview,
        comments: state.documentPreview.comments.map((comment) =>
          comment.id === commentId ? { ...comment, ...updates } : comment
        ),
      },
    })),
  deleteComment: (commentId) =>
    set((state) => ({
      documentPreview: {
        ...state.documentPreview,
        comments: state.documentPreview.comments.filter(
          (comment) => comment.id !== commentId
        ),
      },
    })),
  resolveComment: (commentId) =>
    set((state) => ({
      documentPreview: {
        ...state.documentPreview,
        comments: state.documentPreview.comments.map((comment) =>
          comment.id === commentId ? { ...comment, resolved: true } : comment
        ),
      },
    })),
}))
