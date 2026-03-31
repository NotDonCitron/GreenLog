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
const PROTECTED_PATHS = [
  '/collection',
  '/community',
  '/profile',
  '/strains/new',
  '/admin',
]

const PUBLIC_PATHS = [
  '/',
  '/login',
  '/register',
  '/strains',
  '/impressum',
  '/datenschutz',
  '/agb',
  '/api/health',
]

function isProtectedPath(pathname: string): boolean {
  // Check exact matches and prefixes
  if (PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'))) {
    return false
  }
  if (pathname.startsWith('/en/')) return false
  if (pathname.startsWith('/_next/')) return false
  if (pathname.startsWith('/strains/') && !pathname.includes('/new') && !pathname.includes('/edit')) {
    return false // Individual strain pages are public
  }
  return PROTECTED_PATHS.some(p => pathname.startsWith(p))
}

function isAuthenticated(request: NextRequest): boolean {
  // Check for Supabase auth cookie
  const supabaseCookie = request.cookies.get('supabase-auth-token')
  if (!supabaseCookie) return false

  // The cookie value is a base64-encoded JWT
  // For Edge runtime, we do a simple presence check
  // Full JWT validation happens in API routes with service role
  return supabaseCookie.value.length > 0
}

// ============================================
// MIDDLEWARE EXPORT
// ============================================
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const ip = request.headers.get('x-forwarded-for') || 'anonymous'

  // --- Rate Limiting ---
  if (isRateLimited(ip, pathname)) {
    return NextResponse.json(
      { error: 'Too many requests', retryAfter: RATE_LIMIT_WINDOW },
      { status: 429, headers: { 'Retry-After': String(RATE_LIMIT_WINDOW) } }
    )
  }

  // --- Route Protection ---
  if (isProtectedPath(pathname)) {
    if (!isAuthenticated(request)) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|logo.png|apple-touch-icon.png).*)',
  ],
}
