'use client'

import { useCallback } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useChatStore } from '@/store/chat-store'

export function useUserEditSync() {
  const { user, accessToken } = useAuth()
  const { documentPreview } = useChatStore()

  const syncUserEdit = useCallback(async (
    fieldId: string,
    content: string,
    action: 'update' | 'delete' | 'clear' = 'update'
  ) => {
    if (!user || !accessToken || !documentPreview.currentDocument) {
      console.log('🔍 useUserEditSync - Missing requirements for sync', {
        hasUser: !!user,
        hasAccessToken: !!accessToken,
        hasCurrentDocument: !!documentPreview.currentDocument
      })
      return false
    }

    try {
      const response = await fetch('/api/document-preview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          accessToken,
          documentSessionId: documentPreview.currentDocument.id,
          fieldId,
          content,
          action
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('🔍 useUserEditSync - Failed to sync user edit:', errorData)
        return false
      }

      const result = await response.json()
      console.log('🔍 useUserEditSync - User edit synced successfully:', {
        fieldId,
        action,
        result
      })

      return true
    } catch (error) {
      console.error('🔍 useUserEditSync - Error syncing user edit:', error)
      return false
    }
  }, [user, accessToken, documentPreview.currentDocument])

  const syncAllUserEdits = useCallback(async () => {
    if (!user || !accessToken || !documentPreview.currentDocument) {
      console.log('🔍 useUserEditSync - Missing requirements for bulk sync')
      return false
    }

    try {
      const userEdits = Object.fromEntries(documentPreview.userEdits)

      // Send all user edits in a single request
      const response = await fetch('/api/document-preview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          accessToken,
          documentSessionId: documentPreview.currentDocument.id,
          fieldId: 'bulk',
          content: JSON.stringify(userEdits),
          action: 'bulk_update'
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('🔍 useUserEditSync - Failed to bulk sync user edits:', errorData)
        return false
      }

      const result = await response.json()
      console.log('🔍 useUserEditSync - All user edits synced successfully:', {
        totalEdits: documentPreview.userEdits.size,
        result
      })

      return true
    } catch (error) {
      console.error('🔍 useUserEditSync - Error bulk syncing user edits:', error)
      return false
    }
  }, [user, accessToken, documentPreview.currentDocument, documentPreview.userEdits])

  return {
    syncUserEdit,
    syncAllUserEdits
  }
}