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
import { syncSupabaseSessionCookies } from "@/lib/auth/session-cookies";
import type { User, Session } from "@supabase/supabase-js";
import type { OrganizationMembership } from "@/lib/types";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isDemoMode: boolean;
  setDemoMode: (val: boolean) => void;
  signOut: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, metadata?: Record<string, unknown>) => Promise<{ error: string | null }>;
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
  setDemoMode: () => {},
  signOut: async () => {},
  signIn: async () => ({ error: null }),
  signUp: async () => ({ error: null }),
  memberships: [],
  activeOrganization: null,
  membershipsLoading: true,
  setActiveOrganizationId: () => {},
  refreshMemberships: async () => {},
});

function readStoredActiveOrganizationId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACTIVE_ORG_STORAGE_KEY);
}

async function fetchMembershipsForUser(userId: string): Promise<OrganizationMembership[]> {
  try {
    const { data, error } = await supabase
      .from("organization_members")
      .select(`
        id, organization_id, user_id, role, membership_status,
        joined_at, invited_by, created_at, updated_at,
        organizations:organization_id (
          id, name, slug, organization_type, license_number,
          status, created_by, created_at, updated_at, logo_url,
          avatar_url, requires_member_approval
        )
      `)
      .eq("user_id", userId)
      .eq("membership_status", "active")
      .order("created_at", { ascending: true });

    if (error) {
      console.warn("[Auth] Membership fetch error:", error.message);
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

interface OrgState {
  memberships: OrganizationMembership[];
  activeId: string | null;
  loading: boolean;
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [orgState, setOrgState] = useState<OrgState>({
    memberships: [],
    activeId: readStoredActiveOrganizationId(),
    loading: true
  });

  const [isDemoMode, setIsDemoMode] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(DEMO_MODE_STORAGE_KEY) === "true";
    }
    return false;
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      syncSupabaseSessionCookies(initialSession);
      setSession(initialSession);
      setUser(initialSession?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      syncSupabaseSessionCookies(session);
      setSession(session);
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const refreshMemberships = useCallback(async () => {
    if (!user) {
      setOrgState(prev => ({ ...prev, memberships: [], loading: false }));
      return;
    }
    
    setOrgState(prev => ({ ...prev, loading: true }));
    try {
      const nextMemberships = await fetchMembershipsForUser(user.id);
      
      const storedId = readStoredActiveOrganizationId();
      const fallbackId = nextMemberships[0]?.organization_id ?? null;
      const nextId = nextMemberships.some((m) => m.organization_id === storedId)
        ? storedId
        : fallbackId;

      if (typeof window !== "undefined") {
        if (nextId) {
          localStorage.setItem(ACTIVE_ORG_STORAGE_KEY, nextId);
        } else {
          localStorage.removeItem(ACTIVE_ORG_STORAGE_KEY);
        }
      }

      setOrgState({
        memberships: nextMemberships,
        activeId: nextId,
        loading: false
      });
    } catch (error: unknown) {
      const errorCode = error && typeof error === 'object' && 'code' in error ? (error as { code: string }).code : null;
      const isKnownError = errorCode === 'PGRST205' || errorCode === '54001';
      if (!isKnownError) {
        console.error("Failed to fetch organization memberships:", error);
      }
      setOrgState({
        memberships: [],
        activeId: null,
        loading: false
      });
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setOrgState(prev => ({ ...prev, memberships: [], loading: false }));
      return;
    }
    void refreshMemberships();
  }, [user, refreshMemberships]);

  const setDemoMode = (val: boolean) => {
    setIsDemoMode(val);
    localStorage.setItem(DEMO_MODE_STORAGE_KEY, val.toString());
  };

  const setActiveOrganizationId = (organizationId: string | null) => {
    setOrgState(prev => ({ ...prev, activeId: organizationId }));
    if (typeof window !== "undefined") {
      if (organizationId) {
        localStorage.setItem(ACTIVE_ORG_STORAGE_KEY, organizationId);
      } else {
        localStorage.removeItem(ACTIVE_ORG_STORAGE_KEY);
      }
    }
  };

  const signIn = async (email: string, password: string): Promise<{ error: string | null }> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return { error: null };
  };

  const signUp = async (email: string, password: string, metadata?: Record<string, unknown>): Promise<{ error: string | null }> => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: metadata },
    });
    if (error) return { error: error.message };
    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    syncSupabaseSessionCookies(null);
    setOrgState({ memberships: [], activeId: null, loading: false });
    setDemoMode(false);
    if (typeof window !== "undefined") {
      localStorage.removeItem(ACTIVE_ORG_STORAGE_KEY);
    }
    router.push("/sign-in");
  };

  const activeOrganization = useMemo(
    () => orgState.memberships.find((m) => m.organization_id === orgState.activeId) ?? null,
    [orgState.activeId, orgState.memberships]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        isDemoMode,
        setDemoMode,
        signOut,
        signIn,
        signUp,
        memberships: orgState.memberships,
        activeOrganization,
        membershipsLoading: orgState.loading,
        setActiveOrganizationId,
        refreshMemberships,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
