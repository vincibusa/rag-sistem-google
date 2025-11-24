'use client'

import React from 'react'
import { FileText, Image, File, Download, X, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface FileAttachmentProps {
  uri: string
  name: string
  mimeType: string
  sizeBytes?: number
  onRemove?: (uri: string) => void
  onDownload?: (uri: string, name: string) => void
  isRemovable?: boolean
  className?: string
}

export function FileAttachment({
  uri,
  name,
  mimeType,
  sizeBytes,
  onRemove,
  onDownload,
  isRemovable = false,
  className,
}: FileAttachmentProps) {
  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) {
      return Image
    }
    if (mimeType.includes('pdf')) {
      return FileText
    }
    return File
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  const getFileType = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return 'Image'
    if (mimeType.includes('pdf')) return 'PDF'
    if (mimeType.includes('text')) return 'Text'
    if (mimeType.includes('word') || mimeType.includes('document')) return 'Document'
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return 'Spreadsheet'
    if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return 'Presentation'
    return 'File'
  }

  const Icon = getFileIcon(mimeType)
  const fileType = getFileType(mimeType)

  const handlePreview = () => {
    if (mimeType.startsWith('image/')) {
      // Open image in new tab
      window.open(uri, '_blank')
    } else {
      // For other files, try to open in new tab
      window.open(uri, '_blank')
    }
  }

  return (
    <div
      className={cn(
        "group relative flex items-center gap-3 p-3 rounded-lg border bg-card/50 hover:bg-card/80 transition-colors cursor-pointer",
        className
      )}
      onClick={handlePreview}
    >
      <div className="flex-shrink-0">
        <div className="p-2 rounded-lg bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <p className="text-sm font-medium truncate">{name}</p>
          <Badge variant="secondary" className="text-xs">
            {fileType}
          </Badge>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {sizeBytes && (
            <span>{formatFileSize(sizeBytes)}</span>
          )}
          <span className="text-muted-foreground/60">•</span>
          <span className="truncate">{mimeType}</span>
        </div>
      </div>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {onDownload && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={(e) => {
              e.stopPropagation()
              onDownload(uri, name)
            }}
          >
            <Download className="h-3 w-3" />
          </Button>
        )}

        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={(e) => {
            e.stopPropagation()
            handlePreview()
          }}
        >
          <ExternalLink className="h-3 w-3" />
        </Button>

        {isRemovable && onRemove && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-destructive hover:text-destructive"
            onClick={(e) => {
              e.stopPropagation()
              onRemove(uri)
            }}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  )
}