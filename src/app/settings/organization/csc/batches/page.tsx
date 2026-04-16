"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { BottomNav } from "@/components/bottom-nav";
import { USER_ROLES } from "@/lib/roles";
import { ChevronLeft, Loader2, Plus, CheckCircle2, AlertTriangle, Leaf, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Strain {
  id: string;
  name: string;
  slug: string;
  avg_thc: number | null;
  avg_cbd: number | null;
}

interface Batch {
  id: string;
  strain_id: string;
  harvest_date: string;
  total_weight_grams: number;
  plant_count: number;
  recorded_by: string;
  notes: string | null;
  quality_check_passed: boolean | null;
  quality_check_notes: string | null;
  quality_checked_at: string | null;
  created_at: string;
  strains: Strain | null;
}

export default function CSCBatchesPage() {
  const { activeOrganization, session, isDemoMode } = useAuth();
  const router = useRouter();

  const [batches, setBatches] = useState<Batch[]>([]);
  const [strains, setStrains] = useState<Strain[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Create form state
  const [strainId, setStrainId] = useState("");
  const [harvestDate, setHarvestDate] = useState("");
  const [totalWeight, setTotalWeight] = useState("");
  const [plantCount, setPlantCount] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  // Quality check dialog
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const [qualityNotes, setQualityNotes] = useState("");
  const [qualityPassed, setQualityPassed] = useState(false);
  const [qualitySaving, setQualitySaving] = useState(false);

  const orgId = activeOrganization?.organization_id;
  const isAdmin = activeOrganization && [USER_ROLES.GRUENDER, USER_ROLES.ADMIN].includes(activeOrganization.role as any);

  const fetchBatches = useCallback(async () => {
    if (!orgId || !session?.access_token) return;
    const res = await fetch(`/api/csc/batches?organization_id=${orgId}`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (res.ok) {
      const data = await res.json();
      setBatches(data.data?.batches || []);
    }
  }, [orgId, session?.access_token]);

  const fetchStrains = useCallback(async () => {
    if (!session?.access_token) return;
    const res = await fetch("/api/strains?limit=200", {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (res.ok) {
      const data = await res.json();
      setStrains(data.data?.strains || []);
    }
  }, [session?.access_token]);

  useEffect(() => {
    if (!activeOrganization || !session) return;
    setLoading(true);
    Promise.all([fetchBatches(), fetchStrains()]).finally(() => setLoading(false));
  }, [activeOrganization, session, fetchBatches, fetchStrains]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId || !session?.access_token || isDemoMode) return;

    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/csc/batches", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          organization_id: orgId,
          strain_id: strainId,
          harvest_date: harvestDate,
          total_weight_grams: parseFloat(totalWeight),
          plant_count: parseInt(plantCount, 10),
          notes: notes || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Fehler beim Erstellen");

      setMessage({ type: "success", msg: "Ernte-Los erfasst" });
      setShowCreateForm(false);
      setStrainId(""); setHarvestDate(""); setTotalWeight(""); setPlantCount(""); setNotes("");
      void fetchBatches();
    } catch (err: unknown) {
      setMessage({ type: "error", msg: err instanceof Error ? err.message : "Fehler" });
    } finally {
      setSaving(false);
    }
  };

  const handleQualityCheck = async (passed: boolean) => {
    if (!selectedBatch || !orgId || !session?.access_token || isDemoMode) return;
    setQualitySaving(true);
    try {
      const res = await fetch(`/api/csc/batches/${selectedBatch.id}?organization_id=${orgId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          quality_check_passed: passed,
          quality_check_notes: qualityNotes,
        }),
      });
      if (!res.ok) throw new Error("Fehler beim Speichern");
      setSelectedBatch(null);
      setQualityNotes("");
      setQualityPassed(false);
      void fetchBatches();
    } catch (err) {
      console.error(err);
    } finally {
      setQualitySaving(false);
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
        <p className="text-[var(--muted-foreground)] text-center">Kein Zugriff. Nur Admins können Batches verwalten.</p>
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
          <h1 className="text-2xl font-black italic uppercase font-display">Ernte-Übersicht</h1>
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
        {isAdmin && !isDemoMode && (
          <Card className="bg-[var(--card)] border border-[var(--border)]/50 p-5 rounded-3xl">
            <button
              onClick={() => setShowCreateForm(true)}
              className="w-full flex items-center gap-4 text-left hover:opacity-80 transition-opacity"
            >
              <div className="w-12 h-12 rounded-full bg-[#2FF801]/10 border border-[#2FF801]/20 flex items-center justify-center shrink-0">
                <Plus size={20} className="text-[#2FF801]" />
              </div>
              <div>
                <p className="font-black text-sm text-[var(--foreground)]">Neue Ernte erfassen</p>
                <p className="text-[10px] text-[var(--muted-foreground)]">Ernte-Los für § 26 KCanG dokumentieren</p>
              </div>
            </button>
          </Card>
        )}
        {isDemoMode && <p className="text-[10px] text-center text-[#484849] italic">Im Demo-Modus deaktiviert</p>}

        {/* Batches list */}
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="animate-spin text-[#00F5FF]" size={24} /></div>
        ) : batches.length === 0 ? (
          <Card className="bg-[var(--card)] border border-[var(--border)]/50 p-8 rounded-3xl text-center">
            <Leaf size={32} className="text-[var(--muted-foreground)] mx-auto mb-3" />
            <p className="text-[var(--muted-foreground)] text-sm">Noch keine Ernten erfasst</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {batches.map((batch) => (
              <Card key={batch.id} className="bg-[var(--card)] border border-[var(--border)]/50 p-5 rounded-3xl">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-[#2FF801]/10 border border-[#2FF801]/20 flex items-center justify-center shrink-0">
                    <Scale size={18} className="text-[#2FF801]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-black text-sm text-[var(--foreground)]">{batch.strains?.name || "Unbekannte Sorte"}</p>
                        <p className="text-[10px] text-[var(--muted-foreground)]">{batch.harvest_date} · {batch.plant_count} Pflanzen</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-black text-sm text-[#2FF801]">{batch.total_weight_grams.toFixed(1)}g</p>
                        {batch.strains?.avg_thc && <p className="text-[9px] text-[var(--muted-foreground)]">THC {batch.strains.avg_thc}%</p>}
                      </div>
                    </div>
                    {batch.quality_check_passed === true && (
                      <div className="mt-2 flex items-center gap-1 text-[10px] text-[#2FF801]">
                        <CheckCircle2 size={12} /> Qualitätsprüfung bestanden
                      </div>
                    )}
                    {batch.quality_check_passed === false && (
                      <div className="mt-2 flex items-center gap-1 text-[10px] text-[#ff716c]">
                        <AlertTriangle size={12} /> Qualitätsprüfung nicht bestanden
                      </div>
                    )}
                    {batch.quality_check_passed !== true && isAdmin && (
                      <button
                        onClick={() => setSelectedBatch(batch)}
                        className="mt-2 text-[10px] text-[#00F5FF] hover:underline"
                      >
                        {batch.quality_check_passed === null ? "Qualitätsprüfung durchführen →" : "Qualitätsprüfung wiederholen →"}
                      </button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <BottomNav />

      {/* Create form dialog */}
      <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
        <DialogContent className="bg-[var(--card)] border-[var(--border)] text-[var(--foreground)]">
          <DialogHeader>
            <DialogTitle className="font-black uppercase text-sm">Neue Ernte erfassen</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => void handleCreate(e)} className="space-y-4 mt-4">
            <div>
              <label className="text-[10px] font-black uppercase text-[var(--muted-foreground)] block mb-1">Sorte</label>
              <select
                value={strainId}
                onChange={(e) => setStrainId(e.target.value)}
                required
                className="w-full h-12 bg-[var(--input)] border border-[var(--border)]/50 rounded-xl px-3 text-sm text-[var(--foreground)]"
              >
                <option value="">Sorte wählen...</option>
                {strains.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black uppercase text-[var(--muted-foreground)] block mb-1">Erntedatum</label>
              <Input type="date" value={harvestDate} onChange={(e) => setHarvestDate(e.target.value)} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-black uppercase text-[var(--muted-foreground)] block mb-1">Erntemenge (g)</label>
                <Input type="number" step="0.01" min="0" value={totalWeight} onChange={(e) => setTotalWeight(e.target.value)} required placeholder="0.00" />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-[var(--muted-foreground)] block mb-1">Pflanzenanzahl</label>
                <Input type="number" min="1" value={plantCount} onChange={(e) => setPlantCount(e.target.value)} required placeholder="1" />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-black uppercase text-[var(--muted-foreground)] block mb-1">Notizen (optional)</label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="z.B. Indoor, erste Ernte..." />
            </div>
            <Button type="submit" disabled={saving} className="w-full h-12 bg-gradient-to-r from-[#2FF801] to-[#2fe000] hover:opacity-90 text-black font-black uppercase tracking-widest text-xs">
              {saving ? <Loader2 size={14} className="animate-spin" /> : null}
              Erfassen
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Quality check dialog */}
      <Dialog open={!!selectedBatch} onOpenChange={(v) => !v && setSelectedBatch(null)}>
        <DialogContent className="bg-[var(--card)] border-[var(--border)] text-[var(--foreground)]">
          <DialogHeader>
            <DialogTitle className="font-black uppercase text-sm">Qualitätsprüfung § 11 KCanG</DialogTitle>
          </DialogHeader>
          {selectedBatch && (
            <div className="mt-4 space-y-4">
              <div className="p-3 rounded-xl bg-[var(--muted)] text-sm">
                <p className="font-bold">{selectedBatch.strains?.name}</p>
                <p className="text-[10px] text-[var(--muted-foreground)]">{selectedBatch.harvest_date} · {selectedBatch.total_weight_grams.toFixed(1)}g</p>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-[var(--muted-foreground)] block mb-1">Prüfnotiz</label>
                <Input value={qualityNotes} onChange={(e) => setQualityNotes(e.target.value)} placeholder="z.B. Kein Schimmel, Feuchtigkeit ok..." />
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={() => { setQualitySaving(true); void handleQualityCheck(true); }}
                  disabled={qualitySaving}
                  className="flex-1 h-12 bg-[#2FF801] hover:opacity-90 text-black font-black uppercase tracking-widest text-xs"
                >
                  Bestanden
                </Button>
                <Button
                  onClick={() => { setQualitySaving(true); void handleQualityCheck(false); }}
                  disabled={qualitySaving}
                  className="flex-1 h-12 bg-[#ff716c] hover:opacity-90 text-[var(--foreground)] font-black uppercase tracking-widest text-xs"
                >
                  Nicht bestanden
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}