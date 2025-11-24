import PizZip from 'pizzip'
import ExcelJS from 'exceljs'

/**
 * Extract text content from DOCX file
 * Preserves {{placeholder}} syntax and structure
 */
export async function extractTextFromDOCX(buffer: Buffer): Promise<string> {
  try {
    console.log('📄 Extracting text from DOCX...')

    const zip = new PizZip(buffer)

    // Extract document.xml which contains the main content
    const documentXml = zip.file('word/document.xml')?.asText()

    if (!documentXml) {
      throw new Error('Could not find document.xml in DOCX file')
    }

    // Simple XML text extraction - removes tags but keeps content
    let text = documentXml
      // Remove XML tags but keep text content
      .replace(/<w:t[^>]*>([^<]+)<\/w:t>/g, '$1')
      // Handle paragraph breaks
      .replace(/<w:p[^>]*>/g, '\n')
      // Remove remaining XML tags
      .replace(/<[^>]+>/g, '')
      // Clean up excessive whitespace
      .replace(/\n\s*\n\s*\n/g, '\n\n')
      .trim()

    console.log('✅ Text extracted from DOCX')
    console.log('📏 Extracted text length:', text.length, 'characters')
    console.log('📝 Preview:', text.substring(0, 300))

    return text
  } catch (error) {
    console.error('❌ Error extracting text from DOCX:', error)
    throw new Error(`Failed to extract text from DOCX: ${error instanceof Error ? error.message : String(error)}`)
  }
}

/**
 * Extract text content from XLSX file
 * Preserves {{placeholder}} syntax and cell structure
 */
export async function extractTextFromXLSX(buffer: Buffer): Promise<string> {
  try {
    console.log('📊 Extracting text from XLSX...')

    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(buffer)

    let extractedText = ''

    // Iterate through all worksheets
    workbook.eachSheet((worksheet, sheetId) => {
      extractedText += `\n=== SHEET: ${worksheet.name} ===\n`

      // Iterate through all rows
      worksheet.eachRow((row, rowNumber) => {
        const rowValues: string[] = []

        // Iterate through all cells in the row
        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
          const cellValue = cell.value

          if (cellValue !== null && cellValue !== undefined) {
            // Handle different cell value types
            if (typeof cellValue === 'object' && 'text' in cellValue) {
              rowValues.push(String(cellValue.text))
            } else {
              rowValues.push(String(cellValue))
            }
          } else {
            rowValues.push('')
          }
        })

        // Add row as tab-separated values
        if (rowValues.some(v => v.trim() !== '')) {
          extractedText += `Row ${rowNumber}: ${rowValues.join('\t')}\n`
        }
      })

      extractedText += '\n'
    })

    console.log('✅ Text extracted from XLSX')
    console.log('📏 Extracted text length:', extractedText.length, 'characters')
    console.log('📝 Preview:', extractedText.substring(0, 300))

    return extractedText
  } catch (error) {
    console.error('❌ Error extracting text from XLSX:', error)
    throw new Error(`Failed to extract text from XLSX: ${error instanceof Error ? error.message : String(error)}`)
  }
}

/**
 * Extract text based on file format
 */
export async function extractTextFromDocument(
  buffer: Buffer,
  format: 'docx' | 'xlsx' | 'pdf'
): Promise<string | null> {
  switch (format) {
    case 'docx':
      return await extractTextFromDOCX(buffer)

    case 'xlsx':
      return await extractTextFromXLSX(buffer)

    case 'pdf':
      // PDF can be sent directly to Gemini, no extraction needed
      return null

    default:
      console.warn('⚠️ Unknown format for text extraction:', format)
      return null
  }
}
