'use client'

import { create } from 'zustand'
import { Notebook } from '@/lib/types'

interface NotebookStore {
  currentNotebookId: string | null
  notebooks: Notebook[]
  loading: boolean
  error: string | null

  setCurrentNotebook: (id: string | null) => void
  setNotebooks: (notebooks: Notebook[]) => void
  addNotebook: (notebook: Notebook) => void
  removeNotebook: (id: string) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
}

export const useNotebookStore = create<NotebookStore>((set) => ({
  currentNotebookId: null,
  notebooks: [],
  loading: false,
  error: null,

  setCurrentNotebook: (id) => set({ currentNotebookId: id }),
  setNotebooks: (notebooks) => set({ notebooks }),
  addNotebook: (notebook) =>
    set((state) => ({
      notebooks: [notebook, ...state.notebooks],
    })),
  removeNotebook: (id) =>
    set((state) => ({
      notebooks: state.notebooks.filter((n) => n.id !== id),
      currentNotebookId: state.currentNotebookId === id ? null : state.currentNotebookId,
    })),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
}))
