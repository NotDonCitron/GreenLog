"use client";

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth-provider";

export interface Organization {
  id: string;
  name: string;
  slug: string | null;
  organization_type: string;
  license_number: string | null;
  status: string;
  logo_url?: string | null;
  position: number;
}

export interface MemberOrg extends Organization {
  membership_role?: string;
}

interface CommunityOrder {
  organization_id: string;
  position: number;
}

async function fetchCommunityData(userId: string | undefined, memberships: { organization_id: string; role?: string }[]) {
  const { data: allOrgs, error } = await supabase
    .from("organizations")
    .select("id, name, slug, organization_type, license_number, status, logo_url")
    .eq("status", "active")
    .order("name", { ascending: true })
    .limit(50);

  if (error) throw error;
  if (!allOrgs) return { myOrgs: [] as MemberOrg[], otherOrgs: [] as Organization[] };

  let mine: MemberOrg[] = [];
  let others: Organization[] = [];

  if (userId) {
    const { data: savedOrder } = await supabase
      .from("user_community_order")
      .select("organization_id, position")
      .eq("user_id", userId);

    const orderMap = new Map<string, number>((savedOrder || []).map((o: CommunityOrder) => [o.organization_id, o.position]));

    const myOrgIds = new Set(memberships.map((m) => m.organization_id));

    for (const org of allOrgs) {
      if (myOrgIds.has(org.id)) {
        const membership = memberships.find((m) => m.organization_id === org.id);
        mine.push({ ...org, membership_role: membership?.role, position: orderMap.get(org.id) ?? -1000 - mine.length });
      } else {
        others.push({ ...org, position: orderMap.get(org.id) ?? 0 });
      }
    }

    mine.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    others.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  } else {
    // Logged out — show all as "other"
    others = allOrgs.map(org => ({ ...org, position: 0 }));
  }

  return { myOrgs: mine, otherOrgs: others };
}

export function useCommunity() {
  const { user, memberships } = useAuth();

  return useQuery({
    queryKey: ['community-list', user?.id, memberships.length],
    queryFn: () => fetchCommunityData(user?.id, memberships),
    enabled: true,
    staleTime: 60 * 1000,
  });
}
