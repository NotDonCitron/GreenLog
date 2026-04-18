import { describe, expect, it, vi } from 'vitest';
import { addGrowLogEntry } from '@/lib/grows/actions';

describe('addGrowLogEntry day_number', () => {
  it('calculates day_number from the grow start_date and entry_date', async () => {
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
                    user_id: 'test-user-123',
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

    const req = new Request('http://localhost:3000/api/grows/log-entry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grow_id: 'grow-1',
        entry_type: 'note',
        content: { note_text: 'Week two check-in' },
        entry_date: '2026-04-15',
      }),
    });

    const res = await addGrowLogEntry(req, {
      userId: 'test-user-123',
      supabase: supabase as any,
    });

    expect(res.status).toBe(200);
    expect(insertedPayloads[0]).toMatchObject({
      entry_date: '2026-04-15',
      day_number: 15,
    });
  });
});
