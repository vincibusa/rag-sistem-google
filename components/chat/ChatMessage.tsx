'use client'

import ReactMarkdown from 'react-markdown'
import { Message } from '@/lib/types'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { User, Bot, FileText } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

interface ChatMessageProps {
  message: Message
  citations?: Array<{ title: string; uri?: string }>
}

export function ChatMessage({ message, citations }: ChatMessageProps) {
  const isUser = message.role === 'user'

  return (
    <div className={cn('flex w-full gap-4', isUser ? 'flex-row-reverse' : 'flex-row')}>
      <Avatar className={cn("h-8 w-8 border", isUser ? "bg-primary/10" : "bg-muted")}>
        <AvatarFallback className={isUser ? "text-primary" : "text-muted-foreground"}>
          {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
        </AvatarFallback>
      </Avatar>

      <div className={cn('flex flex-col max-w-[80%]', isUser ? 'items-end' : 'items-start')}>
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
              code: ({ children }) => (
                <code className={cn(
                  "px-1.5 py-0.5 rounded font-mono text-sm",
                  isUser ? "bg-white/20" : "bg-muted"
                )}>
                  {children}
                </code>
              ),
              pre: ({ children }) => (
                <pre className={cn(
                  "rounded-lg p-3 overflow-x-auto mb-3 mt-2",
                  isUser ? "bg-black/20" : "bg-muted"
                )}>
                  {children}
                </pre>
              ),
              a: ({ href, children }) => (
                <a href={href} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 opacity-90 hover:opacity-100">
                  {children}
                </a>
              )
            }}
          >
            {message.content}
          </ReactMarkdown>
        </div>

        {/* Display citations from File Search RAG */}
        {!isUser && citations && citations.length > 0 && (
          <div className="mt-3 flex flex-col gap-2 w-full">
            <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <FileText className="h-3 w-3" />
              Sources
            </p>
            <div className="flex flex-wrap gap-2">
              {citations.map((citation, idx) => (
                <Badge
                  key={idx}
                  variant="secondary"
                  className="text-xs cursor-pointer hover:bg-secondary/80 px-2 py-1 h-auto font-normal border-transparent hover:border-border transition-colors"
                  onClick={() => citation.uri && window.open(citation.uri)}
                >
                  {citation.title}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
