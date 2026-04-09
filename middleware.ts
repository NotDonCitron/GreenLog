import { clerkMiddleware } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const API_RATE_LIMIT = 100
const API_RATE_WINDOW = 60
const PAGE_RATE_LIMIT = 1000
const PAGE_RATE_WINDOW = 60

let apiRatelimit: Ratelimit | null = null
let pageRatelimit: Ratelimit | null = null

function getRatelimits(): { api: Ratelimit | null; page: Ratelimit | null } {
  if (apiRatelimit && pageRatelimit) {
    return { api: apiRatelimit, page: pageRatelimit }
  }

  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN

  if (!url || !token) {
    return { api: null, page: null }
  }

  const redis = new Redis({ url, token })

  apiRatelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(API_RATE_LIMIT, `${API_RATE_WINDOW} s`),
  })

  pageRatelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(PAGE_RATE_LIMIT, `${PAGE_RATE_WINDOW} s`),
  })

  return { api: apiRatelimit, page: pageRatelimit }
}

async function isRateLimited(ip: string, pathname: string): Promise<boolean> {
  const { api, page } = getRatelimits()
  if (!api || !page) {
    return false
  }

  const isApi = pathname.startsWith('/api')
  const rl = isApi ? api : page
  const key = `${isApi ? 'api' : 'page'}:${ip}`

  const { success } = await rl.limit(key)
  return !success
}

function getAllowedOrigins(): string[] {
  return [
    process.env.NEXT_PUBLIC_SITE_URL || 'https://greenlog.app',
    'http://localhost:3000',
  ]
}

function addCorsHeaders(response: NextResponse, request: NextRequest) {
  const origin = request.headers.get('origin')
  if (origin && getAllowedOrigins().includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin)
    response.headers.set('Access-Control-Allow-Credentials', 'true')
  }
}

export default clerkMiddleware(async (auth, request: NextRequest) => {
  const { pathname } = request.nextUrl
  const ip = request.headers.get('x-forwarded-for') || 'anonymous'

  // --- CORS (preflight) ---
  if (request.method === 'OPTIONS') {
    const origin = request.headers.get('origin')
    if (origin && getAllowedOrigins().includes(origin)) {
      return new NextResponse(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': origin,
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
          'Access-Control-Max-Age': '86400',
        },
      })
    }
    return new NextResponse({}, { status: 405 })
  }

  // --- Rate Limiting ---
  const limited = await isRateLimited(ip, pathname)
  if (limited) {
    const isApi = pathname.startsWith('/api')
    const retryAfter = isApi ? API_RATE_WINDOW : PAGE_RATE_WINDOW
    const response = NextResponse.json(
      { error: 'Too many requests', retryAfter },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } }
    )
    addCorsHeaders(response, request)
    return response
  }

  // Allow Clerk auth to proceed
  return NextResponse.next()
})

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|_next/data|favicon.ico|logo.png|apple-touch-icon.png).*)',
  ],
}
