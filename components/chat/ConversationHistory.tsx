'use client'

import React, { useState } from 'react'
import { Search, Clock, MessageSquare, Trash2, Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

interface Conversation {
  id: string
  title: string
  preview: string
  timestamp: Date
  messageCount: number
}

interface ConversationHistoryProps {
  conversations: Conversation[]
  onSelectConversation: (conversationId: string) => void
  onDeleteConversation: (conversationId: string) => void
  onClearAll: () => void
}

export function ConversationHistory({
  conversations,
  onSelectConversation,
  onDeleteConversation,
  onClearAll,
}: ConversationHistoryProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [filter, setFilter] = useState<'all' | 'recent'>('recent')

  const filteredConversations = conversations
    .filter(conv => {
      const matchesSearch = conv.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           conv.preview.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesFilter = filter === 'all' ||
                           (filter === 'recent' &&
                            Date.now() - conv.timestamp.getTime() < 24 * 60 * 60 * 1000)
      return matchesSearch && matchesFilter
    })
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())

  const formatTime = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (hours < 1) return 'Just now'
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`
    return date.toLocaleDateString()
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Clock className="h-4 w-4" />
          History
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Conversation History</span>
            {conversations.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={onClearAll}
                className="gap-2 text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
                Clear All
              </Button>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 flex-1 flex flex-col">
          {/* Search and Filter */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <Filter className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setFilter('all')}>
                  All Conversations
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilter('recent')}>
                  Recent (24h)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Conversations List */}
          <ScrollArea className="flex-1">
            {filteredConversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-center text-muted-foreground">
                <MessageSquare className="h-8 w-8 mb-2 opacity-50" />
                <p>No conversations found</p>
                {searchQuery && (
                  <p className="text-sm">Try changing your search terms</p>
                )}
              </div>
            ) : (
              <div className="space-y-2 pr-4">
                {filteredConversations.map((conversation) => (
                  <div
                    key={conversation.id}
                    className={cn(
                      "group p-3 rounded-lg border hover:bg-accent/50 cursor-pointer transition-colors",
                      "flex items-start justify-between gap-3"
                    )}
                    onClick={() => onSelectConversation(conversation.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-sm truncate">
                          {conversation.title}
                        </h4>
                        <Badge variant="secondary" className="text-xs">
                          {conversation.messageCount}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {conversation.preview}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatTime(conversation.timestamp)}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation()
                        onDeleteConversation(conversation.id)
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Stats */}
          <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
            <span>
              {filteredConversations.length} of {conversations.length} conversations
            </span>
            {filter === 'recent' && (
              <span>Showing last 24 hours</span>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}