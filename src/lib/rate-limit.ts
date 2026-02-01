// Simple in-memory rate limiter
// Tracks requests by IP or user ID
// Returns { success: boolean, remaining: number, reset: Date }

interface RateLimitEntry {
  count: number
  resetAt: number
}

interface RateLimitResult {
  success: boolean
  remaining: number
  reset: Date
}

// In-memory store for rate limit entries
// Key format: `${identifier}:${endpoint}`
const rateLimitStore = new Map<string, RateLimitEntry>()

// Clean up expired entries periodically (every 5 minutes)
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt <= now) {
      rateLimitStore.delete(key)
    }
  }
}, 5 * 60 * 1000)

/**
 * Check if a request should be rate limited
 *
 * @param identifier - IP address or user ID to track
 * @param endpoint - Endpoint identifier for separate limits per route
 * @param limit - Maximum number of requests allowed
 * @param windowMs - Time window in milliseconds
 * @returns RateLimitResult with success status, remaining requests, and reset time
 */
export function checkRateLimit(
  identifier: string,
  endpoint: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const key = `${identifier}:${endpoint}`
  const now = Date.now()

  const entry = rateLimitStore.get(key)

  // If no entry or entry has expired, create new one
  if (!entry || entry.resetAt <= now) {
    const resetAt = now + windowMs
    rateLimitStore.set(key, { count: 1, resetAt })
    return {
      success: true,
      remaining: limit - 1,
      reset: new Date(resetAt)
    }
  }

  // Entry exists and hasn't expired
  if (entry.count >= limit) {
    // Rate limited
    return {
      success: false,
      remaining: 0,
      reset: new Date(entry.resetAt)
    }
  }

  // Increment count
  entry.count++
  rateLimitStore.set(key, entry)

  return {
    success: true,
    remaining: limit - entry.count,
    reset: new Date(entry.resetAt)
  }
}

/**
 * Get client IP from request headers
 * Handles common proxy headers (X-Forwarded-For, X-Real-IP)
 */
export function getClientIp(request: Request): string {
  // Try X-Forwarded-For first (common for proxies/load balancers)
  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) {
    // X-Forwarded-For can contain multiple IPs; take the first one
    return forwardedFor.split(',')[0].trim()
  }

  // Try X-Real-IP (used by Nginx)
  const realIp = request.headers.get('x-real-ip')
  if (realIp) {
    return realIp.trim()
  }

  // Fallback to a default (in production, you might want to block unknown IPs)
  return 'unknown'
}

// Pre-configured rate limiters for common use cases
export const rateLimiters = {
  // File upload: 10 per hour
  fileUpload: (ip: string) => checkRateLimit(ip, 'file-upload', 10, 60 * 60 * 1000),

  // Explain endpoint: 60 per hour
  explain: (ip: string) => checkRateLimit(ip, 'explain', 60, 60 * 60 * 1000),

  // Chat endpoint: 15 per day
  chat: (ip: string) => checkRateLimit(ip, 'chat', 15, 24 * 60 * 60 * 1000),
}

/**
 * Create a rate limit response with proper headers
 */
export function rateLimitResponse(result: RateLimitResult): Response {
  const retryAfterSeconds = Math.ceil((result.reset.getTime() - Date.now()) / 1000)

  return new Response(
    JSON.stringify({
      error: 'Too Many Requests',
      message: 'Rate limit exceeded. Please try again later.',
      retryAfter: retryAfterSeconds,
      resetAt: result.reset.toISOString()
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(retryAfterSeconds),
        'X-RateLimit-Limit': '0', // Will be set by caller
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': result.reset.toISOString()
      }
    }
  )
}
