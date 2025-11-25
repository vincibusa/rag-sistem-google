'use client'

import React, { useEffect, useRef } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ChatMessage } from './ChatMessage'
import { ChatInput } from './ChatInput'
import { DocumentPreview } from '@/components/document-preview/DocumentPreview'
import { Message } from '@/lib/types'
import { AnimatePresence, motion } from 'framer-motion'
import { Sparkles, FileText, Upload, Download, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { Tables } from '@/lib/database.types'
import { useFilesStore } from '@/store/files-store'
import { useChatStore } from '@/store/chat-store'

type DocumentSession = Tables<'document_sessions'>

interface ChatContainerProps {
  messages: Message[]
  onSendMessage: (message: string) => void
  isLoading?: boolean
  isEmpty?: boolean
  documentSession?: DocumentSession | null
  onUploadDocument?: () => void
  onDownloadDocument?: () => void
  onClearDocument?: () => void
}

export function ChatContainer({
  messages,
  onSendMessage,
  isLoading = false,
  isEmpty = true,
  documentSession,
  onUploadDocument,
  onDownloadDocument,
  onClearDocument,
}: ChatContainerProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const { files } = useFilesStore()
  const { documentPreview, setDocumentPreviewVisible, setPreviewDocument } = useChatStore()

  // Function to get file attachments from file URIs
  const getFileAttachments = (fileUris: string[]) => {
    return fileUris.map(uri => {
      // Find the file in the files store that matches the URI
      const file = files.find(f => f.gemini_uri === uri)
      if (file) {
        return {
          uri: file.gemini_uri,
          name: file.name,
          mimeType: file.mime_type,
          sizeBytes: file.size_bytes
        }
      }
      // If file not found in store, create a basic attachment object
      return {
        uri,
        name: uri.split('/').pop() || 'Unknown file',
        mimeType: 'application/octet-stream',
        sizeBytes: 0
      }
    })
  }

  // Sync document session with preview state
  useEffect(() => {
    console.log('🔍 ChatContainer - documentSession sync:', {
      documentSession,
      hasDocumentSession: !!documentSession,
      documentSessionId: documentSession?.id,
      fileName: documentSession?.original_file_name
    })

    if (documentSession) {
      console.log('🔍 ChatContainer - Setting preview document and making visible')
      setPreviewDocument(documentSession)
      setDocumentPreviewVisible(true)
    } else {
      console.log('🔍 ChatContainer - No document session, hiding preview')
      setDocumentPreviewVisible(false)
      setPreviewDocument(null)
    }
  }, [documentSession, setPreviewDocument, setDocumentPreviewVisible])

  // Auto-scroll to bottom when new messages appear
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isLoading])

  return (
    <div className="flex h-full">
      {/* Chat Panel */}
      <div
        className="flex flex-col h-full relative bg-background/50 backdrop-blur-sm transition-all duration-300"
        style={{
          width: documentPreview.isVisible && !documentPreview.isCollapsed
            ? `${(1 - documentPreview.splitRatio) * 100}%`
            : '100%'
        }}
      >
        {/* Document Session Bar */}
        {documentSession && (
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            className="border-b bg-background/80 backdrop-blur-sm p-3 flex items-center gap-3"
          >
            <FileText className="h-5 w-5 text-primary" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm truncate">{documentSession.original_file_name}</span>
                <Badge variant="secondary" className="text-xs">Compiling</Badge>
              </div>
              <p className="text-xs text-muted-foreground">Ask me to help you fill this document</p>
            </div>
            <div className="flex items-center gap-2">
              {documentSession.compiled_content && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onDownloadDocument}
                  className="gap-2"
                >
                  <Download className="h-4 w-4" />
                  Download
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={onClearDocument}
                className="gap-2"
              >
                <X className="h-4 w-4" />
                Close
              </Button>
            </div>
          </motion.div>
        )}

        {/* Upload Document Button (shown when no document session) */}
        {!documentSession && onUploadDocument && (
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="border-b bg-background/80 backdrop-blur-sm p-3 flex items-center justify-center"
          >
            <Button
              variant="outline"
              onClick={onUploadDocument}
              className="gap-2"
            >
              <Upload className="h-4 w-4" />
              Upload Document to Compile
            </Button>
          </motion.div>
        )}

        <div className="flex-1 overflow-y-auto relative">
          <ScrollArea className="h-full w-full pr-4" ref={scrollAreaRef}>
            {isEmpty ? (
              <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center p-8 text-muted-foreground/80">
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5 }}
                  className="bg-primary/10 p-6 rounded-full mb-6"
                >
                  <Sparkles className="w-12 h-12 text-primary" />
                </motion.div>
                <motion.h3
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-2xl font-bold text-foreground mb-2"
                >
                  Start a Conversation
                </motion.h3>
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="max-w-md text-base"
                >
                  Upload your documents and ask questions to get instant, AI-powered answers grounded in your data.
                </motion.p>
              </div>
            ) : (
              <div className="flex flex-col gap-6 p-4 pb-32">
                <AnimatePresence initial={false}>
                  {messages.map((message) => (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <ChatMessage
                        message={message}
                        fileAttachments={message.fileUris && message.fileUris.length > 0 ? getFileAttachments(message.fileUris) : undefined}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
                {isLoading && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 text-muted-foreground text-sm pl-4"
                  >
                    <div className="flex gap-1">
                      <span className="animate-bounce delay-0">●</span>
                      <span className="animate-bounce delay-150">●</span>
                      <span className="animate-bounce delay-300">●</span>
                    </div>
                    Thinking...
                  </motion.div>
                )}
                <div ref={scrollRef} className="h-4" />
              </div>
            )}
          </ScrollArea>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background via-background to-transparent pt-10 z-10">
          <div className="max-w-3xl mx-auto w-full">
            <ChatInput onSendMessage={onSendMessage} isLoading={isLoading} />
          </div>
        </div>
      </div>

      {/* Document Preview Panel */}
      <DocumentPreview />
    </div>
  )
}
