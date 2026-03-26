"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Loader2 } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
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

  // Check if user is already a Gründer
  const isAlreadyGründer = memberships.some((m) => m.role === "gründer");

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
        throw new Error(data.error || "Fehler beim Erstellen der Community");
      }

      const { organization } = await response.json();

      // Refresh memberships so the new org appears
      await refreshMemberships();

      // Redirect to the new community page
      router.push(`/community/${organization.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ein Fehler ist aufgetreten");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (membershipsLoading) {
    return (
      <div className="min-h-screen bg-[#355E3B] flex items-center justify-center">
        <Card className="bg-[#1e3a24] border-white/10 p-8">
          <div className="flex items-center gap-3 text-white">
            <Loader2 className="animate-spin text-[#2FF801]" size={20} />
            <span>Lädt...</span>
          </div>
        </Card>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#355E3B] flex items-center justify-center">
        <Card className="bg-[#1e3a24] border-white/10 p-8">
          <p className="text-white/70">Bitte melde dich an, um eine Community zu erstellen.</p>
        </Card>
      </div>
    );
  }

  if (isAlreadyGründer) {
    return (
      <div className="min-h-screen bg-[#355E3B] flex items-center justify-center p-4">
        <Card className="bg-[#1e3a24] border-white/10 p-8 max-w-md w-full">
          <div className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-[#2FF801]/10 flex items-center justify-center">
              <Building2 className="text-[#2FF801]" size={32} />
            </div>
            <h1 className="text-xl font-black text-white uppercase tracking-tight">
              Du bist bereits Gründer
            </h1>
            <p className="text-white/60 text-sm">
              Du hast bereits eine Community gegründet. Du kannst nur eine Community pro Account erstellen.
            </p>
            <Button
              onClick={() => router.push("/community")}
              className="w-full bg-[#2FF801] hover:bg-[#2FF801]/80 text-black text-xs font-black uppercase tracking-widest"
            >
              Zu meiner Community
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#355E3B] flex items-center justify-center p-4">
      <Card className="bg-[#1e3a24] border-white/10 p-8 max-w-md w-full backdrop-blur-xl">
        <div className="space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="mx-auto w-14 h-14 rounded-full bg-[#2FF801]/10 flex items-center justify-center mb-4">
              <Building2 className="text-[#2FF801]" size={28} />
            </div>
            <h1 className="text-xl font-black text-white uppercase tracking-tight">
              Community gründen
            </h1>
            <p className="text-white/50 text-sm">
              Erstelle eine Community für deinen Club oder deine Apotheke.
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-white/60 mb-1.5 block">
                Name
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Mein Club"
                className="bg-black/20 border-white/10 text-white placeholder:text-white/30 h-12 rounded-xl"
                disabled={isSubmitting}
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-white/60 mb-1.5 block">
                Typ
              </label>
              <Select
                value={orgType}
                onValueChange={(value) => setOrgType(value as "club" | "pharmacy")}
                disabled={isSubmitting}
              >
                <SelectTrigger className="bg-black/20 border-white/10 text-white h-12 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1a191b] border-white/10 text-white">
                  <SelectItem value="club">Club</SelectItem>
                  <SelectItem value="pharmacy">Apotheke</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                disabled={isSubmitting || !name.trim()}
                className="w-full h-12 bg-[#2FF801] hover:bg-[#2FF801]/80 text-black text-xs font-black uppercase tracking-widest disabled:opacity-50 rounded-xl"
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
          <p className="text-center text-white/30 text-[10px]">
            Als Gründer erhältst du automatisch alle Rechte.
          </p>
        </div>
      </Card>
    </div>
  );
}
