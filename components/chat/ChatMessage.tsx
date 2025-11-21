'use client'

import ReactMarkdown from 'react-markdown'
import { Message } from '@/lib/types'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

interface ChatMessageProps {
  message: Message
  // TODO: Add citations field to messages table and pass grounding metadata here
  citations?: Array<{ title: string; uri?: string }>
}

export function ChatMessage({ message, citations }: ChatMessageProps) {
  const isUser = message.role === 'user'

  return (
    <div className={cn('flex w-full', isUser ? 'justify-end' : 'justify-start')}>
      <div className={cn('max-w-[80%]', isUser && 'items-end flex flex-col')}>
        <div
          className={cn(
            'rounded-lg px-4 py-3',
            isUser ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'
          )}
        >
          <ReactMarkdown
            className={cn(
              'prose prose-sm break-words',
              isUser ? 'prose-invert' : 'prose-slate',
              'max-w-none'
            )}
            components={{
              p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
              ul: ({ children }) => <ul className="list-disc list-inside mb-2">{children}</ul>,
              ol: ({ children }) => <ol className="list-decimal list-inside mb-2">{children}</ol>,
              li: ({ children }) => <li className="mb-1">{children}</li>,
              code: ({ children }) => (
                <code className="bg-black/20 rounded px-1.5 py-0.5 font-mono text-sm">
                  {children}
                </code>
              ),
              pre: ({ children }) => (
                <pre className="bg-black/20 rounded p-2 overflow-x-auto mb-2">
                  {children}
                </pre>
              ),
            }}
          >
            {message.content}
          </ReactMarkdown>
        </div>

        {/* Display citations from File Search RAG */}
        {!isUser && citations && citations.length > 0 && (
          <div className="mt-2 text-sm text-muted-foreground max-w-[80%]">
            <p className="text-xs font-semibold mb-1">Sources:</p>
            <div className="flex flex-wrap gap-1">
              {citations.map((citation, idx) => (
                <Badge
                  key={idx}
                  variant="outline"
                  className="text-xs cursor-pointer hover:bg-accent"
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
