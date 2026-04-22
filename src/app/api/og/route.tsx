import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'
import { PUBLIC_SITE_HOST, PUBLIC_SITE_URL } from '@/lib/site-config'

export const runtime = 'edge'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)

  const mode = searchParams.get('mode') || 'default'  // 'default' | 'strain' | 'laborblatt'
  const title = searchParams.get('title') || 'CannaLog'

  // Legal social sharing card: only anonymized/public analytical data.
  if (mode === 'laborblatt') {
    const name = searchParams.get('name') || searchParams.get('title') || 'Unbekannte Sorte'
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
            backgroundColor: '#f7faf7',
            backgroundImage: 'linear-gradient(to bottom right, #f7faf7 0%, #ecfdf5 100%)',
            padding: '56px 72px',
            fontFamily: 'system-ui, sans-serif',
            color: '#0f172a',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
            <div style={{ fontSize: '13px', fontWeight: 800, color: '#166534', letterSpacing: '0.16em', textTransform: 'uppercase' }}>
              Laborblatt
            </div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#16a34a' }}>
              {PUBLIC_SITE_HOST}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '32px', flex: 1 }}>
            <div style={{ display: 'flex', flex: 1, flexDirection: 'column', justifyContent: 'center' }}>
              <div
                style={{
                  display: 'flex',
                  fontSize: name.length > 20 ? '54px' : '68px',
                  fontWeight: 800,
                  color: '#052e16',
                  letterSpacing: '-0.03em',
                  lineHeight: 1,
                }}
              >
                {name}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '16px' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    borderRadius: '9999px',
                    backgroundColor: '#dcfce7',
                    color: '#166534',
                    fontSize: '13px',
                    fontWeight: 800,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    padding: '8px 12px',
                  }}
                >
                  Öffentlich / anonymisiert
                </div>
              </div>

              <div style={{ display: 'flex', fontSize: '20px', fontWeight: 600, color: '#14532d', marginTop: '18px' }}>
                Nur öffentliche, anonymisierte Analysedaten werden gezeigt.
              </div>

              {genetics ? (
                <div style={{ display: 'flex', fontSize: '18px', color: '#475569', marginTop: '12px' }}>
                  {genetics}
                </div>
              ) : (
                <div style={{ display: 'flex', height: '18px', marginTop: '12px' }} />
              )}
            </div>

            <div style={{ display: 'flex', width: '360px', flexDirection: 'column', justifyContent: 'center', gap: '16px' }}>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  borderRadius: '24px',
                  backgroundColor: '#ffffff',
                  border: '1px solid #bbf7d0',
                  padding: '18px 20px',
                  boxShadow: '0 10px 30px rgba(21, 128, 61, 0.08)',
                }}
              >
                <div style={{ fontSize: '13px', color: '#86efac', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  THC
                </div>
                <div style={{ display: 'flex', fontSize: '42px', fontWeight: 800, color: '#16a34a' }}>
                  {thc}
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  borderRadius: '24px',
                  backgroundColor: '#ffffff',
                  border: '1px solid #bbf7d0',
                  padding: '18px 20px',
                  boxShadow: '0 10px 30px rgba(21, 128, 61, 0.08)',
                }}
              >
                <div style={{ fontSize: '13px', color: '#86efac', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  CBD
                </div>
                <div style={{ display: 'flex', fontSize: '42px', fontWeight: 800, color: '#16a34a' }}>
                  {cbd}
                </div>
              </div>
            </div>
          </div>

          {terpenes ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                marginTop: '18px',
                borderRadius: '24px',
                backgroundColor: 'rgba(255, 255, 255, 0.72)',
                border: '1px solid #d1fae5',
                padding: '18px 22px',
              }}
            >
              <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Leit-Terpene
              </div>
              <div style={{ display: 'flex', fontSize: '22px', color: '#14532d', fontWeight: 600 }}>
                {terpenes}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', height: '0px' }} />
          )}

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: 'auto',
              paddingTop: '20px',
              borderTop: '1px solid #bbf7d0',
              fontSize: '14px',
              color: '#64748b',
            }}
          >
            <span>Keine privaten Abgabe-, Konsum- oder Gesundheitsdaten.</span>
            <span>Quelle: GreenLog Public Analytics</span>
          </div>
        </div>
      ),
      { width: 1200, height: 630 }
    )
  }

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
              {PUBLIC_SITE_HOST}
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
            src={`${PUBLIC_SITE_URL}/logo.png`}
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
          {PUBLIC_SITE_HOST}
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  )
}
