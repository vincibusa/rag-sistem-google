'use server'

import { createServerSupabaseClient } from '@/lib/supabase-server'
import { extractTextFromDOCX, extractTextFromXLSX, extractTextFromDocument } from '@/lib/text-extractors'
import { compileDOCXTemplate } from '@/lib/document-compilers/docx'
import { compileXLSXTemplate } from '@/lib/document-compilers/xlsx'
import { compilePDFTemplate } from '@/lib/document-compilers/pdf'
import { SUPPORTED_FILE_TYPES, MAX_FILE_SIZE } from '@/lib/constants'
import { mergeUserEditsWithCompiledContent } from '@/lib/document-merge'
import type { Tables } from '@/lib/database.types'

type DocumentSession = Tables<'document_sessions'>

/**
 * Upload a document for compilation in chat
 * Extracts text and creates a document session
 */
export async function uploadDocumentForCompilation(
  userId: string,
  accessToken: string,
  notebookId: string,
  formData: FormData
): Promise<DocumentSession> {
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

    // Extract file from FormData
    const file = formData.get('file') as unknown as File
    if (!file || !(file instanceof File)) {
      throw new Error('No file provided')
    }

    // Validate file type
    if (!SUPPORTED_FILE_TYPES.includes(file.type)) {
      throw new Error(`Unsupported file type: ${file.type}. Supported types: PDF, DOCX, XLSX, DOC, XLS, TXT, CSV`)
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      throw new Error(`File size exceeds maximum allowed size of ${MAX_FILE_SIZE / 1024 / 1024}MB`)
    }

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer())

    // Extract text based on file type
    let extractedText: string

    if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      // DOCX file
      extractedText = await extractTextFromDOCX(buffer)
    } else if (
      file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      file.type === 'application/vnd.ms-excel'
    ) {
      // XLSX/XLS file
      extractedText = await extractTextFromXLSX(buffer)
    } else if (file.type === 'application/pdf') {
      // PDF - extract text (we'll handle PDF compilation differently)
      extractedText = (await extractTextFromDocument(buffer, file.type, file.name)) || ''
    } else if (file.type === 'text/plain' || file.type === 'text/csv') {
      // Plain text or CSV
      extractedText = buffer.toString('utf-8')
    } else {
      // Try generic extraction
      extractedText = (await extractTextFromDocument(buffer, file.type, file.name)) || ''
    }

    if (!extractedText || extractedText.trim().length === 0) {
      throw new Error('Could not extract text from document')
    }

    // Check if there's an active document session for this notebook
    const { data: existingSession } = await supabase
      .from('document_sessions')
      .select('*')
      .eq('notebook_id', notebookId)
      .eq('status', 'active')
      .single()

    // If there's an existing active session, mark it as cancelled
    if (existingSession) {
      await supabase
        .from('document_sessions')
        .update({ status: 'cancelled' })
        .eq('id', existingSession.id)
    }

    // Create new document session
    const { data: session, error: sessionError } = await supabase
      .from('document_sessions')
      .insert([
        {
          notebook_id: notebookId,
          user_id: userId,
          original_file_name: file.name,
          file_type: file.type,
          extracted_text: extractedText,
          status: 'active',
        } as never,
      ])
      .select()
      .single()

    if (sessionError) {
      throw new Error(`Failed to create document session: ${sessionError.message}`)
    }

    console.log(`✅ Document session created: ${session.id}`)
    console.log(`📄 File: ${file.name} (${file.type})`)
    console.log(`📏 Extracted text length: ${extractedText.length} characters`)

    return session as DocumentSession
  } catch (error) {
    console.error('❌ Error uploading document for compilation:', error)
    throw error
  }
}

/**
 * Update the compiled content of a document session
 * Used during iterative compilation in chat
 */
