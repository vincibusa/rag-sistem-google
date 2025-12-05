import { ExcelCell, ExcelSheet, ExcelStructure } from '@/lib/types'
import type { Tables } from '@/lib/database.types'

type DocumentSession = Tables<'document_sessions'>

/**
 * Parse Excel structure from document content (text format)
 * Expected format:
 * === SHEET: SheetName ===
 * Row 1: Header1\tHeader2\tHeader3
 * Row 2: Value1\tValue2\tValue3
 */
export function parseExcelStructure(document: DocumentSession | null): ExcelStructure | null {
  if (!document) return null

  // Try multiple content sources in order
  const content = document.current_compiled_content ||
                  document.compiled_content ||
                  document.extracted_text

  if (!content) return null

  const sheets: ExcelSheet[] = []
  const lines = content.split('\n')
  let currentSheet: ExcelSheet | null = null

  for (const line of lines) {
    // Check for sheet marker: === SHEET: SheetName ===
    const sheetMatch = line.match(/^===\s*SHEET:\s*(.+?)\s*===$/)
    if (sheetMatch) {
      // Save previous sheet if exists
      if (currentSheet) {
        sheets.push(currentSheet)
      }

      // Create new sheet
      currentSheet = {
        name: sheetMatch[1].trim(),
        rows: [],
        columnCount: 0,
        rowCount: 0
      }
      continue
    }

    // Check for row marker: Row X: cell1\tcell2\tcell3
    const rowMatch = line.match(/^Row\s+(\d+):\s*(.*)$/)
    if (rowMatch && currentSheet) {
      // Parse cells separated by tabs
      const cellValues = rowMatch[2].split('\t')
      const cells: ExcelCell[] = cellValues.map(value => ({
        value: value || null
      }))

      currentSheet.rows.push(cells)
      currentSheet.columnCount = Math.max(currentSheet.columnCount, cells.length)
      currentSheet.rowCount++
    }
  }

  // Don't forget the last sheet
  if (currentSheet) {
    sheets.push(currentSheet)
  }

  // Fallback: if no sheets found, create default single sheet
  if (sheets.length === 0) {
    sheets.push({
      name: 'Sheet1',
      rows: [[{ value: content }]],
      columnCount: 1,
      rowCount: 1
    })
  }

  return {
    sheets,
    activeSheetIndex: 0
  }
}

/**
 * Convert row/column indices to Excel cell reference
 * @example getCellRef(0, 0) => "A1"
 * @example getCellRef(0, 26) => "AA1"
 */
export function getCellRef(rowIndex: number, colIndex: number): string {
  let colName = ''
  let col = colIndex

  // Convert to Excel column name (A, B, ... Z, AA, AB, ... etc.)
  do {
    colName = String.fromCharCode(65 + (col % 26)) + colName
    col = Math.floor(col / 26) - 1
  } while (col >= 0)

  return `${colName}${rowIndex + 1}`
}

/**
 * Parse Excel cell reference to row/column indices
 * @example parseCellRef("A1") => { rowIndex: 0, colIndex: 0 }
 * @example parseCellRef("B5") => { rowIndex: 4, colIndex: 1 }
 * @example parseCellRef("AA1") => { rowIndex: 0, colIndex: 26 }
 */
export function parseCellRef(cellRef: string): { rowIndex: number; colIndex: number } | null {
  const match = cellRef.match(/^([A-Z]+)(\d+)$/i)
  if (!match) return null

  const colName = match[1].toUpperCase()
  const rowNumber = parseInt(match[2], 10)

  if (rowNumber < 1) return null

  // Convert column name to index
  let colIndex = 0
  for (let i = 0; i < colName.length; i++) {
    colIndex = colIndex * 26 + (colName.charCodeAt(i) - 64)
  }
  colIndex-- // Convert to 0-based index

  return {
    rowIndex: rowNumber - 1,
    colIndex
  }
}

/**
 * Format Excel sheet structure as text for AI processing
 * Output format:
 * === SHEET: SheetName ===
 * Row 1: Header1\tHeader2\tHeader3
 * Row 2: Value1\tValue2\tValue3
 */
export function formatExcelStructureAsText(structure: ExcelStructure): string {
  const lines: string[] = []

  for (const sheet of structure.sheets) {
    lines.push(`=== SHEET: ${sheet.name} ===`)

    for (let i = 0; i < sheet.rows.length; i++) {
      const row = sheet.rows[i]
      const cellValues = row.map(cell => {
        const cellValue = cell.value
        if (cellValue === null || cellValue === undefined) return ''

        // Handle Date objects first (before typeof check)
        if ((cellValue as unknown) instanceof Date) {
          return (cellValue as unknown as Date).toISOString()
        }

        // Handle different cell value types
        if (typeof cellValue === 'object' && cellValue !== null) {
          const objValue = cellValue as Record<string, any>
          if ('text' in objValue) {
            // Rich text: { text: "..." }
            return String(objValue.text)
          } else if ('result' in objValue) {
            // Formula: { formula: "...", result: ... }
            return String(objValue.result)
          } else if ('hyperlink' in objValue && 'text' in objValue) {
            // Hyperlink: { text: "...", hyperlink: "..." }
            return String(objValue.text)
          } else if ('error' in objValue) {
            // Error: { error: "..." }
            return String(objValue.error)
          } else {
            // Unknown object type
            console.warn('Unknown cell value in formatExcelStructureAsText:', cellValue)
            return JSON.stringify(cellValue)
          }
        }
        // Simple value: string, number, boolean
        return String(cellValue)
      }).join('\t')
      lines.push(`Row ${i + 1}: ${cellValues}`)
    }

    lines.push('') // Empty line between sheets
  }

  return lines.join('\n')
}

/**
 * Merge user cell edits into Excel structure
 * Cell edit keys format: "SheetName:CellRef" (e.g., "Sheet1:A1")
 */
export function mergeExcelCellEdits(
  structure: ExcelStructure,
  cellEdits: Map<string, string>
): ExcelStructure {
  if (cellEdits.size === 0) return structure

  const mergedStructure = JSON.parse(JSON.stringify(structure)) as ExcelStructure

  for (const [cellId, value] of cellEdits) {
    // Parse cellId: "SheetName:CellRef"
    const [sheetName, cellRef] = cellId.split(':')
    if (!sheetName || !cellRef) continue

    // Find sheet
    const sheet = mergedStructure.sheets.find(s => s.name === sheetName)
    if (!sheet) continue

    // Parse cell reference
    const cellPos = parseCellRef(cellRef)
    if (!cellPos) continue

    const { rowIndex, colIndex } = cellPos

    // Ensure row and column exist
    while (sheet.rows.length <= rowIndex) {
      sheet.rows.push([])
    }
    while (sheet.rows[rowIndex].length <= colIndex) {
      sheet.rows[rowIndex].push({ value: null })
    }

    // Update cell value
    sheet.rows[rowIndex][colIndex].value = value
    sheet.columnCount = Math.max(sheet.columnCount, colIndex + 1)
  }

  return mergedStructure
}
