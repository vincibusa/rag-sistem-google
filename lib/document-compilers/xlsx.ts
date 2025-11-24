import ExcelJS from 'exceljs'

/**
 * Create an XLSX spreadsheet from filled text
 * Parses the filled text and creates a new spreadsheet
 */
export async function compileXLSXTemplate(
  filledText: string
): Promise<Uint8Array> {
  try {
    console.log('📊 Creating XLSX from filled text...')
    console.log('📏 Filled text length:', filledText.length, 'characters')

    // Create a new workbook
    const workbook = new ExcelJS.Workbook()

    // Parse the filled text - expect format like:
    // === SHEET: Sheet1 ===
    // Row 1: Cell1\tCell2\tCell3
    // Row 2: Data1\tData2\tData3

    const sheets = filledText.split(/=== SHEET: (.+?) ===/)

    for (let i = 1; i < sheets.length; i += 2) {
      const sheetName = sheets[i].trim()
      const sheetContent = sheets[i + 1].trim()

      console.log(`📋 Creating sheet: ${sheetName}`)

      const worksheet = workbook.addWorksheet(sheetName)

      // Parse rows
      const lines = sheetContent.split('\n').filter(line => line.trim() !== '')

      for (const line of lines) {
        // Extract row data
        // Format: Row X: value1\tvalue2\tvalue3
        const rowMatch = line.match(/Row \d+: (.+)/)
        if (rowMatch) {
          const rowData = rowMatch[1].split('\t')
          worksheet.addRow(rowData)
          console.log(`  ✓ Added row with ${rowData.length} cells`)
        }
      }
    }

    // If no sheets were parsed, create a simple sheet with the text
    if (workbook.worksheets.length === 0) {
      console.log('⚠️ No structured data found, creating simple sheet')
      const worksheet = workbook.addWorksheet('Sheet1')

      // Split text into lines and add as rows
      const lines = filledText.split('\n')
      for (const line of lines) {
        if (line.trim()) {
          // Try to split by common delimiters
          const cells = line.includes('\t') ? line.split('\t') : [line]
          worksheet.addRow(cells)
        }
      }
    }

    console.log('✅ XLSX compiled successfully')
    console.log(`📊 Created ${workbook.worksheets.length} sheet(s)`)

    // Generate the XLSX buffer
    const buffer = await workbook.xlsx.writeBuffer()
    return new Uint8Array(buffer)
  } catch (error) {
    console.error('❌ Error compiling XLSX:', error)

    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack
      })
    }

    throw new Error(`Failed to compile XLSX template: ${error instanceof Error ? error.message : String(error)}`)
  }
}

