'use client'

import React, { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { Message } from '@/lib/types'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { User, Bot, FileText } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { MessageActions } from './MessageActions'
import { EditMessageDialog } from './EditMessageDialog'
import { FileAttachment } from './FileAttachment'
import { CitationDisplay } from './CitationDisplay'
import { useChatStore } from '@/store/chat-store'

interface ChatMessageProps {
  message: Message
  citations?: Array<{ title: string; uri?: string }>
  fileAttachments?: Array<{
    uri: string
    name: string
    mimeType: string
    sizeBytes?: number
  }>
}

export function ChatMessage({ message, citations, fileAttachments }: ChatMessageProps) {
  const isUser = message.role === 'user'
  const [showEditDialog, setShowEditDialog] = useState(false)
  const { updateMessage, deleteMessage } = useChatStore()

  const handleEdit = (messageId: string, newContent: string) => {
    updateMessage(messageId, newContent)
  }

  const handleDelete = (messageId: string) => {
    deleteMessage(messageId)
  }

  return (
    <div className={cn('group flex w-full gap-4', isUser ? 'flex-row-reverse' : 'flex-row')}>
      <Avatar className={cn("h-8 w-8 border", isUser ? "bg-primary/10" : "bg-muted")}>
        <AvatarFallback className={isUser ? "text-primary" : "text-muted-foreground"}>
          {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
        </AvatarFallback>
      </Avatar>

      <div className={cn('flex flex-col max-w-[80%]', isUser ? 'items-end' : 'items-start')}>
        <div className="flex items-start gap-2">
          {!isUser && (
            <div className="pt-3">
              <MessageActions
                messageId={message.id}
                messageContent={message.content}
                onDelete={handleDelete}
                isUserMessage={isUser}
              />
            </div>
          )}
          <div className="relative group/message">
            <div
              className={cn(
                'rounded-2xl px-5 py-3.5 shadow-sm',
                isUser
                  ? 'bg-primary text-primary-foreground rounded-tr-sm'
                  : 'bg-card border text-card-foreground rounded-tl-sm'
              )}
            >
              <ReactMarkdown
                className={cn(
                  'prose prose-sm break-words max-w-none',
                  isUser ? 'prose-invert' : 'prose-slate dark:prose-invert'
                )}
                components={{
                  p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
                  ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
                  ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
                  li: ({ children }) => <li className="">{children}</li>,
                  code: ({ node, inline, className, children, ...props }: any) => {
                    const match = /language-(\w+)/.exec(className || '')
                    const language = match ? match[1] : ''

                    if (inline) {
                      return (
                        <code className={cn(
                          "px-1.5 py-0.5 rounded font-mono text-sm",
                          isUser ? "bg-white/20" : "bg-muted"
                        )} {...props}>
                          {children}
                        </code>
                      )
                    }

                    return (
                      <div className="relative my-3">
                        {language && (
                          <div className="absolute top-0 right-0 px-2 py-1 text-xs bg-gray-800 text-gray-300 rounded-bl rounded-tr">
                            {language}
                          </div>
                        )}
                        <SyntaxHighlighter
                          style={oneDark}
                          language={language || 'text'}
                          PreTag="div"
                          className="rounded-lg !bg-gray-900 !m-0"
                          customStyle={{
                            margin: 0,
                            padding: '1rem',
                            fontSize: '0.875rem',
                            lineHeight: '1.25rem',
                          }}
                          codeTagProps={{
                            style: {
                              fontSize: '0.875rem',
                              lineHeight: '1.25rem',
                            }
                          }}
                          {...props}
                        >
                          {String(children).replace(/\n$/, '')}
                        </SyntaxHighlighter>
                      </div>
                    )
                  },
                  pre: ({ children }) => (
                    <div className="my-3">
                      {children}
                    </div>
                  ),
                  a: ({ href, children }) => (
                    <a href={href} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 opacity-90 hover:opacity-100">
                      {children}
                    </a>
                  ),
                  table: ({ children }) => (
                    <div className="overflow-x-auto my-3">
                      <table className="min-w-full border-collapse border border-gray-300 dark:border-gray-600">
                        {children}
                      </table>
                    </div>
                  ),
                  th: ({ children }) => (
                    <th className="border border-gray-300 dark:border-gray-600 px-3 py-2 bg-gray-100 dark:bg-gray-700 font-semibold">
                      {children}
                    </th>
                  ),
                  td: ({ children }) => (
                    <td className="border border-gray-300 dark:border-gray-600 px-3 py-2">
                      {children}
                    </td>
                  ),
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-4 border-primary pl-4 my-3 italic text-muted-foreground">
                      {children}
                    </blockquote>
                  ),
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>

            {/* User message actions */}
            {isUser && (
              <div className="absolute -right-2 top-2 opacity-0 group-hover/message:opacity-100 transition-opacity duration-200">
                <MessageActions
                  messageId={message.id}
                  messageContent={message.content}
                  onEdit={() => setShowEditDialog(true)}
                  onDelete={handleDelete}
                  isUserMessage={isUser}
                />
              </div>
            )}
          </div>

        {/* Display file attachments */}
        {fileAttachments && fileAttachments.length > 0 && (
          <div className="mt-3 flex flex-col gap-2 w-full">
            <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <FileText className="h-3 w-3" />
              Attachments
            </p>
            <div className="flex flex-col gap-2">
              {fileAttachments.map((attachment, idx) => (
                <FileAttachment
                  key={idx}
                  uri={attachment.uri}
                  name={attachment.name}
                  mimeType={attachment.mimeType}
                  sizeBytes={attachment.sizeBytes}
                  onDownload={(uri, name) => {
                    // Download functionality
                    const link = document.createElement('a')
                    link.href = uri
                    link.download = name
                    link.click()
                  }}
                  className="max-w-md"
                />
              ))}
            </div>
          </div>
        )}

        {/* Display citations from File Search RAG */}
        {!isUser && citations && citations.length > 0 && (
          <CitationDisplay citations={citations} />
        )}
        </div>
      </div>

      {/* Edit Message Dialog */}
      <EditMessageDialog
        isOpen={showEditDialog}
        onClose={() => setShowEditDialog(false)}
        messageContent={message.content}
        onSave={(newContent) => handleEdit(message.id, newContent)}
      />
    </div>
  )
}
