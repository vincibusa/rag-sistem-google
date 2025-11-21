import { Database } from '@/lib/database.types'

// Re-export Supabase types
export type Notebook = Database['public']['Tables']['notebooks']['Row']
export type NotebookInsert = Database['public']['Tables']['notebooks']['Insert']
export type NotebookUpdate = Database['public']['Tables']['notebooks']['Update']

export type File = Database['public']['Tables']['files']['Row']
export type FileInsert = Database['public']['Tables']['files']['Insert']
export type FileUpdate = Database['public']['Tables']['files']['Update']

export type Message = Database['public']['Tables']['messages']['Row']
export type MessageInsert = Database['public']['Tables']['messages']['Insert']
export type MessageUpdate = Database['public']['Tables']['messages']['Update']

// Custom types
export interface UploadProgress {
  fileId: string
  fileName: string
  progress: number
  status: 'pending' | 'uploading' | 'processing' | 'complete' | 'error'
  error?: string
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  fileUris: string[]
  createdAt: Date
}

export interface GeminiFile {
  uri: string
  mimeType: string
  name: string
}

export interface NotebookState {
  currentNotebookId: string | null
  notebooks: Notebook[]
  loading: boolean
  error: string | null
}

export interface FilesState {
  files: File[]
  uploadProgress: Map<string, UploadProgress>
  loading: boolean
  error: string | null
}

export interface ChatState {
  messages: ChatMessage[]
  isLoading: boolean
  isStreaming: boolean
  error: string | null
}

export interface AutofillData {
  templateFileUri: string
  sourceFileUris: string[]
  formattedOutput: string
}
