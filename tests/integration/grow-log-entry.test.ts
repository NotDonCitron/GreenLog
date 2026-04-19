import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { POST } from '@/app/api/grows/log-entry/route';
import { getAuthenticatedClient } from '@/lib/supabase/client';

// Mock getAuthenticatedClient (used by getServerUser in actions.ts)
vi.mock('@/lib/supabase/client', () => ({
  getAuthenticatedClient: vi.fn(),
}));

describe('API: POST /api/grows/log-entry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function mockSupabase(mockClient: any) {
    (getAuthenticatedClient as ReturnType<typeof vi.fn>).mockResolvedValue(mockClient);
  }

  function buildValidReq(withAuth = true) {
    return new Request('http://localhost:3000/api/grows/log-entry', {
      method: 'POST',
      headers: withAuth
        ? { 'Content-Type': 'application/json', Authorization: 'Bearer mock-token' }
        : { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grow_id: 'grow-1',
        entry_type: 'watering',
        content: { amount_liters: 2.5 },
      }),
    });
  }

  // Builds a mock Supabase client that chains .from().select().eq().single()
  function makeMockClient(userId: string | null, growData: any, entryData?: any, entryError?: any) {
    const growResponse = { data: growData, error: null };
    const entryResponse = entryData !== undefined
      ? { data: entryData, error: entryError || null }
      : { data: null, error: null };

    let callCount = 0;
    return {
      auth: {
        getUser: vi.fn(async () => ({
          data: { user: userId ? { id: userId } : null },
          error: null,
        })),
      },
      from: vi.fn((table: string) => {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => {
                callCount++;
                // First call: grow lookup (for ownership check)
                // Second call: insert (for entry creation)
                if (callCount === 1) return Promise.resolve(growResponse);
                if (callCount === 2) return Promise.resolve(entryResponse);
                return Promise.resolve({ data: null, error: null });
              }),
            })),
          })),
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve(entryResponse)),
            })),
          })),
        };
      }),
    };
  }

  it('should return 401 if not authenticated', async () => {
    mockSupabase({});

    const req = buildValidReq(false);
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('should return 400 if grow_id is missing', async () => {
    mockSupabase(makeMockClient('test-user-123', null));

    const req = new Request('http://localhost:3000/api/grows/log-entry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer mock-token' },
      body: JSON.stringify({ entry_type: 'watering', content: {} }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error?.message).toMatch(/grow_id is required/i);
  });

  it('should return 400 if entry_type is missing', async () => {
    mockSupabase(makeMockClient('test-user-123', null));

    const req = new Request('http://localhost:3000/api/grows/log-entry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer mock-token' },
      body: JSON.stringify({ grow_id: 'grow-1', content: {} }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error?.message).toMatch(/entry_type is required/i);
  });

  it('should return 400 for invalid entry_type', async () => {
    mockSupabase(makeMockClient('test-user-123', null));

    const req = new Request('http://localhost:3000/api/grows/log-entry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer mock-token' },
      body: JSON.stringify({ grow_id: 'grow-1', entry_type: 'invalid-type', content: {} }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error?.message).toMatch(/entry_type must be one of/i);
  });

  it('should return 404 if grow does not exist', async () => {
    const mockClient = makeMockClient('test-user-123', null); // grow not found
    mockSupabase(mockClient);

    const req = buildValidReq();
    const res = await POST(req);
    expect(res.status).toBe(404);
  });

  it('should return 403 if user does not own the grow', async () => {
    const mockClient = makeMockClient('another-user', { id: 'grow-1', user_id: 'test-user-123' });
    mockSupabase(mockClient);

    const req = buildValidReq();
    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it('should successfully create a watering entry', async () => {
    const mockEntry = {
      id: 'entry-1',
      grow_id: 'grow-1',
      user_id: 'test-user-123',
      entry_type: 'watering',
      content: { amount_liters: 2.5 },
    };
    const mockClient = makeMockClient(
      'test-user-123',
      { id: 'grow-1', user_id: 'test-user-123' },
      mockEntry
    );
    mockSupabase(mockClient);

    const req = buildValidReq();
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data?.entry).toMatchObject({
      grow_id: 'grow-1',
      entry_type: 'watering',
    });
  });
});
