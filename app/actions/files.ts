'use server'

import { createServerSupabaseClient } from '@/lib/supabase-server'
import { addFileToNotebook, getNotebookFiles, deleteFile as deleteFileFromDB } from '@/lib/supabase'
import {
  createFileSearchStore,
  uploadToFileSearchStore,
  deleteFileSearchStore,
} from '@/lib/file-search'
import type { File } from '@/lib/types'
import { SUPPORTED_FILE_TYPES, MAX_FILE_SIZE } from '@/lib/constants'
import { convertFileIfNeeded } from '@/lib/file-conversion'
import { extractTextFromDOCX, extractTextFromXLSX, extractTextFromPDF } from '@/lib/text-extractors'
import { extractEntitiesFromText } from '@/lib/entity-extraction'
import { bulkCreateEntitiesAction } from './entities'

export async function uploadFileAction(
  userId: string,
  accessToken: string,
  notebookId: string,
  formData: FormData
): Promise<File> {
  try {
    const supabase = createServerSupabaseClient(accessToken)

    // Verify notebook ownership
    const { data: notebook } = await supabase
      .from('notebooks')
      .select('user_id')
      .eq('id', notebookId)
      .single()

    if (!notebook || notebook.user_id !== userId) {
      throw new Error('Not authorized to upload to this notebook')
    }

    const file = formData.get('file') as unknown as File
    if (!file || !(file instanceof File)) throw new Error('No file provided')

    // Validate file
    if (!SUPPORTED_FILE_TYPES.includes(file.type)) {
      throw new Error(`Unsupported file type: ${file.type}`)
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new Error(`File size exceeds maximum allowed size of ${MAX_FILE_SIZE / 1024 / 1024}MB`)
    }

    // Get or create File Search store for this notebook
    let fileSearchStore = null
    const { data: existingStore } = await supabase
      .from('file_search_stores')
      .select('*')
      .eq('notebook_id', notebookId)
      .single()

    if (!existingStore) {
      // Create new File Search store
      const newStore = await createFileSearchStore(`notebook-${notebookId}`)
      // Save store reference to database
      const { data: dbStore, error: storeError } = await supabase
        .from('file_search_stores')
        .insert([
          {
            notebook_id: notebookId,
            file_search_store_name: newStore.name,
          } as never,
        ])
        .select()
        .single()

      if (storeError) throw new Error(`Failed to save file search store: ${storeError.message}`)
      fileSearchStore = dbStore
    } else {
      fileSearchStore = existingStore
    }

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer())

    // Convert file if needed (Excel, Word legacy, etc.)
    const converted = await convertFileIfNeeded(buffer, file.type, file.name)

    // Upload to File Search store (using converted buffer and filename)
    const uploadResult = await uploadToFileSearchStore(
      converted.buffer,
      fileSearchStore.file_search_store_name,
      converted.convertedFilename
    )

    // Generate a URI for the file - either from the operation or a fallback
    // The File Search API will handle the actual file reference
    const geminiUri = (uploadResult as any)?.response?.documentName || (uploadResult as any)?.name || `fileSearchStore://${fileSearchStore.id}/${converted.convertedFilename}`

    // Save metadata to Supabase (not the file itself)
    // Use converted filename and mimetype, but original size
    console.log('💾 Saving file metadata to database:', { notebookId, fileName: converted.convertedFilename, geminiUri })
    const dbFile = await addFileToNotebook(
      notebookId,
      converted.convertedFilename,
      geminiUri,
      converted.mimeType,
      file.size,
      supabase,
      fileSearchStore.id
    )
    console.log('✅ File metadata saved to database:', dbFile)

    // Extract entities from the uploaded file (background task - don't block upload)
    // Use converted MIME type and filename since the file may have been converted
    extractAndSaveEntities(userId, accessToken, notebookId, dbFile.id, converted.buffer, converted.mimeType, converted.convertedFilename)
      .catch(error => {
        console.error('⚠️ Entity extraction failed (non-blocking):', error)
      })

    return dbFile
  } catch (error) {
    console.error('Error uploading file:', error)
    throw error
  }
}

/**
 * Extract entities from file and save to database
 * This runs in the background and doesn't block the file upload
 */
async function extractAndSaveEntities(
  userId: string,
  accessToken: string,
  notebookId: string,
  fileId: string,
  buffer: Buffer,
  mimeType: string,
  fileName: string
): Promise<void> {
  try {
    console.log(`🔍 Starting entity extraction for ${fileName}`)

    // Extract text based on file type
    let extractedText: string

    if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      // DOCX file
      extractedText = await extractTextFromDOCX(buffer)
    } else if (
      mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      mimeType === 'application/vnd.ms-excel'
    ) {
      // XLSX/XLS file
      extractedText = await extractTextFromXLSX(buffer)
    } else if (mimeType === 'text/plain' || mimeType === 'text/csv') {
      // Plain text or CSV
      extractedText = buffer.toString('utf-8')
    } else if (mimeType === 'application/pdf') {
      // PDF file
      extractedText = await extractTextFromPDF(buffer)
    } else {
      console.warn(`⚠️ Unsupported file type for entity extraction: ${mimeType}`)
      return // Skip entity extraction for unsupported types
    }

    if (!extractedText || extractedText.trim().length === 0) {
      console.warn(`⚠️ No text extracted from ${fileName}, skipping entity extraction`)
      return
    }

    console.log(`📝 Extracted ${extractedText.length} characters from ${fileName}`)

    // Extract entities using Gemini AI
    const entities = await extractEntitiesFromText(extractedText, fileName)

    if (entities.length === 0) {
      console.log(`ℹ️ No entities found in ${fileName}`)
      return
    }

    // Save entities to database
    const entitiesToSave = entities.map(entity => ({
      entity_type: entity.entity_type,
      entity_name: entity.entity_name,
      attributes: entity.attributes,
      source_file_id: fileId,
    }))

    await bulkCreateEntitiesAction(userId, accessToken, notebookId, entitiesToSave)

    console.log(`✅ Saved ${entities.length} entities from ${fileName}`)
  } catch (error) {
    console.error(`❌ Entity extraction failed for ${fileName}:`, error)
    // Don't throw - this is a background task
  }
}

export async function getFilesAction(
  userId: string,
  accessToken: string,
  notebookId: string
): Promise<File[]> {
  try {
    console.log('🔍 getFilesAction called:', { userId, notebookId })
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

    const files = await getNotebookFiles(notebookId, supabase)
    console.log('📂 Files retrieved from database:', files)
    return files
  } catch (error) {
    console.error('Error fetching files:', error)
    throw error
  }
}

export async function deleteFileAction(
  userId: string,
  accessToken: string,
  fileId: string
): Promise<void> {
  try {
    const supabase = createServerSupabaseClient(accessToken)

    // Verify ownership by checking file's notebook ownership
    const { data: file } = await supabase
      .from('files')
      .select('notebooks(user_id)')
      .eq('id', fileId)
      .single()

    if (!file || !file.notebooks || file.notebooks.user_id !== userId) {
      throw new Error('Not authorized to delete this file')
    }

    // File Search handles document deletion at the store level
    // Individual file deletion is not needed - they'll be removed when the store is deleted
    // Soft delete from database (pass the authenticated client)
    await deleteFileFromDB(fileId, supabase)
  } catch (error) {
    console.error('Error deleting file:', error)
    throw error
  }
}
