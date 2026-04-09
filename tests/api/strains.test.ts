import { describe, it, expect, vi } from 'vitest';
import { POST } from '@/app/api/strains/route';

// Mocking der Abhängigkeiten
vi.mock('@/lib/supabase/client', () => ({
  getAuthenticatedClient: vi.fn(),
}));

vi.mock('@/lib/api-response', () => ({
  authenticateRequest: vi.fn(),
  jsonError: vi.fn((msg, status) => new Response(JSON.stringify({ error: msg }), { status })),
  jsonSuccess: vi.fn((data, status) => new Response(JSON.stringify(data), { status })),
}));

describe('API: Strains POST Route', () => {
  
  it('should return 400 if required fields are missing', async () => {
    const { authenticateRequest } = await import('@/lib/api-response');
    
    // Mocking einer erfolgreichen Authentifizierung
    (authenticateRequest as any).mockResolvedValue({ 
      user: { id: 'test-user' }, 
      supabase: {} 
    });

    // Request mit fehlenden Feldern
    const req = new Request('http://localhost:3000/api/strains', {
      method: 'POST',
      body: JSON.stringify({ name: 'Only Name' }),
    });

    const res = await POST(req);
    expect(res?.status).toBe(400);
    const body = await res?.json();
    expect(body.error).toMatch(/Missing required fields/i);
  });

  it('should return 400 for invalid strain types', async () => {
    const { authenticateRequest } = await import('@/lib/api-response');
    
    (authenticateRequest as any).mockResolvedValue({ 
      user: { id: 'test-user' }, 
      supabase: {} 
    });

    const req = new Request('http://localhost:3000/api/strains', {
      method: 'POST',
      body: JSON.stringify({ 
        name: 'Strong Bud', 
        slug: 'strong-bud', 
        type: 'invalid-type' 
      }),
    });

    const res = await POST(req);
    expect(res?.status).toBe(400);
    const body = await res?.json();
    expect(body.error).toMatch(/type must be one of/i);
  });
});
