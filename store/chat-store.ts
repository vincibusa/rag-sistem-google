'use client'

import { create } from 'zustand'
import { Message, ExcelStructure } from '@/lib/types'
import { mergeUserEditsWithCompiledContent } from '@/lib/document-merge'
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
  // Merged content cache with version-based invalidation
  mergedContent: string | null
  mergedContentVersion: number
  // Excel/Spreadsheet state
  excelStructure: ExcelStructure | null
  excelCellEdits: Map<string, string> // key: "SheetName:CellRef", value: contenuto
}

interface ChatStore {
  messages: Message[]
  isLoading: boolean
  isStreaming: boolean
  error: string | null
  documentSession: DocumentSession | null
  editingMessageId: string | null
  documentPreview: DocumentPreviewState
  chatMode: 'rag' | 'compilation'

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
  updateDocumentSessionRealTime: (updates: Partial<DocumentSession>) => void
  clearDocumentSession: () => void
  setEditingMessageId: (messageId: string | null) => void
  setChatMode: (mode: 'rag' | 'compilation') => void

  // Document Preview Actions
  setDocumentPreviewVisible: (visible: boolean) => void
  setPreviewDocument: (document: DocumentSession | null) => void
  updatePreviewDocument: (updates: Partial<DocumentSession>) => void
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

  // Merged content methods
  getMergedContent: () => string | null
  invalidateMergedContent: () => void
  getFieldMergedContent: (fieldId: string) => string | null

  // Excel/Spreadsheet methods
  setExcelStructure: (structure: ExcelStructure) => void
  updateExcelCell: (sheetName: string, cellRef: string, value: string) => void
  setActiveSheet: (index: number) => void
}

export const useChatStore = create<ChatStore>((set, get) => ({
  messages: [],
  isLoading: false,
  isStreaming: false,
  error: null,
  documentSession: null,
  editingMessageId: null,
  chatMode: 'rag',
  documentPreview: {
    isVisible: false,
    currentDocument: null,
    previewMode: 'text',
    splitRatio: 0.4,
    isCollapsed: false,
    activeField: null,
    userEdits: new Map(),
    comments: [],
    mergedContent: null,
    mergedContentVersion: 0,
    excelStructure: null,
    excelCellEdits: new Map(),
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

    const newMode = session ? 'compilation' : 'rag'

    set({
      documentSession: session,
      chatMode: newMode
    })
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
  updateDocumentSessionRealTime: (updates) =>
    set((state) => {
      if (!state.documentSession) return state
      return {
        documentSession: {
          ...state.documentSession,
          ...updates,
          updated_at: new Date().toISOString(),
        },
      }
    }),
  clearDocumentSession: () => set({ documentSession: null }),
  setEditingMessageId: (messageId) => set({ editingMessageId: messageId }),
  setChatMode: (mode) => {
    console.log('🔍 chat-store - setChatMode called:', mode)
    set({ chatMode: mode })
  },

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
  updatePreviewDocument: (updates) =>
    set((state) => {
      if (!state.documentPreview.currentDocument) return state
      return {
        documentPreview: {
          ...state.documentPreview,
          currentDocument: {
            ...state.documentPreview.currentDocument,
            ...updates,
            updated_at: new Date().toISOString(),
          },
          mergedContent: null, // ← Invalida cache quando contenuto compilato cambia
          mergedContentVersion: state.documentPreview.mergedContentVersion + 1,
        },
      }
    }),
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
          mergedContent: null, // ← Invalida cache
          mergedContentVersion: state.documentPreview.mergedContentVersion + 1,
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
          mergedContent: null, // ← Invalida cache
          mergedContentVersion: state.documentPreview.mergedContentVersion + 1,
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

  // Merged content methods
  getMergedContent: () => {
    const state = get()
    const { currentDocument, userEdits, mergedContent } = state.documentPreview

    if (!currentDocument) return null

    const baseContent = currentDocument.current_compiled_content || currentDocument.compiled_content
    if (!baseContent) return null

    // If no user edits, return compiled content directly
    if (userEdits.size === 0) {
      return baseContent
    }

    // If cache is valid, return cached
    if (mergedContent !== null) {
      console.log('✅ Merged content cache hit')
      return mergedContent
    }

    // Cache miss: compute merge fresh (no set() to avoid render phase violation)
    const userEditsObj = Object.fromEntries(userEdits)
    const documentStructure = currentDocument.document_structure

    console.log('🔄 Computing merged content (cache miss)...')
    const mergeResult = mergeUserEditsWithCompiledContent(baseContent, userEditsObj, documentStructure)

    console.log(`✅ Merged content computed: ${mergeResult.appliedEdits}/${mergeResult.totalFields} edits applied`)

    // Return computed content without saving to cache in this getter
    // This prevents React render phase violations
    return mergeResult.mergedContent
  },

  invalidateMergedContent: () => {
    set((state) => ({
      documentPreview: {
        ...state.documentPreview,
        mergedContent: null,
        mergedContentVersion: state.documentPreview.mergedContentVersion + 1,
      },
    }))
    console.log('🔄 Merged content cache invalidated')
  },

  getFieldMergedContent: (fieldId: string) => {
    const state = get()
    const userEdit = state.documentPreview.userEdits.get(fieldId)

    if (userEdit) return userEdit

    // Fallback: try to find in parsed structure
    const mergedContent = state.getMergedContent()
    if (!mergedContent) return null

    // Simple search in merged content for the field value
    // This is a basic implementation; more sophisticated parsing could be added
    const document = state.documentPreview.currentDocument
    if (document?.document_structure) {
      const structure = (document.document_structure as any)
      const field = structure.fields?.find((f: any) => f.id === fieldId)
      return field?.compiledContent || null
    }

    return null
  },

  // Excel/Spreadsheet actions
  setExcelStructure: (structure) => {
    set((state) => ({
      documentPreview: {
        ...state.documentPreview,
        excelStructure: structure,
      },
    }))
  },

  updateExcelCell: (sheetName, cellRef, value) => {
    set((state) => {
      const cellId = `${sheetName}:${cellRef}`
      const newEdits = new Map(state.documentPreview.excelCellEdits)
      newEdits.set(cellId, value)

      return {
        documentPreview: {
          ...state.documentPreview,
          excelCellEdits: newEdits,
          mergedContentVersion: state.documentPreview.mergedContentVersion + 1,
        },
      }
    })
  },

  setActiveSheet: (index) => {
    set((state) => {
      if (!state.documentPreview.excelStructure) return state

      return {
        documentPreview: {
          ...state.documentPreview,
          excelStructure: {
            ...state.documentPreview.excelStructure,
            activeSheetIndex: index,
          },
        },
      }
    })
  },
}))
