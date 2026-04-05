import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = body

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'E-Mail ist erforderlich' },
        { status: 400 }
      )
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Bitte gib eine gültige E-Mail-Adresse ein' },
        { status: 400 }
      )
    }

    const supabase = await createServerSupabaseClient()

    const { error } = await supabase
      .from('waitlist_entries')
      .insert({ email: email.toLowerCase().trim(), source: 'landing_page' })

    if (error) {
      if (error.code === '23505') {
        // Unique violation - email already exists
        return NextResponse.json(
          { error: 'Diese E-Mail ist bereits registriert' },
          { status: 409 }
        )
      }
      console.error('Waitlist insert error:', error)
      return NextResponse.json(
        { error: 'Ein Fehler ist aufgetreten. Bitte versuche es erneut.' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { message: 'Danke! Wir melden uns bald bei dir.' },
      { status: 201 }
    )
  } catch {
    console.error('Waitlist route error')
    return NextResponse.json(
      { error: 'Ein Fehler ist aufgetreten' },
      { status: 500 }
    )
  }
}

export async function GET() {
  // Endpoint exists but returns method not allowed for browser requests
  // Only service role should access this via direct Supabase query
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  )
}
