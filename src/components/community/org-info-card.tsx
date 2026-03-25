"use client";

import Link from "next/link";
import { Building2, Crown, Plus, Mail } from "lucide-react";
import { Card } from "@/components/ui/card";
import { OrgStats } from "@/lib/types";

interface OrgInfoCardProps {
  orgName: string;
  orgType: string | null;
  isAdmin: boolean;
  stats: OrgStats;
}

export function OrgInfoCard({ orgName, orgType, isAdmin, stats }: OrgInfoCardProps) {
  const orgTypeLabel = orgType === "club" ? "Club" : orgType === "pharmacy" ? "Apotheke" : orgType;

  return (
    <Card className="bg-[#1e3a24] border-white/10 p-6 rounded-3xl">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0 flex-1">
          <div className="w-14 h-14 rounded-full bg-[#00F5FF]/10 border border-[#00F5FF]/20 flex items-center justify-center shrink-0">
            <Building2 size={24} className="text-[#00F5FF]" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-black text-lg truncate">{orgName}</p>
              {isAdmin && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-yellow-400 bg-yellow-400/10 px-2 py-0.5 rounded-full border border-yellow-400/20">
                  <Crown size={8} />
                  Admin
                </span>
              )}
            </div>
            <p className="text-[10px] text-white/40 font-mono uppercase tracking-wider">
              {orgTypeLabel}
            </p>
            <div className="flex items-center gap-4 mt-2 text-xs text-white/60">
              <span className="flex items-center gap-1">
                <span className="text-[#00F5FF]">👥</span>
                {stats.memberCount}
              </span>
              <span className="flex items-center gap-1">
                <span className="text-[#2FF801]">🌿</span>
                {stats.strainCount}
              </span>
            </div>
            {stats.newestStrain && (
              <p className="text-[10px] text-white/40 mt-1">
                Neueste:{" "}
                <Link
                  href={`/strains/${stats.newestStrain.slug}`}
                  className="text-[#2FF801] hover:underline"
                >
                  {stats.newestStrain.name}
                </Link>
              </p>
            )}
          </div>
        </div>

        {/* Admin Quick Actions */}
        {isAdmin && (
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/settings/organization/strains"
              className="w-9 h-9 rounded-full bg-[#2FF801]/10 border border-[#2FF801]/20 flex items-center justify-center hover:bg-[#2FF801]/20 transition-colors"
              title="Eigene Sorte erstellen"
            >
              <Plus size={16} className="text-[#2FF801]" />
            </Link>
            <Link
              href="/settings/organization/invites"
              className="w-9 h-9 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center hover:bg-purple-500/20 transition-colors"
              title="Einladung senden"
            >
              <Mail size={16} className="text-purple-400" />
            </Link>
          </div>
        )}
      </div>
    </Card>
  );
}