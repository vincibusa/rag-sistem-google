/**
 * Document Merge Utility
 * Merges user edits with AI-compiled content while preserving document structure
 */

export interface MergeResult {
  mergedContent: string
  appliedEdits: number
  totalFields: number
  hasUserEdits: boolean
}

export interface UserEdit {
  content: string
  timestamp: string
  fieldId: string
  userId: string
}

export interface DocumentField {
  id: string
  label: string
  originalContent: string
  compiledContent: string
  isSection: boolean
}

export interface DocumentStructure {
  fields: DocumentField[]
  totalFields: number
  parsedAt: string
}

/**
 * Main merge function - combines user edits with compiled content
 */
export function mergeUserEditsWithCompiledContent(
  compiledContent: string,
  userEdits: Record<string, any>,
  documentStructure?: any
): MergeResult {
  try {
    if (!compiledContent || compiledContent.trim().length === 0) {
      console.warn('⚠️ Compiled content is empty, returning original')
      return {
        mergedContent: compiledContent,
        appliedEdits: 0,
        totalFields: 0,
        hasUserEdits: false,
      }
    }

    // If no user edits, return original content
    if (!userEdits || Object.keys(userEdits).length === 0) {
      return {
        mergedContent: compiledContent,
        appliedEdits: 0,
        totalFields: 0,
        hasUserEdits: false,
      }
    }

    let structure = documentStructure

    // If no structure provided, parse it from compiled content
    if (!structure) {
      structure = parseDocumentStructure(compiledContent)
    }

    // If still no structure, treat as single field
    if (!structure || !structure.fields || structure.fields.length === 0) {
      console.log('🔄 No document structure found, treating as single field')
      return mergeAsSingleField(compiledContent, userEdits)
    }

    console.log(`🔄 Merging user edits with structured document (${structure.fields.length} fields)`)
    return mergeUsingDocumentStructure(compiledContent, userEdits, structure)
  } catch (error) {
    console.error('❌ Error merging user edits:', error)
    // Fallback to original content on error
    return {
      mergedContent: compiledContent,
      appliedEdits: 0,
      totalFields: 0,
      hasUserEdits: false,
    }
  }
}

/**
 * Merge using structured document with identified fields
 */
function mergeUsingDocumentStructure(
  compiledContent: string,
  userEdits: Record<string, any>,
  documentStructure: DocumentStructure
): MergeResult {
  let mergedContent = compiledContent
  let appliedEdits = 0
  const editableFields = documentStructure.fields.filter((field: any) => !field.isSection)

  for (const field of editableFields) {
    const userEdit = userEdits[field.id]
    if (userEdit && field.compiledContent) {
      const originalContent = field.compiledContent
      const userEditContent = userEdit.content

      // Only replace if content actually changed
      if (userEditContent !== originalContent) {
        try {
          // Use exact string replacement with proper escaping
          const escapedOriginal = escapeRegExp(originalContent)
          const regex = new RegExp(escapedOriginal, 'g')

          // Verify the original content exists before replacing
          if (regex.test(mergedContent)) {
            mergedContent = mergedContent.replace(regex, userEditContent)
            appliedEdits++
            console.log(`✅ Applied edit to field "${field.label}"`)
          } else {
            console.warn(`⚠️ Field "${field.label}" not found in compiled content for replacement`)
          }
        } catch (error) {
          console.error(`❌ Error replacing field "${field.label}":`, error)
        }
      }
    }
  }

  console.log(`✅ Merged ${appliedEdits}/${editableFields.length} fields`)

  return {
    mergedContent,
    appliedEdits,
    totalFields: editableFields.length,
    hasUserEdits: appliedEdits > 0,
  }
}

/**
 * Merge when no structure available - treat as single field
 */
function mergeAsSingleField(compiledContent: string, userEdits: Record<string, any>): MergeResult {
  // Find the most relevant user edit (usually the only one or the latest)
  const editEntries = Object.entries(userEdits)
  if (editEntries.length === 0) {
    return {
      mergedContent: compiledContent,
      appliedEdits: 0,
      totalFields: 1,
      hasUserEdits: false,
    }
  }

  // Use the latest edit or the only available edit
  const latestEdit = editEntries.reduce((latest, [fieldId, edit]) => {
    const editObj = edit as any
    if (!latest || (editObj.timestamp && new Date(editObj.timestamp) > new Date(latest.timestamp))) {
      return editObj
    }
    return latest
  }, null as any)

  if (latestEdit?.content) {
    console.log('✅ Applied single-field edit')
    return {
      mergedContent: latestEdit.content,
      appliedEdits: 1,
      totalFields: 1,
      hasUserEdits: true,
    }
  }

  return {
    mergedContent: compiledContent,
    appliedEdits: 0,
    totalFields: 1,
    hasUserEdits: false,
  }
}

/**
 * Parse document content into structured fields
 * Replicates logic from TextPreview.tsx for consistency
 */
export function parseDocumentStructure(content: string): DocumentStructure | null {
  if (!content || content.trim().length === 0) return null

  const lines = content.split('\n')
  const fields: DocumentField[] = []
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
        isSection: true,
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
        isSection: false,
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
      isSection: false,
    })
  }

  return {
    fields,
    totalFields: fields.length,
    parsedAt: new Date().toISOString(),
  }
}

/**
 * Escape special regex characters for safe string replacement
 */
export function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Validate that user edits can be safely applied to compiled content
 */
export function validateUserEdits(
  compiledContent: string,
  userEdits: Record<string, any>,
  documentStructure?: any
): { isValid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!compiledContent) {
    errors.push('Compiled content is empty')
  }

  if (!userEdits || Object.keys(userEdits).length === 0) {
    return { isValid: true, errors: [] }
  }

  let structure = documentStructure
  if (!structure) {
    structure = parseDocumentStructure(compiledContent)
  }

  if (structure?.fields) {
    for (const field of structure.fields) {
      const userEdit = userEdits[field.id]
      if (userEdit && field.compiledContent) {
        // Check if the original content exists in compiled content
        if (!compiledContent.includes(field.compiledContent)) {
          errors.push(`Field "${field.label}" content not found in compiled document`)
        }
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

/**
 * Get merge statistics for logging/debugging
 */
export function getMergeStats(
  mergeResult: MergeResult
): { totalApplied: number; totalFields: number; percentage: number; contentChanged: boolean } {
  const percentage =
    mergeResult.totalFields > 0 ? Math.round((mergeResult.appliedEdits / mergeResult.totalFields) * 100) : 0

  return {
    totalApplied: mergeResult.appliedEdits,
    totalFields: mergeResult.totalFields,
    percentage,
    contentChanged: mergeResult.hasUserEdits,
  }
}
