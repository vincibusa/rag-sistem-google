/**
 * Utility functions for document validation and completeness checking
 */

/**
 * Detects if a text contains unfilled placeholders
 */
export function containsPlaceholders(text: string): boolean {
  if (!text) return false

  // Check for various placeholder patterns
  const patterns = [
    /\{\{[^}]+\}\}/g, // {{placeholder}}
    /_{3,}/g, // ___ (3 or more underscores)
    /\[vuoto\]/gi, // [vuoto]
    /\[blank\]/gi, // [blank]
    /\[da compilare\]/gi, // [da compilare]
    /\[TODO\]/gi, // [TODO]
  ]

  for (const pattern of patterns) {
    if (pattern.test(text)) {
      return true
    }
  }

  return false
}

/**
 * Counts approximately how many placeholders are in the text
 */
export function countPlaceholders(text: string): number {
  if (!text) return 0

  let count = 0

  // Count {{placeholder}} style
  const braceMatches = text.match(/\{\{[^}]+\}\}/g)
  if (braceMatches) count += braceMatches.length

  // Count ___ style (groups of 3+ underscores)
  const underscoreMatches = text.match(/_{3,}/g)
  if (underscoreMatches) count += underscoreMatches.length

  // Count [vuoto], [blank], etc.
  const bracketPatterns = [
    /\[vuoto\]/gi,
    /\[blank\]/gi,
    /\[da compilare\]/gi,
    /\[TODO\]/gi,
  ]

  for (const pattern of bracketPatterns) {
    const matches = text.match(pattern)
    if (matches) count += matches.length
  }

  return count
}

/**
 * Extracts placeholder names from text for debugging
 */
export function extractPlaceholderNames(text: string): string[] {
  const placeholders: string[] = []

  // Extract {{placeholder}} names
  const braceMatches = text.matchAll(/\{\{([^}]+)\}\}/g)
  for (const match of braceMatches) {
    placeholders.push(match[1])
  }

  return placeholders
}
