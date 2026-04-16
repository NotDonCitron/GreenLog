"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { BottomNav } from "@/components/bottom-nav";
import { USER_ROLES } from "@/lib/roles";
import { ChevronLeft, Loader2, Download, FileText, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function CSCExportPage() {
  const { activeOrganization, session, isDemoMode } = useAuth();
  const router = useRouter();

  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [exporting, setExporting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [stats, setStats] = useState<{ batches: number; dispensations: number; destructions: number } | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  const orgId = activeOrganization?.organization_id;
  const isAdmin = activeOrganization && [USER_ROLES.GRUENDER, USER_ROLES.ADMIN].includes(activeOrganization.role as any);

  useEffect(() => {
    if (!orgId || !session?.access_token) return;
    setLoadingStats(true);
    fetch(`/api/csc/batches?organization_id=${orgId}`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    }).then(r => r.ok ? r.json() : null).then(d => {
      if (d) setStats(s => s ? { ...s, batches: d.batches?.length || 0 } : null);
    }).finally(() => setLoadingStats(false));
  }, [orgId, session?.access_token]);

  const handleExport = async () => {
    if (!orgId || !session?.access_token || isDemoMode) return;
    setExporting(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/csc/export?organization_id=${orgId}&year=${year}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) throw new Error("Export fehlgeschlagen");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = res.headers.get("Content-Disposition")?.match(/filename="(.+)"/)?.[1] || `kcang-report-${year}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setMessage({ type: "success", msg: "Export erfolgreich heruntergeladen" });
    } catch (err: unknown) {
      setMessage({ type: "error", msg: err instanceof Error ? err.message : "Export fehlgeschlagen" });
    } finally {
      setExporting(false);
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
        <p className="text-[var(--muted-foreground)] text-center">Kein Zugriff. Nur Admins können Exporte erstellen.</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)] pb-32">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#ffd76a]/5 blur-[100px] rounded-full" />
      </div>

      <header className="px-6 pt-12 pb-4 flex items-center gap-4 relative z-10">
        <button onClick={() => router.back()} className="p-2 rounded-full bg-[var(--card)] border border-[var(--border)]/50 hover:border-[#00F5FF]/50 transition-all">
          <ChevronLeft size={20} className="text-[var(--foreground)]" />
        </button>
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[#ffd76a]">{activeOrganization.organizations?.name}</p>
          <h1 className="text-2xl font-black italic uppercase font-display">§ 26 Export</h1>
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

        {/* Info card */}
        <Card className="bg-[var(--card)] border border-[var(--border)]/50 p-5 rounded-3xl">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-[#ffd76a]/10 border border-[#ffd76a]/20 flex items-center justify-center shrink-0">
              <FileText size={20} className="text-[#ffd76a]" />
            </div>
            <div>
              <p className="font-black text-sm text-[var(--foreground)]">Jährlicher Behördenbericht</p>
              <p className="text-[10px] text-[var(--muted-foreground)] mt-1">
                Gemäß § 26 KCanG müssen Anbauvereinigungen bis zum 31. Januar jedes Jahres einen detaillierten Bericht über Anbau, Abgaben und Vernichtungen des Vorjahres bei der zuständigen Behörde einreichen.
              </p>
            </div>
          </div>
        </Card>

        {/* Year selector */}
        <Card className="bg-[var(--card)] border border-[var(--border)]/50 p-5 rounded-3xl">
          <p className="text-[10px] font-black uppercase text-[var(--muted-foreground)] mb-3">Berichtsjahr</p>
          <div className="flex gap-3">
            {[
              (new Date().getFullYear() - 2).toString(),
              (new Date().getFullYear() - 1).toString(),
              new Date().getFullYear().toString(),
            ].map((y) => (
              <button
                key={y}
                onClick={() => setYear(y)}
                className={`flex-1 h-12 rounded-xl font-black text-sm transition-all ${
                  year === y
                    ? "bg-gradient-to-r from-[#ffd76a] to-[#ffb700] text-black"
                    : "bg-[var(--muted)] border border-[var(--border)]/50 text-[var(--muted-foreground)]"
                }`}
              >
                {y}
              </button>
            ))}
          </div>
        </Card>

        {/* Export button */}
        {!isDemoMode ? (
          <Button
            onClick={() => void handleExport()}
            disabled={exporting}
            className="w-full h-14 bg-gradient-to-r from-[#ffd76a] to-[#ffb700] hover:opacity-90 text-black font-black uppercase tracking-widest text-sm"
          >
            {exporting ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
            {exporting ? "Export läuft..." : `CSV Export ${year} herunterladen`}
          </Button>
        ) : (
          <Card className="bg-[var(--card)] border border-[var(--border)]/50 p-5 rounded-3xl text-center">
            <p className="text-[10px] text-center text-[#484849] italic">Im Demo-Modus deaktiviert</p>
          </Card>
        )}

        {/* What's included */}
        <Card className="bg-[var(--card)] border border-[var(--border)]/50 p-5 rounded-3xl">
          <p className="text-[10px] font-black uppercase text-[var(--muted-foreground)] mb-3">Enthaltene Daten</p>
          <div className="space-y-2">
            {[
              { icon: "🌿", label: "Ernten", desc: "Datum, Sorte, THC/CBD, Menge, Pflanzenanzahl" },
              { icon: "📦", label: "Abgaben", desc: "Datum, Zeit, Sorte, Mitglieds-ID, Menge" },
              { icon: "🗑️", label: "Vernichtungen", desc: "Datum, Sorte, Grund, Menge" },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-3 p-2 rounded-xl bg-[var(--muted)]">
                <span className="text-lg">{item.icon}</span>
                <div>
                  <p className="font-bold text-xs">{item.label}</p>
                  <p className="text-[9px] text-[var(--muted-foreground)]">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Deadline reminder */}
        <Card className="bg-[#ffd76a]/10 border border-[#ffd76a]/30 p-4 rounded-2xl">
          <p className="text-xs font-bold text-[#ffd76a]">⏰ Deadline: 31. Januar</p>
          <p className="text-[10px] text-[var(--muted-foreground)] mt-1">
            Der Bericht für {new Date().getFullYear()} muss bis zum 31. Januar {new Date().getFullYear() + 1} eingereicht werden.
          </p>
        </Card>
      </div>

      <BottomNav />
    </main>
  );
}