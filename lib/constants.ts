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

// Gemini API constants
export const GEMINI_MODEL = 'gemini-2.5-flash-lite'
export const GEMINI_VISION_MODEL = 'gemini-2.5-flash-lite'

// UI Constants
export const TOAST_DURATION = 3000
export const UPLOAD_CHUNK_SIZE = 1024 * 1024 // 1MB
