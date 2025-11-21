'use client'

import { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { SUPPORTED_FILE_TYPES, MAX_FILE_SIZE } from '@/lib/constants'

interface FileUploadZoneProps {
  onFilesSelected: (files: File[]) => void
  isLoading?: boolean
}

export function FileUploadZone({ onFilesSelected, isLoading = false }: FileUploadZoneProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      // Validate files
      const validFiles = acceptedFiles.filter((file) => {
        if (!SUPPORTED_FILE_TYPES.includes(file.type)) {
          return false
        }
        if (file.size > MAX_FILE_SIZE) {
          return false
        }
        return true
      })

      if (validFiles.length > 0) {
        onFilesSelected(validFiles)
      }
    },
    [onFilesSelected]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'text/plain': ['.txt'],
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
    disabled: isLoading,
  })

  return (
    <Card
      {...getRootProps()}
      className={`border-2 border-dashed p-8 text-center cursor-pointer transition ${
        isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/20'
      } ${isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:border-primary/50'}`}
    >
      <input {...getInputProps()} />
      <div className="flex flex-col items-center gap-4">
        <Upload className="h-10 w-10 text-muted-foreground" />
        <div>
          <p className="text-lg font-semibold">Drag files here</p>
          <p className="text-sm text-muted-foreground">or click to select files</p>
        </div>
        <p className="text-xs text-muted-foreground">
          Supported: PDF, TXT, CSV, DOCX (Max {MAX_FILE_SIZE / 1024 / 1024}MB)
        </p>
      </div>
    </Card>
  )
}
