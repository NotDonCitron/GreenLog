import { describe, expect, it, vi, beforeEach } from 'vitest';
import { PATCH } from '@/app/api/admin/strains/[id]/publication/route';
import { getAuthenticatedClient } from '@/lib/supabase/client';
import * as authModule from '@/lib/auth';

vi.mock('@/lib/supabase/client', () => ({
  getAuthenticatedClient: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  isAppAdmin: vi.fn(),
}));

function makeRequest(body: Record<string, unknown>) {
  return new Request('http://localhost:3000/api/admin/strains/strain-1/publication', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer admin-token',
    },
    body: JSON.stringify(body),
  });
}

function makeParams() {
  return { params: Promise.resolve({ id: 'strain-1' }) };
}

const completeStrain = {
  id: 'strain-1',
  name: 'Test Strain',
  slug: 'test-strain',
  type: 'hybrid',
  description: 'A complete test strain',
  thc_min: 15.0,
  thc_max: 20.0,
  cbd_min: 1.0,
  cbd_max: 2.0,
  terpenes: ['myrcene', 'limonene'],
  flavors: ['citrus'],
  effects: ['relaxed'],
  image_url: 'https://example.com/image.jpg',
  canonical_image_path: 'strains/test-strain.jpg',
  primary_source: 'manual-curation',
  source_notes: 'Manuell kuratiert und geprüft.',
};

const incompleteStrain = {
  id: 'strain-1',
  name: 'Incomplete Strain',
  slug: 'incomplete-strain',
  type: 'hybrid',
  description: '',
  terpenes: ['myrcene'],
  flavors: [],
  effects: [],
  source_notes: null,
};

