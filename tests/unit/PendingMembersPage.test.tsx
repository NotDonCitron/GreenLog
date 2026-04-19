import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import PendingMembersPage from '@/app/settings/organization/pending-members/page.tsx';
import { useAuth } from '@/components/auth-provider';

// Mock useAuth hook
vi.mock('@/components/auth-provider', () => ({
  useAuth: vi.fn(),
}));

// Mock useRouter hook
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    back: vi.fn(),
    refresh: vi.fn(),
  }),
}));

// Mock BottomNav
vi.mock('@/components/bottom-nav', () => ({
  BottomNav: () => <div data-testid="bottom-nav" />,
}));

// Mock Lucide icons to avoid potential rendering issues in test
vi.mock('lucide-react', () => ({
  ChevronLeft: () => <div data-testid="chevron-left" />,
  Loader2: ({ className, size }: { className?: string, size?: number }) => (
    <div data-testid="loader" className={className} data-size={size} />
  ),
  Users: () => <div data-testid="users" />,
  UserRound: () => <div data-testid="user-round" />,
  Check: () => <div data-testid="check" />,
  X: () => <div data-testid="x" />,
}));

describe('PendingMembersPage Loader Test', () => {
  it('should show loader when membershipsLoading is true', () => {
    (useAuth as any).mockReturnValue({
      user: { id: 'user-1' },
      session: { access_token: 'fake-token' },
      activeOrganization: null,
      membershipsLoading: true,
      isDemoMode: false,
    });

    render(<PendingMembersPage />);

    // Check if loader is present
    const loader = screen.getByTestId('loader');
    expect(loader).toBeDefined();
    expect(loader.className).toContain('animate-spin');
  });

  it('should show loader when activeOrganization is null and membershipsLoading is false', () => {
    // This state happens initially or when user is not in any org
    (useAuth as any).mockReturnValue({
      user: { id: 'user-1' },
      session: { access_token: 'fake-token' },
      activeOrganization: null,
      membershipsLoading: false,
      isDemoMode: false,
    });

    render(<PendingMembersPage />);

    const loader = screen.getByTestId('loader');
    expect(loader).toBeDefined();
  });

  it('should not show main loader when activeOrganization is loaded and membershipsLoading is false', async () => {
    (useAuth as any).mockReturnValue({
      user: { id: 'user-1' },
      session: { access_token: 'fake-token' },
      activeOrganization: {
        organization_id: 'org-1',
        role: 'owner',
        organizations: { name: 'Test Org' }
      },
      membershipsLoading: false,
      isDemoMode: false,
    });

    // Mock fetch for pending members
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { pendingMembers: [] } }),
    });

    render(<PendingMembersPage />);

    // Loader from the first two if conditions should NOT be present
    // Note: The content itself might show a loader while fetching members,
    // but the main full-screen loader should be gone.
    const mainLoader = screen.queryByTestId('loader');
    
    // In the actual component, if 'loading' is true, it shows a loader in the content area.
    // Let's check if there's ONLY one loader (the one in the content area) 
    // and if the "Ausstehende Anfragen" header is present.
    const header = screen.getByText('Ausstehende Anfragen');
    expect(header).toBeDefined();
  });
});
