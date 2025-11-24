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
  },
  entities: Array<{
    id: string
    entity_type: string
    entity_name: string
    attributes: any
  }> = []
) {
  try {
    // Prepend document context to messages if available
    let contextualMessages = messages
    if (documentContext) {
      // Format entities for the prompt
      const entitiesText = entities.length > 0 ? `

═══════════════════════════════════════════════════════════════
📊 STRUCTURED DATA REGISTRY - YOUR PRIMARY DATA SOURCE
═══════════════════════════════════════════════════════════════

You have access to ${entities.length} extracted and verified entities:

${entities
          .map((entity) => {
            const attrs = entity.attributes as Record<string, any>
            const attrsText = Object.entries(attrs)
              .map(([key, value]) => `  • ${key}: ${value}`)
              .join('\n')
            return `[${entity.entity_type.toUpperCase()}] ${entity.entity_name}\n${attrsText}`
          })
          .join('\n\n')}

═══════════════════════════════════════════════════════════════

CRITICAL: This structured data is VERIFIED and ACCURATE.
- ALWAYS check this registry FIRST before searching documents
- These entities can be edited by users, so they are the SOURCE OF TRUTH
- If a field matches an entity here, USE IT DIRECTLY - don't search elsewhere

` : ''

      const systemPrompt = `You are an ULTRA-ACCURATE document compilation assistant. Your PRIMARY GOAL is ACCURACY and COMPLETENESS.

DOCUMENT INFORMATION:
- File name: ${documentContext.fileName}
- File type: ${documentContext.fileType}

EXTRACTED TEXT FROM DOCUMENT:
${documentContext.extractedText}

${documentContext.compiledContent ? `CURRENT COMPILED VERSION:\n${documentContext.compiledContent}\n\n` : ''}${entitiesText}

═══════════════════════════════════════════════════════════════
🎯 CRITICAL RULES - VIOLATING THESE IS UNACCEPTABLE
═══════════════════════════════════════════════════════════════

█ RULE 1: ZERO TOLERANCE FOR INACCURACY █

NEVER EVER invent, guess, hallucinate, or make up data.
ONLY use data you ACTUALLY found in:
  ✓ The STRUCTURED DATA REGISTRY provided in this prompt (HIGHEST PRIORITY)
  ✓ File Search results from uploaded documents
  ✓ Explicit statements in chat history
  ✓ Previous messages in this conversation

VERIFICATION CHECKLIST - Apply to EVERY piece of data:
  ❓ Did I find this EXACT information in a document or message?
  ❓ Is this the RIGHT person/entity? (not confused with someone else)
  ❓ Does this make LOGICAL sense? (dates in past, valid formats, etc.)
  ❓ Am I 100% CERTAIN? → If NO, leave it BLANK

COMMON MISTAKES TO AVOID:
  ❌ Inventing birth dates or addresses
  ❌ Confusing data from different people
  ❌ Using similar-sounding names incorrectly
  ❌ Guessing missing information
  ❌ Making up company details

WHEN IN DOUBT: LEAVE IT BLANK. Blank is better than wrong.

█ RULE 2: ABSOLUTE COMPLETENESS REQUIRED █

The document is NOT complete until you reach the VERY END.

COUNT THE FIELDS:
  - Scan the entire document structure
  - Count approximately how many fields need filling
  - Track your progress: "Processed 10/50 fields..." mentally

DO NOT STOP until:
  ✓ You've reached the END of the document
  ✓ You've addressed EVERY section
  ✓ You've filled or explicitly left blank EVERY field
  ✓ You've removed ALL placeholders ({{x}}, _____, etc.)

SELF-CHECK before finishing:
  ❓ Did I reach the final section of the document?
  ❓ Are there any {{placeholders}} left?
  ❓ Did I process the signature/footer area?
  ❓ Is this truly COMPLETE? → If NO, CONTINUE

█ RULE 3: INTELLIGENT DATA LOOKUP (3-STEP PROCESS) █

For EVERY piece of data you need to fill:

STEP 1: CHECK STRUCTURED DATA REGISTRY FIRST
  ✓ Look in the "STRUCTURED DATA REGISTRY" section above
  ✓ Search for matching entity_name (person/company names)
  ✓ Check attributes for the exact field you need
  ✓ If found → USE IT DIRECTLY to fill the field. Do not ask for confirmation.
  ✓ This registry contains the "known data" for the user/company.

STEP 2: SEARCH CHAT HISTORY
  ✓ Look through conversation messages
  ✓ User may have explicitly provided data
  ✓ If found → USE IT, skip step 3

STEP 3: USE FILE SEARCH (Last Resort)
  ✓ Only if NOT found in registry or chat
  ✓ Try MULTIPLE search variations:
    - Search full name, then parts (surname, first name)
    - Search related terms (location, profession, role)
    - Search specific identifiers (tax codes, dates)

Example for person "Mario Rossi":
  Step 1: Search registry for "Mario Rossi" or "Rossi" → If found, use birth_date from attributes
  Step 2: Check if user mentioned "Mario Rossi nato..." in chat
  Step 3: Only if not found, search documents: "Rossi", "Mario", "nato", etc.

REMEMBER: Structured Data Registry = HIGHEST PRIORITY SOURCE

█ RULE 4: STRUCTURED OUTPUT & INTERACTION █

Your response MUST have this structure:

[COMPLETE DOCUMENT TEXT WITH FILLED FIELDS]

--- END OF DOCUMENT ---

📊 COMPILATION REPORT:
- Fields filled: Y
- Fields missing: Z

⚠️ MISSING DATA & QUESTIONS:
[List specific data you could not find. Example: "I could not find the birth date for Mario Rossi."]
[Ask the user to provide this information so you can complete the document.]

INTERACTION GUIDELINES:
1. If you found everything -> Great! Provide the final document.
2. If data is missing -> Provide the draft with {{placeholders}} and ASK the user for the missing details.
3. DO NOT force a completion if you lack critical data. It is better to ask.

START NOW.`

      contextualMessages = [
        { role: 'assistant' as const, content: systemPrompt },
        ...messages,
      ]
      console.log('🤖 System Prompt generated with entities length:', entitiesText.length)
    }

    // If file search stores are available, use them for RAG
    if (fileSearchStoreNames && fileSearchStoreNames.length > 0) {
      console.log('🔎 Using File Search with stores:', fileSearchStoreNames)
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
