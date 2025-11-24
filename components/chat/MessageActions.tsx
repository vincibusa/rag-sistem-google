'use client'

import React, { useState } from 'react'
import { Edit, Trash2, Copy, MoreHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'

interface MessageActionsProps {
  messageId: string
  messageContent: string
  onEdit?: (messageId: string, newContent: string) => void
  onDelete?: (messageId: string) => void
  isUserMessage?: boolean
}

export function MessageActions({
  messageId,
  messageContent,
  onEdit,
  onDelete,
  isUserMessage = false,
}: MessageActionsProps) {
  const [isOpen, setIsOpen] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(messageContent)
      toast.success('Message copied to clipboard')
      setIsOpen(false)
    } catch (error) {
      toast.error('Failed to copy message')
    }
  }

  const handleEdit = () => {
    if (onEdit) {
      onEdit(messageId, messageContent)
      setIsOpen(false)
    }
  }

  const handleDelete = () => {
    if (onDelete) {
      onDelete(messageId)
      setIsOpen(false)
    }
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-accent/50"
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={handleCopy} className="cursor-pointer">
          <Copy className="h-4 w-4 mr-2" />
          Copy
        </DropdownMenuItem>

        {isUserMessage && onEdit && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleEdit} className="cursor-pointer">
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </DropdownMenuItem>
          </>
        )}

        {onDelete && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleDelete}
              className="cursor-pointer text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}