"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Loader2, Zap, Square, Search, RotateCw, AlertCircle, Terminal, Database, ArrowDown
} from "lucide-react";

const WATCH_SLUG = "blue-zushi";

type RunStatus = "idle" | "busy" | "done" | "error";

function parseStatus(sourceNotes: string | null): { status: RunStatus; runId?: string; detail?: string } {
  if (!sourceNotes) return { status: "idle" };
  if (sourceNotes.startsWith("BUSY_")) return { status: "busy", runId: sourceNotes.slice(5) };
  if (sourceNotes.startsWith("DONE_")) {
    const parts = sourceNotes.split("_");
    return { status: "done", runId: parts[3], detail: `${parts[1]} imported of ${parts[2]}` };
  }
  if (sourceNotes.startsWith("ERROR_")) return { status: "error", detail: sourceNotes };
  if (sourceNotes.startsWith("STOP_")) return { status: "idle" };
  if (sourceNotes.startsWith("TRIGGER_") || sourceNotes.startsWith("SINGLE_")) return { status: "busy" };
  return { status: "idle" };
}

export default function AdminScraperPage() {
  const { user } = useAuth();
  const [triggerRow, setTriggerRow] = useState<{ source_notes: string | null } | null>(null);
  const [logs, setLogs] = useState<{ id: number; line: string; created_at: string }[]>([]);
  const [limit, setLimit] = useState("50");
  const [singleSlug, setSingleSlug] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const logEndRef = useRef<HTMLDivElement>(null);
  const logContainerRef = useRef<HTMLDivElement>(null);

  const ADMIN_IDS = (process.env.NEXT_PUBLIC_APP_ADMIN_IDS || "").split(",").filter(Boolean);
  const isAdmin = user && ADMIN_IDS.includes(user.id);

  const state = parseStatus(triggerRow?.source_notes ?? null);
  const isBusy = state.status === "busy";

  const fetchTrigger = useCallback(async () => {
    const { data } = await supabase
      .from("strains")
      .select("source_notes")
      .eq("slug", WATCH_SLUG)
      .single();
    if (data) setTriggerRow(data);
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    fetchTrigger();
    const interval = setInterval(fetchTrigger, 5000);
    return () => clearInterval(interval);
  }, [isAdmin, fetchTrigger]);

  useEffect(() => {
    if (!isAdmin || !state.runId) return;

    const channel = supabase
      .channel(`scraper-logs-${state.runId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "scraper_logs",
          filter: `run_id=eq.${state.runId}`,
        },
        (payload) => {
          setLogs((prev) => {
            if (prev.some((l) => l.id === payload.new.id)) return prev;
            return [...prev, payload.new as { id: number; line: string; created_at: string }];
          });
        }
      )
      .subscribe();

    supabase
      .from("scraper_logs")
      .select("id, line, created_at")
      .eq("run_id", state.runId)
      .order("id", { ascending: true })
      .limit(500)
      .then(({ data }) => {
        if (data) setLogs(data);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin, state.runId]);

  useEffect(() => {
    if (autoScroll && logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs, autoScroll]);

  const handleScroll = () => {
    if (!logContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = logContainerRef.current;
    const nearBottom = scrollHeight - scrollTop - clientHeight < 80;
    setAutoScroll(nearBottom);
  };

  const triggerBatch = async () => {
    setActionLoading(true);
    const n = parseInt(limit);
    if (isNaN(n) || n <= 0) { setActionLoading(false); return; }
    await supabase
      .from("strains")
      .update({ source_notes: `TRIGGER_LIMIT_${n}` })
      .eq("slug", WATCH_SLUG);
    setLogs([]);
    setActionLoading(false);
    setTimeout(fetchTrigger, 1000);
  };

  const triggerSingle = async () => {
    if (!singleSlug.trim()) return;
    setActionLoading(true);
    await supabase
      .from("strains")
      .update({ source_notes: `SINGLE_${singleSlug.trim()}` })
      .eq("slug", WATCH_SLUG);
    setLogs([]);
    setSingleSlug("");
    setActionLoading(false);
    setTimeout(fetchTrigger, 1000);
  };

  const stopScraper = async () => {
    setActionLoading(true);
    await supabase
      .from("strains")
      .update({ source_notes: "STOP_ADMIN" })
      .eq("slug", WATCH_SLUG);
    setActionLoading(false);
    setTimeout(fetchTrigger, 1000);
  };

  const resetTrigger = async () => {
    setActionLoading(true);
    await supabase
      .from("strains")
      .update({ source_notes: "IDLE" })
      .eq("slug", WATCH_SLUG);
    setLogs([]);
    setActionLoading(false);
    setTimeout(fetchTrigger, 500);
  };

  const loadLatestRun = async () => {
    const { data } = await supabase
      .from("scraper_logs")
      .select("id, line, created_at, run_id")
      .order("id", { ascending: false })
      .limit(1)
      .single();
    if (data) {
      const { data: runLogs } = await supabase
        .from("scraper_logs")
        .select("id, line, created_at")
        .eq("run_id", data.run_id)
        .order("id", { ascending: true })
        .limit(500);
      if (runLogs) setLogs(runLogs);
    }
  };

  if (!isAdmin) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-md w-full p-10 border-red-500/20 text-center space-y-8 shadow-2xl border-t-4 border-t-red-500">
          <AlertCircle className="text-red-500 mx-auto" size={64} />
          <h1 className="text-xl font-black uppercase tracking-tighter text-red-500">Access Denied</h1>
        </Card>
      </main>
    );
  }

  const statusColor = state.status === "busy" ? "text-amber-400" : state.status === "done" ? "text-emerald-400" : state.status === "error" ? "text-red-400" : "text-zinc-400";
  const statusLabel = state.status === "busy" ? "RUNNING" : state.status === "done" ? "COMPLETE" : state.status === "error" ? "ERROR" : "IDLE";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">StrainDB Scraper</h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Trigger imports from strain-database.com (prioritizes strains with images)
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="p-5 space-y-4 border-[var(--border)]/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database size={18} className="text-[var(--primary)]" />
              <span className="text-sm font-semibold">Status</span>
            </div>
            <span className={`text-xs font-bold uppercase tracking-wider ${statusColor}`}>
              {isBusy && <Loader2 size={12} className="inline animate-spin mr-1" />}
              {statusLabel}
            </span>
          </div>
          {state.detail && (
            <p className="text-xs text-[var(--muted-foreground)]">{state.detail}</p>
          )}
          {state.runId && (
            <p className="text-[10px] text-[var(--muted-foreground)]/60 font-mono">run: {state.runId}</p>
          )}
        </Card>

        <Card className="p-5 space-y-3 border-[var(--border)]/50">
          <div className="flex items-center gap-2">
            <Zap size={18} className="text-amber-400" />
            <span className="text-sm font-semibold">Batch Import</span>
          </div>
          <div className="flex gap-2">
            <Input
              type="number"
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
              placeholder="Limit"
              disabled={isBusy}
              className="flex-1 h-9 text-sm"
              min={1}
              max={500}
            />
            <Button
              onClick={triggerBatch}
              disabled={isBusy || actionLoading}
              className="h-9 bg-[var(--primary)] text-[var(--primary-foreground)] hover:bg-[var(--primary)]/80 text-xs font-bold gap-1.5"
            >
              {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
              START
            </Button>
          </div>
          <p className="text-[10px] text-[var(--muted-foreground)]">
            Prioritizes strains with images + THC data
          </p>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-4 space-y-2 border-[var(--border)]/50">
          <span className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">Single Strain</span>
          <div className="flex gap-2">
            <Input
              value={singleSlug}
              onChange={(e) => setSingleSlug(e.target.value)}
              placeholder="slug e.g. acai-mints"
              disabled={isBusy}
              className="flex-1 h-8 text-xs"
              onKeyDown={(e) => e.key === "Enter" && triggerSingle()}
            />
            <Button
              onClick={triggerSingle}
              disabled={isBusy || !singleSlug.trim()}
              size="sm"
              variant="outline"
              className="h-8 text-xs gap-1"
            >
              <Search size={12} /> Import
            </Button>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-2 border-[var(--border)]/50">
          <Button
            onClick={stopScraper}
            disabled={!isBusy || actionLoading}
            variant="destructive"
            size="sm"
            className="h-8 text-xs gap-1"
          >
            <Square size={12} /> STOP
          </Button>
          <Button
            onClick={resetTrigger}
            disabled={isBusy || actionLoading}
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1"
          >
            <RotateCw size={12} /> RESET
          </Button>
          <Button
            onClick={loadLatestRun}
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1"
          >
            <Terminal size={12} /> LAST LOG
          </Button>
        </Card>

        <Card className="p-4 flex flex-col items-center justify-center border-[var(--border)]/50">
          <span className="text-[10px] text-[var(--muted-foreground)] uppercase tracking-wider">Auto-scroll</span>
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={`mt-1 text-xs font-bold ${autoScroll ? "text-[var(--primary)]" : "text-[var(--muted-foreground)]"}`}
          >
            {autoScroll ? "ON" : "OFF"}
          </button>
        </Card>
      </div>

      <Card className="border-[var(--border)]/50 overflow-hidden">
        <div className="flex items-center justify-between border-b border-[var(--border)]/30 px-4 py-2">
          <div className="flex items-center gap-2">
            <Terminal size={14} className="text-[var(--muted-foreground)]" />
            <span className="text-xs font-semibold text-[var(--muted-foreground)]">Live Log</span>
            {logs.length > 0 && (
              <span className="text-[10px] text-[var(--muted-foreground)]/60">{logs.length} lines</span>
            )}
          </div>
          {autoScroll && (
            <button
              onClick={() => logEndRef.current?.scrollIntoView({ behavior: "smooth" })}
              className="text-[10px] text-[var(--primary)] hover:underline flex items-center gap-1"
            >
              <ArrowDown size={10} /> bottom
            </button>
          )}
        </div>
        <div
          ref={logContainerRef}
          onScroll={handleScroll}
          className="h-80 overflow-y-auto bg-zinc-950 p-3 font-mono text-[11px] leading-relaxed"
        >
          {logs.length === 0 ? (
            <div className="h-full flex items-center justify-center text-zinc-600">
              {isBusy ? "Waiting for output..." : "No logs yet — trigger a batch to start"}
            </div>
          ) : (
            logs.map((l) => (
              <div
                key={l.id}
                className={`${
                  l.line.includes("✅")
                    ? "text-emerald-400"
                    : l.line.includes("❌") || l.line.includes("⚠️") || l.line.includes("⚠")
                    ? "text-red-400"
                    : l.line.includes("🚀") || l.line.includes("🏁") || l.line.includes("📊") || l.line.includes("⭐")
                    ? "text-amber-300"
                    : l.line.includes("📷")
                    ? "text-sky-400"
                    : l.line.includes("[*]")
                    ? "text-zinc-300"
                    : "text-zinc-500"
                }`}
              >
                {l.line}
              </div>
            ))
          )}
          <div ref={logEndRef} />
        </div>
      </Card>
    </div>
  );
}
