import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// ============================================
// RATE LIMITING
// ============================================
const RATE_LIMIT_WINDOW = 60 // seconds
const API_RATE_LIMIT = 100 // requests per window
const PAGE_RATE_LIMIT = 1000 // requests per window

// Simple in-memory Map (resets on Vercel Edge cold start)
// For production at scale: consider upstash/ratelimit with Redis
const rateLimitStore = new Map<string, { count: number; timestamp: number }>()

function isRateLimited(ip: string, pathname: string): boolean {
  const now = Date.now()
  const isApi = pathname.startsWith('/api')
  const key = `${ip}:${isApi ? 'api' : 'page'}`
  const limit = isApi ? API_RATE_LIMIT : PAGE_RATE_LIMIT

  const current = rateLimitStore.get(key)

  // Cleanup expired entries
  if (current && now - current.timestamp > RATE_LIMIT_WINDOW * 1000) {
    rateLimitStore.delete(key)
  }

  const entry = rateLimitStore.get(key) || { count: 0, timestamp: now }
  entry.count++
  entry.timestamp = now
  rateLimitStore.set(key, entry)

  return entry.count > limit
}

// ============================================
// ROUTE PROTECTION
// ============================================
// NOTE: Route protection is handled at the API/Page level, not Edge Middleware.
// Supabase JWT validation requires the service role key which is not available in Edge runtime.
// Auth checks happen in:
//   - API routes: via getUser() from @/lib/supabase/server
//   - Client components: via useAuth() from auth-provider
//   - Page level: client-side redirects in useEffect hooks

// ============================================
// MIDDLEWARE EXPORT
// ============================================
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  // On Vercel Edge, x-forwarded-for is set by Vercel's edge nodes and is generally
  // not susceptible to IP spoofing since the header is injected at the edge.
  const ip = request.headers.get('x-forwarded-for') || 'anonymous'

  // --- Rate Limiting ---
  if (isRateLimited(ip, pathname)) {
    return NextResponse.json(
      { error: 'Too many requests', retryAfter: RATE_LIMIT_WINDOW },
      { status: 429, headers: { 'Retry-After': String(RATE_LIMIT_WINDOW) } }
    )
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|_next/data|favicon.ico|logo.png|apple-touch-icon.png).*)',
  ],
}
