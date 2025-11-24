import * as XLSX from 'xlsx'
import mammoth from 'mammoth'
import WordExtractor from 'word-extractor'

interface ConvertedFile {
  buffer: Buffer
  mimeType: string
  convertedFilename: string
}

export async function convertFileIfNeeded(
  buffer: Buffer,
  mimeType: string,
  filename: string
): Promise<ConvertedFile> {
  // Files that need conversion
  const needsConversion = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-excel', // .xls
    'application/msword', // .doc
  ]

  if (!needsConversion.includes(mimeType)) {
    // File is already supported, return as-is
    return {
      buffer,
      mimeType,
      convertedFilename: filename,
    }
  }

  // Excel files (.xlsx, .xls) -> CSV
  if (
    mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    mimeType === 'application/vnd.ms-excel'
  ) {
    return convertExcelToCSV(buffer, filename)
  }

  // Word legacy files (.doc) -> Plain text
  if (mimeType === 'application/msword') {
    return convertDocToText(buffer, filename)
  }

  // Fallback: return original if no conversion matched
  return {
    buffer,
    mimeType,
    convertedFilename: filename,
  }
}

async function convertExcelToCSV(buffer: Buffer, filename: string): Promise<ConvertedFile> {
  try {
    // Read the Excel file
    const workbook = XLSX.read(buffer, { type: 'buffer' })

    // Get all sheet names
    const sheetNames = workbook.SheetNames

    // Convert all sheets to CSV
    let combinedCSV = ''

    sheetNames.forEach((sheetName, index) => {
      const worksheet = workbook.Sheets[sheetName]
      const csv = XLSX.utils.sheet_to_csv(worksheet)

      // Add sheet separator if there are multiple sheets
      if (sheetNames.length > 1) {
        combinedCSV += `---SHEET: ${sheetName}---\n`
      }

      combinedCSV += csv

      // Add newline between sheets
      if (index < sheetNames.length - 1) {
        combinedCSV += '\n\n'
      }
    })

    // Convert to buffer
    const csvBuffer = Buffer.from(combinedCSV, 'utf-8')

    // Change filename extension to .csv
    const convertedFilename = filename.replace(/\.(xlsx|xls)$/i, '.csv')

    return {
      buffer: csvBuffer,
      mimeType: 'text/csv',
      convertedFilename,
    }
  } catch (error) {
    throw new Error(`Failed to convert Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

async function convertDocToText(buffer: Buffer, filename: string): Promise<ConvertedFile> {
  try {
    // Use word-extractor for legacy .doc files
    const extractor = new WordExtractor()
    const extracted = await extractor.extract(buffer)
    const text = extracted.getBody()

    // Convert to buffer
    const textBuffer = Buffer.from(text, 'utf-8')

    // Change filename extension to .txt
    const convertedFilename = filename.replace(/\.doc$/i, '.txt')

    return {
      buffer: textBuffer,
      mimeType: 'text/plain',
      convertedFilename,
    }
  } catch (error) {
    throw new Error(`Failed to convert Word document: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}
