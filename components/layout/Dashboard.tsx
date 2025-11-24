'use client'

import { useEffect, useState, useRef } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useNotebookStore } from '@/store/notebook-store'
import { useFilesStore } from '@/store/files-store'
import { useChatStore } from '@/store/chat-store'
import { useEntitiesStore } from '@/store/entities-store'
import {
  getNotebooksAction,
  createNotebookAction,
  deleteNotebookAction,
} from '@/app/actions/notebooks'
import { getFilesAction, uploadFileAction, deleteFileAction } from '@/app/actions/files'
import { sendMessageAction, getMessagesAction } from '@/app/actions/chat'
import { getEntitiesAction } from '@/app/actions/entities'
import {
  uploadDocumentForCompilation,
  downloadCompiledDocument,
  clearDocumentSession,
  getActiveDocumentSession,
  updateCompiledDocument,
} from '@/app/actions/document-compilation'
import { getFileSearchStoreNames } from '@/lib/supabase'
import { containsPlaceholders, countPlaceholders } from '@/lib/document-validation'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { FileUploadZone } from '../upload/FileUploadZone'
import { FileList } from '../upload/FileList'
import { ChatContainer } from '../chat/ChatContainer'
import { EntitiesList } from '../entities/EntitiesList'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'

export function Dashboard() {
  const { user, accessToken } = useAuth()
  const {
    currentNotebookId,
    notebooks,
    loading: notebooksLoading,
    setCurrentNotebook,
    setNotebooks,
    addNotebook,
    removeNotebook,
    setLoading: setNotebooksLoading,
  } = useNotebookStore()

  const {
    files,
    uploadProgress,
    setFiles,
    addFile,
    removeFile,
    updateUploadProgress,
    removeUploadProgress,
    setLoading: setFilesLoading,
  } = useFilesStore()

  const {
    messages,
    setMessages,
    addMessage,
    updateLastMessage,
    setLoading: setChatLoading,
    isLoading: chatLoading,
    setStreaming,
    isStreaming,
    documentSession,
    setDocumentSession,
    updateDocumentSessionContent,
    clearDocumentSession: clearDocumentSessionStore,
  } = useChatStore()

  const {
    entities,
    setEntities,
    setLoading: setEntitiesLoading,
  } = useEntitiesStore()

  const [isDeletingNotebook, setIsDeletingNotebook] = useState<string | null>(null)
  const [isDeletingFile, setIsDeletingFile] = useState<string | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const autoContinuationCountRef = useRef<number>(0)
  const autoContinuationTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Load notebooks on mount or when user/accessToken changes
  useEffect(() => {
    if (user && accessToken) {
      loadNotebooks()
    }
  }, [user, accessToken])

  // Load files, messages, entities, and document session when notebook changes
  useEffect(() => {
    if (currentNotebookId) {
      loadFiles()
      loadMessages()
      loadEntities()
      loadDocumentSession()
    } else {
      setFiles([])
      setMessages([])
      setEntities([])
      clearDocumentSessionStore()
    }
  }, [currentNotebookId])

  const loadNotebooks = async () => {
    if (!accessToken || !user) return
    try {
      setNotebooksLoading(true)
      const data = await getNotebooksAction(user.id, accessToken)
      setNotebooks(data)
      if (data.length > 0 && !currentNotebookId) {
        setCurrentNotebook(data[0].id)
      }
    } catch (error) {
      console.error('Error loading notebooks:', error)
      toast.error('Failed to load notebooks')
    } finally {
      setNotebooksLoading(false)
    }
  }

  const loadFiles = async () => {
    if (!currentNotebookId || !user || !accessToken) return
    try {
      console.log('🔄 Loading files for notebook:', currentNotebookId)
      setFilesLoading(true)
      const data = await getFilesAction(user.id, accessToken, currentNotebookId)
      console.log('📁 Files loaded from database:', data)
      setFiles(data)
    } catch (error) {
      console.error('Error loading files:', error)
      toast.error('Failed to load files')
    } finally {
      setFilesLoading(false)
    }
  }

  const loadMessages = async () => {
    if (!currentNotebookId || !user || !accessToken) return
    try {
      const data = await getMessagesAction(user.id, accessToken, currentNotebookId)
      setMessages(data)
    } catch (error) {
      console.error('Error loading messages:', error)
      toast.error('Failed to load messages')
    }
  }

  const loadEntities = async () => {
    if (!currentNotebookId || !user || !accessToken) return
    try {
      setEntitiesLoading(true)
      const data = await getEntitiesAction(user.id, accessToken, currentNotebookId)
      setEntities(data)
    } catch (error) {
      console.error('Error loading entities:', error)
      toast.error('Failed to load entities')
    } finally {
      setEntitiesLoading(false)
    }
  }

  const loadDocumentSession = async () => {
    if (!currentNotebookId || !user || !accessToken) return
    try {
      const session = await getActiveDocumentSession(user.id, accessToken, currentNotebookId)
      setDocumentSession(session)
    } catch (error) {
      console.error('Error loading document session:', error)
      // Don't show error toast for this - it's ok if there's no active session
    }
  }

  const handleCreateNotebook = async (name: string, description?: string) => {
    if (!user || !accessToken) return
    try {
      const notebook = await createNotebookAction(user.id, accessToken, name, description)
      addNotebook(notebook)
      setCurrentNotebook(notebook.id)
      toast.success('Notebook created')
    } catch (error) {
      console.error('Error creating notebook:', error)
      toast.error('Failed to create notebook')
    }
  }

  const handleDeleteNotebook = async (id: string) => {
    if (!user || !accessToken) return
    try {
      setIsDeletingNotebook(id)
      await deleteNotebookAction(user.id, accessToken, id)
      removeNotebook(id)
      toast.success('Notebook deleted')
    } catch (error) {
      console.error('Error deleting notebook:', error)
      toast.error('Failed to delete notebook')
    } finally {
      setIsDeletingNotebook(null)
    }
  }

  const handleFilesSelected = async (selectedFiles: File[]) => {
    if (!currentNotebookId || !user || !accessToken) {
      toast.error('Please select a notebook first')
      return
    }

    for (const file of selectedFiles) {
      const fileId = `${file.name}-${Date.now()}`
      try {
        updateUploadProgress(fileId, {
          fileId,
          fileName: file.name,
          progress: 0,
          status: 'uploading',
        })

        const formData = new FormData()
        formData.append('file', file)

        const uploadedFile = await uploadFileAction(user.id, accessToken, currentNotebookId, formData)
        addFile(uploadedFile)
        removeUploadProgress(fileId)
        toast.success(`${file.name} uploaded`)
      } catch (error) {
        console.error('Error uploading file:', error)
        removeUploadProgress(fileId)
        toast.error(`Failed to upload ${file.name}`)
      }
    }
  }

  const handleDeleteFile = async (fileId: string) => {
    if (!user || !accessToken) return
    try {
      setIsDeletingFile(fileId)
      await deleteFileAction(user.id, accessToken, fileId)
      removeFile(fileId)
      toast.success('File deleted')
    } catch (error) {
      console.error('Error deleting file:', error)
      toast.error('Failed to delete file')
    } finally {
      setIsDeletingFile(null)
    }
  }

  const handleUploadDocument = async () => {
    if (!currentNotebookId || !user || !accessToken) {
      toast.error('Please select a notebook first')
      return
    }

    // Create file input to trigger file picker
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      try {
        toast.loading('Uploading document...', { id: 'upload-doc' })
        const formData = new FormData()
        formData.append('file', file)

        const session = await uploadDocumentForCompilation(user.id, accessToken, currentNotebookId, formData)
        setDocumentSession(session)
        toast.success('Document loaded! Start asking me to fill it out.', { id: 'upload-doc' })
      } catch (error) {
        console.error('Error uploading document:', error)
        toast.error('Failed to upload document', { id: 'upload-doc' })
      }
    }
    input.click()
  }

  const handleDownloadDocument = async () => {
    if (!documentSession || !user || !accessToken) return

    try {
      toast.loading('Generating document...', { id: 'download-doc' })
      const { fileName, fileData, mimeType } = await downloadCompiledDocument(
        user.id,
        accessToken,
        documentSession.id
      )

      // Create blob and trigger download
      const blob = new Blob([fileData], { type: mimeType })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      a.click()
      URL.revokeObjectURL(url)

      toast.success('Document downloaded!', { id: 'download-doc' })
    } catch (error) {
      console.error('Error downloading document:', error)
      toast.error('Failed to download document', { id: 'download-doc' })
    }
  }

  const handleClearDocument = async () => {
    if (!documentSession || !user || !accessToken) return

    try {
      await clearDocumentSession(user.id, accessToken, documentSession.id)
      clearDocumentSessionStore()
      toast.success('Document session closed')
    } catch (error) {
      console.error('Error clearing document session:', error)
      toast.error('Failed to clear document session')
    }
  }

  const handleSendMessage = async (message: string) => {
    console.log('🔵 handleSendMessage called', { message, isStreaming, hasAbortController: abortControllerRef.current !== null })

    if (!currentNotebookId || !user || !accessToken) return

    // SYNCHRONOUS guard check using ref to prevent race conditions
    // This prevents multiple calls before state updates propagate
    if (abortControllerRef.current !== null || isStreaming) {
      console.log('🔴 BLOCKED: Already streaming!')
      toast.error('Please wait for the current message to finish')
      return
    }

    // Create abort controller IMMEDIATELY (synchronous operation)
    abortControllerRef.current = new AbortController()
    console.log('🟢 Lock acquired, proceeding with request')

    // Set streaming state (async, but ref is already set)
    setStreaming(true)

    try {
      // Get file search store names for this notebook
      const fileUris = files.map((f) => f.gemini_uri)
      const fileSearchStoreNames = await getFileSearchStoreNames(currentNotebookId)

      // Save user message (with document session id if present)
      const userMessage = await sendMessageAction(
        user.id,
        accessToken,
        currentNotebookId,
        message,
        fileUris,
        documentSession?.id
      )
      addMessage(userMessage)

      // Stream assistant response
      let assistantContent = ''

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          accessToken,
          notebookId: currentNotebookId,
          messages: [
            ...messages.map((m) => ({
              role: m.role,
              content: m.content,
            })),
            { role: 'user', content: message },
          ],
          fileSearchStoreNames,
          documentSessionId: documentSession?.id,
        }),
        signal: abortControllerRef.current.signal,
      })

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('API quota exceeded. Please try again in a moment.')
        }
        throw new Error(`Failed to get response: ${response.status}`)
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error('No response body')

      const decoder = new TextDecoder()
      const assistantMessage = {
        id: `msg-${Date.now()}`,
        role: 'assistant' as const,
        content: '',
        file_uris: fileUris,
        created_at: new Date().toISOString(),
        notebook_id: currentNotebookId,
      }

      addMessage(assistantMessage)

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        assistantContent += decoder.decode(value, { stream: true })
        // Use updateLastMessage instead of addMessage to avoid re-render spam
        updateLastMessage(assistantContent)
      }

      // Save compiled content to database if there's a document session
      if (documentSession && assistantContent) {
        try {
          await updateCompiledDocument(user.id, accessToken, documentSession.id, assistantContent)
          updateDocumentSessionContent(assistantContent) // Update store as well
          console.log('✅ Compiled content saved to database')
        } catch (error) {
          console.error('⚠️ Error saving compiled content:', error)
          // Don't throw - continue with auto-continuation even if save fails
        }
      }

      // Auto-continuation for document compilation
      // If there's an active document session and the response still has placeholders
      if (documentSession && containsPlaceholders(assistantContent)) {
        const placeholderCount = countPlaceholders(assistantContent)

        // Limit auto-continuation to 3 times to prevent infinite loops
        if (autoContinuationCountRef.current < 3) {
          autoContinuationCountRef.current += 1
          console.log(`🔄 Auto-continuation ${autoContinuationCountRef.current}/3: ${placeholderCount} placeholders remaining`)

          // Wait 2 seconds before auto-continuing (give user time to read)
          autoContinuationTimerRef.current = setTimeout(() => {
            console.log('🔄 Triggering auto-continuation...')
            handleSendMessage('Continua a compilare i campi rimanenti del documento. Non fermarti, compila TUTTO fino alla fine.')
          }, 2000)
        } else {
          // Max attempts reached
          console.log('⚠️ Max auto-continuation attempts reached')
          toast.info(`Documento compilato con ${placeholderCount} campi ancora vuoti. Puoi chiedere di continuare se necessario.`)
          autoContinuationCountRef.current = 0 // Reset for next document
        }
      } else {
        // Document complete or no document session
        autoContinuationCountRef.current = 0 // Reset counter
        if (documentSession && !containsPlaceholders(assistantContent)) {
          // Document fully compiled!
          toast.success('Documento completamente compilato! Puoi scaricarlo ora.')
        }
      }
    } catch (error) {
      console.error('🔴 Error sending message:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to send message'
      toast.error(errorMessage)
      autoContinuationCountRef.current = 0 // Reset on error
    } finally {
      console.log('🔓 Lock released, streaming finished')
      setStreaming(false)
      abortControllerRef.current = null
    }
  }

  const currentNotebook = notebooks.find((n) => n.id === currentNotebookId)

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div className="w-64 border-r flex-shrink-0">
        <Sidebar
          notebooks={notebooks}
          currentNotebookId={currentNotebookId}
          onSelectNotebook={setCurrentNotebook}
          onCreateNotebook={handleCreateNotebook}
          onDeleteNotebook={handleDeleteNotebook}
          isLoading={notebooksLoading}
          isDeletingId={isDeletingNotebook}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header currentNotebookName={currentNotebook?.name} />

        {currentNotebookId ? (
          <div className="flex-1 overflow-hidden p-6">
            <Tabs defaultValue="chat" className="h-full flex flex-col">
              <TabsList>
                <TabsTrigger value="chat">Chat</TabsTrigger>
                <TabsTrigger value="documents">Documents</TabsTrigger>
                <TabsTrigger value="entities">Data Registry</TabsTrigger>
              </TabsList>

              <TabsContent value="chat" className="flex-1 overflow-hidden">
                <ChatContainer
                  messages={messages}
                  onSendMessage={handleSendMessage}
                  isLoading={isStreaming}
                  isEmpty={messages.length === 0}
                  documentSession={documentSession}
                  onUploadDocument={handleUploadDocument}
                  onDownloadDocument={handleDownloadDocument}
                  onClearDocument={handleClearDocument}
                />
              </TabsContent>

              <TabsContent value="documents" className="flex-1 overflow-auto">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Upload Documents</h3>
                    <FileUploadZone onFilesSelected={handleFilesSelected} />
                  </div>

                  <Separator />

                  <div>
                    <h3 className="text-lg font-semibold mb-4">Uploaded Files</h3>
                    <FileList
                      files={files}
                      uploadProgress={uploadProgress}
                      onDeleteFile={handleDeleteFile}
                      isDeleting={isDeletingFile}
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="entities" className="flex-1 overflow-auto">
                <EntitiesList notebookId={currentNotebookId} />
              </TabsContent>
            </Tabs>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-center text-muted-foreground">
            <div>
              <p className="text-lg font-semibold mb-2">No notebook selected</p>
              <p className="text-sm">Create a new notebook to get started</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
