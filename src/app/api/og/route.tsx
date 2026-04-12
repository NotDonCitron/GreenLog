import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)

  const mode = searchParams.get('mode') || 'default'  // 'default' | 'strain'
  const title = searchParams.get('title') || 'CannaLog'

  // Strain mode: light lab-report style
  if (mode === 'strain') {
    const name = searchParams.get('name') || 'Unbekannte Sorte'
    const genetics = searchParams.get('genetics') || ''
    const thc = searchParams.get('thc') || '—'
    const cbd = searchParams.get('cbd') || '—'
    const terpenes = searchParams.get('terpenes') || ''

    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: '#fafafa',
            padding: '60px 80px',
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          {/* Header row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '40px' }}>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#52525b', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              Analytisches Profil
            </div>
            <div style={{ fontSize: '16px', fontWeight: 600, color: '#16a34a' }}>
              greenlog.app
            </div>
          </div>

          {/* Strain name */}
          <div
            style={{
              display: 'flex',
              fontSize: name.length > 20 ? '52px' : '64px',
              fontWeight: 800,
              color: '#18181b',
              letterSpacing: '-0.02em',
              marginBottom: '12px',
            }}
          >
            {name}
          </div>

          {/* Genetics — only rendered if non-empty */}
          {genetics ? (
            <div
              style={{
                display: 'flex',
                fontSize: '20px',
                color: '#71717a',
                marginBottom: '40px',
              }}
            >
              {genetics}
            </div>
          ) : (
            <div style={{ display: 'flex', height: '20px', marginBottom: '40px' }} />
          )}

          {/* THC / CBD row */}
          <div style={{ display: 'flex', gap: '48px', marginBottom: '48px' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: '14px', color: '#a1a1aa', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>THC</div>
              <div style={{ display: 'flex', fontSize: '40px', fontWeight: 700, color: '#16a34a' }}>{thc}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: '14px', color: '#a1a1aa', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>CBD</div>
              <div style={{ display: 'flex', fontSize: '40px', fontWeight: 700, color: '#16a34a' }}>{cbd}</div>
            </div>
          </div>

          {/* Terpenes — only rendered if non-empty */}
          {terpenes ? (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: '14px', color: '#a1a1aa', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Leit-Terpene</div>
              <div style={{ display: 'flex', fontSize: '22px', color: '#3f3f46', fontWeight: 500 }}>{terpenes}</div>
            </div>
          ) : (
            <div style={{ display: 'flex', height: '0px' }} />
          )}

          {/* Footer */}
          <div
            style={{
              display: 'flex',
              position: 'absolute',
              bottom: '40px',
              right: '60px',
              fontSize: '16px',
              color: '#d4d4d8',
            }}
          >
            <span>Quelle: GreenLog Datenbank</span>
          </div>
        </div>
      ),
      { width: 1200, height: 630 }
    )
  }

  // Default dark mode (existing behavior)
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
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '40px' }}>
          <img
            src="https://greenlog.app/logo.png"
            width="100"
            height="100"
            alt="CannaLog Logo"
            style={{ objectFit: 'contain' }}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          <div style={{ fontSize: title.length > 20 ? '56px' : '72px', fontWeight: 700, color: '#22c55e', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
            {title}
          </div>
          <div style={{ fontSize: '28px', color: '#a1a1aa', marginTop: '16px', letterSpacing: '0.01em' }}>
            Strain Management
          </div>
        </div>
        <div style={{ position: 'absolute', bottom: '40px', right: '60px', fontSize: '18px', color: '#52525b' }}>
          greenlog.app
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  )
}