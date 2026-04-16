"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { BottomNav } from "@/components/bottom-nav";
import { USER_ROLES } from "@/lib/roles";
import { ChevronLeft, Loader2, Plus, CheckCircle2, AlertTriangle, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Member {
  id: string;
  user_id: string;
  role: string;
  membership_status: string;
  joined_at: string | null;
  profiles: { id: string; username: string; display_name: string | null; full_name: string | null; date_of_birth: string | null } | null;
}

interface Batch {
  id: string;
  harvest_date: string;
  total_weight_grams: number;
  quality_check_passed?: boolean;
  strains: { id: string; name: string; thc_min?: number; thc_max?: number; cbd_min?: number; cbd_max?: number } | null;
}

interface Dispensations {
  id: string;
  member_id: string;
  batch_id: string;
  amount_grams: number;
  dispensed_at: string;
  dispensed_by: string;
  reason: string | null;
  csc_batches: { id: string; harvest_date: string; strains: { name: string; avg_thc: number | null } | null } | null;
}

interface LimitInfo {
  daily: { max: number; used: number; remaining: number };
  monthly: { max: number; used: number; remaining: number };
  isYoungAdult: boolean;
}

export default function CSCDispensationsPage() {
  const { activeOrganization, session, isDemoMode } = useAuth();
  const router = useRouter();

  const [members, setMembers] = useState<Member[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [dispensations, setDispensations] = useState<Dispensations[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDispenseForm, setShowDispenseForm] = useState(false);

  // Dispense form state
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [selectedBatchId, setSelectedBatchId] = useState("");
  const [amountGrams, setAmountGrams] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [memberLimit, setMemberLimit] = useState<LimitInfo | null>(null);
  const [loadingLimits, setLoadingLimits] = useState(false);

  const orgId = activeOrganization?.organization_id;
  const isAdmin = activeOrganization && [USER_ROLES.GRUENDER, USER_ROLES.ADMIN].includes(activeOrganization.role as any);

  const fetchMembers = useCallback(async () => {
    if (!orgId || !session?.access_token) return;
    const res = await fetch(`/api/organizations/${orgId}/members`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (res.ok) {
      const data = await res.json();
      setMembers(data.data?.members?.filter((m: Member) => m.membership_status === "active") || []);
    }
  }, [orgId, session?.access_token]);

  const fetchBatches = useCallback(async () => {
    if (!orgId || !session?.access_token) return;
    const res = await fetch(`/api/csc/batches?organization_id=${orgId}`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (res.ok) {
      const data = await res.json();
      setBatches(data.data?.batches?.filter((b: Batch) => b.quality_check_passed === true) || []);
    }
  }, [orgId, session?.access_token]);

  const fetchDispensations = useCallback(async () => {
    if (!orgId || !session?.access_token) return;
    const res = await fetch(`/api/csc/dispensations?organization_id=${orgId}&limit=50`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (res.ok) {
      const data = await res.json();
      setDispensations(data.data?.dispensations || []);
    }
  }, [orgId, session?.access_token]);

  const fetchMemberLimits = useCallback(async (memberId: string) => {
    if (!orgId || !session?.access_token || !memberId) return;
    setLoadingLimits(true);
    const res = await fetch(`/api/csc/members/limit-check?member_id=${memberId}&organization_id=${orgId}`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (res.ok) {
      const data = await res.json();
      setMemberLimit(data.data?.limits);
    }
    setLoadingLimits(false);
  }, [orgId, session?.access_token]);

  useEffect(() => {
    if (!activeOrganization || !session) return;
    setLoading(true);
    Promise.all([fetchMembers(), fetchBatches(), fetchDispensations()]).finally(() => setLoading(false));
  }, [activeOrganization, session, fetchMembers, fetchBatches, fetchDispensations]);

  useEffect(() => {
    if (selectedMemberId) {
      void fetchMemberLimits(selectedMemberId);
    } else {
      setMemberLimit(null);
    }
  }, [selectedMemberId, fetchMemberLimits]);

  const handleDispense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId || !session?.access_token || isDemoMode) return;

    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/csc/dispensations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          organization_id: orgId,
          member_id: selectedMemberId,
          batch_id: selectedBatchId,
          amount_grams: parseFloat(amountGrams),
          reason: reason || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Fehler bei der Abgabe");

      setMessage({ type: "success", msg: "Abgabe erfolgreich dokumentiert" });
      setShowDispenseForm(false);
      setSelectedMemberId(""); setSelectedBatchId(""); setAmountGrams(""); setReason("");
      void fetchDispensations();
      if (selectedMemberId) void fetchMemberLimits(selectedMemberId);
    } catch (err: unknown) {
      setMessage({ type: "error", msg: err instanceof Error ? err.message : "Fehler" });
    } finally {
      setSaving(false);
    }
  };

  const getMemberName = (member: Member) => {
    return member.profiles?.full_name || member.profiles?.display_name || member.profiles?.username || member.user_id;
  };

  if (!activeOrganization) {
    return (
      <main className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <Loader2 className="animate-spin text-[#00F5FF]" size={32} />
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="min-h-screen bg-[var(--background)] flex items-center justify-center p-6">
        <p className="text-[var(--muted-foreground)] text-center">Kein Zugriff. Nur Admins können Abgaben verwalten.</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)] pb-32">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#2FF801]/5 blur-[100px] rounded-full" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[30%] h-[30%] bg-[#00F5FF]/5 blur-[80px] rounded-full" />
      </div>

      <header className="px-6 pt-12 pb-4 flex items-center gap-4 relative z-10">
        <button onClick={() => router.back()} className="p-2 rounded-full bg-[var(--card)] border border-[var(--border)]/50 hover:border-[#00F5FF]/50 transition-all">
          <ChevronLeft size={20} className="text-[var(--foreground)]" />
        </button>
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[#00F5FF]">{activeOrganization.organizations?.name}</p>
          <h1 className="text-2xl font-black italic uppercase font-display">Abgaben</h1>
        </div>
      </header>

      <div className="px-6 space-y-6 mt-4 relative z-10">

        {message && (
          <div className={`p-3 rounded-2xl flex items-start gap-2 text-sm font-bold border ${
            message.type === "success" ? "bg-[#2FF801]/10 border-[#2FF801]/30 text-[#2FF801]" : "bg-[#ff716c]/10 border-[#ff716c]/30 text-[#ff716c]"
          }`}>
            {message.type === "success" ? <CheckCircle2 size={16} className="shrink-0" /> : <AlertTriangle size={16} className="shrink-0" />}
            <span>{message.msg}</span>
          </div>
        )}

        {/* Create button */}
        {isAdmin && !isDemoMode && batches.length > 0 && (
          <Card className="bg-[var(--card)] border border-[var(--border)]/50 p-5 rounded-3xl">
            <button onClick={() => setShowDispenseForm(true)} className="w-full flex items-center gap-4 text-left hover:opacity-80 transition-opacity">
              <div className="w-12 h-12 rounded-full bg-[#00F5FF]/10 border border-[#00F5FF]/20 flex items-center justify-center shrink-0">
                <Plus size={20} className="text-[#00F5FF]" />
              </div>
              <div>
                <p className="font-black text-sm text-[var(--foreground)]">Neue Abgabe</p>
                <p className="text-[10px] text-[var(--muted-foreground)]">Cannabis an Mitglied abgeben</p>
              </div>
            </button>
          </Card>
        )}
        {isDemoMode && <p className="text-[10px] text-center text-[#484849] italic">Im Demo-Modus deaktiviert</p>}
        {batches.length === 0 && (
          <Card className="bg-[var(--card)] border border-[var(--border)]/50 p-5 rounded-3xl text-center">
            <p className="text-[var(--muted-foreground)] text-sm">Zuerst Ernte-Los mit Qualitätsprüfung erstellen</p>
          </Card>
        )}

        {/* Limit preview */}
        {memberLimit && !loadingLimits && (
          <Card className="bg-[var(--card)] border border-[#00F5FF]/30 p-4 rounded-2xl">
            <p className="text-[10px] font-black uppercase text-[#00F5FF] mb-2">Verbleibende Limits</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-2 rounded-xl bg-[var(--muted)]">
                <p className="text-[9px] text-[var(--muted-foreground)]">Heute</p>
                <p className={`font-black text-lg ${memberLimit.daily.remaining < 5 ? "text-[#ff716c]" : "text-[#2FF801]"}`}>
                  {memberLimit.daily.remaining.toFixed(1)}g
                </p>
                <p className="text-[9px] text-[var(--muted-foreground)]">von {memberLimit.daily.max}g</p>
              </div>
              <div className="p-2 rounded-xl bg-[var(--muted)]">
                <p className="text-[9px] text-[var(--muted-foreground)]">Monat</p>
                <p className={`font-black text-lg ${memberLimit.monthly.remaining < 10 ? "text-[#ff716c]" : "text-[#2FF801]"}`}>
                  {memberLimit.monthly.remaining.toFixed(1)}g
                </p>
                <p className="text-[9px] text-[var(--muted-foreground)]">von {memberLimit.monthly.max}g</p>
              </div>
            </div>
            {memberLimit.isYoungAdult && (
              <p className="text-[10px] text-[#ffd76a] mt-2">⚠ Heranwachsende (18-21): THC max 10%, Monatslimit 30g</p>
            )}
          </Card>
        )}
        {loadingLimits && <div className="flex justify-center py-4"><Loader2 className="animate-spin text-[#00F5FF] w-5 h-5" /></div>}

        {/* Dispensations list */}
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="animate-spin text-[#00F5FF]" size={24} /></div>
        ) : dispensations.length === 0 ? (
          <Card className="bg-[var(--card)] border border-[var(--border)]/50 p-8 rounded-3xl text-center">
            <Package size={32} className="text-[var(--muted-foreground)] mx-auto mb-3" />
            <p className="text-[var(--muted-foreground)] text-sm">Noch keine Abgaben erfasst</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {dispensations.map((d) => (
              <Card key={d.id} className="bg-[var(--card)] border border-[var(--border)]/50 p-5 rounded-3xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#00F5FF]/10 border border-[#00F5FF]/20 flex items-center justify-center shrink-0">
                    <Package size={16} className="text-[#00F5FF]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm">{d.csc_batches?.strains?.name || "Unbekannte Sorte"}</p>
                    <p className="text-[10px] text-[var(--muted-foreground)]">{d.dispensed_at.substring(0, 16).replace("T", " ")}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-[#00F5FF]">{Number(d.amount_grams).toFixed(1)}g</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <BottomNav />

      {/* Dispense form dialog */}
      <Dialog open={showDispenseForm} onOpenChange={setShowDispenseForm}>
        <DialogContent className="bg-[var(--card)] border-[var(--border)] text-[var(--foreground)]">
          <DialogHeader>
            <DialogTitle className="font-black uppercase text-sm">Neue Abgabe</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => void handleDispense(e)} className="space-y-4 mt-4">
            <div>
              <label className="text-[10px] font-black uppercase text-[var(--muted-foreground)] block mb-1">Mitglied</label>
              <select
                value={selectedMemberId}
                onChange={(e) => { setSelectedMemberId(e.target.value); setMemberLimit(null); }}
                required
                className="w-full h-12 bg-[var(--input)] border border-[var(--border)]/50 rounded-xl px-3 text-sm text-[var(--foreground)]"
              >
                <option value="">Mitglied wählen...</option>
                {members.map((m) => (
                  <option key={m.id} value={m.user_id}>{getMemberName(m)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black uppercase text-[var(--muted-foreground)] block mb-1">Ernte-Los</label>
              <select
                value={selectedBatchId}
                onChange={(e) => setSelectedBatchId(e.target.value)}
                required
                className="w-full h-12 bg-[var(--input)] border border-[var(--border)]/50 rounded-xl px-3 text-sm text-[var(--foreground)]"
              >
                <option value="">Los wählen...</option>
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.strains?.name} — {b.harvest_date} — {Number(b.total_weight_grams).toFixed(1)}g
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black uppercase text-[var(--muted-foreground)] block mb-1">Menge (g)</label>
              <Input type="number" step="0.01" min="0.01" value={amountGrams} onChange={(e) => setAmountGrams(e.target.value)} required placeholder="0.00" />
              {memberLimit && (
                <p className="text-[9px] text-[var(--muted-foreground)] mt-1">
                  Verfügbar: {memberLimit.daily.remaining.toFixed(1)}g heute, {memberLimit.monthly.remaining.toFixed(1)}g diesen Monat
                </p>
              )}
            </div>
            <div>
              <label className="text-[10px] font-black uppercase text-[var(--muted-foreground)] block mb-1">Grund (optional)</label>
              <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="z.B. Mitgliedsbeitrag" />
            </div>
            <Button
              type="submit"
              disabled={saving || !!(memberLimit && parseFloat(amountGrams) > memberLimit.daily.remaining)}
              className="w-full h-12 bg-gradient-to-r from-[#00F5FF] to-[#00d4cc] hover:opacity-90 text-black font-black uppercase tracking-widest text-xs"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : null}
              Abgabe bestätigen
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </main>
  );
}