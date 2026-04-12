import { ImageResponse } from 'next/og';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const runtime = 'edge';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();

  // Fetch grow with strain and plants
  const { data: grow } = await supabase
    .from('grows')
    .select(`
      *,
      strains (name),
      plants (plant_name, status, harvested_at)
    `)
    .eq('id', id)
    .eq('is_public', true)
    .single();

  if (!grow) {
    return new Response('Not found', { status: 404 });
  }

  const plantCount = grow.plants?.length || 0;
  const harvestDate = grow.harvest_date
    ? new Date(grow.harvest_date).toLocaleDateString('de-DE', { year: 'numeric', month: 'long', day: 'numeric' })
    : null;
  const startDate = new Date(grow.start_date).toLocaleDateString('de-DE', { year: 'numeric', month: 'long', day: 'numeric' });

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          padding: '60px',
          background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)',
          color: '#ffffff',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '40px' }}>
          <div
            style={{
              width: '60px',
              height: '60px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #2FF801, #00F5FF)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '28px',
              fontWeight: '900',
            }}
          >
            GL
          </div>
          <div>
            <div style={{ fontSize: '14px', color: '#2FF801', fontWeight: '700', letterSpacing: '0.2em' }}>
              GREENLOG
            </div>
            <div style={{ fontSize: '20px', fontWeight: '800', letterSpacing: '-0.02em' }}>
              Ernte-Zertifikat
            </div>
          </div>
        </div>

        {/* Title */}
        <div style={{ fontSize: '48px', fontWeight: '900', letterSpacing: '-0.03em', marginBottom: '20px' }}>
          {grow.title}
        </div>

        {/* Details Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '30px', marginBottom: '40px' }}>
          <div>
            <div style={{ fontSize: '12px', color: '#888888', fontWeight: '600', letterSpacing: '0.15em', marginBottom: '8px' }}>SORTE</div>
            <div style={{ fontSize: '24px', fontWeight: '700' }}>{grow.strains?.name || 'Unbekannt'}</div>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#888888', fontWeight: '600', letterSpacing: '0.15em', marginBottom: '8px' }}>ANBAUART</div>
            <div style={{ fontSize: '24px', fontWeight: '700', textTransform: 'capitalize' }}>{grow.grow_type}</div>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#888888', fontWeight: '600', letterSpacing: '0.15em', marginBottom: '8px' }}>PFLANZEN</div>
            <div style={{ fontSize: '24px', fontWeight: '700' }}>{plantCount}</div>
          </div>
        </div>

        {/* Dates */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginBottom: '40px' }}>
          <div>
            <div style={{ fontSize: '12px', color: '#888888', fontWeight: '600', letterSpacing: '0.15em', marginBottom: '8px' }}>START</div>
            <div style={{ fontSize: '20px', fontWeight: '600' }}>{startDate}</div>
          </div>
          {harvestDate && (
            <div>
              <div style={{ fontSize: '12px', color: '#888888', fontWeight: '600', letterSpacing: '0.15em', marginBottom: '8px' }}>ERNTE</div>
              <div style={{ fontSize: '20px', fontWeight: '600', color: '#2FF801' }}>{harvestDate}</div>
            </div>
          )}
        </div>

        {/* Yield if available */}
        {grow.yield_grams && (
          <div style={{ marginBottom: '40px' }}>
            <div style={{ fontSize: '12px', color: '#888888', fontWeight: '600', letterSpacing: '0.15em', marginBottom: '8px' }}>ERTRAG</div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: '#2FF801' }}>{grow.yield_grams}g</div>
          </div>
        )}

        {/* Plants */}
        {grow.plants && grow.plants.length > 0 && (
          <div style={{ marginBottom: '40px' }}>
            <div style={{ fontSize: '12px', color: '#888888', fontWeight: '600', letterSpacing: '0.15em', marginBottom: '16px' }}>PFLANZEN</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
              {grow.plants.map((plant: { plant_name: string; status: string }) => (
                <div
                  key={plant.plant_name}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '12px',
                    background: '#1a1a1a',
                    border: '1px solid #333333',
                    fontSize: '16px',
                    fontWeight: '600',
                  }}
                >
                  {plant.plant_name}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer / Disclaimer */}
        <div style={{ marginTop: 'auto', paddingTop: '30px', borderTop: '1px solid #333333' }}>
          <div style={{ fontSize: '12px', color: '#666666', lineHeight: '1.6' }}>
            Dient ausschliesslich dem Wissensaustausch und der Dokumentation. Kein Handel oder Gewinnabsicht. Der Handel oder die Weitergabe von privat angebautem Cannabis an Dritte ist gesetzlich verboten (§ 9 Abs. 2 KCanG).
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
