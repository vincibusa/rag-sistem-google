'use client'

import React from 'react'
import { useChatStore } from '@/store/chat-store'
import { InteractiveField } from './InteractiveField'

export function TextPreview() {
  const { documentPreview, getMergedContent } = useChatStore()
  const document = documentPreview.currentDocument

  if (!document) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        No document loaded
      </div>
    )
  }

  // Use merged content (compiled + user edits) for both structure parsing and display
  const mergedContent = getMergedContent()
  const extractedText = document.extracted_text

  // Parse document structure from merged content
  const documentStructure = document.document_structure as any
  const parsedStructure = documentStructure || parseDocumentStructure(mergedContent || extractedText)

  console.log('🔍 TextPreview - Content sources:', {
    hasMergedContent: !!mergedContent,
    mergedContentLength: mergedContent?.length,
    hasCompiledContent: !!document.compiled_content,
    hasUserEdits: documentPreview.userEdits.size > 0,
    hasExtractedText: !!extractedText
  })

  if (parsedStructure && parsedStructure.fields && parsedStructure.fields.length > 0) {
    // Render structured document with fields
    return (
      <div className="p-4 space-y-4">
        {parsedStructure.fields.map((field: any) => (
          <InteractiveField
            key={field.id}
            fieldId={field.id}
            fieldLabel={field.label}
            originalContent={field.originalContent || ''}
            compiledContent={field.compiledContent || ''}
            isEditable={!field.isSection}
            isSection={field.isSection}
          />
        ))}
      </div>
    )
  }

  // Fallback for unstructured documents: use merged content
  const displayContent = mergedContent || extractedText || 'No content available'

  return (
    <div className="p-4">
      <div className="prose prose-sm max-w-none">
        <pre className="whitespace-pre-wrap font-sans text-sm">
          {displayContent}
        </pre>
      </div>
    </div>
  )
}

/**
 * Parse document content into structured fields for interactive editing
 * This function analyzes the compiled content and extracts logical sections
 */
function parseDocumentStructure(content: string): any {
  if (!content) return null

  console.log('🔍 parseDocumentStructure - Parsing content:', {
    contentLength: content.length,
    contentPreview: content.substring(0, 200)
  })

  const lines = content.split('\n')
  const fields: any[] = []
  let currentField: any = null
  let fieldId = 1

  // Common field patterns to detect
  const fieldPatterns = [
    /^(Nome|Name):\s*(.+)$/i,
    /^(Cognome|Surname):\s*(.+)$/i,
    /^(Data di nascita|Birth Date):\s*(.+)$/i,
    /^(Luogo di nascita|Birth Place):\s*(.+)$/i,
    /^(Indirizzo|Address):\s*(.+)$/i,
    /^(Città|City):\s*(.+)$/i,
    /^(CAP|Postal Code):\s*(.+)$/i,
    /^(Telefono|Phone):\s*(.+)$/i,
    /^(Email):\s*(.+)$/i,
    /^(Codice Fiscale|Tax Code):\s*(.+)$/i,
    /^(Partita IVA|VAT Number):\s*(.+)$/i,
    /^(Professione|Profession):\s*(.+)$/i,
    /^(Azienda|Company):\s*(.+)$/i,
    /^(Ruolo|Role):\s*(.+)$/i,
    /^(Stipendio|Salary):\s*(.+)$/i,
    /^(Contratto|Contract):\s*(.+)$/i,
  ]

  // Section patterns
  const sectionPatterns = [
    /^(Dati Personali|Personal Information)/i,
    /^(Informazioni di Contatto|Contact Information)/i,
    /^(Informazioni Professionali|Professional Information)/i,
    /^(Educazione|Education)/i,
    /^(Esperienza|Experience)/i,
    /^(Competenze|Skills)/i,
  ]

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()

    // Skip empty lines
    if (!line) continue

    // Check for section headers
    let isSectionHeader = false
    for (const pattern of sectionPatterns) {
      if (pattern.test(line)) {
        isSectionHeader = true
        break
      }
    }

    if (isSectionHeader) {
      // If we have a current field, save it
      if (currentField) {
        fields.push(currentField)
        currentField = null
      }

      // Create a section header field
      fields.push({
        id: `section-${fieldId++}`,
        label: line,
        originalContent: '',
        compiledContent: line,
        isSection: true
      })
      continue
    }

    // Check for field patterns
    let fieldMatch = null
    for (const pattern of fieldPatterns) {
      const match = line.match(pattern)
      if (match) {
        fieldMatch = match
        break
      }
    }

    if (fieldMatch) {
      // If we have a current field, save it
      if (currentField) {
        fields.push(currentField)
      }

      // Create new field
      const fieldLabel = fieldMatch[1]
      const fieldValue = fieldMatch[2]

      currentField = {
        id: `field-${fieldId++}`,
        label: fieldLabel,
        originalContent: '',
        compiledContent: fieldValue,
        isSection: false
      }
    } else if (currentField && line.length > 0) {
      // Continue building the current field content
      currentField.compiledContent += '\n' + line
    }
  }

  // Don't forget the last field
  if (currentField) {
    fields.push(currentField)
  }

  // If no structured fields found, create a single text field
  if (fields.length === 0 && content.trim().length > 0) {
    fields.push({
      id: 'text-content',
      label: 'Document Content',
      originalContent: '',
      compiledContent: content,
      isSection: false
    })
  }

  console.log('🔍 parseDocumentStructure - Parsed structure:', {
    totalFields: fields.length,
    fields: fields.map(f => ({ id: f.id, label: f.label, contentLength: f.compiledContent?.length }))
  })

  return {
    fields,
    totalFields: fields.length,
    parsedAt: new Date().toISOString()
  }
}