import { describe, expect, it, vi } from 'vitest';
import { addGrowLogEntry } from '@/lib/grows/actions';

function makeRequest(content: Record<string, unknown>) {
  return new Request('http://localhost:3000/api/grows/log-entry', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grow_id: 'grow-1',
      entry_type: 'photo',
      content,
      entry_date: '2026-04-02',
    }),
  });
}

function makeSupabase() {
  return {
    from: vi.fn((table: string) => {
      if (table === 'grows') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(async () => ({
                data: {
                  id: 'grow-1',
                  user_id: 'user-1',
                  organization_id: 'org-1',
                  start_date: '2026-04-01',
                },
                error: null,
              })),
            })),
          })),
        };
      }

      return {
        insert: vi.fn((payload: any) => ({
          select: vi.fn(() => ({
            single: vi.fn(async () => ({ data: { id: 'entry-1', ...payload }, error: null })),
          })),
        })),
      };
    }),
  };
}

describe('addGrowLogEntry photo content', () => {
  it('accepts private storage photo_path for photo entries', async () => {
    const res = await addGrowLogEntry(
      makeRequest({ photo_path: 'user-1/grow-1/photo.webp', caption: 'Day 2' }),
      { userId: 'user-1', supabase: makeSupabase() as any }
    );

    expect(res.status).toBe(200);
  });

  it('rejects legacy URL-only photo entries', async () => {
    const res = await addGrowLogEntry(
      makeRequest({ photo_url: 'https://example.com/photo.jpg' }),
      { userId: 'user-1', supabase: makeSupabase() as any }
    );

    expect(res.status).toBe(400);
  });
});
