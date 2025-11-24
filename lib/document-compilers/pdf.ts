import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'

/**
 * Create a PDF document from filled text
 * This generates a new PDF with the filled content
 */
export async function compilePDFTemplate(
  filledText: string
): Promise<Uint8Array> {
  try {
    console.log('📄 Creating PDF from filled text...')
    console.log('📏 Filled text length:', filledText.length, 'characters')

    // Generate new PDF with filled data
    const pdfBytes = await generatePDFFromText(filledText)

    console.log('✅ PDF compiled successfully')
    return pdfBytes
  } catch (error) {
    console.error('❌ Error compiling PDF:', error)

    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack
      })
    }

    throw new Error(`Failed to compile PDF template: ${error instanceof Error ? error.message : String(error)}`)
  }
}

/**
 * Generate a PDF from filled text
 */
async function generatePDFFromText(
  filledText: string
): Promise<Uint8Array> {
  try {
    console.log('📝 Generating PDF from filled text...')

    // Create PDF from filled text
    const pdfDoc = await PDFDocument.create()
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

    const fontSize = 10
    const lineHeight = 12
    const margin = 50
    const pageWidth = 595.28 // A4 width in points
    const pageHeight = 841.89 // A4 height in points
    const maxWidth = pageWidth - (margin * 2)

    let currentPage = pdfDoc.addPage([pageWidth, pageHeight])
    let yPosition = pageHeight - margin

    // Split text into lines
    const lines = filledText.split('\n')

    for (const line of lines) {
      // Handle empty lines
      if (line.trim() === '') {
        yPosition -= lineHeight / 2
        continue
      }

      // Word wrap long lines
      const words = line.split(' ')
      let currentLine = ''

      for (const word of words) {
        const testLine = currentLine + (currentLine ? ' ' : '') + word
        const width = font.widthOfTextAtSize(testLine, fontSize)

        if (width > maxWidth && currentLine) {
          // Draw current line
          if (yPosition < margin) {
            currentPage = pdfDoc.addPage([pageWidth, pageHeight])
            yPosition = pageHeight - margin
          }

          currentPage.drawText(currentLine, {
            x: margin,
            y: yPosition,
            size: fontSize,
            font: font,
            color: rgb(0, 0, 0),
          })
          yPosition -= lineHeight
          currentLine = word
        } else {
          currentLine = testLine
        }
      }

      // Draw remaining text
      if (currentLine) {
        if (yPosition < margin) {
          currentPage = pdfDoc.addPage([pageWidth, pageHeight])
          yPosition = pageHeight - margin
        }

        currentPage.drawText(currentLine, {
          x: margin,
          y: yPosition,
          size: fontSize,
          font: font,
          color: rgb(0, 0, 0),
        })
        yPosition -= lineHeight
      }
    }

    const pdfBytes = await pdfDoc.save()
    console.log('✅ PDF generated from template')
    return pdfBytes
  } catch (error) {
    console.error('Error generating PDF from text:', error)
    throw error
  }
}

