'use client'

import React from 'react'
import { useChatStore } from '@/store/chat-store'
import { InteractiveField } from './InteractiveField'

export function TextPreview() {
  const { documentPreview } = useChatStore()
  const document = documentPreview.currentDocument

  if (!document) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        No document loaded
      </div>
    )
  }

  // Parse document structure or use extracted text
  const documentStructure = document.document_structure as any
  const extractedText = document.extracted_text

  if (documentStructure && documentStructure.fields) {
    // Render structured document with fields
    return (
      <div className="p-4 space-y-4">
        {documentStructure.fields.map((field: any) => (
          <InteractiveField
            key={field.id}
            fieldId={field.id}
            fieldLabel={field.label}
            originalContent={field.originalContent || ''}
            compiledContent={field.compiledContent || ''}
            isEditable={true}
          />
        ))}
      </div>
    )
  }

  // Fallback to raw extracted text
  return (
    <div className="p-4">
      <div className="prose prose-sm max-w-none">
        <pre className="whitespace-pre-wrap font-sans text-sm">
          {extractedText}
        </pre>
      </div>
    </div>
  )
}