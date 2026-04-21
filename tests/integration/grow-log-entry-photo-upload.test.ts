import { describe, expect, it, vi } from 'vitest';
import { POST } from '@/app/api/grows/log-entry/photo/route';
import { getAuthenticatedClient } from '@/lib/supabase/client';
import * as minioStorage from '@/lib/minio-storage';

vi.mock('server-only', () => ({}));
vi.mock('@/lib/supabase/client', () => ({
  getAuthenticatedClient: vi.fn(),
}));
vi.mock('@/lib/minio-storage', () => ({
  uploadToMinio: vi.fn(async () => ({ path: 'user-1/grow-1/entry-photo.webp' })),
  deleteFromMinio: vi.fn(async () => undefined),
  getSignedMinioUrl: vi.fn(async () => 'https://example.supabase.co/storage/v1/object/sign/grow-entry-photos/photo.webp?token=signed'),
}));

function makeImageFile(type = 'image/jpeg') {
  return new File([new Uint8Array([255, 216, 255, 224])], 'plant.jpg', { type });
}

function makePhotoRequest(fields: Record<string, string | File>, withAuth = true) {
  const formData = new FormData();
  Object.entries(fields).forEach(([key, value]) => formData.set(key, value));

  return new Request('http://localhost:3000/api/grows/log-entry/photo', {
    method: 'POST',
    headers: withAuth ? { Authorization: 'Bearer mock-token' } : undefined,
    body: formData,
  });
}

describe('API: POST /api/grows/log-entry/photo', () => {
  it('uploads the image to private storage and creates a photo log entry with photo_path', async () => {
    const insertedPayloads: any[] = [];
    const upload = vi.fn(async () => ({ data: { path: 'user-1/grow-1/entry-photo.webp' }, error: null }));
    const createSignedUrl = vi.fn(async () => ({
      data: { signedUrl: 'https://example.supabase.co/storage/v1/object/sign/grow-entry-photos/photo.webp?token=signed' },
      error: null,
    }));

    const supabase = {
      auth: {
        getUser: vi.fn(async () => ({
          data: { user: { id: 'user-1' } },
          error: null,
        })),
      },
      storage: {
        from: vi.fn(() => ({ upload, createSignedUrl })),
      },
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

        if (table === 'grow_entries') {
          return {
            insert: vi.fn((payload: any) => {
              insertedPayloads.push(payload);
              return {
                select: vi.fn(() => ({
                  single: vi.fn(async () => ({ data: { id: 'entry-1', ...payload }, error: null })),
                })),
              };
            }),
          };
        }

        if (table === 'plants') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  in: vi.fn(async () => ({
                    data: [{ id: 'plant-1' }],
                    error: null,
                  })),
                })),
              })),
            })),
          };
        }

        return {};
      }),
    };

    (getAuthenticatedClient as ReturnType<typeof vi.fn>).mockResolvedValue(supabase);

    const res = await POST(makePhotoRequest({
      grow_id: 'grow-1',
      image: makeImageFile('image/webp'),
      caption: 'Tag 15',
      affected_plant_ids: JSON.stringify(['plant-1']),
    }));

    expect(res.status).toBe(200);
    expect(minioStorage.uploadToMinio).toHaveBeenCalledWith(
      'grow-entry-photos',
      expect.stringMatching(/^user-1\/grow-1\/.+\.webp$/),
      expect.any(Buffer),
      'image/webp',
      expect.objectContaining({ upsert: false })
    );
    expect(insertedPayloads[0]).toMatchObject({
      grow_id: 'grow-1',
      user_id: 'user-1',
      plant_id: 'plant-1',
      entry_type: 'photo',
      content: {
        caption: 'Tag 15',
        affected_plant_ids: ['plant-1'],
      },
      entry_date: expect.any(String),
      day_number: expect.any(Number),
    });
    expect((insertedPayloads[0].content as Record<string, unknown>).photo_path).toMatch(/^user-1\/grow-1\/.+\.webp$/);

    const body = await res.json();
    expect(body.data.entry.content.signed_photo_url).toBe(
      'https://example.supabase.co/storage/v1/object/sign/grow-entry-photos/photo.webp?token=signed'
    );
  });

  it('rejects unsupported file types before storage upload', async () => {
    const upload = vi.fn();
    const supabase = {
      auth: {
        getUser: vi.fn(async () => ({
          data: { user: { id: 'user-1' } },
          error: null,
        })),
      },
      storage: {
        from: vi.fn(() => ({ upload })),
      },
    };
    (getAuthenticatedClient as ReturnType<typeof vi.fn>).mockResolvedValue(supabase);

    const res = await POST(makePhotoRequest({
      grow_id: 'grow-1',
      image: makeImageFile('text/plain'),
    }));

    expect(res.status).toBe(400);
    expect(upload).not.toHaveBeenCalled();
  });
});
