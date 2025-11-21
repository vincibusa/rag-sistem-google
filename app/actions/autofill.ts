'use server'

import { createServerSupabaseClient } from '@/lib/supabase-server'
import { client } from '@/lib/gemini'
import { AutofillData } from '@/lib/types'
import { GEMINI_MODEL } from '@/lib/constants'

export async function generateAutofilledDocumentAction(
  userId: string,
  accessToken: string,
  templateFileUri: string,
  sourceFileUris: string[]
): Promise<string> {
  try {
    const supabase = createServerSupabaseClient(accessToken)

    // Build the prompt for autofill
    const prompt = `You are a document autofill assistant. The user has provided:
1. A template document that needs to be filled
2. Source documents containing information to fill in the template

Your task is to:
1. Analyze the template document to understand what fields need to be filled
2. Search through the source documents for relevant information
3. Fill in all the fields in the template with the extracted information
4. Return ONLY the completed template document, without any explanations or additional text

Please proceed with autofilling the template document.`

    const response = await client.models.generateContent({
      model: GEMINI_MODEL,
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: prompt,
            },
            {
              fileData: {
                fileUri: templateFileUri,
                mimeType: 'application/pdf',
              },
            },
            ...sourceFileUris.map((uri) => ({
              fileData: {
                fileUri: uri,
                mimeType: 'application/pdf',
              },
            })),
          ],
        },
      ],
      config: {
        thinkingConfig: {
          thinkingBudget: 0,
        },
      },
    })

    if (!response.text) {
      throw new Error('No response from AI model')
    }

    return response.text
  } catch (error) {
    console.error('Error generating autofilled document:', error)
    throw error
  }
}
