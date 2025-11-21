'use server'

import { createServerSupabaseClient } from '@/lib/supabase-server'
import { Notebook } from '@/lib/types'

export async function createNotebookAction(
  userId: string,
  accessToken: string,
  name: string,
  description?: string
): Promise<Notebook> {
  try {
    const supabase = createServerSupabaseClient(accessToken)

    // Insert with explicit user_id from the authenticated client
    const { data, error } = await supabase
      .from('notebooks')
      .insert([{ name, description, user_id: userId }])
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error creating notebook:', error)
    throw error
  }
}

export async function getNotebooksAction(userId: string, accessToken: string): Promise<Notebook[]> {
  try {
    const supabase = createServerSupabaseClient(accessToken)

    const { data, error } = await supabase
      .from('notebooks')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching notebooks:', error)
    throw error
  }
}

export async function deleteNotebookAction(
  userId: string,
  accessToken: string,
  notebookId: string
): Promise<void> {
  try {
    const supabase = createServerSupabaseClient(accessToken)

    // Verify ownership before deleting
    const { data: notebook, error: fetchError } = await supabase
      .from('notebooks')
      .select('user_id')
      .eq('id', notebookId)
      .single()

    if (fetchError || !notebook || notebook.user_id !== userId) {
      throw new Error('Not authorized to delete this notebook')
    }

    const { error } = await supabase.from('notebooks').delete().eq('id', notebookId)
    if (error) throw error
  } catch (error) {
    console.error('Error deleting notebook:', error)
    throw error
  }
}
