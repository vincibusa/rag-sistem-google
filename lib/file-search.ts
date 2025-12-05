import { GoogleGenAI } from '@google/genai'
import { GEMINI_MODEL } from './constants'

const apiKey = process.env.GOOGLE_GEMINI_API_KEY
if (!apiKey) {
  throw new Error('GOOGLE_GEMINI_API_KEY environment variable is required')
}

const client = new GoogleGenAI({ apiKey })

export { client }

/**
 * Create a new File Search Store for a notebook
 */
export async function createFileSearchStore(displayName: string) {
  try {
    const fileSearchStore = await client.fileSearchStores.create({
      config: { displayName }
    })
    return fileSearchStore
  } catch (error) {
    console.error('Error creating File Search store:', error)
    throw error
  }
}

/**
 * Upload a file directly to a File Search Store
 * This handles upload + chunking + embedding + indexing automatically
 */
export async function uploadToFileSearchStore(
  file: Buffer,
  fileSearchStoreName: string,
  fileName: string
) {
  const fs = require('fs')
  try {
    console.log('Starting File Search upload:', { fileName, fileSearchStoreName, fileSize: file.length })

    // Create a temporary file for upload
    const tempFilePath = `/tmp/${fileName}`
    fs.writeFileSync(tempFilePath, file)
    console.log('Created temp file:', tempFilePath)

    // Upload and import to File Search store
    // The API handles chunking, embedding, and indexing automatically
    console.log('Calling uploadToFileSearchStore API...')
    const result = await client.fileSearchStores.uploadToFileSearchStore({
      file: tempFilePath,
      fileSearchStoreName: fileSearchStoreName,
      config: {
        displayName: fileName,
      }
    })
    console.log('API response received:', {
      resultType: typeof result,
      resultKeys: result ? Object.keys(result) : 'null',
      result: JSON.stringify(result, null, 2).substring(0, 500) // Limit output length
    })

    // Clean up temp file
    try {
      fs.unlinkSync(tempFilePath)
      console.log('Temp file cleaned up')
    } catch (e) {
      console.warn('Failed to clean up temp file:', e)
    }

    if (!result) {
      throw new Error('No response from File Search upload')
    }

    // The API returns the document/file object directly
    // No need to poll for operation completion - it's handled server-side
    console.log('File Search upload completed successfully')
    return result as any
  } catch (error) {
    console.error('Error uploading to File Search store:', {
      errorMessage: error instanceof Error ? error.message : String(error),
      errorStack: error instanceof Error ? error.stack : 'No stack trace',
      errorType: typeof error
    })
    throw error
  }
}

/**
 * List all File Search stores
 */
export async function listFileSearchStores() {
  try {
    const stores: any[] = []
    const listResult = client.fileSearchStores.list() as any

    if (listResult && typeof listResult[Symbol.asyncIterator] === 'function') {
      for await (const store of listResult) {
        stores.push(store)
      }
    }
    return stores
  } catch (error) {
    console.error('Error listing File Search stores:', error)
    throw error
  }
}

/**
 * Get a specific File Search store by name
 */
export async function getFileSearchStore(name: string) {
  try {
    const store = await client.fileSearchStores.get({ name })
    return store
  } catch (error) {
    console.error('Error getting File Search store:', error)
    throw error
  }
}

/**
 * Delete a File Search store
 */
export async function deleteFileSearchStore(name: string) {
  try {
    await client.fileSearchStores.delete({
      name,
      config: { force: true }
    })
  } catch (error) {
    console.error('Error deleting File Search store:', error)
    throw error
  }
}

/**
 * Query with File Search for RAG
 */
export async function* streamChatWithFileSearch(
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  fileSearchStoreNames: string[]
) {
  try {
    // Build prompt from messages
    const prompt = messages
      .map((msg) => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
      .join('\n\n')

    // Generate content with File Search tool using streaming
    const stream = await client.models.generateContentStream({
      model: GEMINI_MODEL,
      contents: prompt,
      config: {
        tools: [
          {
            fileSearch: {
              fileSearchStoreNames: fileSearchStoreNames
            }
          }
        ],
        thinkingConfig: {
          thinkingBudget: 0,
        },
        maxOutputTokens: 8192,
      }
    })

    // Yield chunks as they arrive from Gemini for real-time streaming
    let lastChunk: any = null
    for await (const chunk of stream) {
      if (chunk.text) {
        yield chunk.text
      } else if (chunk.candidates && chunk.candidates[0]) {
        // Handle cases where text is in candidates structure
        const content = chunk.candidates[0].content
        if (content && content.parts) {
          for (const part of content.parts) {
            if (part.text) {
              yield part.text
            }
          }
        }
      }
      lastChunk = chunk
    }

    // Return grounding metadata for citations from final chunk
    return lastChunk?.candidates?.[0]?.groundingMetadata
  } catch (error) {
    console.error('Error querying with File Search:', error)

    // Check for rate limit error
    const errorString = JSON.stringify(error)
    if (errorString.includes('429') || errorString.includes('Too Many Requests')) {
      throw new Error('API quota exceeded. The service rate limit has been reached. Please try again in a moment or check your API quota.')
    }

    throw error
  }
}
