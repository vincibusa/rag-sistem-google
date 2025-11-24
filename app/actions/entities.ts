'use server'

import { createServerSupabaseClient } from '@/lib/supabase-server'
import type { Tables } from '@/lib/database.types'
import type { EntityType } from '@/lib/entity-extraction'

type DocumentEntity = Tables<'document_entities'>

/**
 * Get all entities for a notebook
 */
export async function getEntitiesAction(
  userId: string,
  accessToken: string,
  notebookId: string
): Promise<DocumentEntity[]> {
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

    // Get all entities for this notebook
    const { data: entities, error } = await supabase
      .from('document_entities')
      .select('*')
      .eq('notebook_id', notebookId)
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to fetch entities: ${error.message}`)
    }

    return entities as DocumentEntity[]
  } catch (error) {
    console.error('Error getting entities:', error)
    throw error
  }
}

/**
 * Create a new entity
 */
export async function createEntityAction(
  userId: string,
  accessToken: string,
  notebookId: string,
  entityType: EntityType,
  entityName: string,
  attributes: Record<string, any>,
  sourceFileId?: string
): Promise<DocumentEntity> {
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

    // Create entity
    const { data: entity, error } = await supabase
      .from('document_entities')
      .insert([
        {
          user_id: userId,
          notebook_id: notebookId,
          entity_type: entityType,
          entity_name: entityName,
          attributes: attributes,
          source_file_id: sourceFileId || null,
        } as never,
      ])
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create entity: ${error.message}`)
    }

    return entity as DocumentEntity
  } catch (error) {
    console.error('Error creating entity:', error)
    throw error
  }
}

/**
 * Update an existing entity
 */
export async function updateEntityAction(
  userId: string,
  accessToken: string,
  entityId: string,
  updates: {
    entity_name?: string
    attributes?: Record<string, any>
  }
): Promise<DocumentEntity> {
  try {
    const supabase = createServerSupabaseClient(accessToken)

    // Verify entity ownership
    const { data: entity } = await supabase
      .from('document_entities')
      .select('user_id')
      .eq('id', entityId)
      .single()

    if (!entity || entity.user_id !== userId) {
      throw new Error('Not authorized to update this entity')
    }

    // Update entity
    const { data: updatedEntity, error } = await supabase
      .from('document_entities')
      .update(updates)
      .eq('id', entityId)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to update entity: ${error.message}`)
    }

    return updatedEntity as DocumentEntity
  } catch (error) {
    console.error('Error updating entity:', error)
    throw error
  }
}

/**
 * Delete an entity
 */
export async function deleteEntityAction(
  userId: string,
  accessToken: string,
  entityId: string
): Promise<void> {
  try {
    const supabase = createServerSupabaseClient(accessToken)

    // Verify entity ownership
    const { data: entity } = await supabase
      .from('document_entities')
      .select('user_id')
      .eq('id', entityId)
      .single()

    if (!entity || entity.user_id !== userId) {
      throw new Error('Not authorized to delete this entity')
    }

    // Delete entity
    const { error } = await supabase
      .from('document_entities')
      .delete()
      .eq('id', entityId)

    if (error) {
      throw new Error(`Failed to delete entity: ${error.message}`)
    }
  } catch (error) {
    console.error('Error deleting entity:', error)
    throw error
  }
}

/**
 * Bulk create entities (used after file upload and extraction)
 */
export async function bulkCreateEntitiesAction(
  userId: string,
  accessToken: string,
  notebookId: string,
  entities: Array<{
    entity_type: EntityType
    entity_name: string
    attributes: Record<string, any>
    source_file_id?: string
  }>
): Promise<DocumentEntity[]> {
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

    // Prepare entities for insertion
    const entitiesToInsert = entities.map(entity => ({
      user_id: userId,
      notebook_id: notebookId,
      entity_type: entity.entity_type,
      entity_name: entity.entity_name,
      attributes: entity.attributes,
      source_file_id: entity.source_file_id || null,
    }))

    // Bulk insert
    const { data: insertedEntities, error } = await supabase
      .from('document_entities')
      .insert(entitiesToInsert as never[])
      .select()

    if (error) {
      throw new Error(`Failed to bulk create entities: ${error.message}`)
    }

    return insertedEntities as DocumentEntity[]
  } catch (error) {
    console.error('Error bulk creating entities:', error)
    throw error
  }
}
