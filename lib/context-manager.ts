/**
 * Context Window Optimization
 *
 * Reduces token usage by intelligently selecting relevant messages
 * instead of sending entire conversation history.
 *
 * Strategy:
 * 1. Always include recent messages (recency bias)
 * 2. Stay within token budget (~4K tokens)
 * 3. Ready for future embedding-based semantic selection
 */

/**
 * Rough token estimation (1 token ≈ 4 characters for English/Italian)
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

/**
 * Calculate total tokens for a list of messages
 */
function calculateMessageTokens(messages: Array<{ role: string; content: string }>): number {
  return messages.reduce((total, msg) => {
    // Add tokens for role prefix and content
    const roleTokens = estimateTokens(msg.role + ': ')
    const contentTokens = estimateTokens(msg.content)
    return total + roleTokens + contentTokens
  }, 0)
}

/**
 * Select relevant messages within token budget
 *
 * Current implementation: Sliding window with recency bias
 * Future: Semantic similarity search using embeddings
 *
 * @param messages All conversation messages (chronological order)
 * @param _currentQuery The current user query (reserved for future embedding-based selection)
 * @param maxTokens Maximum token budget (default: 4000)
 * @returns Selected messages that fit within token budget
 */
export function selectRelevantMessages(
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  _currentQuery: string,
  maxTokens: number = 4000
): Array<{ role: 'user' | 'assistant'; content: string }> {
  if (messages.length === 0) {
    return []
  }

  // Strategy 1: If messages already fit within budget, return all
  const totalTokens = calculateMessageTokens(messages)
  if (totalTokens <= maxTokens) {
    console.log(`✅ All ${messages.length} messages fit within budget (${totalTokens}/${maxTokens} tokens)`)
    return messages
  }

  // Strategy 2: Keep recent messages (recency bias) within token budget
  console.log(`🔄 Context window optimization: ${messages.length} messages (${totalTokens} tokens) → target ${maxTokens} tokens`)

  const selected: Array<{ role: 'user' | 'assistant'; content: string }> = []
  let currentTokens = 0

  // Start from most recent and work backwards
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i]
    const msgTokens = calculateMessageTokens([msg])

    // Check if adding this message would exceed budget
    if (currentTokens + msgTokens > maxTokens) {
      // Budget exceeded, stop here
      break
    }

    // Add message to the beginning (since we're going backwards)
    selected.unshift(msg)
    currentTokens += msgTokens
  }

  const reductionPercent = ((1 - currentTokens / totalTokens) * 100).toFixed(1)
  console.log(`✅ Context optimized: ${selected.length}/${messages.length} messages, ${currentTokens}/${totalTokens} tokens (${reductionPercent}% reduction)`)

  return selected
}

/**
 * Select messages with minimum conversation context
 *
 * Ensures at least N recent exchanges are included for context continuity
 *
 * @param messages All conversation messages
 * @param currentQuery Current user query
 * @param minExchanges Minimum number of user-assistant exchanges to keep (default: 5)
 * @param maxTokens Maximum token budget
 */
export function selectRelevantMessagesWithMinContext(
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  currentQuery: string,
  minExchanges: number = 5,
  maxTokens: number = 4000
): Array<{ role: 'user' | 'assistant'; content: string }> {
  if (messages.length === 0) {
    return []
  }

  // Calculate minimum required messages (minExchanges * 2 for user+assistant pairs)
  const minMessages = Math.min(minExchanges * 2, messages.length)
  const recentMessages = messages.slice(-minMessages)

  // Check if recent messages fit within budget
  const recentTokens = calculateMessageTokens(recentMessages)
  if (recentTokens <= maxTokens) {
    // Try to add more older messages if budget allows
    let selected = [...recentMessages]
    let currentTokens = recentTokens

    for (let i = messages.length - minMessages - 1; i >= 0; i--) {
      const msg = messages[i]
      const msgTokens = calculateMessageTokens([msg])

      if (currentTokens + msgTokens <= maxTokens) {
        selected.unshift(msg)
        currentTokens += msgTokens
      } else {
        break
      }
    }

    return selected
  }

  // Recent messages exceed budget, fall back to token-based selection
  console.warn(`⚠️ Recent ${minMessages} messages exceed budget (${recentTokens}/${maxTokens}), using token-based selection`)
  return selectRelevantMessages(messages, currentQuery, maxTokens)
}

/**
 * Future: Semantic message selection using embeddings
 *
 * This will be implemented in a future iteration:
 * 1. Embed all messages using Google Text Embedding API
 * 2. Embed current query
 * 3. Calculate cosine similarity between query and each message
 * 4. Select top-K most relevant + recent messages
 * 5. Cache embeddings to avoid recomputation
 *
 * Technology:
 * - Google Text Embedding API (free tier: 1500 req/day)
 * - Redis/Upstash for embedding cache
 */
export async function selectRelevantMessagesWithEmbeddings(
  messages: Array<{ role: 'user' | 'assistant'; content: string; id?: string }>,
  currentQuery: string,
  maxTokens: number = 4000
): Promise<Array<{ role: 'user' | 'assistant'; content: string }>> {
  // TODO: Implement embedding-based selection
  // For now, fallback to recency-based selection
  console.warn('⚠️ Embedding-based selection not yet implemented, using recency-based selection')
  return selectRelevantMessages(messages, currentQuery, maxTokens)
}

/**
 * Summarize old conversation context for very long conversations
 *
 * When conversation exceeds 100 messages, summarize older messages
 * to provide high-level context without sending all details
 */
export async function summarizeOldContext(
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  maxMessages: number = 50
): Promise<string | null> {
  if (messages.length <= maxMessages) {
    return null // No need to summarize
  }

  // TODO: Implement summarization using Gemini
  // For now, return null (no summary)
  console.warn('⚠️ Conversation has >100 messages, summarization not yet implemented')
  return null
}

/**
 * Get context optimization stats for monitoring
 */
export function getContextStats(
  originalMessages: Array<{ role: string; content: string }>,
  selectedMessages: Array<{ role: string; content: string }>
) {
  const originalTokens = calculateMessageTokens(originalMessages)
  const selectedTokens = calculateMessageTokens(selectedMessages)
  const reductionPercent = ((1 - selectedTokens / originalTokens) * 100).toFixed(1)
  const savedTokens = originalTokens - selectedTokens

  return {
    originalMessageCount: originalMessages.length,
    selectedMessageCount: selectedMessages.length,
    originalTokens,
    selectedTokens,
    savedTokens,
    reductionPercent: parseFloat(reductionPercent),
  }
}
