"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Building2, Loader2 } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { USER_ROLES } from "@/lib/roles";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function NewCommunityPage() {
  const router = useRouter();
  const { user, session, memberships, membershipsLoading, refreshMemberships } = useAuth();

  const [name, setName] = useState("");
  const [orgType, setOrgType] = useState<"club" | "pharmacy">("club");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refresh memberships on mount to ensure we have the latest state
  useEffect(() => {
    refreshMemberships();
  }, []);

  const isAlreadyGründer = memberships.some((m) => m.role === USER_ROLES.GRUENDER);

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !session || !name.trim()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (session.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      }

      const response = await fetch("/api/organizations", {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: name.trim(),
          slug: generateSlug(name.trim()),
          organization_type: orgType,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error?.message || "Fehler beim Erstellen der Community");
      }

      const { organization } = await response.json();

      await refreshMemberships();

      router.push(`/community/${organization.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ein Fehler ist aufgetreten");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (membershipsLoading) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <Card className="bg-[var(--card)] border border-[var(--border)]/50 p-8">
          <div className="flex items-center gap-3 text-[var(--foreground)]">
            <Loader2 className="animate-spin text-[#2FF801]" size={20} />
            <span>Lädt...</span>
          </div>
        </Card>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <Card className="bg-[var(--card)] border border-[var(--border)]/50 p-8">
          <p className="text-[var(--muted-foreground)]">Bitte melde dich an, um eine Community zu erstellen.</p>
        </Card>
      </div>
    );
  }

  if (isAlreadyGründer) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center p-4">
        <Card className="bg-[var(--card)] border border-[var(--border)]/50 p-8 max-w-md w-full">
          <div className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-[#2FF801]/10 flex items-center justify-center">
              <Building2 className="text-[#2FF801]" size={32} />
            </div>
            <h1 className="text-xl font-black text-[var(--foreground)] uppercase tracking-tight font-display">
              Du bist bereits Gründer
            </h1>
            <p className="text-[var(--muted-foreground)] text-sm">
              Du hast bereits eine Community gegründet und kannst keine weitere erstellen.
            </p>
            <Button
              onClick={() => {
                const myMembership = memberships.find((m) => m.role === USER_ROLES.GRUENDER);
                if (myMembership?.organization?.id) {
                  router.push(`/community/${myMembership.organization.id}`);
                } else {
                  router.push("/community");
                }
              }}
              className="w-full bg-gradient-to-r from-[#2FF801] to-[#2fe000] hover:opacity-90 text-black text-xs font-black uppercase tracking-widest"
            >
              Zu meiner Community
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)] flex items-center justify-center p-4">
      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#2FF801]/5 blur-[100px] rounded-full" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[30%] h-[30%] bg-[#00F5FF]/5 blur-[80px] rounded-full" />
      </div>

      <Card className="bg-[var(--card)] border border-[var(--border)]/50 p-8 max-w-md w-full relative z-10">
        <div className="space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="mx-auto w-14 h-14 rounded-full bg-[#2FF801]/10 flex items-center justify-center mb-4">
              <Building2 className="text-[#2FF801]" size={28} />
            </div>
            <h1 className="text-xl font-black text-[var(--foreground)] uppercase tracking-tight font-display">
              Community gründen
            </h1>
            <p className="text-[var(--muted-foreground)] text-sm">
              Erstelle eine Community für deinen Club oder deine Apotheke.
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-[#ff716c]/10 border border-[#ff716c]/20 rounded-lg p-3 text-[#ff716c] text-sm">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)] mb-1.5 block">
                Name
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Mein Club"
                className="bg-[var(--input)] border border-[var(--border)]/50 text-[var(--foreground)] placeholder:text-[#484849] h-12 rounded-xl"
                disabled={isSubmitting}
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)] mb-1.5 block">
                Typ
              </label>
              <Select
                value={orgType}
                onValueChange={(value) => setOrgType(value as "club" | "pharmacy")}
                disabled={isSubmitting}
              >
                <SelectTrigger className="bg-[var(--input)] border border-[var(--border)]/50 text-[var(--foreground)] h-12 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[var(--card)] border border-[var(--border)]/50 text-[var(--foreground)]">
                  <SelectItem value="club">Club</SelectItem>
                  <SelectItem value="pharmacy" disabled>
                    Apotheke (auf Anfrage)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                disabled={isSubmitting || !name.trim()}
                className="w-full h-12 bg-gradient-to-r from-[#2FF801] to-[#2fe000] hover:opacity-90 text-black text-xs font-black uppercase tracking-widest disabled:opacity-50 rounded-xl"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={14} className="animate-spin mr-2" />
                    Wird erstellt...
                  </>
                ) : (
                  "Community erstellen"
                )}
              </Button>
            </div>
          </form>

          {/* Note */}
          <p className="text-center text-[#484849] text-[10px]">
            Als Gründer erhältst du automatisch alle Rechte.
          </p>
        </div>
      </Card>
    </div>
  );
}
