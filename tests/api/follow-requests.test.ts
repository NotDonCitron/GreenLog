import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PUT } from '@/app/api/follow-request/manage/route';

vi.mock('@/lib/supabase/client', () => ({
  getAuthenticatedClient: vi.fn(),
}));

vi.mock('@/lib/api-response', () => ({
  authenticateRequest: vi.fn(),
  jsonError: vi.fn((msg, status) => new Response(JSON.stringify({ error: msg }), { status })),
  jsonSuccess: vi.fn((data, status) => new Response(JSON.stringify(data), { status })),
}));

describe('API: Follow Request Manage PUT Route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 400 for invalid action', async () => {
    const { authenticateRequest } = await import('@/lib/api-response');
    (authenticateRequest as any).mockResolvedValue({ user: { id: 'user-1' }, supabase: {} });

    const req = new Request('http://localhost:3000/api/follow-request/manage', {
      method: 'PUT',
      body: JSON.stringify({ requestId: 'req-1', action: 'invalid' }),
    });

    const res = await PUT(req);
    expect(res?.status).toBe(400);
  });

  it('should return 404 if request not found', async () => {
    const { authenticateRequest } = await import('@/lib/api-response');
    const mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
    };
    (authenticateRequest as any).mockResolvedValue({ user: { id: 'user-1' }, supabase: mockSupabase });

    const req = new Request('http://localhost:3000/api/follow-request/manage', {
      method: 'PUT',
      body: JSON.stringify({ requestId: 'missing', action: 'approve' }),
    });

    const res = await PUT(req);
    expect(res?.status).toBe(404);
  });

  it('should return 403 if user is not the target of the request', async () => {
    const { authenticateRequest } = await import('@/lib/api-response');
    const mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ 
        data: { requester_id: 'user-2', target_id: 'other-user', status: 'pending' }, 
        error: null 
      }),
    };
    (authenticateRequest as any).mockResolvedValue({ user: { id: 'user-1' }, supabase: mockSupabase });

    const req = new Request('http://localhost:3000/api/follow-request/manage', {
      method: 'PUT',
      body: JSON.stringify({ requestId: 'req-1', action: 'approve' }),
    });

    const res = await PUT(req);
    expect(res?.status).toBe(403);
  });
});
