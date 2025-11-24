import { create } from 'zustand'
import type { Tables } from '@/lib/database.types'

type DocumentEntity = Tables<'document_entities'>

interface EntitiesStore {
  entities: DocumentEntity[]
  loading: boolean

  // Actions
  setEntities: (entities: DocumentEntity[]) => void
  addEntity: (entity: DocumentEntity) => void
  updateEntity: (id: string, updates: Partial<DocumentEntity>) => void
  removeEntity: (id: string) => void
  setLoading: (loading: boolean) => void

  // Filtering
  filterByType: (type: string | null) => DocumentEntity[]
  searchEntities: (searchTerm: string) => DocumentEntity[]
}

export const useEntitiesStore = create<EntitiesStore>((set, get) => ({
  entities: [],
  loading: false,

  setEntities: (entities) => set({ entities }),

  addEntity: (entity) =>
    set((state) => ({
      entities: [entity, ...state.entities],
    })),

  updateEntity: (id, updates) =>
    set((state) => ({
      entities: state.entities.map((entity) =>
        entity.id === id ? { ...entity, ...updates } : entity
      ),
    })),

  removeEntity: (id) =>
    set((state) => ({
      entities: state.entities.filter((entity) => entity.id !== id),
    })),

  setLoading: (loading) => set({ loading }),

  filterByType: (type) => {
    const { entities } = get()
    if (!type) return entities
    return entities.filter((entity) => entity.entity_type === type)
  },

  searchEntities: (searchTerm) => {
    const { entities } = get()
    if (!searchTerm) return entities

    const term = searchTerm.toLowerCase()
    return entities.filter((entity) => {
      // Search in entity name
      if (entity.entity_name.toLowerCase().includes(term)) return true

      // Search in attributes
      const attributes = entity.attributes as Record<string, any>
      return Object.values(attributes).some((value) => {
        if (typeof value === 'string') {
          return value.toLowerCase().includes(term)
        }
        return false
      })
    })
  },
}))
