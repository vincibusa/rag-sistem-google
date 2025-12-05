import { GoogleGenAI } from '@google/genai'
import { streamChatWithFileSearch } from './file-search'
import { GEMINI_MODEL, AI_MODELS } from './constants'
import { getCachedSystemPrompt } from './cache-manager'
import {
  selectModelForQuery,
  getCompilationModel,
  calculateCostSavings
} from './model-selector'

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
 * Base RAG system prompt (for caching)
 * This is the static part that can be cached
 */
const RAG_BASE_SYSTEM_PROMPT = `You are a helpful AI assistant specialized in answering questions about documents.

Your capabilities:
- You can search through uploaded documents using File Search
- You have access to extracted business entities and their attributes
- You provide accurate, sourced answers based on document content

When answering questions:
1. Search the documents for relevant information
2. Provide clear, concise answers with context from the documents
3. If information is not found, say so clearly
4. Always cite the document sections you're referencing

Be helpful, accurate, and always cite your sources from the documents.`

/**
 * Base compilation system prompt (for caching)
 * This is the static part that can be cached
 */
const COMPILATION_BASE_SYSTEM_PROMPT = `You are an ULTRA-ACCURATE document compilation assistant. Your PRIMARY GOAL is ACCURACY and COMPLETENESS.

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
1. GENERATE THE FULL DOCUMENT FROM START TO FINISH.
2. If data is missing -> Use {{placeholders}} (e.g., {{BIRTH_DATE}}) and CONTINUE generating.
3. DO NOT STOP until you reach the end of the document.
4. List missing data in the "MISSING DATA & QUESTIONS" section at the very bottom.

START NOW.`

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

    // Format entities for all modes
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

` : ''

    if (documentContext) {
      // COMPILATION MODE - Document filling assistant

      // Try to use cached base prompt (this saves ~1500 tokens)
      const cachedPromptId = await getCachedSystemPrompt('compilation', COMPILATION_BASE_SYSTEM_PROMPT)

      // Build dynamic context (document-specific, cannot be cached)
      const dynamicContext = `
DOCUMENT INFORMATION:
- File name: ${documentContext.fileName}
- File type: ${documentContext.fileType}

EXTRACTED TEXT FROM DOCUMENT:
${documentContext.extractedText}

${documentContext.compiledContent ? `CURRENT COMPILED VERSION:\n${documentContext.compiledContent}\n\n` : ''}${entitiesText}

${
          documentContext.fileType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
          documentContext.fileType === 'application/vnd.ms-excel'
            ? `
█ EXCEL-SPECIFIC FORMATTING (THIS IS AN EXCEL FILE) █

This is an Excel/spreadsheet document. Format your output EXACTLY like this:

=== SHEET: SheetName ===
Row 1: Header1\tHeader2\tHeader3\tHeader4
Row 2: Value1\tValue2\tValue3\tValue4
Row 3: Value5\tValue6\tValue7\tValue8

CRITICAL EXCEL RULES:
✓ Start each sheet with: === SHEET: [SheetName] ===
✓ Use TAB characters (\\t) to separate cells
✓ Number rows starting from 1
✓ Fill ALL cells with appropriate data
✓ Use Excel formula syntax for calculations: =SUM(A1:A10)
✓ Leave empty cells as empty (nothing between tabs)
✓ Process ALL sheets in the document
✓ Do NOT use commas or other delimiters - ONLY tabs
✓ Preserve original sheet names from the document

Example format with 3 sheets:
=== SHEET: Anagrafi ===
Row 1: Nome\tCognome\tData Nascita
Row 2: Mario\tRossi\t15/06/1980

=== SHEET: Contatti ===
Row 1: Email\tTelefono\tIndirizzo
Row 2: mario@example.com\t+39 0234567\tVia Roma 5

After generating the Excel content, include the compilation report.
`
            : ''
        }`

      // Construct system prompt: use cache if available, otherwise full prompt
      let systemPrompt: string
      if (cachedPromptId) {
        // Using cached base prompt + dynamic context
        console.log('🚀 Using CACHED compilation prompt (saving ~1500 tokens)')
        systemPrompt = dynamicContext
      } else {
        // Fallback: full prompt (cache not available)
        console.log('⚠️ Cache not available, using full prompt')
        systemPrompt = COMPILATION_BASE_SYSTEM_PROMPT + '\n' + dynamicContext
      }

      contextualMessages = [
        { role: 'assistant' as const, content: systemPrompt },
        ...messages,
      ]
      console.log('🤖 System Prompt generated with entities length:', entitiesText.length)
    } else {
      // RAG MODE - Document search and question answering

      // Try to use cached base prompt for RAG (saves ~200 tokens)
      const cachedPromptId = await getCachedSystemPrompt('rag', RAG_BASE_SYSTEM_PROMPT)

      // Build dynamic context (entities, cannot be cached)
      let ragSystemPrompt: string
      if (cachedPromptId) {
        // Using cached base prompt + entities
        console.log('🚀 Using CACHED RAG prompt (saving ~200 tokens)')
        ragSystemPrompt = entitiesText
      } else {
        // Fallback: full prompt
        console.log('⚠️ Cache not available, using full RAG prompt')
        ragSystemPrompt = RAG_BASE_SYSTEM_PROMPT + '\n' + entitiesText
      }

      contextualMessages = [
        { role: 'assistant' as const, content: ragSystemPrompt },
        ...messages,
      ]
      console.log('🎯 RAG Mode System Prompt generated')
    }

    // If file search stores are available, use them for RAG
    if (fileSearchStoreNames && fileSearchStoreNames.length > 0) {
      console.log('🔎 Using File Search with stores:', fileSearchStoreNames)

      // Select appropriate model based on query complexity (only for RAG mode)
      let selectedModel: string
      if (documentContext) {
        // Compilation mode: always use full flash for accuracy
        selectedModel = getCompilationModel()
        console.log('📄 Using compilation model (flash) for accuracy')
      } else {
        // RAG mode: select based on query complexity
        const lastUserMessage = messages[messages.length - 1]
        const userQuery = lastUserMessage?.role === 'user' ? lastUserMessage.content : ''
        selectedModel = selectModelForQuery(userQuery, messages.length)

        // Log potential savings
        if (selectedModel === AI_MODELS.RAG_SIMPLE) {
          console.log('💰 Using flash-lite: expect 60-70% cost savings compared to flash')
        }
      }

      // Get cached prompt ID for File Search
      const cachedPromptIdForFileSearch = !documentContext
        ? await getCachedSystemPrompt('rag', RAG_BASE_SYSTEM_PROMPT)
        : null

      // Stream from File Search with RAG (with optional cached content and dynamic model)
      let citations: any = null
      for await (const chunk of streamChatWithFileSearch(
        contextualMessages,
        fileSearchStoreNames,
        cachedPromptIdForFileSearch,
        selectedModel
      )) {
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

    // Select model for fallback case
    let fallbackModel: string
    if (documentContext) {
      fallbackModel = getCompilationModel()
    } else {
      const lastUserMessage = messages[messages.length - 1]
      const userQuery = lastUserMessage?.role === 'user' ? lastUserMessage.content : ''
      fallbackModel = selectModelForQuery(userQuery, messages.length)

      if (fallbackModel === AI_MODELS.RAG_SIMPLE) {
        console.log('💰 Using flash-lite for fallback: expect 60-70% cost savings')
      }
    }

    const response = await client.models.generateContent({
      model: fallbackModel,
      contents: prompt,
      config: {
        thinkingConfig: {
          thinkingBudget: 0,
        },
        maxOutputTokens: 8192,
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
