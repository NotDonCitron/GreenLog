import { clerkMiddleware } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// allowed origins for CORS preflight
function getAllowedOrigins(): string[] {
  return [
    process.env.NEXT_PUBLIC_SITE_URL || 'https://greenlog.app',
    'http://localhost:3000',
  ]
}

export default clerkMiddleware(async (auth, request: NextRequest) => {
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

  // Allow Clerk auth to proceed
  return NextResponse.next()
})

// Standard Clerk Matcher
export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}
