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

    return dbFile
  } catch (error) {
    console.error('Error uploading file:', error)
    throw error
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
    // Delete from database
    await deleteFileFromDB(fileId)
  } catch (error) {
    console.error('Error deleting file:', error)
    throw error
  }
}
