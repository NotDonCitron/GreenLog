---
phase: 6
plan: 04
type: feature
wave: 4
depends_on:
  - PLAN-01-server-actions-types
  - PLAN-03-grow-pages
files_modified:
  - src/app/api/grows/[id]/harvest-report/route.tsx
  - src/app/api/grows/[id]/comments/route.ts
  - src/lib/grows/actions.ts
autonomous: true
requirements:
  - GROW-08
  - GROW-09
  - GROW-14
---

## Plan 04: Harvest Certificate (next/og) + grow_comments API

### Context

Harvest certificates are generated server-side using next/og. The grow_comments API enables flat comments on grow entries.

### Tasks

#### Task 01: Harvest Certificate Route (next/og)

<read_first>
- /home/phhttps/Dokumente/Greenlog/GreenLog/src/app/api/og/strain/[slug]/route.tsx (existing OG image generation pattern)
- /home/phhttps/Dokumente/Greenlog/GreenLog/src/app/grows/[id]/page.tsx (grow detail data)
</read_first>

<acceptance_criteria>
- File `src/app/api/grows/[id]/harvest-report/route.tsx` exists with `GET` handler
- Generates OG image at `/api/grows/[id]/harvest-report`
- Grow details displayed: title, grow_type, strain name, plant count, harvest date
- Sobriety statement: "Dient ausschließlich dem wissensaustausch und der dokumentation. Kein handel oder gewinnabsicht."
- No emojis or promotional text in the certificate
- Shows plant names and phases at harvest
- Shows total yield if `yield_grams` is set on the grow
- Typography: clean serif or clean sans-serif, high contrast
- Color scheme: dark background with green accents (matching GreenLog brand)
- Image size: 1200x630 (standard OG image)
- Returns `ImageResponse` from `next/og`
- If grow not found or not public: returns 404
- `'use server'` directive at top
</acceptance_criteria>

<action>
Create `src/app/api/grows/[id]/harvest-report/route.tsx`:

```typescript
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
```

#### Task 02: grow_comments API

<read_first>
- /home/phhttps/Dokumente/Greenlog/GreenLog/src/app/api/organizations/[organizationId]/route.ts (API pattern)
- /home/phhttps/Dokumente/Greenlog/GreenLog/src/lib/api-response.ts
</read_first>

<acceptance_criteria>
- File `src/app/api/grows/[id]/comments/route.ts` exists
- GET: returns comments for a grow_entry (query `?entry_id=xxx`)
- POST: creates comment with `{ grow_entry_id, comment }` body
- DELETE: `?comment_id=xxx` deletes own comment
- Auth required for all operations (GET/POST/DELETE)
- GET returns `{ data: GrowComment[], error: null }`
- POST returns `{ data: comment, error: null }`
- DELETE returns `{ data: { deleted: true }, error: null }`
- `'use server'` directive at top
</acceptance_criteria>

<action>
Create `src/app/api/grows/[id]/comments/route.ts`:

