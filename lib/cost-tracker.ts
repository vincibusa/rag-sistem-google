/**
 * Cost Tracking System
 *
 * Monitors token usage and costs across all AI operations
 * Provides insights for optimization and billing
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

/**
 * Cost event structure
 */
export interface CostEvent {
  user_id?: string
  notebook_id?: string
  model: string
  operation: 'rag' | 'compilation' | 'entity_extraction' | 'query_expansion'
  input_tokens: number
  output_tokens: number
  cached_tokens?: number
  cost_usd: number
  metadata?: Record<string, any>
}

/**
 * Pricing per 1M tokens (as of 2025, verify with current Google pricing)
 * Source: https://ai.google.dev/pricing
 */
const PRICING = {
  // Gemini 2.5 Flash
  'gemini-2.5-flash': {
    input: 0.15,        // $0.15 per 1M input tokens
    output: 0.60,       // $0.60 per 1M output tokens
    cachedInput: 0.015, // $0.015 per 1M cached tokens (10x cheaper)
  },
  // Gemini 2.5 Flash-lite
  'gemini-2.5-flash-lite': {
    input: 0.075,       // $0.075 per 1M input tokens (50% cheaper)
    output: 0.30,       // $0.30 per 1M output tokens (50% cheaper)
    cachedInput: 0.0075, // $0.0075 per 1M cached tokens
  },
  // Default fallback
  default: {
    input: 0.15,
    output: 0.60,
    cachedInput: 0.015,
  },
} as const

/**
 * Calculate cost for a given usage
 */
export function calculateCost(
  model: string,
  inputTokens: number,
  outputTokens: number,
  cachedTokens: number = 0
): number {
  const pricing = PRICING[model as keyof typeof PRICING] || PRICING.default

  const inputCost = (inputTokens / 1_000_000) * pricing.input
  const outputCost = (outputTokens / 1_000_000) * pricing.output
  const cachedCost = (cachedTokens / 1_000_000) * pricing.cachedInput

  return inputCost + outputCost + cachedCost
}

/**
 * Track a cost event to the database
 */
export async function trackCost(event: CostEvent): Promise<void> {
  try {
    const { error } = await supabase.from('cost_tracking').insert({
      user_id: event.user_id,
      notebook_id: event.notebook_id,
      model: event.model,
      operation: event.operation,
      input_tokens: event.input_tokens,
      output_tokens: event.output_tokens,
      cached_tokens: event.cached_tokens || 0,
      cost_usd: event.cost_usd,
      metadata: event.metadata || {},
      created_at: new Date().toISOString(),
    })

    if (error) {
      console.error('❌ Failed to track cost:', error)
    }
  } catch (error) {
    console.error('❌ Cost tracking error:', error)
    // Don't throw - cost tracking shouldn't break the main flow
  }
}

/**
 * Extract usage metadata from Gemini response
 *
 * Note: The exact structure depends on the Google GenAI SDK response format
 * This is a best-effort extraction that should be updated based on actual response structure
 */
export function extractUsageMetadata(response: any): {
  model: string
  inputTokens: number
  outputTokens: number
  cachedTokens: number
} {
  // Default values
  const usage = {
    model: 'gemini-2.5-flash',
    inputTokens: 0,
    outputTokens: 0,
    cachedTokens: 0,
  }

  try {
    // Try to extract from response metadata
    if (response?.usageMetadata) {
      usage.inputTokens = response.usageMetadata.promptTokenCount || 0
      usage.outputTokens = response.usageMetadata.candidatesTokenCount || 0
      usage.cachedTokens = response.usageMetadata.cachedContentTokenCount || 0
    }

    // Try to extract model name
    if (response?.model || response?.modelName) {
      usage.model = response.model || response.modelName
    }
  } catch (error) {
    console.warn('⚠️ Failed to extract usage metadata:', error)
  }

  return usage
}

/**
 * Wrapper function to automatically track costs for AI operations
 *
 * Usage:
 * ```typescript
 * const result = await withCostTracking(
 *   () => generateContent(prompt),
 *   'rag',
 *   { userId, notebookId }
 * )
 * ```
 */
