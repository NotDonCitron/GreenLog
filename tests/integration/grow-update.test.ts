import { describe, expect, it, vi } from 'vitest';
import { PATCH } from '@/app/api/grows/[id]/route';
import { getAuthenticatedClient } from '@/lib/supabase/client';

vi.mock('@/lib/supabase/client', () => ({
  getAuthenticatedClient: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(),
}));

vi.mock('@/lib/minio-storage', () => ({
  deleteFromMinio: vi.fn(),
  uploadToMinio: vi.fn(),
}));

function makeRequest(body: Record<string, unknown>) {
  return new Request('http://localhost:3000/api/grows/grow-1', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer mock-token',
    },
    body: JSON.stringify(body),
  });
}

function makeParams() {
  return { params: Promise.resolve({ id: 'grow-1' }) };
}

describe('API: PATCH /api/grows/[id]', () => {
  it('updates grow settings for the owner', async () => {
    const updatePayloads: any[] = [];
    const supabase = {
      auth: {
        getUser: vi.fn(async () => ({
          data: { user: { id: 'user-1' } },
          error: null,
        })),
      },
      from: vi.fn((table: string) => {
        if (table === 'grows') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(async () => ({
                  data: { id: 'grow-1', user_id: 'user-1' },
                  error: null,
                })),
              })),
            })),
            update: vi.fn((payload: any) => {
              updatePayloads.push(payload);
              return {
                eq: vi.fn(() => ({
                  select: vi.fn(() => ({
                    single: vi.fn(async () => ({
                      data: {
                        id: 'grow-1',
                        user_id: 'user-1',
                        title: payload.title,
                        grow_notes: payload.grow_notes,
                        is_public: payload.is_public,
                      },
                      error: null,
                    })),
                  })),
                })),
              };
            }),
          };
        }

        return {};
      }),
    };
    (getAuthenticatedClient as ReturnType<typeof vi.fn>).mockResolvedValue(supabase);

    const res = await PATCH(
      makeRequest({
        title: 'Updated Grow',
        grow_notes: 'New notes',
        is_public: false,
      }),
      makeParams()
    );

    expect(res.status).toBe(200);
    expect(updatePayloads[0]).toMatchObject({
      title: 'Updated Grow',
      grow_notes: 'New notes',
      is_public: false,
    });
    const body = await res.json();
    expect(body.data.grow).toMatchObject({
      title: 'Updated Grow',
      grow_notes: 'New notes',
      is_public: false,
    });
  });

  it('rejects updates for non-owner users', async () => {
    const supabase = {
      auth: {
        getUser: vi.fn(async () => ({
          data: { user: { id: 'user-2' } },
          error: null,
        })),
      },
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(async () => ({
              data: { id: 'grow-1', user_id: 'user-1' },
              error: null,
            })),
          })),
        })),
      })),
    };
    (getAuthenticatedClient as ReturnType<typeof vi.fn>).mockResolvedValue(supabase);

    const res = await PATCH(makeRequest({ is_public: true }), makeParams());

    expect(res.status).toBe(403);
  });
});
