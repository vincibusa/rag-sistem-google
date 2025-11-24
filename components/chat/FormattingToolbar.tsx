'use client'

import React from 'react'
import { Bold, Italic, Code, List, ListOrdered, Quote, Link } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface FormattingToolbarProps {
  onFormat: (format: string) => void
}

export function FormattingToolbar({ onFormat }: FormattingToolbarProps) {
  const formats = [
    {
      icon: Bold,
      label: 'Bold',
      format: '**bold**',
      description: 'Add bold text'
    },
    {
      icon: Italic,
      label: 'Italic',
      format: '*italic*',
      description: 'Add italic text'
    },
    {
      icon: Code,
      label: 'Code',
      format: '`code`',
      description: 'Add inline code'
    },
    {
      icon: List,
      label: 'Bullet List',
      format: '- item',
      description: 'Add bullet list'
    },
    {
      icon: ListOrdered,
      label: 'Numbered List',
      format: '1. item',
      description: 'Add numbered list'
    },
    {
      icon: Quote,
      label: 'Quote',
      format: '> quote',
      description: 'Add blockquote'
    },
    {
      icon: Link,
      label: 'Link',
      format: '[text](url)',
      description: 'Add link'
    }
  ]

  return (
    <TooltipProvider>
      <div className="flex items-center gap-1 p-2 border-b bg-muted/50">
        {formats.map(({ icon: Icon, label, format, description }) => (
          <Tooltip key={label}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => onFormat(format)}
              >
                <Icon className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{label}</p>
              <p className="text-xs text-muted-foreground">{description}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  )
}