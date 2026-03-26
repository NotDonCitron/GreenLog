"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BottomNav } from "@/components/bottom-nav";
import { Card } from "@/components/ui/card";
import { Leaf, Building2, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

interface Organization {
  id: string;
  name: string;
  slug: string | null;
  organization_type: string;
  license_number: string | null;
  status: string;
}

function OrgTypeLabel({ type }: { type: string }) {
  const label = type === "club" ? "Club" : type === "pharmacy" ? "Apotheke" : type;
  return (
    <span className="text-[10px] text-white/40 font-mono uppercase tracking-wider">
      {label}
    </span>
  );
}

function CommunityCard({ org }: { org: Organization }) {
  return (
    <Link href={`/community/${org.id}`}>
      <Card className="bg-[#1e3a24] border-white/10 p-5 rounded-3xl hover:bg-[#243d2a] transition-colors cursor-pointer">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-[#2FF801]/10 border border-[#2FF801]/20 flex items-center justify-center shrink-0">
            <Leaf size={20} className="text-[#2FF801]" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-black text-sm truncate">{org.name}</p>
            <OrgTypeLabel type={org.organization_type} />
          </div>
          <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center shrink-0">
            <Building2 size={14} className="text-white/30" />
          </div>
        </div>
      </Card>
    </Link>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-12 space-y-3">
      <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto">
        <Building2 size={24} className="text-white/20" />
      </div>
      <p className="text-white/40 text-sm">Es gibt noch keine Communities.</p>
    </div>
  );
}

export default function CommunityListPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrganizations = async () => {
      try {
        // Fetch all public organizations (status = 'active')
        const { data, error } = await supabase
          .from("organizations")
          .select("id, name, slug, organization_type, license_number, status")
          .eq("status", "active")
          .order("name", { ascending: true });

        if (error) {
          console.error("Error fetching organizations:", error);
          return;
        }

        setOrganizations(data || []);
      } catch (err) {
        console.error("Error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrganizations();
  }, []);

  return (
    <main className="min-h-screen bg-[#355E3B] text-white pb-32">
      <header className="p-8 pb-4">
        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[#00F5FF]">
          Discover
        </p>
        <h1 className="text-2xl font-black italic tracking-tighter uppercase leading-none">
          Communities
        </h1>
      </header>

      <div className="px-8 space-y-3 mt-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={24} className="animate-spin text-white/40" />
          </div>
        ) : organizations.length === 0 ? (
          <EmptyState />
        ) : (
          organizations.map((org) => (
            <CommunityCard key={org.id} org={org} />
          ))
        )}
      </div>

      <BottomNav />
    </main>
  );
}
