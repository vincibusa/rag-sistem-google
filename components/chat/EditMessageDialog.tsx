'use client'

import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

interface EditMessageDialogProps {
  isOpen: boolean
  onClose: () => void
  messageContent: string
  onSave: (newContent: string) => void
}

export function EditMessageDialog({
  isOpen,
  onClose,
  messageContent,
  onSave,
}: EditMessageDialogProps) {
  const [editedContent, setEditedContent] = useState(messageContent)

  useEffect(() => {
    setEditedContent(messageContent)
  }, [messageContent])

  const handleSave = () => {
    if (editedContent.trim()) {
      onSave(editedContent.trim())
      onClose()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      handleSave()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Edit Message</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Textarea
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Edit your message..."
            className="min-h-[200px] resize-none"
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!editedContent.trim()}>
              Save Changes
            </Button>
          </div>
          <p className="text-xs text-muted-foreground text-center">
            Press Ctrl+Enter (Cmd+Enter on Mac) to save
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}