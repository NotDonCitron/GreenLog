"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { supabase } from "@/lib/supabase/client";
import { User, Session } from "@supabase/supabase-js";
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
        updated_at
      )
    `)
    .eq("user_id", userId)
    .eq("membership_status", "active")
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  const rows = (data ?? []) as unknown as OrganizationMembership[];

  return rows.map((membership) => ({
    ...membership,
    organizations: Array.isArray(membership.organizations)
      ? membership.organizations[0] ?? null
      : membership.organizations ?? null,
  }));
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
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
    // Timeout fallback: if getSession() hangs, unblock the UI after 10s
    const timeoutId = setTimeout(() => {
      console.warn("[Auth] getSession() timed out — unblocking UI");
      setLoading(false);
    }, 10000);

    supabase.auth.getSession().then(({ data: { session } }) => {
      clearTimeout(timeoutId);
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    }).catch((err) => {
      clearTimeout(timeoutId);
      console.error("[Auth] getSession() failed:", err);
      setSession(null);
      setUser(null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      setMemberships([]);
      setActiveOrganizationIdState(null);
      if (typeof window !== "undefined") {
        localStorage.removeItem(ACTIVE_ORG_STORAGE_KEY);
      }
      return;
    }

    void refreshMemberships();
  }, [refreshMemberships, user]);

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
    await supabase.auth.signOut();
    setMemberships([]);
    setActiveOrganizationIdState(null);
    setDemoMode(false);
    if (typeof window !== "undefined") {
      localStorage.removeItem(ACTIVE_ORG_STORAGE_KEY);
    }
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
        loading,
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
