import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/notifications/route';

// Mock dependencies
vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(),
}));

vi.mock('@/lib/supabase/client', () => ({
  getAuthenticatedClient: vi.fn(),
}));

vi.mock('@/lib/api-response', () => ({
  jsonError: vi.fn((msg, status) => new Response(JSON.stringify({ error: msg }), { status })),
  jsonSuccess: vi.fn((data, status) => new Response(JSON.stringify(data), { status })),
}));

vi.mock('@/lib/push', () => ({
  sendPushToUser: vi.fn(),
  getSupabaseAdmin: vi.fn(),
}));

describe('API: Notifications GET Route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should log push errors instead of failing', async () => {
    const { createServerSupabaseClient } = await import('@/lib/supabase/server');
    const { sendPushToUser, getSupabaseAdmin } = await import('@/lib/push');
    
    const mockUser = { id: 'user-123' };
    const mockSupabase: any = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }) },
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({
        data: [{ id: 'notif-1', title: 'Test', read: false, pushed_at: null }],
        error: null
      }),
      update: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
    };

    // Correctly handle the thenable nature of the final eq() call
    mockSupabase.eq.mockImplementation(() => {
        return Object.assign(Promise.resolve({ error: null }), mockSupabase);
    });

    (createServerSupabaseClient as any).mockResolvedValue(mockSupabase);
    (getSupabaseAdmin as any).mockReturnValue(mockSupabase);
    
    // Simulate push error
    (sendPushToUser as any).mockRejectedValue(new Error('Push failed'));
    
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const req = new Request('http://localhost:3000/api/notifications');
    const res = await GET(req);

    expect(res?.status).toBe(200);
    expect(sendPushToUser).toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[Push] Failed to send notification notif-1:'),
      expect.any(Error)
    );

    consoleSpy.mockRestore();
  });
});