```typescript
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { jsonSuccess, jsonError, authenticateRequest } from '@/lib/api-response';
import { getAuthenticatedClient } from '@/lib/supabase/client';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticateRequest(request, getAuthenticatedClient);
  if (!auth) return jsonError('Unauthorized', 401) as unknown as Response;
  if (auth instanceof Response) return auth;
  const { supabase } = auth;

  const { searchParams } = new URL(request.url);
  const entryId = searchParams.get('entry_id');
  if (!entryId) return jsonError('entry_id is required', 400) as Response;

  const { data: comments, error } = await supabase
    .from('grow_comments')
    .select('*, profiles(username, display_name, avatar_url)')
    .eq('grow_entry_id', entryId)
    .order('created_at', { ascending: true });

  if (error) return jsonError('Failed to fetch comments', 500, error.code, error.message) as Response;
  return jsonSuccess({ comments }) as Response;
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticateRequest(request, getAuthenticatedClient);
  if (!auth) return jsonError('Unauthorized', 401) as unknown as Response;
  if (auth instanceof Response) return auth;
  const { user, supabase } = auth;

  const body = await request.json();
  const { grow_entry_id, comment } = body;

  if (!grow_entry_id) return jsonError('grow_entry_id is required', 400) as Response;
  if (!comment?.trim()) return jsonError('comment is required', 400) as Response;

  const { data: newComment, error } = await supabase
    .from('grow_comments')
    .insert({
      grow_entry_id,
      user_id: user.id,
      comment: comment.trim(),
    })
    .select('*, profiles(username, display_name, avatar_url)')
    .single();

  if (error) return jsonError('Failed to create comment', 500, error.code, error.message) as Response;
  return jsonSuccess({ comment: newComment }) as Response;
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticateRequest(request, getAuthenticatedClient);
  if (!auth) return jsonError('Unauthorized', 401) as unknown as Response;
  if (auth instanceof Response) return auth;
  const { user, supabase } = auth;

  const { searchParams } = new URL(request.url);
  const commentId = searchParams.get('comment_id');
  if (!commentId) return jsonError('comment_id is required', 400) as Response;

  // Verify ownership
  const { data: existing } = await supabase
    .from('grow_comments')
    .select('user_id')
    .eq('id', commentId)
    .single();

  if (!existing) return jsonError('Comment not found', 404) as Response;
  if (existing.user_id !== user.id) return jsonError('Forbidden', 403) as Response;

  const { error } = await supabase
    .from('grow_comments')
    .delete()
    .eq('id', commentId);

  if (error) return jsonError('Failed to delete comment', 500, error.code, error.message) as Response;
  return jsonSuccess({ deleted: true }) as Response;
}
```

#### Task 03: grow_follows API

<read_first>
- /home/phhttps/Dokumente/Greenlog/GreenLog/src/app/api/communities/[id]/follow/route.ts (follow pattern)
</read_first>

<acceptance_criteria>
- File `src/app/api/grows/[id]/follow/route.ts` exists
- POST: creates grow_follows entry (user follows a public grow)
- DELETE: unfollows a grow
- Auth required
- POST returns `{ data: { follow: growFollow }, error: null }`
- DELETE returns `{ data: { unfollowed: true }, error: null }`
- `'use server'` directive at top
</acceptance_criteria>

<action>
Create `src/app/api/grows/[id]/follow/route.ts`:

```typescript
import { jsonSuccess, jsonError, authenticateRequest } from '@/lib/api-response';
import { getAuthenticatedClient } from '@/lib/supabase/client';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticateRequest(request, getAuthenticatedClient);
  if (!auth) return jsonError('Unauthorized', 401) as unknown as Response;
  if (auth instanceof Response) return auth;
  const { user, supabase } = auth;
  const { id: growId } = await params;

  // Verify grow exists and is public
  const { data: grow } = await supabase
    .from('grows')
    .select('id, is_public')
    .eq('id', growId)
    .single();

  if (!grow) return jsonError('Grow not found', 404) as Response;
  if (!grow.is_public) return jsonError('Cannot follow private grow', 403) as Response;

  const { data: follow, error } = await supabase
    .from('grow_follows')
    .insert({ user_id: user.id, grow_id: growId })
    .select()
    .single();

  if (error) return jsonError('Failed to follow grow', 500, error.code, error.message) as Response;
  return jsonSuccess({ follow }) as Response;
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticateRequest(request, getAuthenticatedClient);
  if (!auth) return jsonError('Unauthorized', 401) as unknown as Response;
  if (auth instanceof Response) return auth;
  const { user, supabase } = auth;
  const { id: growId } = await params;

  const { error } = await supabase
    .from('grow_follows')
    .delete()
    .eq('user_id', user.id)
    .eq('grow_id', growId);

  if (error) return jsonError('Failed to unfollow grow', 500, error.code, error.message) as Response;
  return jsonSuccess({ unfollowed: true }) as Response;
}
```

### Verification

```bash
ls src/app/api/grows/[id]/
grep -l "harvest-report\|comments\|follow" src/app/api/grows/[id]/*.ts
```