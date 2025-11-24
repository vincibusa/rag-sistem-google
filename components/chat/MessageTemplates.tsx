'use client'

import React from 'react'
import { Sparkles, FileText, Search, Brain } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface MessageTemplatesProps {
  onSelectTemplate: (template: string) => void
}

export function MessageTemplates({ onSelectTemplate }: MessageTemplatesProps) {
  const templates = [
    {
      icon: Search,
      label: 'Cerca nei Documenti',
      template: 'Puoi cercare nei miei documenti e trovare informazioni su [argomento]?',
      description: 'Cerca informazioni specifiche'
    },
    {
      icon: FileText,
      label: 'Riassumi Documento',
      template: 'Per favore riassumi i punti chiave di [nome documento o argomento]',
      description: 'Ottieni un riassunto del documento'
    },
    {
      icon: Brain,
      label: 'Spiega Concetto',
      template: 'Puoi spiegarmi [concetto] in termini semplici?',
      description: 'Ottieni spiegazioni di concetti'
    },
    {
      icon: Sparkles,
      label: 'Genera Idee',
      template: 'Quali sono alcune idee creative per [argomento o progetto]?',
      description: 'Brainstorming di nuove idee'
    }
  ]

  return (
    <TooltipProvider>
      <div className="flex flex-wrap gap-2 p-3 border-b bg-muted/30">
        <p className="w-full text-xs font-medium text-muted-foreground mb-2">Template Rapidi</p>
        {templates.map(({ icon: Icon, label, template, description }) => (
          <Tooltip key={label}>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-auto py-2 px-3 text-xs whitespace-normal text-left"
                onClick={() => onSelectTemplate(template)}
              >
                <Icon className="h-3 w-3 mr-1 flex-shrink-0" />
                <span className="truncate">{label}</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p className="text-sm">{template}</p>
              <p className="text-xs text-muted-foreground mt-1">{description}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  )
}