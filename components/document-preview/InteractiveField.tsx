'use client'

import React, { useState } from 'react'
import { useChatStore } from '@/store/chat-store'
import { Edit2, MessageSquare, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

interface InteractiveFieldProps {
  fieldId: string
  fieldLabel: string
  originalContent: string
  compiledContent: string
  isEditable: boolean
}

export function InteractiveField({
  fieldId,
  fieldLabel,
  originalContent,
  compiledContent,
  isEditable,
}: InteractiveFieldProps) {
  const {
    documentPreview,
    setActiveField,
    updateUserEdit,
    removeUserEdit,
    addComment,
  } = useChatStore()

  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(compiledContent)
  const [showCommentInput, setShowCommentInput] = useState(false)
  const [commentText, setCommentText] = useState('')

  const userEdit = documentPreview.userEdits.get(fieldId)
  const displayContent = userEdit || compiledContent || originalContent
  const isActive = documentPreview.activeField === fieldId

  const handleSaveEdit = () => {
    if (editContent.trim() && editContent !== compiledContent) {
      updateUserEdit(fieldId, editContent)
    }
    setIsEditing(false)
  }

  const handleCancelEdit = () => {
    setEditContent(compiledContent)
    setIsEditing(false)
  }

  const handleAddComment = () => {
    if (commentText.trim()) {
      addComment({
        fieldId,
        content: commentText,
        author: 'user',
        resolved: false,
      })
      setCommentText('')
      setShowCommentInput(false)
    }
  }

  const handleFieldClick = () => {
    setActiveField(fieldId)
  }

  return (
    <div
      className={cn(
        "p-4 border rounded-lg transition-all duration-200 cursor-pointer",
        isActive
          ? "border-primary bg-primary/5"
          : "border-border hover:border-primary/50 hover:bg-muted/50",
        userEdit && "border-green-500 bg-green-50/50"
      )}
      onClick={handleFieldClick}
    >
      {/* Field header */}
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-medium text-sm text-muted-foreground">
          {fieldLabel}
        </h4>
        <div className="flex items-center gap-1">
          {userEdit && (
            <div className="text-xs text-green-600 font-medium px-2 py-1 bg-green-100 rounded-full">
              Edited
            </div>
          )}
          {isEditable && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                setIsEditing(true)
              }}
              className="h-6 w-6 p-0"
            >
              <Edit2 className="h-3 w-3" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              setShowCommentInput(!showCommentInput)
            }}
            className="h-6 w-6 p-0"
          >
            <MessageSquare className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Field content */}
      {isEditing ? (
        <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
          <Textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="min-h-[100px] resize-none"
            autoFocus
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSaveEdit}>
              <Check className="h-3 w-3 mr-1" />
              Save
            </Button>
            <Button size="sm" variant="outline" onClick={handleCancelEdit}>
              <X className="h-3 w-3 mr-1" />
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="prose prose-sm max-w-none">
          <p className="text-sm leading-relaxed whitespace-pre-wrap">
            {displayContent}
          </p>
        </div>
      )}

      {/* Comment input */}
      {showCommentInput && (
        <div className="mt-3 space-y-2" onClick={(e) => e.stopPropagation()}>
          <Textarea
            placeholder="Add a comment..."
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            className="min-h-[60px] resize-none"
            autoFocus
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleAddComment}>
              <MessageSquare className="h-3 w-3 mr-1" />
              Add Comment
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowCommentInput(false)}
            >
              <X className="h-3 w-3 mr-1" />
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Comments display */}
      {documentPreview.comments
        .filter((comment) => comment.fieldId === fieldId)
        .map((comment) => (
          <div
            key={comment.id}
            className={cn(
              "mt-2 p-2 text-xs rounded border",
              comment.resolved
                ? "bg-muted border-muted-foreground/20"
                : "bg-blue-50 border-blue-200"
            )}
          >
            <div className="flex justify-between items-start mb-1">
              <span className="font-medium">
                {comment.author === 'user' ? 'You' : 'AI'}
              </span>
              <span className="text-muted-foreground">
                {new Date(comment.createdAt).toLocaleTimeString()}
              </span>
            </div>
            <p className="text-muted-foreground">{comment.content}</p>
          </div>
        ))}
    </div>
  )
}