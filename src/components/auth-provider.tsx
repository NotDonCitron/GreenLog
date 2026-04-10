"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import { useAuth as useClerkAuth, useUser as useClerkUser } from "@clerk/nextjs";
import type { OrganizationMembership } from "@/lib/types";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isDemoMode: boolean;
  setDemoMode: (val: boolean) => void;
  signOut: () => Promise<void>;
  memberships: OrganizationMembership[];
  activeOrganization: OrganizationMembership | null;
  membershipsLoading: boolean;
  setActiveOrganizationId: (organizationId: string | null) => void;
  refreshMemberships: () => Promise<void>;
}

const ACTIVE_ORG_STORAGE_KEY = "greenlog_active_organization_id";
const DEMO_MODE_STORAGE_KEY = "cannalog_demo_mode";

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  isDemoMode: false,
  setDemoMode: () => { },
  signOut: async () => { },
  memberships: [],
  activeOrganization: null,
  membershipsLoading: false,
  setActiveOrganizationId: () => { },
  refreshMemberships: async () => { },
});

function readStoredActiveOrganizationId(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return localStorage.getItem(ACTIVE_ORG_STORAGE_KEY);
}

async function fetchMembershipsForUser(userId: string): Promise<OrganizationMembership[]> {
  try {
    const { data, error } = await supabase
      .from("organization_members")
      .select(`
        id,
        organization_id,
        user_id,
        role,
        membership_status,
        joined_at,
        invited_by,
        created_at,
        updated_at,
        organizations:organization_id (
          id,
          name,
          slug,
          organization_type,
          license_number,
          status,
          created_by,
          created_at,
          updated_at,
          requires_member_approval
        )
      `)
      .eq("user_id", userId)
      .eq("membership_status", "active")
      .order("created_at", { ascending: true });

    if (error) {
      console.warn("[Auth] Membership fetch error (expected if table missing):", error.message);
      return [];
    }

    const rows = (data ?? []) as unknown as OrganizationMembership[];

    return rows.map((membership) => ({
      ...membership,
      organizations: Array.isArray(membership.organizations)
        ? membership.organizations[0] ?? null
        : membership.organizations ?? null,
    }));
  } catch (e) {
    console.error("[Auth] Unexpected error in fetchMembershipsForUser:", e);
    return [];
  }
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();
  const { userId, isLoaded: clerkLoaded, getToken, signOut: clerkSignOut } = useClerkAuth();
  const { user: clerkUser } = useClerkUser();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [membershipsLoading, setMembershipsLoading] = useState(false);
  const [memberships, setMemberships] = useState<OrganizationMembership[]>([]);
  const [activeOrganizationId, setActiveOrganizationIdState] = useState<string | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(DEMO_MODE_STORAGE_KEY) === "true";
    }
    return false;
  });

  // useAuth() reads __session cookie set by clerkMiddleware — no JS SDK init needed
  useEffect(() => {
    if (!clerkLoaded) return;

    const syncClerkToSupabase = async () => {
      if (userId && clerkUser) {
        console.log("[Auth] Clerk userId found, creating synthetic Supabase session...", userId);
        try {
          const token = await getToken({ template: 'supabase' });

          if (token) {
            console.log("[Auth] Clerk token received, setting synthetic session...");

            let supabaseUserId = userId;
            try {
              const base64Url = token.split('.')[1];
              const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
              const jsonPayload = decodeURIComponent(atob(base64).split('').map(function (c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
              }).join(''));
              const payload = JSON.parse(jsonPayload);
              if (payload.sub) {
                supabaseUserId = payload.sub;
              }
            } catch (e) {
              console.warn("[Auth] Failed to parse JWT payload", e);
            }

            const mappedUser = {
              id: supabaseUserId,
              app_metadata: { provider: 'clerk' },
              user_metadata: {
                avatar_url: clerkUser.imageUrl,
                full_name: clerkUser.fullName,
                username: clerkUser.username || clerkUser.primaryEmailAddress?.emailAddress?.split('@')[0] || ''
              },
              email: clerkUser.primaryEmailAddress?.emailAddress,
              created_at: clerkUser.createdAt ? new Date(clerkUser.createdAt).toISOString() : new Date().toISOString(),
              aud: 'authenticated',
            } as User;

            const mappedSession = {
              access_token: token,
              refresh_token: '',
              expires_in: 3600,
              expires_at: Math.floor(Date.now() / 1000) + 3600,
              token_type: 'bearer',
              user: mappedUser,
            } as Session;

            setSession(mappedSession);
            setUser(mappedUser);
          } else {
            console.error("[Auth] No token found from Clerk");
            setSession(null);
            setUser(null);
          }
        } catch (err) {
          console.error("[Auth] Failed to sync Clerk session:", err);
          setSession(null);
          setUser(null);
        }
      } else {
        console.log("[Auth] No Clerk userId or user, clearing session");
        setSession(null);
        setUser(null);
      }
      setLoading(false);
    };

    syncClerkToSupabase();
  }, [clerkLoaded, userId, clerkUser, getToken]);


  const syncActiveOrganization = useCallback((nextMemberships: OrganizationMembership[]) => {
    const storedId = readStoredActiveOrganizationId();
    const fallbackId = nextMemberships[0]?.organization_id ?? null;
    const nextId = nextMemberships.some((membership) => membership.organization_id === storedId)
      ? storedId
      : fallbackId;

    setActiveOrganizationIdState(nextId);

    if (typeof window !== "undefined") {
      if (nextId) {
        localStorage.setItem(ACTIVE_ORG_STORAGE_KEY, nextId);
      } else {
        localStorage.removeItem(ACTIVE_ORG_STORAGE_KEY);
      }
    }
  }, []);

  const refreshMemberships = useCallback(async () => {
    if (!user) {
      setMemberships([]);
      setActiveOrganizationIdState(null);
      return;
    }

    setMembershipsLoading(true);
    try {
      const nextMemberships = await fetchMembershipsForUser(user.id);
      setMemberships(nextMemberships);
      syncActiveOrganization(nextMemberships);
    } catch (error: unknown) {
      // PGRST205 = table not found in schema cache (organization_members doesn't exist yet)
      // 54001 = stack depth limit exceeded (recursive RLS policy issue)
      const errorCode = error && typeof error === 'object' && 'code' in error ? (error as { code: string }).code : null;
      const isKnownError = errorCode === 'PGRST205' || errorCode === '54001';
      if (!isKnownError) {
        console.error("Failed to fetch organization memberships:", error);
      }
      setMemberships([]);
      setActiveOrganizationIdState(null);
    } finally {
      setMembershipsLoading(false);
    }
  }, [syncActiveOrganization, user]);

  useEffect(() => {
    if (!clerkLoaded) return;
    if (!user) {
      setMemberships([]);
      setActiveOrganizationIdState(null);
      if (typeof window !== "undefined") {
        localStorage.removeItem(ACTIVE_ORG_STORAGE_KEY);
      }
      return;
    }

    void refreshMemberships();
  }, [clerkLoaded, user, refreshMemberships]);

  const setDemoMode = (val: boolean) => {
    setIsDemoMode(val);
    localStorage.setItem(DEMO_MODE_STORAGE_KEY, val.toString());
  };

  const setActiveOrganizationId = (organizationId: string | null) => {
    setActiveOrganizationIdState(organizationId);

    if (typeof window !== "undefined") {
      if (organizationId) {
        localStorage.setItem(ACTIVE_ORG_STORAGE_KEY, organizationId);
      } else {
        localStorage.removeItem(ACTIVE_ORG_STORAGE_KEY);
      }
    }
  };

  const signOut = async () => {
    if (clerkSignOut) {
      await clerkSignOut();
    }
    setMemberships([]);
    setActiveOrganizationIdState(null);
    setDemoMode(false);
    if (typeof window !== "undefined") {
      localStorage.removeItem(ACTIVE_ORG_STORAGE_KEY);
    }
    router.push("/sign-in");
  };

  const activeOrganization = useMemo(
    () => memberships.find((membership) => membership.organization_id === activeOrganizationId) ?? null,
    [activeOrganizationId, memberships]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading: loading || !clerkLoaded,
        isDemoMode,
        setDemoMode,
        signOut,
        memberships,
        activeOrganization,
        membershipsLoading,
        setActiveOrganizationId,
        refreshMemberships,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
