import { GoogleGenAI } from '@google/genai'
import { GEMINI_MODEL } from './constants'

const apiKey = process.env.GOOGLE_GEMINI_API_KEY
if (!apiKey) {
  throw new Error('GOOGLE_GEMINI_API_KEY environment variable is required')
}

const client = new GoogleGenAI({ apiKey })

/**
 * Cache configuration for system prompts
 */
interface CacheConfig {
  mode: 'rag' | 'compilation'
  systemPrompt: string
  version: string
  ttl: number // seconds
}

/**
 * In-memory cache store for cache IDs
 * In production, this should be stored in Redis or similar
 */
const cacheStore = new Map<string, {
  cacheId: string
  expiresAt: Date
  version: string
}>()

/**
 * Generate a cache key for a given mode and version
 */
function getCacheKey(mode: 'rag' | 'compilation', version: string = 'v1'): string {
  return `${mode}-system-prompt-${version}`
}

/**
 * Create or retrieve a cached system prompt
 * This uses Gemini's Context Caching API to cache large system prompts
 *
 * Benefits:
 * - 10x cost reduction on cached tokens
 * - Faster response times (cached tokens processed faster)
 * - Automatic cache invalidation via TTL
 */
export async function getCachedSystemPrompt(
  mode: 'rag' | 'compilation',
  systemPrompt: string,
  version: string = 'v1'
): Promise<string | null> {
  const cacheKey = getCacheKey(mode, version)

  // Check if we have a valid cached entry
  const cached = cacheStore.get(cacheKey)
  if (cached && cached.expiresAt > new Date() && cached.version === version) {
    console.log(`✅ Using cached system prompt for ${mode} (cache hit)`)
    return cached.cacheId
  }

  try {
    // Create new cache entry
    console.log(`🔄 Creating new cache entry for ${mode}...`)

    // Note: The Google Genai SDK may not have cacheManager in all versions
    // This is a forward-compatible implementation
    // If cacheManager is not available, we'll fall back to not using cache
    if (typeof (client as any).cacheManager === 'undefined') {
      console.warn('⚠️ Cache manager not available in this SDK version, skipping cache')
      return null
    }

    const cache = await (client as any).cacheManager.create({
      model: GEMINI_MODEL,
      contents: [{ role: 'system', parts: [{ text: systemPrompt }] }],
      ttl: 3600, // 1 hour cache
      displayName: cacheKey
    })

    // Store cache ID with expiration
    const expiresAt = new Date(Date.now() + 3600 * 1000) // 1 hour from now
    cacheStore.set(cacheKey, {
      cacheId: cache.name,
      expiresAt,
      version
    })

    console.log(`✅ Cache created for ${mode}: ${cache.name} (expires at ${expiresAt.toISOString()})`)
    return cache.name

  } catch (error) {
    // If cache creation fails, log but don't break the flow
    console.error(`❌ Failed to create cache for ${mode}:`, error)
    return null
  }
}

/**
 * Invalidate a cached system prompt
 * Useful when the prompt content changes
 */
export function invalidateCache(mode: 'rag' | 'compilation', version: string = 'v1') {
  const cacheKey = getCacheKey(mode, version)
  cacheStore.delete(cacheKey)
  console.log(`🗑️ Cache invalidated for ${cacheKey}`)
}

/**
 * Refresh cache before TTL expires
 * Should be called by a scheduled job (e.g., every 50 minutes)
 */
export async function refreshCache(
  mode: 'rag' | 'compilation',
  systemPrompt: string,
  version: string = 'v1'
) {
  console.log(`🔄 Refreshing cache for ${mode}...`)

  // Invalidate old cache
  invalidateCache(mode, version)

  // Create new cache
  return await getCachedSystemPrompt(mode, systemPrompt, version)
}

/**
 * Get cache stats for monitoring
 */
export function getCacheStats() {
  const stats = {
    totalCaches: cacheStore.size,
    caches: Array.from(cacheStore.entries()).map(([key, value]) => ({
      key,
      expiresAt: value.expiresAt,
      version: value.version,
      isExpired: value.expiresAt < new Date()
    }))
  }

  return stats
}
