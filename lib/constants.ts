// File upload constants
export const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB
export const SUPPORTED_FILE_TYPES = [
  'application/pdf',
  'text/plain',
  'text/csv',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'application/vnd.ms-excel', // .xls
  'application/msword', // .doc
]
export const SUPPORTED_EXTENSIONS = ['.pdf', '.txt', '.csv', '.docx', '.xlsx', '.xls', '.doc']

// Gemini API constants - Model differentiation for cost optimization
export const AI_MODELS = {
  RAG_SIMPLE: 'gemini-2.5-flash-lite',      // Simple queries: "trova info", "cos'è"
  RAG_COMPLEX: 'gemini-2.5-flash',          // Multi-step reasoning, analysis
  COMPILATION: 'gemini-2.5-flash',          // Document filling (needs high accuracy)
  ENTITY_EXTRACTION: 'gemini-2.5-flash',    // Structured data extraction
} as const

// Default models for backward compatibility
export const GEMINI_MODEL = AI_MODELS.RAG_COMPLEX
export const GEMINI_VISION_MODEL = AI_MODELS.RAG_COMPLEX

// UI Constants
export const TOAST_DURATION = 3000
export const UPLOAD_CHUNK_SIZE = 1024 * 1024 // 1MB
