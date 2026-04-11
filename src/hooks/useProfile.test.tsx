import { renderHook, waitFor } from "@testing-library/react";
import { useProfile } from "./useProfile";
import { useAuth } from "@/components/auth-provider";
import { supabase } from "@/lib/supabase/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";

// Mock dependencies
vi.mock("@/components/auth-provider", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/lib/supabase/client", () => ({
  supabase: {
    from: vi.fn(),
  },
}));

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

describe("useProfile hook", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = createTestQueryClient();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it("should return fallback view model in demo mode", async () => {
    (useAuth as any).mockReturnValue({
      user: null,
      loading: false,
      isDemoMode: true,
    });

    const { result } = renderHook(() => useProfile(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.identity.username).toBe("@guest");
    expect(result.current.data?.stats.level).toBe(1);
  });

  it("should fetch profile data for an authenticated user", async () => {
    const mockUser = {
      id: "test-user-id",
      email: "test@example.com",
      user_metadata: { full_name: "Test User" },
    };

    (useAuth as any).mockReturnValue({
      user: mockUser,
      loading: false,
      isDemoMode: false,
    });

    const mockResponse = (data: any = null, count: number | null = null) => ({
      data,
      count,
      error: null,
      then: (resolve: any) => resolve({ data, count, error: null }),
    });

    const mockBuilder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockImplementation(() => Promise.resolve({ data: { username: "testuser", display_name: "Test User" }, error: null })),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
    };

    // Generic mock for then to make it awaitable
    (mockBuilder as any).then = function(resolve: any) {
      if (this === mockBuilder) {
        // Default response if no specific implementation was hit
        return Promise.resolve({ data: [], count: 0, error: null }).then(resolve);
      }
    };

    const mockFrom = supabase.from as any;
    mockFrom.mockImplementation((table: string) => {
      const builder = { ...mockBuilder };
      
      if (table === "profiles") {
        builder.maybeSingle = vi.fn().mockResolvedValue({ data: { username: "testuser", display_name: "Test User" }, error: null });
      } else if (table === "user_collection") {
        // This is tricky because it's called twice with different structures
        // 1. .select("*", { count: "exact", head: true }).eq("user_id", userId)
        // 2. .select("strain_id, user_image_url").eq("user_id", userId).in("strain_id", favoriteIds)
        builder.eq = vi.fn().mockImplementation(() => {
           return {
             ...builder,
             then: (resolve: any) => resolve({ count: 10, data: [], error: null })
           };
        });
      } else if (table === "follows") {
        builder.eq = vi.fn().mockResolvedValue({ count: 5, data: [], error: null });
      } else if (table === "user_strain_relations") {
        builder.limit = vi.fn().mockResolvedValue({ data: [], error: null });
      } else if (table === "user_badges") {
        builder.eq = vi.fn().mockResolvedValue({ data: [], error: null });
      }
      
      return builder;
    });

    const { result } = renderHook(() => useProfile(), { wrapper });

    await waitFor(() => {
      if (result.current.isError) {
        console.error("Hook Error:", result.current.error);
      }
      expect(result.current.isSuccess).toBe(true);
    }, { timeout: 3000 });

    expect(result.current.data?.identity.username).toBe("@testuser");
    expect(result.current.data?.stats.totalStrains).toBe(10);
    expect(result.current.data?.stats.followers).toBe(5);
  });
});
