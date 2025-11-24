'use client'

import React, { useState, useRef } from 'react'
import { Send, Loader2, Paperclip, X, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { FormattingToolbar } from './FormattingToolbar'
import { MessageTemplates } from './MessageTemplates'

interface ChatInputProps {
  onSendMessage: (message: string) => void
  isLoading?: boolean
  placeholder?: string
}

export function ChatInput({
  onSendMessage,
  isLoading = false,
  placeholder = 'Ask something about your documents...',
}: ChatInputProps) {
  const [message, setMessage] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSendMessage = () => {
    if (message.trim() && !isLoading) {
      onSendMessage(message)
      setMessage('')
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value)
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px'
    }
  }

  const handleFormat = (format: string) => {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = message.substring(start, end)

    let formattedText = format
    if (selectedText) {
      // Replace placeholder with selected text
      formattedText = format.replace(/\[.*?\]/, selectedText)
    }

    const newMessage = message.substring(0, start) + formattedText + message.substring(end)
    setMessage(newMessage)

    // Focus back on textarea and set cursor position
    setTimeout(() => {
      textarea.focus()
      const newCursorPos = start + formattedText.length
      textarea.setSelectionRange(newCursorPos, newCursorPos)
    }, 0)
  }

  const handleSelectTemplate = (template: string) => {
    setMessage(template)
    setShowTemplates(false)
    if (textareaRef.current) {
      textareaRef.current.focus()
    }
  }

  return (
    <div className="space-y-2">
      {/* Message Templates */}
      <AnimatePresence>
        {showTemplates && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            <MessageTemplates onSelectTemplate={handleSelectTemplate} />
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className={cn(
          "relative rounded-2xl border bg-background shadow-lg transition-all duration-300 overflow-hidden",
          isFocused ? "ring-2 ring-primary/20 border-primary/50 shadow-xl" : "border-border/50"
        )}
      >
        {/* Formatting Toolbar */}
        <FormattingToolbar onFormat={handleFormat} />

        <div className="flex items-end gap-2 p-2">
          <div className="flex-1 relative">
            <Textarea
              ref={textareaRef}
              value={message}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder={placeholder}
              disabled={isLoading}
              className="min-h-[24px] max-h-[200px] w-full resize-none bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 px-3 py-3 text-base placeholder:text-muted-foreground/50"
              rows={1}
            />
          </div>

          <div className="flex items-center gap-2 pb-1 pr-1">
            {/* Templates Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowTemplates(!showTemplates)}
              className="h-8 w-8 rounded-lg"
            >
              <ChevronDown className={cn(
                "h-4 w-4 transition-transform",
                showTemplates ? "rotate-180" : ""
              )} />
            </Button>

            <AnimatePresence mode="wait">
              {message.trim() ? (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Button
                    onClick={handleSendMessage}
                    disabled={isLoading}
                    size="icon"
                    className="h-10 w-10 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm transition-all hover:scale-105 active:scale-95"
                  >
                    {isLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Send className="h-5 w-5" />
                    )}
                  </Button>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Button
                    disabled
                    size="icon"
                    variant="ghost"
                    className="h-10 w-10 rounded-xl text-muted-foreground/50"
                  >
                    <Send className="h-5 w-5" />
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
