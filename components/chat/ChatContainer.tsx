'use client'

import React, { useEffect, useRef } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { ChatMessage } from './ChatMessage'
import { ChatInput } from './ChatInput'
import { Message } from '@/lib/types'

interface ChatContainerProps {
  messages: Message[]
  onSendMessage: (message: string) => void
  isLoading?: boolean
  isEmpty?: boolean
}

export function ChatContainer({
  messages,
  onSendMessage,
  isLoading = false,
  isEmpty = true,
}: ChatContainerProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  return (
    <div className="flex flex-col h-full gap-4">
      <ScrollArea className="flex-1 pr-4">
        {isEmpty ? (
          <div className="flex items-center justify-center h-full text-center text-muted-foreground">
            <div>
              <p className="text-lg font-semibold mb-2">No messages yet</p>
              <p className="text-sm">Upload documents and start chatting to get began</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4 p-4">
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}
            <div ref={scrollRef} />
          </div>
        )}
      </ScrollArea>

      <Separator />

      <ChatInput onSendMessage={onSendMessage} isLoading={isLoading} />
    </div>
  )
}