export async function updateCompiledDocument(
  userId: string,
  accessToken: string,
  sessionId: string,
  compiledContent: string
): Promise<void> {
  try {
    const supabase = createServerSupabaseClient(accessToken)

    // Verify session ownership
    const { data: session } = await supabase
      .from('document_sessions')
      .select('user_id, status')
      .eq('id', sessionId)
      .single()

    if (!session || session.user_id !== userId) {
      throw new Error('Not authorized to update this document session')
    }

    if (session.status !== 'active') {
      throw new Error('Document session is not active')
    }

    // Update compiled content
    const { error: updateError } = await supabase
      .from('document_sessions')
      .update({
        compiled_content: compiledContent,
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId)

    if (updateError) {
      throw new Error(`Failed to update compiled document: ${updateError.message}`)
    }

    console.log(`✅ Document session updated: ${sessionId}`)
  } catch (error) {
    console.error('❌ Error updating compiled document:', error)
    throw error
  }
}

/**
 * Generate and return the compiled document as a downloadable file
 */
export async function downloadCompiledDocument(
  userId: string,
  accessToken: string,
  sessionId: string
): Promise<{ fileName: string; fileData: Uint8Array; mimeType: string }> {
  try {
    const supabase = createServerSupabaseClient(accessToken)

    // Get document session
    const { data: session, error: sessionError } = await supabase
      .from('document_sessions')
      .select('*')
      .eq('id', sessionId)
      .single()

    if (sessionError || !session) {
      throw new Error('Document session not found')
    }

    if (session.user_id !== userId) {
      throw new Error('Not authorized to download this document')
    }

    if (!session.compiled_content) {
      throw new Error('No compiled content available. Please compile the document first.')
    }

    // Merge user edits with compiled content so downloaded file includes user modifications
    const userEdits = (session.user_edits || {}) as Record<string, any>
    const documentStructure = session.document_structure as any
    const mergeResult = mergeUserEditsWithCompiledContent(session.compiled_content, userEdits, documentStructure)

    console.log(
      `🔄 Preparing download: ${mergeResult.appliedEdits}/${mergeResult.totalFields} user edits applied to document`
    )

    // Generate file based on original file type
    let fileData: Uint8Array
    let fileName: string
    let mimeType: string

    if (session.file_type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      // DOCX
      fileData = await compileDOCXTemplate(mergeResult.mergedContent)
      fileName = session.original_file_name.replace(/\.docx$/i, '_compiled.docx')
      mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    } else if (
      session.file_type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      session.file_type === 'application/vnd.ms-excel'
    ) {
      // XLSX - Convert userEdits to Map for cell-level edits
      const cellEditsMap = new Map<string, string>(
        Object.entries(userEdits).map(([k, v]) => [k, String(v)])
      )

      fileData = await compileXLSXTemplate(mergeResult.mergedContent, cellEditsMap)
      fileName = session.original_file_name.replace(/\.(xlsx|xls)$/i, '_compiled.xlsx')
      mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    } else if (session.file_type === 'application/pdf') {
      // PDF
      fileData = await compilePDFTemplate(mergeResult.mergedContent)
      fileName = session.original_file_name.replace(/\.pdf$/i, '_compiled.pdf')
      mimeType = 'application/pdf'
    } else if (session.file_type === 'text/plain') {
      // TXT
      fileData = new TextEncoder().encode(mergeResult.mergedContent)
      fileName = session.original_file_name.replace(/\.txt$/i, '_compiled.txt')
      mimeType = 'text/plain'
    } else if (session.file_type === 'text/csv') {
      // CSV
      fileData = new TextEncoder().encode(mergeResult.mergedContent)
      fileName = session.original_file_name.replace(/\.csv$/i, '_compiled.csv')
      mimeType = 'text/csv'
    } else {
      // Default to TXT
      fileData = new TextEncoder().encode(mergeResult.mergedContent)
      fileName = session.original_file_name + '_compiled.txt'
      mimeType = 'text/plain'
    }

    // Mark session as completed
    await supabase
      .from('document_sessions')
      .update({ status: 'completed' })
      .eq('id', sessionId)

    console.log(`✅ Document compiled and ready for download: ${fileName}`)

    return { fileName, fileData, mimeType }
  } catch (error) {
    console.error('❌ Error downloading compiled document:', error)
    throw error
  }
}

/**
 * Clear/cancel a document session
 */
export async function clearDocumentSession(
  userId: string,
  accessToken: string,
  sessionId: string
): Promise<void> {
  try {
    const supabase = createServerSupabaseClient(accessToken)

    // Verify session ownership
    const { data: session } = await supabase
      .from('document_sessions')
      .select('user_id')
      .eq('id', sessionId)
      .single()

    if (!session || session.user_id !== userId) {
      throw new Error('Not authorized to clear this document session')
    }

    // Update status to cancelled
    const { error: updateError } = await supabase
      .from('document_sessions')
      .update({ status: 'cancelled' })
      .eq('id', sessionId)

    if (updateError) {
      throw new Error(`Failed to clear document session: ${updateError.message}`)
    }

    console.log(`✅ Document session cleared: ${sessionId}`)
  } catch (error) {
    console.error('❌ Error clearing document session:', error)
    throw error
  }
}

/**
 * Get active document session for a notebook
 */
export async function getActiveDocumentSession(
  userId: string,
  accessToken: string,
  notebookId: string
): Promise<DocumentSession | null> {
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

    // Get active session
    const { data: session } = await supabase
      .from('document_sessions')
      .select('*')
      .eq('notebook_id', notebookId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    return session as DocumentSession | null
  } catch (error) {
    // Return null if no active session found (not an error)
    return null
  }
}
