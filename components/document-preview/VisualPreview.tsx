'use client'

import React from 'react'
import { useChatStore } from '@/store/chat-store'
import { FileText, Image } from 'lucide-react'

export function VisualPreview() {
  const { documentPreview } = useChatStore()
  const document = documentPreview.currentDocument

  if (!document) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        No document loaded
      </div>
    )
  }

  // For now, show a placeholder for visual document representation
  // In a real implementation, this would render the actual document
  // using libraries like react-pdf, docx.js, or custom visual components
  return (
    <div className="p-4">
      <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
        <FileText className="h-16 w-16 mb-4 opacity-50" />
        <h3 className="text-lg font-semibold mb-2">
          Visual Preview
        </h3>
        <p className="text-sm max-w-md">
          This would show a visual representation of the document with interactive fields.
          For PDFs, this could be a PDF viewer. For forms, this could be a form layout.
        </p>

        {/* Document info */}
        <div className="mt-6 p-4 bg-muted rounded-lg text-left w-full max-w-md">
          <h4 className="font-medium mb-2">Document Information</h4>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span>File Name:</span>
              <span className="font-medium">{document.original_file_name}</span>
            </div>
            <div className="flex justify-between">
              <span>File Type:</span>
              <span className="font-medium">{document.file_type}</span>
            </div>
            <div className="flex justify-between">
              <span>Status:</span>
              <span className="font-medium capitalize">{document.status}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}