import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { POST } from '@/app/api/grows/log-entry/route';
import { auth } from '@clerk/nextjs/server';
import { getAuthenticatedClient } from '@/lib/supabase/client';

// Mock Clerk auth
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}));

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

  function mockAuth(userId: string | null) {
    (auth as ReturnType<typeof vi.fn>).mockResolvedValue({
      userId,
      getToken: vi.fn().mockResolvedValue('mock-token'),
    } as any);
  }

  function mockSupabase(mockClient: any) {
    (getAuthenticatedClient as ReturnType<typeof vi.fn>).mockResolvedValue(mockClient);
  }

  function buildValidReq() {
    return new Request('http://localhost:3000/api/grows/log-entry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grow_id: 'grow-1',
        entry_type: 'watering',
        content: { amount_liters: 2.5 },
      }),
    });
  }

  // Builds a mock Supabase client that chains .from().select().eq().single()
  function makeMockClient(growData: any, entryData?: any, entryError?: any) {
    const growResponse = { data: growData, error: null };
    const entryResponse = entryData !== undefined
      ? { data: entryData, error: entryError || null }
      : { data: null, error: null };

    let callCount = 0;
    return {
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
    mockAuth(null);
    mockSupabase({});

    const req = buildValidReq();
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('should return 400 if grow_id is missing', async () => {
    mockAuth('test-user-123');
    mockSupabase({});

    const req = new Request('http://localhost:3000/api/grows/log-entry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entry_type: 'watering', content: {} }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error?.message).toMatch(/grow_id is required/i);
  });

  it('should return 400 if entry_type is missing', async () => {
    mockAuth('test-user-123');
    mockSupabase({});

    const req = new Request('http://localhost:3000/api/grows/log-entry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ grow_id: 'grow-1', content: {} }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error?.message).toMatch(/entry_type is required/i);
  });

  it('should return 400 for invalid entry_type', async () => {
    mockAuth('test-user-123');
    mockSupabase({});

    const req = new Request('http://localhost:3000/api/grows/log-entry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ grow_id: 'grow-1', entry_type: 'invalid-type', content: {} }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error?.message).toMatch(/entry_type must be one of/i);
  });

  it('should return 404 if grow does not exist', async () => {
    mockAuth('test-user-123');
    const mockClient = makeMockClient(null); // grow not found
    mockSupabase(mockClient);

    const req = buildValidReq();
    const res = await POST(req);
    expect(res.status).toBe(404);
  });

  it('should return 403 if user does not own the grow', async () => {
    mockAuth('another-user');
    const mockClient = makeMockClient({ id: 'grow-1', user_id: 'test-user-123' });
    mockSupabase(mockClient);

    const req = buildValidReq();
    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it('should successfully create a watering entry', async () => {
    mockAuth('test-user-123');
    const mockEntry = {
      id: 'entry-1',
      grow_id: 'grow-1',
      user_id: 'test-user-123',
      entry_type: 'watering',
      content: { amount_liters: 2.5 },
    };
    const mockClient = makeMockClient(
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