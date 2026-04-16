"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { BottomNav } from "@/components/bottom-nav";
import { USER_ROLES } from "@/lib/roles";
import { ChevronLeft, Loader2, Plus, CheckCircle2, AlertTriangle, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface Batch {
  id: string;
  harvest_date: string;
  total_weight_grams: number;
  strains: { name: string } | null;
}

interface Destruction {
  id: string;
  batch_id: string | null;
  amount_grams: number;
  destruction_reason: string;
  destroyed_at: string;
  destroyed_by: string;
  documentation_url: string | null;
  notes: string | null;
  csc_batches: { id: string; harvest_date: string; strains: { name: string } | null } | null;
}

export default function CSCDestructionsPage() {
  const { activeOrganization, session, isDemoMode } = useAuth();
  const router = useRouter();

  const [batches, setBatches] = useState<Batch[]>([]);
  const [destructions, setDestructions] = useState<Destruction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const [batchId, setBatchId] = useState("");
  const [amountGrams, setAmountGrams] = useState("");
  const [destructionReason, setDestructionReason] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const orgId = activeOrganization?.organization_id;
  const isAdmin = activeOrganization && [USER_ROLES.GRUENDER, USER_ROLES.ADMIN].includes(activeOrganization.role as any);

  const fetchBatches = useCallback(async () => {
    if (!orgId || !session?.access_token) return;
    const res = await fetch(`/api/csc/batches?organization_id=${orgId}`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (res.ok) {
      const data = await res.json();
      setBatches(data.batches || []);
    }
  }, [orgId, session?.access_token]);

  const fetchDestructions = useCallback(async () => {
    if (!orgId || !session?.access_token) return;
    const res = await fetch(`/api/csc/destructions?organization_id=${orgId}`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (res.ok) {
      const data = await res.json();
      setDestructions(data.destructions || []);
    }
  }, [orgId, session?.access_token]);

  useEffect(() => {
    if (!activeOrganization || !session) return;
    setLoading(true);
    Promise.all([fetchBatches(), fetchDestructions()]).finally(() => setLoading(false));
  }, [activeOrganization, session, fetchBatches, fetchDestructions]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId || !session?.access_token || isDemoMode) return;

    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/csc/destructions?organization_id=${orgId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          batch_id: batchId || null,
          amount_grams: parseFloat(amountGrams),
          destruction_reason: destructionReason,
          notes: notes || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Fehler beim Erfassen");

      setMessage({ type: "success", msg: "Vernichtung dokumentiert" });
      setShowCreateForm(false);
      setBatchId(""); setAmountGrams(""); setDestructionReason(""); setNotes("");
      void fetchDestructions();
    } catch (err: unknown) {
      setMessage({ type: "error", msg: err instanceof Error ? err.message : "Fehler" });
    } finally {
      setSaving(false);
    }
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
        <p className="text-[var(--muted-foreground)] text-center">Kein Zugriff. Nur Admins können Vernichtungen verwalten.</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)] pb-32">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#ff716c]/5 blur-[100px] rounded-full" />
      </div>

      <header className="px-6 pt-12 pb-4 flex items-center gap-4 relative z-10">
        <button onClick={() => router.back()} className="p-2 rounded-full bg-[var(--card)] border border-[var(--border)]/50 hover:border-[#00F5FF]/50 transition-all">
          <ChevronLeft size={20} className="text-[var(--foreground)]" />
        </button>
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[#ff716c]">{activeOrganization.organizations?.name}</p>
          <h1 className="text-2xl font-black italic uppercase font-display">Vernichtungen</h1>
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

        {isAdmin && !isDemoMode && (
          <Card className="bg-[var(--card)] border border-[var(--border)]/50 p-5 rounded-3xl">
            <button onClick={() => setShowCreateForm(true)} className="w-full flex items-center gap-4 text-left hover:opacity-80 transition-opacity">
              <div className="w-12 h-12 rounded-full bg-[#ff716c]/10 border border-[#ff716c]/20 flex items-center justify-center shrink-0">
                <Plus size={20} className="text-[#ff716c]" />
              </div>
              <div>
                <p className="font-black text-sm text-[var(--foreground)]">Vernichtung dokumentieren</p>
                <p className="text-[10px] text-[var(--muted-foreground)]">§ 26 KCanG Nachweispflicht</p>
              </div>
            </button>
          </Card>
        )}
        {isDemoMode && <p className="text-[10px] text-center text-[#484849] italic">Im Demo-Modus deaktiviert</p>}

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="animate-spin text-[#00F5FF]" size={24} /></div>
        ) : destructions.length === 0 ? (
          <Card className="bg-[var(--card)] border border-[var(--border)]/50 p-8 rounded-3xl text-center">
            <Trash2 size={32} className="text-[var(--muted-foreground)] mx-auto mb-3" />
            <p className="text-[var(--muted-foreground)] text-sm">Keine Vernichtungen erfasst</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {destructions.map((d) => (
              <Card key={d.id} className="bg-[var(--card)] border border-[var(--border)]/50 p-5 rounded-3xl">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-[#ff716c]/10 border border-[#ff716c]/20 flex items-center justify-center shrink-0">
                    <Trash2 size={18} className="text-[#ff716c]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <p className="font-black text-sm">{d.csc_batches?.strains?.name || "Unbekannt"}</p>
                        <p className="text-[10px] text-[var(--muted-foreground)]">{d.destroyed_at.substring(0, 10)}</p>
                      </div>
                      <p className="font-black text-[#ff716c]">{Number(d.amount_grams).toFixed(1)}g</p>
                    </div>
                    <p className="text-xs text-[var(--muted-foreground)] mt-1">{d.destruction_reason}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <BottomNav />

      <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
        <DialogContent className="bg-[var(--card)] border-[var(--border)] text-[var(--foreground)]">
          <DialogHeader>
            <DialogTitle className="font-black uppercase text-sm">Vernichtung dokumentieren</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => void handleCreate(e)} className="space-y-4 mt-4">
            <div>
              <label className="text-[10px] font-black uppercase text-[var(--muted-foreground)] block mb-1">Ernte-Los (optional)</label>
              <select
                value={batchId}
                onChange={(e) => setBatchId(e.target.value)}
                className="w-full h-12 bg-[var(--input)] border border-[var(--border)]/50 rounded-xl px-3 text-sm text-[var(--foreground)]"
              >
                <option value="">Kein Los</option>
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>{b.strains?.name} — {b.harvest_date}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black uppercase text-[var(--muted-foreground)] block mb-1">Menge (g)</label>
              <Input type="number" step="0.01" min="0.01" value={amountGrams} onChange={(e) => setAmountGrams(e.target.value)} required placeholder="0.00" />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase text-[var(--muted-foreground)] block mb-1">Grund</label>
              <select
                value={destructionReason}
                onChange={(e) => setDestructionReason(e.target.value)}
                required
                className="w-full h-12 bg-[var(--input)] border border-[var(--border)]/50 rounded-xl px-3 text-sm text-[var(--foreground)]"
              >
                <option value="">Grund wählen...</option>
                <option value="Pilzbefall">Pilzbefall</option>
                <option value="Schimmel">Schimmel</option>
                <option value="Qualitätskontrolle bestanden">Qualitätskontrolle bestanden</option>
                <option value="Schädlingsbefall">Schädlingsbefall</option>
                <option value="Überlagerung">Überlagerung</option>
                <option value="Sonstiges">Sonstiges</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black uppercase text-[var(--muted-foreground)] block mb-1">Notiz (optional)</label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Zusätzliche Details..." />
            </div>
            <Button
              type="submit"
              disabled={saving}
              className="w-full h-12 bg-[#ff716c] hover:opacity-90 text-[var(--foreground)] font-black uppercase tracking-widest text-xs"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : null}
              Dokumentieren
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </main>
  );
}