import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const title = searchParams.get('title') || 'CannaLog'

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'flex-end',
          backgroundColor: '#0a0a0f',
          backgroundImage: 'linear-gradient(to bottom right, #0a0a0f 0%, #111827 100%)',
          padding: '60px 80px',
        }}
      >
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '40px' }}>
          <img
            src="https://greenlog.app/logo.png"
            width={100}
            height={100}
            alt="CannaLog Logo"
            style={{ objectFit: 'contain' }}
          />
        </div>

        {/* Title and tagline */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
          }}
        >
          <div
            style={{
              fontSize: title.length > 20 ? '56px' : '72px',
              fontWeight: 700,
              color: '#22c55e',
              letterSpacing: '-0.02em',
              lineHeight: 1.1,
            }}
          >
            {title}
          </div>
          <div
            style={{
              fontSize: '28px',
              color: '#a1a1aa',
              marginTop: '16px',
              letterSpacing: '0.01em',
            }}
          >
            Cannabis Strain Tracking
          </div>
        </div>

        {/* Bottom tagline */}
        <div
          style={{
            position: 'absolute',
            bottom: '40px',
            right: '60px',
            fontSize: '18px',
            color: '#52525b',
          }}
        >
          greenlog.app
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  )
}