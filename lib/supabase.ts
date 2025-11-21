import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/lib/database.types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please check your .env.local file.'
  )
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

// Helper to get the appropriate client (defaults to client-side)
function getClient(client?: SupabaseClient<Database>): SupabaseClient<Database> {
  return client || supabase
}

// Notebook operations
export async function createNotebook(userId: string, name: string, description?: string) {
  const { data, error } = await supabase
    .from('notebooks')
    .insert([{ user_id: userId, name, description }])
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getNotebooks(userId: string) {
  const { data, error } = await supabase
    .from('notebooks')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export async function deleteNotebook(notebookId: string) {
  const { error } = await supabase.from('notebooks').delete().eq('id', notebookId)

  if (error) throw error
}

// File operations
export async function addFileToNotebook(
  notebookId: string,
  name: string,
  geminiUri: string,
  mimeType: string,
  sizeBytes: number,
  client?: SupabaseClient<Database>,
  fileSearchStoreId?: string
) {
  const supabaseClient = getClient(client)
  console.log('📝 Inserting file into database:', { notebookId, name, geminiUri, mimeType, sizeBytes })

  const { data, error } = await supabaseClient
    .from('files')
    .insert([
      {
        notebook_id: notebookId,
        name,
        gemini_uri: geminiUri,
        mime_type: mimeType,
        size_bytes: sizeBytes,
        status: 'active',
        file_search_store_id: fileSearchStoreId,
      },
    ])
    .select()
    .single()

  if (error) {
    console.error('❌ Error inserting file into database:', error)
    throw error
  }
  console.log('✅ File inserted successfully:', data)
  return data
}

export async function getNotebookFiles(notebookId: string, client?: SupabaseClient<Database>) {
  console.log('📊 Querying database for files in notebook:', notebookId)
  const supabaseClient = getClient(client)

  // Test query without status filter first
  const testQuery = await supabaseClient
    .from('files')
    .select('*')
    .eq('notebook_id', notebookId)

  console.log('🔍 Test query (no status filter):', testQuery)

  // Then do the actual query
  const { data, error } = await supabaseClient
    .from('files')
    .select('*')
    .eq('notebook_id', notebookId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('❌ Database query error:', error)
    throw error
  }
  console.log('✅ Database query successful, found files:', data)
  return data
}

export async function deleteFile(fileId: string) {
  const { error } = await supabase.from('files').delete().eq('id', fileId)

  if (error) throw error
}

/**
 * Get unique File Search store names for a notebook
 */
export async function getFileSearchStoreNames(notebookId: string, client?: SupabaseClient<Database>) {
  const supabaseClient = getClient(client)

  const { data, error } = await supabaseClient
    .from('file_search_stores')
    .select('file_search_store_name')
    .eq('notebook_id', notebookId)

  if (error) {
    console.error('Error fetching file search stores:', error)
    throw error
  }

  const storeNames = data.map(store => store.file_search_store_name).filter(Boolean)
  console.log('📚 File Search store names found:', storeNames)
  return storeNames
}

// Message operations
export async function addMessage(
  notebookId: string,
  role: 'user' | 'assistant',
  content: string,
  fileUris: string[] = [],
  client?: SupabaseClient<Database>
) {
  const supabaseClient = getClient(client)
  const { data, error } = await supabaseClient
    .from('messages')
    .insert([
      {
        notebook_id: notebookId,
        role,
        content,
        file_uris: fileUris,
      },
    ])
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getNotebookMessages(notebookId: string, limit: number = 50) {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('notebook_id', notebookId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data?.reverse() || []
}

export async function clearNotebookMessages(notebookId: string) {
  const { error } = await supabase
    .from('messages')
    .delete()
    .eq('notebook_id', notebookId)

  if (error) throw error
}
