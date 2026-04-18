import { describe, expect, it, vi } from 'vitest';
import { addGrowLogEntry } from '@/lib/grows/actions';

function makeRequest(body: Record<string, unknown>) {
  return new Request('http://localhost:3000/api/grows/log-entry', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('addGrowLogEntry affected plants', () => {
  it('stores validated affected_plant_ids in content and keeps plant_id null for multi-plant logs', async () => {
    const insertedPayloads: any[] = [];
    const supabase = {
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

        if (table === 'plants') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  in: vi.fn(async () => ({
                    data: [
                      { id: 'plant-1' },
                      { id: 'plant-2' },
                    ],
                    error: null,
                  })),
                })),
              })),
            })),
          };
        }

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
      }),
    };

    const res = await addGrowLogEntry(
      makeRequest({
        grow_id: 'grow-1',
        entry_type: 'watering',
        content: { amount_liters: 2.5 },
        affected_plant_ids: ['plant-1', 'plant-2'],
        entry_date: '2026-04-02',
      }),
      { userId: 'user-1', supabase: supabase as any }
    );

    expect(res.status).toBe(200);
    expect(insertedPayloads[0]).toMatchObject({
      plant_id: null,
      content: {
        amount_liters: 2.5,
        affected_plant_ids: ['plant-1', 'plant-2'],
      },
    });
  });
});
