import { client } from './gemini'
import { GEMINI_MODEL } from './constants'

/**
 * Entity types that can be extracted from documents
 */
export type EntityType = 'person' | 'company' | 'date' | 'address' | 'other'

/**
 * Structured entity extracted from a document
 */
export interface ExtractedEntity {
  entity_type: EntityType
  entity_name: string
  attributes: Record<string, any>
}

/**
 * Person attributes
 */
export interface PersonAttributes {
  first_name?: string
  last_name?: string
  full_name?: string
  birth_date?: string
  birth_place?: string
  profession?: string
  tax_code?: string // codice fiscale
  phone?: string
  email?: string
  address?: string
  city?: string
  province?: string
  postal_code?: string
  country?: string
  [key: string]: any
}

/**
 * Company attributes
 */
export interface CompanyAttributes {
  company_name?: string
  legal_name?: string
  vat_number?: string // partita IVA
  tax_code?: string // codice fiscale
  registration_number?: string
  headquarters_address?: string
  headquarters_city?: string
  headquarters_province?: string
  headquarters_postal_code?: string
  legal_representative?: string
  phone?: string
  email?: string
  pec?: string
  website?: string
  [key: string]: any
}

/**
 * Extract structured entities from document text using Gemini AI
 */
export async function extractEntitiesFromText(
  text: string,
  fileName: string
): Promise<ExtractedEntity[]> {
  try {
    const prompt = `You are an expert data extraction AI. Your task is to extract ALL structured entities from the following document.

DOCUMENT NAME: ${fileName}

DOCUMENT TEXT:
${text}

═══════════════════════════════════════════════════════════════
EXTRACTION RULES:
═══════════════════════════════════════════════════════════════

1. Extract EVERY person mentioned with ANY identifying information
2. Extract EVERY company mentioned with ANY identifying information
3. Extract ALL dates that refer to specific events (birth dates, contract dates, etc.)
4. Extract ALL addresses
5. For each entity, extract AS MANY attributes as possible

ENTITY TYPES:

█ PERSON █
Extract:
- first_name, last_name, full_name
- birth_date (format: YYYY-MM-DD if possible)
- birth_place (city, province, country)
- profession, role, title
- tax_code (codice fiscale)
- phone, email
- address, city, province, postal_code, country

█ COMPANY █
Extract:
- company_name, legal_name
- vat_number (P.IVA), tax_code (CF)
- registration_number
- headquarters_address, headquarters_city, headquarters_province, headquarters_postal_code
- legal_representative
- phone, email, pec, website

█ DATE █
Extract significant dates with context:
- event_type: "birth", "contract_signature", "deadline", etc.
- date: YYYY-MM-DD format if possible
- related_to: person or company name

█ ADDRESS █
Extract complete addresses:
- street, city, province, postal_code, country
- related_to: person or company name

OUTPUT FORMAT:
Return ONLY a valid JSON array. Each object must have:
{
  "entity_type": "person" | "company" | "date" | "address" | "other",
  "entity_name": "string (main identifier)",
  "attributes": { ...all extracted data... }
}

IMPORTANT:
- Return ONLY the JSON array, no other text
- If no entities found, return empty array []
- Be thorough: extract EVERY entity with ANY information
- Include uncertain data but mark it: {"uncertain": true}

START EXTRACTION NOW:`

    const response = await client.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
      config: {
        temperature: 0.1, // Low temperature for precise extraction
        maxOutputTokens: 4096,
        thinkingConfig: {
          thinkingBudget: 0,
        },
      },
    })

    if (!response.text) {
      console.warn('⚠️ No response text from entity extraction')
      return []
    }

    // Parse JSON response
    const responseText = response.text.trim()

    // Try to extract JSON array from response (in case AI added markdown or other text)
    let jsonText = responseText
    const jsonMatch = responseText.match(/\[[\s\S]*\]/)
    if (jsonMatch) {
      jsonText = jsonMatch[0]
    } else {
      // If no complete array found, try to find the start of an array
      const startMatch = responseText.match(/\[[\s\S]*/)
      if (startMatch) {
        jsonText = startMatch[0]
      }
    }

    let entities: ExtractedEntity[] = []
    try {
      entities = JSON.parse(jsonText) as ExtractedEntity[]
    } catch (parseError) {
      console.warn('⚠️ Initial JSON parse failed, attempting to repair truncated JSON...')

      // Attempt to repair truncated JSON
      try {
        // Simple repair: close open objects and arrays
        // This is a heuristic and might not work for all cases
        let repairedJson = jsonText.trim()

        // Count open brackets/braces
        let openBraces = (repairedJson.match(/\{/g) || []).length
        let closeBraces = (repairedJson.match(/\}/g) || []).length
        let openBrackets = (repairedJson.match(/\[/g) || []).length
        let closeBrackets = (repairedJson.match(/\]/g) || []).length

        // Close unclosed strings first (if the cut happened inside a string)
        const quoteCount = (repairedJson.match(/"/g) || []).length
        if (quoteCount % 2 !== 0) {
          repairedJson += '"'
        }

        // Add missing closing braces/brackets
        while (openBraces > closeBraces) {
          repairedJson += '}'
          closeBraces++
        }
        while (openBrackets > closeBrackets) {
          repairedJson += ']'
          closeBrackets++
        }

        entities = JSON.parse(repairedJson) as ExtractedEntity[]
        console.log('✅ Successfully parsed repaired JSON')
      } catch (repairError) {
        console.error('❌ Failed to parse repaired JSON:', repairError)
        // If repair fails, try to parse just the valid objects we have so far
        // This is a fallback to get partial data
        try {
          // Find the last closing brace that matches a top-level object
          // This is tricky with regex, so we might just give up or try a simpler approach
          // For now, let's just re-throw the original error to be handled below
          throw parseError
        } catch (e) {
          throw parseError
        }
      }
    }

    // Validate and clean entities
    const validEntities = entities.filter(entity => {
      return (
        entity.entity_type &&
        entity.entity_name &&
        typeof entity.entity_name === 'string' &&
        entity.entity_name.trim().length > 0 &&
        ['person', 'company', 'date', 'address', 'other'].includes(entity.entity_type)
      )
    })

    console.log(`✅ Extracted ${validEntities.length} entities from ${fileName}`)
    return validEntities
  } catch (error) {
    console.error('❌ Error extracting entities:', error)
    return []
  }
}

/**
 * Group entities by type
 */
export function groupEntitiesByType(entities: ExtractedEntity[]): Record<EntityType, ExtractedEntity[]> {
  return {
    person: entities.filter(e => e.entity_type === 'person'),
    company: entities.filter(e => e.entity_type === 'company'),
    date: entities.filter(e => e.entity_type === 'date'),
    address: entities.filter(e => e.entity_type === 'address'),
    other: entities.filter(e => e.entity_type === 'other'),
  }
}

/**
 * Search for a specific entity by name (case-insensitive, partial match)
 */
export function searchEntity(
  entities: ExtractedEntity[],
  searchTerm: string
): ExtractedEntity | undefined {
  const term = searchTerm.toLowerCase().trim()
  return entities.find(entity =>
    entity.entity_name.toLowerCase().includes(term) ||
    Object.values(entity.attributes).some(value =>
      typeof value === 'string' && value.toLowerCase().includes(term)
    )
  )
}