export async function withCostTracking<T>(
  fn: () => Promise<T>,
  operation: CostEvent['operation'],
  context: {
    userId?: string
    notebookId?: string
    metadata?: Record<string, any>
  }
): Promise<T> {
  const startTime = Date.now()

  try {
    const result = await fn()

    // Extract usage from response
    const usage = extractUsageMetadata(result)

    // Calculate cost
    const cost = calculateCost(
      usage.model,
      usage.inputTokens,
      usage.outputTokens,
      usage.cachedTokens
    )

    // Track cost
    await trackCost({
      user_id: context.userId,
      notebook_id: context.notebookId,
      model: usage.model,
      operation,
      input_tokens: usage.inputTokens,
      output_tokens: usage.outputTokens,
      cached_tokens: usage.cachedTokens,
      cost_usd: cost,
      metadata: {
        ...context.metadata,
        duration_ms: Date.now() - startTime,
      },
    })

    console.log(
      `💰 Cost tracked: ${operation} - $${cost.toFixed(6)} (${usage.inputTokens} in / ${usage.outputTokens} out)`
    )

    return result
  } catch (error) {
    // Still track error events for monitoring
    await trackCost({
      user_id: context.userId,
      notebook_id: context.notebookId,
      model: 'unknown',
      operation,
      input_tokens: 0,
      output_tokens: 0,
      cost_usd: 0,
      metadata: {
        ...context.metadata,
        error: String(error),
        duration_ms: Date.now() - startTime,
      },
    })

    throw error
  }
}

/**
 * Get cost statistics for a user or notebook
 */
export async function getCostStats(filters: {
  userId?: string
  notebookId?: string
  startDate?: Date
  endDate?: Date
}): Promise<{
  totalCost: number
  totalTokens: number
  operationBreakdown: Record<string, { cost: number; count: number }>
  modelBreakdown: Record<string, { cost: number; count: number }>
}> {
  try {
    let query = supabase
      .from('cost_tracking')
      .select('*')
      .order('created_at', { ascending: false })

    if (filters.userId) {
      query = query.eq('user_id', filters.userId)
    }

    if (filters.notebookId) {
      query = query.eq('notebook_id', filters.notebookId)
    }

    if (filters.startDate) {
      query = query.gte('created_at', filters.startDate.toISOString())
    }

    if (filters.endDate) {
      query = query.lte('created_at', filters.endDate.toISOString())
    }

    const { data, error } = await query

    if (error) {
      throw error
    }

    // Calculate statistics
    const stats = {
      totalCost: 0,
      totalTokens: 0,
      operationBreakdown: {} as Record<string, { cost: number; count: number }>,
      modelBreakdown: {} as Record<string, { cost: number; count: number }>,
    }

    for (const event of data || []) {
      stats.totalCost += event.cost_usd
      stats.totalTokens += event.input_tokens + event.output_tokens

      // Operation breakdown
      if (!stats.operationBreakdown[event.operation]) {
        stats.operationBreakdown[event.operation] = { cost: 0, count: 0 }
      }
      stats.operationBreakdown[event.operation].cost += event.cost_usd
      stats.operationBreakdown[event.operation].count += 1

      // Model breakdown
      if (!stats.modelBreakdown[event.model]) {
        stats.modelBreakdown[event.model] = { cost: 0, count: 0 }
      }
      stats.modelBreakdown[event.model].cost += event.cost_usd
      stats.modelBreakdown[event.model].count += 1
    }

    return stats
  } catch (error) {
    console.error('❌ Failed to get cost stats:', error)
    throw error
  }
}

/**
 * Get daily cost trends for visualization
 */
export async function getDailyCostTrends(
  userId: string,
  days: number = 30
): Promise<Array<{ date: string; cost: number; tokens: number }>> {
  try {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const { data, error } = await supabase
      .from('cost_tracking')
      .select('created_at, cost_usd, input_tokens, output_tokens')
      .eq('user_id', userId)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true })

    if (error) {
      throw error
    }

    // Group by day
    const dailyData = new Map<string, { cost: number; tokens: number }>()

    for (const event of data || []) {
      const date = new Date(event.created_at).toISOString().split('T')[0]

      if (!dailyData.has(date)) {
        dailyData.set(date, { cost: 0, tokens: 0 })
      }

      const day = dailyData.get(date)!
      day.cost += event.cost_usd
      day.tokens += event.input_tokens + event.output_tokens
    }

    return Array.from(dailyData.entries())
      .map(([date, stats]) => ({ date, ...stats }))
      .sort((a, b) => a.date.localeCompare(b.date))
  } catch (error) {
    console.error('❌ Failed to get daily cost trends:', error)
    return []
  }
}

/**
 * Calculate cost savings from optimizations
 */
export function calculateOptimizationSavings(
  beforeInputTokens: number,
  beforeOutputTokens: number,
  afterInputTokens: number,
  afterOutputTokens: number,
  model: string = 'gemini-2.5-flash'
): {
  savedTokens: number
  savedCost: number
  savingsPercent: number
} {
  const beforeCost = calculateCost(model, beforeInputTokens, beforeOutputTokens)
  const afterCost = calculateCost(model, afterInputTokens, afterOutputTokens)

  const savedTokens = beforeInputTokens + beforeOutputTokens - (afterInputTokens + afterOutputTokens)
  const savedCost = beforeCost - afterCost
  const savingsPercent = (savedCost / beforeCost) * 100

  return {
    savedTokens,
    savedCost,
    savingsPercent,
  }
}
