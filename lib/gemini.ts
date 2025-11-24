import { GoogleGenAI } from '@google/genai'
import { streamChatWithFileSearch } from './file-search'
import { GEMINI_MODEL } from './constants'

const apiKey = process.env.GOOGLE_GEMINI_API_KEY
if (!apiKey) {
  throw new Error('GOOGLE_GEMINI_API_KEY environment variable is required')
}

const client = new GoogleGenAI({ apiKey })

export { client }

export function getModel() {
  return client.models.get({ model: GEMINI_MODEL })
}

/**
 * Stream chat response with File Search RAG
 * This integrates with File Search stores for semantic search and citations
 */
export async function* streamChatResponse(
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  fileSearchStoreNames: string[] = [],
  documentContext?: {
    fileName: string
    fileType: string
    extractedText: string
    compiledContent?: string
  }
) {
  try {
    // Prepend document context to messages if available
    let contextualMessages = messages
    if (documentContext) {
      const systemPrompt = `You are a proactive document compilation assistant. The user has uploaded a document that needs to be filled out.

DOCUMENT INFORMATION:
- File name: ${documentContext.fileName}
- File type: ${documentContext.fileType}

EXTRACTED TEXT FROM DOCUMENT:
${documentContext.extractedText}

${documentContext.compiledContent ? `CURRENT COMPILED VERSION:\n${documentContext.compiledContent}\n\n` : ''}

YOUR TASK:
1. When the user asks to fill/compile the document with data about specific people or entities (e.g., "Di Fisco Massimo", "mediterranea eng"):
   - FIRST: Analyze the document to identify what fields need to be filled
   - SECOND: Use File Search to search the uploaded documents in this notebook for the relevant data
   - THIRD: Look through the chat history for any data the user has provided
   - FOURTH: Fill in ALL fields you can find data for
   - ONLY ask the user for information if you cannot find it anywhere after searching thoroughly

2. Be PROACTIVE - if the user mentions a person or company name, search for their data and use it to fill the document

3. When providing the compiled document, provide the COMPLETE updated document text with all available data filled in

4. Maintain the original document structure and formatting as much as possible

5. Replace placeholders (like {{name}}, {{date}}, _____, etc.) with actual values found in the documents or chat history

6. Be iterative - the user may ask for multiple changes

IMPORTANT: Do NOT ask for information that might already exist in the uploaded documents or previous chat messages. Search first, then ask only if truly necessary.

Always provide the FULL document text in your responses when making changes, not just the changed parts.`

      contextualMessages = [
        { role: 'assistant' as const, content: systemPrompt },
        ...messages,
      ]
    }

    // If file search stores are available, use them for RAG
    if (fileSearchStoreNames && fileSearchStoreNames.length > 0) {
      // Stream from File Search with RAG
      let citations: any = null
      for await (const chunk of streamChatWithFileSearch(contextualMessages, fileSearchStoreNames)) {
        yield chunk
      }
      // Note: To get citations, we'd need to modify streamChatWithFileSearch to yield them separately
      // For now, they're attached to the final response
      return
    }

    // Fallback: Regular chat without File Search
    // Build a simple prompt from the messages
    const prompt = contextualMessages
      .map((msg) => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
      .join('\n\n')

    const response = await client.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
      config: {
        thinkingConfig: {
          thinkingBudget: 0,
        },
      },
    })

    if (response.text) {
      yield response.text
    }
  } catch (error) {
    console.error('Error streaming chat response:', error)

    // Check for rate limit error and provide user-friendly message
    const errorString = JSON.stringify(error)
    if (errorString.includes('429') || errorString.includes('Too Many Requests')) {
      throw new Error('API quota exceeded. The service rate limit has been reached. Please try again in a moment or check your API quota.')
    }

    throw error
  }
}

/**
 * Upload a file temporarily to Gemini (not to File Search)
 * This file can be used in generateContent but won't be indexed for search
 */
export async function uploadTemporaryFile(
  buffer: Buffer,
  fileName: string,
  mimeType: string
) {
  const fs = require('fs')
  const tempPath = `/tmp/${fileName}`

  try {
    // Write buffer to temporary file
    fs.writeFileSync(tempPath, buffer)
    console.log('📤 Uploading temporary file:', fileName)

    // Upload to Gemini Files API (temporary storage)
    const uploadedFile = await client.files.upload({
      file: tempPath,
      config: {
        displayName: fileName,
        mimeType: mimeType
      }
    })

    console.log('✅ Temporary file uploaded:', uploadedFile.name)

    // Clean up local temp file
    try {
      fs.unlinkSync(tempPath)
    } catch (e) {
      console.warn('⚠️ Failed to clean up local temp file:', e)
    }

    return uploadedFile
  } catch (error) {
    // Ensure cleanup on error
    try {
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath)
      }
    } catch (e) {
      console.warn('⚠️ Failed to clean up temp file on error:', e)
    }
    throw error
  }
}

/**
 * Delete a temporary file from Gemini
 */
export async function deleteTemporaryFile(fileName: string) {
  try {
    console.log('🗑️ Deleting temporary file:', fileName)
    await client.files.delete({ name: fileName })
    console.log('✅ Temporary file deleted')
  } catch (error) {
    console.error('❌ Error deleting temporary file:', error)
    // Don't throw - file deletion is cleanup, shouldn't break the flow
  }
}
