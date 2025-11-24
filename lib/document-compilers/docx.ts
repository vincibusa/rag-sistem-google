import PizZip from 'pizzip'

/**
 * Create a DOCX document from filled text
 * This generates a new DOCX with the filled content
 */
export async function compileDOCXTemplate(
  filledText: string
): Promise<Uint8Array> {
  try {
    console.log('\n========== DOCX COMPILATION START ==========')
    console.log('📝 Creating DOCX from filled text...')
    console.log('📏 Filled text length:', filledText.length, 'characters')

    // Create a minimal DOCX structure
    const zip = new PizZip()

    // Add [Content_Types].xml
    zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`)

    // Add _rels/.rels
    zip.folder('_rels')
    zip.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`)

    // Add word/document.xml with the filled text
    zip.folder('word')

    // Convert text to Word XML paragraphs
    const paragraphs = filledText.split('\n').map(line => {
      // Escape XML special characters
      const escapedLine = line
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;')

      return `<w:p><w:r><w:t xml:space="preserve">${escapedLine}</w:t></w:r></w:p>`
    }).join('\n')

    zip.file('word/document.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${paragraphs}
  </w:body>
</w:document>`)

    // Generate the DOCX buffer
    console.log('📦 Generating DOCX buffer...')
    const compiledBuffer = zip.generate({
      type: 'uint8array',
      compression: 'DEFLATE'
    })

    console.log('✅ DOCX compiled successfully')
    console.log('📏 Compiled document size:', compiledBuffer.length, 'bytes')
    console.log('========== DOCX COMPILATION END ==========\n')
    return compiledBuffer
  } catch (error) {
    console.error('❌ Error compiling DOCX:', error)

    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack
      })
    }

    throw new Error(`Failed to compile DOCX template: ${error instanceof Error ? error.message : String(error)}`)
  }
}

