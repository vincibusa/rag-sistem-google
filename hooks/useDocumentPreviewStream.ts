'use client'

import { useEffect, useRef } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useChatStore } from '@/store/chat-store'

export function useDocumentPreviewStream() {
  const { user, accessToken } = useAuth()
  const { documentPreview, updatePreviewDocument } = useChatStore()
  const eventSourceRef = useRef<EventSource | null>(null)

  useEffect(() => {
    if (!documentPreview.isVisible || !documentPreview.currentDocument || !user || !accessToken) {
      console.log('🔍 useDocumentPreviewStream - Not connecting: missing requirements', {
        isVisible: documentPreview.isVisible,
        hasCurrentDocument: !!documentPreview.currentDocument,
        hasUser: !!user,
        hasAccessToken: !!accessToken
      })

      // Close existing connection if any
      if (eventSourceRef.current) {
        console.log('🔍 useDocumentPreviewStream - Closing existing connection due to missing requirements')
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }
      return
    }

    const documentSessionId = documentPreview.currentDocument.id
    console.log('🔍 useDocumentPreviewStream - Setting up real-time connection for session:', documentSessionId)

    // Create EventSource with query parameters
    const queryParams = new URLSearchParams({
      userId: user.id,
      accessToken: accessToken,
      documentSessionId: documentSessionId
    })
    const eventSource = new EventSource(`/api/document-preview?${queryParams}`)
    eventSourceRef.current = eventSource

    eventSource.onopen = () => {
      console.log('🔍 useDocumentPreviewStream - EventSource connection opened')
    }

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        console.log('🔍 useDocumentPreviewStream - Received real-time update:', data)

        // Handle different types of updates
        switch (data.type) {
          case 'compilation_update':
            console.log('🔍 useDocumentPreviewStream - Updating compiled content:', {
              hasContent: !!data.content,
              contentLength: data.content?.length
            })
            updatePreviewDocument({
              current_compiled_content: data.content
            })
            break

          case 'field_status_update':
            console.log('🔍 useDocumentPreviewStream - Updating field completion status:', data.status)
            updatePreviewDocument({
              field_completion_status: data.status
            })
            break

          case 'user_edit_update':
            console.log('🔍 useDocumentPreviewStream - Updating user edits:', data.edits)
            updatePreviewDocument({
              user_edits: data.edits
            })
            break

          case 'comment_update':
            console.log('🔍 useDocumentPreviewStream - Updating comments:', data.comments)
            updatePreviewDocument({
              comments: data.comments
            })
            break

          case 'session_completed':
            console.log('🔍 useDocumentPreviewStream - Session completed:', data.status)
            eventSource.close()
            eventSourceRef.current = null
            break

          default:
            console.log('🔍 useDocumentPreviewStream - Unknown update type:', data.type)
        }
      } catch (error) {
        console.error('🔍 useDocumentPreviewStream - Error parsing real-time update:', error)
      }
    }

    eventSource.onerror = (error) => {
      console.error('🔍 useDocumentPreviewStream - EventSource error:', error)

      // Try to reconnect after a delay
      setTimeout(() => {
        if (eventSourceRef.current === eventSource) {
          console.log('🔍 useDocumentPreviewStream - Attempting to reconnect...')
          eventSource.close()
          eventSourceRef.current = null
          // The useEffect will trigger again and create a new connection
        }
      }, 3000)
    }

    // Cleanup on unmount
    return () => {
      console.log('🔍 useDocumentPreviewStream - Cleaning up EventSource connection')
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }
    }
  }, [
    documentPreview.isVisible,
    documentPreview.currentDocument?.id,
    user?.id,
    accessToken,
    updatePreviewDocument
  ])

  return null
}