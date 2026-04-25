"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";

export function useAppAdmin() {
  const { user, session, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (authLoading) return;
      if (!user || !session?.access_token) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const response = await fetch("/api/admin/me", {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const payload = await response.json().catch(() => null);
        if (!cancelled) {
          setIsAdmin(response.ok && payload?.data?.isAdmin === true);
        }
      } catch {
        if (!cancelled) setIsAdmin(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [authLoading, session?.access_token, user]);

  return { isAdmin, loading: authLoading || loading };
}
