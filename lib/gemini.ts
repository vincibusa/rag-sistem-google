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
  fileSearchStoreNames: string[] = []
) {
  try {
    // If file search stores are available, use them for RAG
    if (fileSearchStoreNames && fileSearchStoreNames.length > 0) {
      // Stream from File Search with RAG
      let citations: any = null
      for await (const chunk of streamChatWithFileSearch(messages, fileSearchStoreNames)) {
        yield chunk
      }
      // Note: To get citations, we'd need to modify streamChatWithFileSearch to yield them separately
      // For now, they're attached to the final response
      return
    }

    // Fallback: Regular chat without File Search
    // Build a simple prompt from the messages
    const prompt = messages
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
