'use client'

import React from 'react'
import { FileText, ExternalLink, Download, File } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface Citation {
  title: string
  uri?: string
  confidence?: number
  pageNumber?: number
  fileType?: string
}

interface CitationDisplayProps {
  citations: Citation[]
  className?: string
}

export function CitationDisplay({ citations, className }: CitationDisplayProps) {
  const getFileIcon = (fileType?: string) => {
    if (fileType?.includes('pdf')) return FileText
    if (fileType?.includes('word') || fileType?.includes('document')) return FileText
    if (fileType?.includes('text')) return FileText
    return File
  }

  const getFileTypeLabel = (fileType?: string) => {
    if (fileType?.includes('pdf')) return 'PDF'
    if (fileType?.includes('word') || fileType?.includes('document')) return 'Document'
    if (fileType?.includes('text')) return 'Text'
    if (fileType?.includes('spreadsheet') || fileType?.includes('excel')) return 'Spreadsheet'
    if (fileType?.includes('presentation') || fileType?.includes('powerpoint')) return 'Presentation'
    return 'File'
  }

  const formatConfidence = (confidence?: number) => {
    if (!confidence) return null
    const percentage = Math.round(confidence * 100)
    if (percentage >= 80) return 'High'
    if (percentage >= 60) return 'Medium'
    return 'Low'
  }

  const handleOpenCitation = (citation: Citation) => {
    if (citation.uri) {
      window.open(citation.uri, '_blank')
    }
  }

  const handleDownloadCitation = (citation: Citation) => {
    if (citation.uri) {
      const link = document.createElement('a')
      link.href = citation.uri
      link.download = citation.title || 'document'
      link.click()
    }
  }

  return (
    <div className={cn("mt-3 flex flex-col gap-2 w-full", className)}>
      <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
        <FileText className="h-3 w-3" />
        Sources ({citations.length})
      </p>
      <div className="flex flex-col gap-2">
        {citations.map((citation, idx) => {
          const Icon = getFileIcon(citation.fileType)
          const fileType = getFileTypeLabel(citation.fileType)
          const confidence = formatConfidence(citation.confidence)

          return (
            <div
              key={idx}
              className="group flex items-center gap-3 p-3 rounded-lg border bg-card/50 hover:bg-card/80 transition-colors cursor-pointer"
              onClick={() => handleOpenCitation(citation)}
            >
              <div className="flex-shrink-0">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-4 w-4" />
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-medium truncate">{citation.title}</p>
                  <div className="flex items-center gap-1">
                    <Badge variant="secondary" className="text-xs">
                      {fileType}
                    </Badge>
                    {confidence && (
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-xs",
                          confidence === 'High' && "bg-green-50 text-green-700 border-green-200",
                          confidence === 'Medium' && "bg-yellow-50 text-yellow-700 border-yellow-200",
                          confidence === 'Low' && "bg-red-50 text-red-700 border-red-200"
                        )}
                      >
                        {confidence}
                      </Badge>
                    )}
                    {citation.pageNumber && (
                      <Badge variant="outline" className="text-xs">
                        Page {citation.pageNumber}
                      </Badge>
                    )}
                  </div>
                </div>
                {citation.uri && (
                  <p className="text-xs text-muted-foreground truncate">
                    {citation.uri}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDownloadCitation(citation)
                  }}
                >
                  <Download className="h-3 w-3" />
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleOpenCitation(citation)
                  }}
                >
                  <ExternalLink className="h-3 w-3" />
                </Button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}