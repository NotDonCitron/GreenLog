"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth-provider";
import {
  Loader2,
  Building2,
  CheckCircle2,
  AlertTriangle,
  Mail,
  Shield,
  UserRound,
  LogIn
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface InvitePreview {
  email: string;
  role: string;
  status: string;
  expires_at: string;
  organization: {
    name: string;
    organization_type: string;
  } | null;
}

export default function InvitePage() {
  const { session, refreshMemberships } = useAuth();
  const router = useRouter();
  const params = useParams();
  const token = params.token as string;

  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [acceptError, setAcceptError] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    if (!token) return;

    async function fetchPreview() {
      setLoading(true);
      setPreviewError(null);
      try {
        const res = await fetch(`/api/invites/${token}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Invalid invite");
        setPreview(data);
      } catch (err: any) {
        setPreviewError(err.message);
      } finally {
        setLoading(false);
      }
    }

    void fetchPreview();
  }, [token]);

  const handleAccept = async () => {
    if (!session?.access_token) {
      // Redirect to login with return URL
      router.push(`/login?redirect=/invite/${token}`);
      return;
    }

    setAccepting(true);
    setAcceptError(null);
    try {
      const res = await fetch(`/api/invites/${token}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to accept invite");
      setAccepted(true);
      await refreshMemberships();
    } catch (err: any) {
      setAcceptError(err.message);
    } finally {
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[#355E3B] flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="animate-spin text-white/40 mx-auto" size={48} />
          <p className="text-white/40 font-bold text-sm">Einladung wird geladen...</p>
        </div>
      </main>
    );
  }

  if (previewError) {
    return (
      <main className="min-h-screen bg-[#355E3B] flex items-center justify-center p-8">
        <Card className="bg-red-500/10 border-red-500/20 p-8 rounded-3xl max-w-sm w-full text-center space-y-4">
          <AlertTriangle size={48} className="mx-auto text-red-400" />
          <h1 className="text-xl font-black uppercase tracking-tight">Einladung ungültig</h1>
          <p className="text-sm text-white/60">{previewError}</p>
          <Button
            onClick={() => router.push("/")}
            className="w-full bg-white/10 hover:bg-white/20 text-white font-black uppercase tracking-widest text-xs"
          >
            Zur Startseite
          </Button>
        </Card>
      </main>
    );
  }

  if (accepted) {
    return (
      <main className="min-h-screen bg-[#355E3B] flex items-center justify-center p-8">
        <Card className="bg-[#1e3a24] border-[#2FF801]/20 p-8 rounded-3xl max-w-sm w-full text-center space-y-4">
          <CheckCircle2 size={48} className="mx-auto text-[#2FF801]" />
          <div>
            <h1 className="text-xl font-black uppercase tracking-tight">Willkommen!</h1>
            <p className="text-sm text-white/60 mt-1">
              Du bist {preview?.organization?.name} beigetreten.
            </p>
          </div>
          <Button
            onClick={() => router.push("/")}
            className="w-full bg-[#2FF801] hover:bg-[#2FF801]/80 text-black font-black uppercase tracking-widest text-xs"
          >
            Zur App
          </Button>
        </Card>
      </main>
    );
  }

  const orgTypeLabel = preview?.organization?.organization_type === "pharmacy" ? "Apotheke" : "Club";

  return (
    <main className="min-h-screen bg-[#355E3B] flex items-center justify-center p-8">
      <Card className="bg-[#1e3a24] border-white/10 p-8 rounded-3xl max-w-sm w-full space-y-6">
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-full bg-[#00F5FF]/10 border border-[#00F5FF]/20 flex items-center justify-center mx-auto">
            {preview?.organization?.organization_type === "pharmacy" ? (
              <Building2 size={28} className="text-[#00F5FF]" />
            ) : (
              <Building2 size={28} className="text-[#2FF801]" />
            )}
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/40">Einladung</p>
            <h1 className="text-2xl font-black italic tracking-tighter uppercase leading-none mt-1">
              {preview?.organization?.name || "Organisation"}
            </h1>
            <p className="text-xs text-white/40 font-bold uppercase tracking-widest mt-1">
              {orgTypeLabel}
            </p>
          </div>
        </div>

        <div className="space-y-3 bg-black/10 rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <Mail size={14} className="text-white/40 shrink-0" />
            <span className="text-sm font-mono text-white/70 truncate">{preview?.email}</span>
          </div>
          <div className="flex items-center gap-3">
            <Shield size={14} className="text-white/40 shrink-0" />
            <span className="text-sm font-bold text-white/70">
              {preview?.role === "admin" ? "Admin" : preview?.role === "staff" ? "Staff" : "Mitglied"}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Building2 size={14} className="text-white/40 shrink-0" />
            <span className="text-sm text-white/70">{preview?.organization?.name}</span>
          </div>
        </div>

        {acceptError && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-2 text-xs font-bold text-red-400">
            <AlertTriangle size={14} className="shrink-0 mt-0.5" />
            <span>{acceptError}</span>
          </div>
        )}

        <div className="space-y-3">
          <Button
            onClick={() => void handleAccept()}
            disabled={accepting}
            className="w-full h-12 bg-[#2FF801] hover:bg-[#2FF801]/80 text-black font-black uppercase tracking-widest text-xs disabled:opacity-50"
          >
            {accepting ? (
              <Loader2 size={14} className="animate-spin mr-2" />
            ) : (
              <CheckCircle2 size={14} className="mr-2" />
            )}
            Einladung annehmen
          </Button>

          {!session && (
            <p className="text-[10px] text-center text-white/30 font-bold">
              Du wirst zum Login weitergeleitet, falls nötig
            </p>
          )}

          <Button
            variant="ghost"
            onClick={() => router.push("/")}
            className="w-full h-10 text-white/40 hover:text-white font-bold text-xs"
          >
            Ablehnen
          </Button>
        </div>
      </Card>
    </main>
  );
}