describe('API: PATCH /api/admin/strains/[id]/publication', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects non-admin users', async () => {
    vi.mocked(authModule.isAppAdmin).mockReturnValue(false);

    const supabase = {
      auth: {
        getUser: vi.fn(async () => ({
          data: { user: { id: 'user-1' } },
          error: null,
        })),
      },
      from: vi.fn(() => ({})),
    };
    (getAuthenticatedClient as ReturnType<typeof vi.fn>).mockResolvedValue(supabase);

    const res = await PATCH(makeRequest({ publication_status: 'published' }), makeParams());

    expect(res.status).toBe(403);
  });

  it('rejects invalid publication status', async () => {
    vi.mocked(authModule.isAppAdmin).mockReturnValue(true);

    const supabase = {
      auth: {
        getUser: vi.fn(async () => ({
          data: { user: { id: 'admin-user' } },
          error: null,
        })),
      },
      from: vi.fn(() => ({})),
    };
    (getAuthenticatedClient as ReturnType<typeof vi.fn>).mockResolvedValue(supabase);

    const res = await PATCH(makeRequest({ publication_status: 'invalid' }), makeParams());

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.message).toContain('publication_status must be one of');
  });

  it('returns 404 when strain not found', async () => {
    vi.mocked(authModule.isAppAdmin).mockReturnValue(true);

    const supabase = {
      auth: {
        getUser: vi.fn(async () => ({
          data: { user: { id: 'admin-user' } },
          error: null,
        })),
      },
      from: vi.fn((table: string) => {
        if (table === 'strains') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(async () => ({
                  data: null,
                  error: { message: 'Not found' },
                })),
              })),
            })),
          };
        }
        return {};
      }),
    };
    (getAuthenticatedClient as ReturnType<typeof vi.fn>).mockResolvedValue(supabase);

    const res = await PATCH(makeRequest({ publication_status: 'published' }), makeParams());

    expect(res.status).toBe(404);
  });

  it('blocks publication of incomplete strain', async () => {
    vi.mocked(authModule.isAppAdmin).mockReturnValue(true);

    const updatePayloads: any[] = [];
    const supabase = {
      auth: {
        getUser: vi.fn(async () => ({
          data: { user: { id: 'admin-user' } },
          error: null,
        })),
      },
      from: vi.fn((table: string) => {
        if (table === 'strains') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(async () => ({
                  data: incompleteStrain,
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
                      data: null,
                      error: { message: 'Update failed' },
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

    const res = await PATCH(makeRequest({ publication_status: 'published' }), makeParams());

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe('publish_gate_failed');
    expect(body.error.details.missing).toContain('description');
    expect(body.error.details.missing).toContain('thc');
    expect(body.error.details.missing).toContain('cbd');
    expect(body.error.details.missing).toContain('terpenes');
    expect(body.error.details.missing).toContain('flavors');
    expect(body.error.details.missing).toContain('effects');
    expect(body.error.details.missing).toContain('image');
    expect(body.error.details.missing).toContain('source');
  });

  it('allows publication of complete strain', async () => {
    vi.mocked(authModule.isAppAdmin).mockReturnValue(true);

    const updatePayloads: any[] = [];
    const supabase = {
      auth: {
        getUser: vi.fn(async () => ({
          data: { user: { id: 'admin-user' } },
          error: null,
        })),
      },
      from: vi.fn((table: string) => {
        if (table === 'strains') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(async () => ({
                  data: completeStrain,
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
                        id: 'strain-1',
                        publication_status: 'published',
                        quality_score: 100,
                        reviewed_by: 'admin-user',
                        reviewed_at: new Date().toISOString(),
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

    const res = await PATCH(makeRequest({ publication_status: 'published' }), makeParams());

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.strain.publication_status).toBe('published');
    expect(body.data.strain.quality_score).toBe(100);
    expect(updatePayloads[0]).toMatchObject({
      publication_status: 'published',
      quality_score: 100,
      reviewed_by: 'admin-user',
    });
  });

  it('allows setting strain to draft', async () => {
    vi.mocked(authModule.isAppAdmin).mockReturnValue(true);

    const supabase = {
      auth: {
        getUser: vi.fn(async () => ({
          data: { user: { id: 'admin-user' } },
          error: null,
        })),
      },
      from: vi.fn((table: string) => {
        if (table === 'strains') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(async () => ({
                  data: incompleteStrain,
                  error: null,
                })),
              })),
            })),
            update: vi.fn(() => ({
              eq: vi.fn(() => ({
                select: vi.fn(() => ({
                  single: vi.fn(async () => ({
                    data: {
                      id: 'strain-1',
                      publication_status: 'draft',
                      quality_score: 0,
                      reviewed_by: 'admin-user',
                      reviewed_at: new Date().toISOString(),
                    },
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

    const res = await PATCH(makeRequest({ publication_status: 'draft' }), makeParams());

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.strain.publication_status).toBe('draft');
  });

  it('allows setting strain to review without full publish gate', async () => {
    vi.mocked(authModule.isAppAdmin).mockReturnValue(true);

    const supabase = {
      auth: {
        getUser: vi.fn(async () => ({
          data: { user: { id: 'admin-user' } },
          error: null,
        })),
      },
      from: vi.fn((table: string) => {
        if (table === 'strains') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(async () => ({
                  data: incompleteStrain,
                  error: null,
                })),
              })),
            })),
            update: vi.fn(() => ({
              eq: vi.fn(() => ({
                select: vi.fn(() => ({
                  single: vi.fn(async () => ({
                    data: {
                      id: 'strain-1',
                      publication_status: 'review',
                      quality_score: 14,
                      reviewed_by: 'admin-user',
                      reviewed_at: new Date().toISOString(),
                    },
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

    const res = await PATCH(makeRequest({ publication_status: 'review' }), makeParams());

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.strain.publication_status).toBe('review');
  });

  it('blocks risky sources without manual source notes', async () => {
    vi.mocked(authModule.isAppAdmin).mockReturnValue(true);

    const supabase = {
      auth: {
        getUser: vi.fn(async () => ({
          data: { user: { id: 'admin-user' } },
          error: null,
        })),
      },
      from: vi.fn((table: string) => {
        if (table === 'strains') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(async () => ({
                  data: {
                    ...completeStrain,
                    primary_source: 'askgrowers',
                    source_notes: '',
                  },
                  error: null,
                })),
              })),
            })),
          };
        }
        return {};
      }),
    };
    (getAuthenticatedClient as ReturnType<typeof vi.fn>).mockResolvedValue(supabase);

    const res = await PATCH(makeRequest({ publication_status: 'published' }), makeParams());

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe('publish_gate_failed');
    expect(body.error.details.missing).toContain('source');
  });
});
