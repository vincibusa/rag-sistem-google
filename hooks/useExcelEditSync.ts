'use client'

import { useCallback } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useChatStore } from '@/store/chat-store'

export function useExcelEditSync() {
  const { user, accessToken } = useAuth()
  const { documentPreview, invalidateMergedContent } = useChatStore()

  const syncCellEdit = useCallback(
    async (sheetName: string, cellRef: string, value: string) => {
      if (!user || !accessToken || !documentPreview.currentDocument) {
        console.log('🔍 useExcelEditSync - Missing requirements for sync', {
          hasUser: !!user,
          hasAccessToken: !!accessToken,
          hasCurrentDocument: !!documentPreview.currentDocument
        })
        return false
      }

      try {
        const cellId = `${sheetName}:${cellRef}`

        const response = await fetch('/api/document-preview', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: user.id,
            accessToken,
            documentSessionId: documentPreview.currentDocument.id,
            fieldId: cellId,  // Use cell ID for Excel
            content: value,
            action: 'update'
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          console.error('🔍 useExcelEditSync - Failed to sync cell edit:', errorData)
          return false
        }

        const result = await response.json()
        console.log('🔍 useExcelEditSync - Cell edit synced successfully:', {
          sheetName,
          cellRef,
          value,
          result
        })

        // Invalidate merged content cache after successful sync
        invalidateMergedContent()
        console.log('✅ Merged content cache invalidated')

        return true
      } catch (error) {
        console.error('🔍 useExcelEditSync - Error syncing cell edit:', error)
        return false
      }
    },
    [user, accessToken, documentPreview.currentDocument, invalidateMergedContent]
  )

  const syncAllCellEdits = useCallback(async () => {
    if (!user || !accessToken || !documentPreview.currentDocument) {
      console.log('🔍 useExcelEditSync - Missing requirements for bulk sync')
      return false
    }

    try {
      const cellEdits = Object.fromEntries(documentPreview.excelCellEdits)

      // Send all cell edits in a single request
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
          content: JSON.stringify(cellEdits),
          action: 'bulk_update'
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('🔍 useExcelEditSync - Failed to bulk sync cell edits:', errorData)
        return false
      }

      const result = await response.json()
      console.log('🔍 useExcelEditSync - All cell edits synced successfully:', {
        totalEdits: documentPreview.excelCellEdits.size,
        result
      })

      // Invalidate merged content cache after successful bulk sync
      invalidateMergedContent()
      console.log('✅ Merged content cache invalidated after bulk sync')

      return true
    } catch (error) {
      console.error('🔍 useExcelEditSync - Error bulk syncing cell edits:', error)
      return false
    }
  }, [user, accessToken, documentPreview.currentDocument, documentPreview.excelCellEdits, invalidateMergedContent])

  return {
    syncCellEdit,
    syncAllCellEdits
  }
}
