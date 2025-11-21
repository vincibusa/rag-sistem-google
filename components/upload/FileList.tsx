'use client'

import React from 'react'
import { Trash2, File, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { File as FileType, UploadProgress } from '@/lib/types'

interface FileListProps {
  files: FileType[]
  uploadProgress: Map<string, UploadProgress>
  onDeleteFile: (fileId: string) => void
  isDeleting?: string | null
}

export function FileList({
  files,
  uploadProgress,
  onDeleteFile,
  isDeleting = null,
}: FileListProps) {
  if (files.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <File className="h-12 w-12 mx-auto mb-2 opacity-50" />
        <p>No files uploaded yet</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {files.map((file) => {
        const progress = uploadProgress.get(file.id)
        return (
          <div
            key={file.id}
            className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent transition"
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <File className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(file.size_bytes / 1024 / 1024).toFixed(2)}MB
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {progress && (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{progress.progress}%</span>
                </div>
              )}
              {!progress && (
                <Badge variant="outline" className="text-xs">
                  Ready
                </Badge>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDeleteFile(file.id)}
                disabled={isDeleting === file.id || !!progress}
              >
                {isDeleting === file.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
