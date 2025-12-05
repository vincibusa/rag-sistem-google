import { AI_MODELS } from './constants'

/**
 * Select the appropriate AI model based on query complexity
 * This optimizes costs by using flash-lite for simple queries
 *
 * Cost comparison (approximate):
 * - flash-lite: $0.075 per 1M input tokens, $0.30 per 1M output tokens (60-70% cheaper)
 * - flash: $0.15 per 1M input tokens, $0.60 per 1M output tokens
 *
 * @param query The user's query text
 * @param messageCount Number of messages in conversation history
 * @returns The appropriate model name
 */
export function selectModelForQuery(
  query: string,
  messageCount: number = 0
): string {
  // Normalize query for analysis
  const normalizedQuery = query.toLowerCase().trim()
  const queryLength = query.length

  // Complex indicators (use flash)
  const complexIndicators = [
    // Analysis requests
    'analizza',
    'confronta',
    'compara',
    'valuta',
    'esamina',
    'analizza',
    'analyze',
    'compare',
    'evaluate',

    // Multi-step reasoning
    'prima',
    'poi',
    'quindi',
    'dopo',
    'successivamente',
    'step by step',
    'passo passo',

    // Synthesis requests
    'riassumi',
    'sintetizza',
    'summarize',
    'explain',
    'spiega',

    // Calculation/reasoning
    'calcola',
    'calcolare',
    'quanto',
    'quanti',
    'calculate',

    // Complex questions
    'perché',
    'why',
    'come mai',
    'in che modo',
  ]

  // Simple indicators (use flash-lite)
  const simpleIndicators = [
    // Direct lookup
    'trova',
    'cerca',
    'mostra',
    'dimmi',
    'qual è',
    'cos\'è',
    'chi è',
    'dove',
    'quando',
    'find',
    'search',
    'show',
    'what is',
    'who is',
    'where',
    'when',
  ]

  // Heuristic 1: Query length (long queries often more complex)
  const isLongQuery = queryLength > 200

  // Heuristic 2: Check for complex indicators
  const hasComplexIndicator = complexIndicators.some(indicator =>
    normalizedQuery.includes(indicator)
  )

  // Heuristic 3: Check for simple indicators
  const hasSimpleIndicator = simpleIndicators.some(indicator =>
    normalizedQuery.includes(indicator)
  )

  // Heuristic 4: Long conversations may need better context understanding
  const isLongConversation = messageCount > 20

  // Heuristic 5: Multiple questions or instructions (complex)
  const multipleQuestions =
    (normalizedQuery.match(/\?/g) || []).length > 1 ||
    (normalizedQuery.match(/\./g) || []).length > 3

  // Decision logic
  const complexityScore =
    (isLongQuery ? 2 : 0) +
    (hasComplexIndicator ? 3 : 0) +
    (hasSimpleIndicator ? -2 : 0) +
    (isLongConversation ? 1 : 0) +
    (multipleQuestions ? 2 : 0)

  // Threshold: >= 2 = complex (use flash), < 2 = simple (use flash-lite)
  const useComplexModel = complexityScore >= 2

  const selectedModel = useComplexModel ? AI_MODELS.RAG_COMPLEX : AI_MODELS.RAG_SIMPLE

  // Log selection for monitoring
  console.log(`🤖 Model selection: ${selectedModel}`, {
    query: query.substring(0, 50) + '...',
    complexityScore,
    isLongQuery,
    hasComplexIndicator,
    hasSimpleIndicator,
    messageCount
  })

  return selectedModel
}

/**
 * Get model for compilation mode (always use flash for accuracy)
 */
export function getCompilationModel(): string {
  return AI_MODELS.COMPILATION
}

/**
 * Get model for entity extraction (always use flash for accuracy)
 */
export function getEntityExtractionModel(): string {
  return AI_MODELS.ENTITY_EXTRACTION
}

/**
 * Calculate estimated cost savings from using flash-lite
 *
 * @param inputTokens Number of input tokens
 * @param outputTokens Number of output tokens
 * @returns Object with cost for both models and savings
 */
export function calculateCostSavings(inputTokens: number, outputTokens: number) {
  // Pricing per 1M tokens (approximate, verify with current pricing)
  const FLASH_LITE_INPUT = 0.075
  const FLASH_LITE_OUTPUT = 0.30
  const FLASH_INPUT = 0.15
  const FLASH_OUTPUT = 0.60

  const flashLiteCost =
    (inputTokens / 1_000_000) * FLASH_LITE_INPUT +
    (outputTokens / 1_000_000) * FLASH_LITE_OUTPUT

  const flashCost =
    (inputTokens / 1_000_000) * FLASH_INPUT +
    (outputTokens / 1_000_000) * FLASH_OUTPUT

  const savings = flashCost - flashLiteCost
  const savingsPercentage = (savings / flashCost) * 100

  return {
    flashLiteCost: flashLiteCost.toFixed(6),
    flashCost: flashCost.toFixed(6),
    savings: savings.toFixed(6),
    savingsPercentage: savingsPercentage.toFixed(1),
  }
}
