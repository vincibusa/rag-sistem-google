'use client'

import { create } from 'zustand'
import { File, UploadProgress } from '@/lib/types'

interface FilesStore {
  files: File[]
  uploadProgress: Map<string, UploadProgress>
  loading: boolean
  error: string | null

  setFiles: (files: File[]) => void
  addFile: (file: File) => void
  removeFile: (id: string) => void
  updateUploadProgress: (fileId: string, progress: UploadProgress) => void
  removeUploadProgress: (fileId: string) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  clearError: () => void
}

export const useFilesStore = create<FilesStore>((set) => ({
  files: [],
  uploadProgress: new Map(),
  loading: false,
  error: null,

  setFiles: (files) => set({ files }),
  addFile: (file) =>
    set((state) => ({
      files: [file, ...state.files],
    })),
  removeFile: (id) =>
    set((state) => ({
      files: state.files.filter((f) => f.id !== id),
    })),
  updateUploadProgress: (fileId, progress) =>
    set((state) => {
      const newProgress = new Map(state.uploadProgress)
      newProgress.set(fileId, progress)
      return { uploadProgress: newProgress }
    }),
  removeUploadProgress: (fileId) =>
    set((state) => {
      const newProgress = new Map(state.uploadProgress)
      newProgress.delete(fileId)
      return { uploadProgress: newProgress }
    }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  clearError: () => set({ error: null }),
}))
