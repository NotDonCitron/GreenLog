'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Loader2, ShieldCheck, Terminal, AlertCircle, Trash2, Clock, ChevronDown, Copy, Check, ScrollText, Link, Download } from 'lucide-react';
import { useAuth } from '@/components/auth-provider';
import { useAppAdmin } from '../../../hooks/useAppAdmin';
import { supabase } from '@/lib/supabase/client';

interface LogEntry {
  id: number;
  run_id: string;
  line: string;
  created_at: string;
}

type ScraperStatus = 'IDLE' | 'BUSY' | 'DONE' | 'ERROR';

function parseStatus(sourceNotes: string | null): ScraperStatus {
  if (!sourceNotes) return 'IDLE';
  if (sourceNotes.startsWith('TRIGGER_LIMIT_')) return 'BUSY';
  if (sourceNotes.startsWith('SINGLE_')) return 'BUSY';
  if (sourceNotes.startsWith('BUSY')) return 'BUSY';
  if (sourceNotes.startsWith('DONE')) return 'DONE';
  if (sourceNotes.startsWith('ERROR')) return 'ERROR';
  return 'IDLE';
}

function parseProgress(sourceNotes: string | null): { imported: number; limit: number } | null {
  if (!sourceNotes) return null;
  const doneMatch = sourceNotes.match(/^DONE_(\d+)_(\d+)_/);
  if (doneMatch) return { imported: parseInt(doneMatch[1]), limit: parseInt(doneMatch[2]) };
  const errMatch = sourceNotes.match(/^ERROR_EXIT_\d+_(\d+)_/);
  if (errMatch) return { imported: parseInt(errMatch[1]), limit: 0 };
  return null;
}

const STATUS_CONFIG: Record<ScraperStatus, { label: string; color: string; bg: string; pulse: boolean }> = {
  IDLE: { label: 'Bereit', color: 'text-zinc-400', bg: 'bg-zinc-500', pulse: false },
  BUSY: { label: 'Läuft...', color: 'text-amber-400', bg: 'bg-amber-500', pulse: true },
  DONE: { label: 'Fertig', color: 'text-emerald-400', bg: 'bg-emerald-500', pulse: false },
  ERROR: { label: 'Fehler', color: 'text-red-400', bg: 'bg-red-500', pulse: false },
};

export default function ScraperPage() {
  const [limit, setLimit] = useState(50);
  const [loading, setLoading] = useState(false);
  const [triggerStatus, setTriggerStatus] = useState<null | 'success' | 'error'>(null);
  const [triggerMsg, setTriggerMsg] = useState('');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [currentRunId, setCurrentRunId] = useState<string | null>(null);
  const [scraperStatus, setScraperStatus] = useState<ScraperStatus>('IDLE');
  const [progressData, setProgressData] = useState<{ imported: number; limit: number } | null>(null);
  const [liveProgress, setLiveProgress] = useState<{ imported: number; limit: number } | null>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [copied, setCopied] = useState(false);
  const [runHistory, setRunHistory] = useState<{ run_id: string; firstLine: string; lastLine: string; count: number }[]>([]);
  const [singleUrl, setSingleUrl] = useState('');
  const [singleLoading, setSingleLoading] = useState(false);
  const [singleStatus, setSingleStatus] = useState<null | 'success' | 'error'>(null);
  const [singleMsg, setSingleMsg] = useState('');
  const logContainerRef = useRef<HTMLDivElement>(null);
  const logEndRef = useRef<HTMLDivElement>(null);
  
  const { session } = useAuth();
  const { isAdmin } = useAppAdmin();

  const scrollToBottom = useCallback(() => {
    if (autoScroll) logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [autoScroll]);

  useEffect(() => {
    let lastId = 0;

    const fetchNewLogs = async () => {
      const [logRes, statusRes] = await Promise.all([
        supabase.from('scraper_logs').select('*').gt('id', lastId).order('id', { ascending: true }),
        supabase.from('strains').select('source_notes').eq('slug', 'blue-zushi').single(),
      ]);

      if (statusRes.data) {
        const st = parseStatus(statusRes.data.source_notes);
        setScraperStatus(st);
        setProgressData(parseProgress(statusRes.data.source_notes));
        const busyMatch = (statusRes.data.source_notes || '').match(/^BUSY_([a-f0-9-]+)/);
        if (busyMatch && !currentRunId) setCurrentRunId(busyMatch[1]);
      }

      const data = logRes.data;
      if (data && data.length > 0) {
        lastId = data[data.length - 1].id;
        setLogs(prev => {
          const existing = new Set(prev.map(l => l.id));
          const newEntries = data.filter(d => !existing.has(d.id));
          if (newEntries.length === 0) return prev;
          const merged = [...prev, ...newEntries];
          const trigger = newEntries.find(d => d.line?.includes('🚀') && d.line?.includes('run_id='));
          if (trigger) {
            const match = trigger.line.match(/run_id=([a-f0-9-]+)/);
            if (match) setCurrentRunId(match[1]);
          }
          const lastProgressLine = [...merged].reverse().find(l => /^\[\d+\/\d+\]/.test(l.line));
          if (lastProgressLine) {
            const m = lastProgressLine.line.match(/^\[(\d+)\/(\d+)\]/);
            if (m) setLiveProgress({ imported: parseInt(m[1]), limit: parseInt(m[2]) });
          }
          return merged;
        });
        setTimeout(scrollToBottom, 50);
      }
    };

    fetchNewLogs();
    const interval = setInterval(fetchNewLogs, 3000);
    return () => clearInterval(interval);
  }, [scrollToBottom, currentRunId]);

  useEffect(() => {
    if (logs.length === 0) return;
    const runMap = new Map<string, { firstLine: string; lastLine: string; count: number }>();
    for (const l of logs) {
      const existing = runMap.get(l.run_id) || { firstLine: l.line, lastLine: l.line, count: 0 };
      existing.lastLine = l.line;
      existing.count++;
      runMap.set(l.run_id, existing);
    }
    const sorted = [...runMap.entries()]
      .map(([run_id, info]) => ({ run_id, ...info }))
      .sort((a, b) => {
        const aLog = logs.find(l => l.run_id === a.run_id);
        const bLog = logs.find(l => l.run_id === b.run_id);
        return (bLog?.id || 0) - (aLog?.id || 0);
      });
    setRunHistory(sorted);
  }, [logs]);

  const filteredLogs = currentRunId
    ? logs.filter(l => l.run_id === currentRunId)
    : logs;

  const displayProgress = scraperStatus === 'BUSY' ? liveProgress : progressData;
  const progressPct = displayProgress && displayProgress.limit > 0
    ? Math.round((displayProgress.imported / displayProgress.limit) * 100)
    : 0;

  const getLineColor = (line: string) => {
    if (line.includes('❌') || line.includes('ERROR') || line.includes('⚠')) return 'text-red-400';
    if (line.includes('✅') || line.includes('Complete')) return 'text-emerald-400';
    if (line.includes('🚀') || line.includes('TRIGGER')) return 'text-amber-400';
    if (line.includes('🎯')) return 'text-amber-400';
    if (line.includes('📊')) return 'text-purple-400';
    if (/^\[\d+\/\d+\]/.test(line) && line.includes('Importing')) return 'text-cyan-400';
    if (line.includes('[*]') || line.includes('Importing')) return 'text-cyan-400';
    if (line.includes('[VPS] Bypassing')) return 'text-zinc-600';
    return 'text-zinc-400';
  };

  const getStrainName = (line: string) => {
    const m = line.match(/Importing:\s*(.+)/);
    return m ? m[1].trim() : null;
  };

  const copyLogs = () => {
    const text = filteredLogs.map(l => `[${new Date(l.created_at).toLocaleTimeString()}] ${l.line}`).join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const extractSlug = (input: string): string | null => {
    const trimmed = input.trim();
    const slugMatch = trimmed.match(/\/api\/strains\/([a-z0-9-]+)/);
    if (slugMatch) return slugMatch[1];
    const directSlug = trimmed.match(/^([a-z0-9-]+)$/);
    if (directSlug) return directSlug[1];
    const urlSlug = trimmed.match(/\/([a-z0-9-]+)\/?$/);
    if (urlSlug && urlSlug[1] !== 'strains') return urlSlug[1];
    return null;
  };

  const runSingleImport = async () => {
    const slug = extractSlug(singleUrl);
    if (!slug) {
      setSingleStatus('error');
      setSingleMsg('Ungültiger Slug oder URL. Format: blue-zushi oder https://strain-database.com/api/strains/blue-zushi');
      return;
    }

    if (!session?.access_token) {
      setSingleStatus('error');
      setSingleMsg('Keine aktive Sitzung.');
      return;
    }

    setSingleLoading(true);
    setSingleStatus(null);
    try {
      const response = await fetch('/api/admin/scraper/single', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ slug }),
      });

      const data = await response.json();
      if (response.ok) {
        setSingleStatus('success');
        setSingleMsg(`${slug} wird als Draft importiert...`);
        setSingleUrl('');
      } else {
        throw new Error(data.error || 'Fehler');
      }
    } catch (err: any) {
      setSingleStatus('error');
      setSingleMsg(err.message);
    } finally {
      setSingleLoading(false);
    }
  };

  const runScraper = async () => {
    if (!session?.access_token) {
      setTriggerStatus('error');
      setTriggerMsg('Keine aktive Sitzung. Bitte neu einloggen.');
      return;
    }

    setLoading(true);
    setTriggerStatus(null);
    try {
      const response = await fetch('/api/admin/scraper/run', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ limit }),
      });

      const data = await response.json();
      if (response.ok) {
        setTriggerStatus('success');
        setTriggerMsg('Scraper getriggert! VPS startet in wenigen Sekunden.');
      } else {
        throw new Error(data.error || 'Fehler beim Starten');
      }
    } catch (err: any) {
      setTriggerStatus('error');
      setTriggerMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isAdmin) return null;

  const sc = STATUS_CONFIG[scraperStatus];

  return (
    <div className="space-y-6 max-w-2xl mx-auto py-10">

      {/* Header */}
      <div className="bg-[var(--card)] rounded-3xl p-8 border border-[var(--border)] shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12">
          <Terminal size={120} />
        </div>

        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-black tracking-tight text-[var(--foreground)] flex items-center gap-3">
              <ShieldCheck className="text-emerald-400" />
              VPS Scraper
            </h1>
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${sc.pulse ? 'animate-pulse' : ''}`}
                 style={{ background: sc.bg.replace('bg-', '') ? `${sc.bg}22` : undefined }}>
              <div className={`w-2 h-2 rounded-full ${sc.bg}`} />
              <span className={`text-xs font-bold ${sc.color}`}>{sc.label}</span>
            </div>
          </div>
          <p className="mt-2 text-[var(--muted-foreground)] text-sm">
            Strain-Importer auf srv1606266 — FlareSolverr bypassed Cloudflare automatisch.
          </p>

          {/* Progress */}
          {(scraperStatus === 'BUSY' || (scraperStatus === 'DONE' && displayProgress)) && displayProgress && (
            <div className="mt-5">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-zinc-400">
                  {scraperStatus === 'BUSY' ? 'Importiere...' : 'Abgeschlossen'}
                </span>
                <span className="font-mono text-zinc-300">
                  {displayProgress.imported}/{displayProgress.limit} Strains
                </span>
              </div>
              <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${(scraperStatus as string) === 'ERROR' ? 'bg-red-500' : 'bg-emerald-500'}`}
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <div className="text-right text-[10px] text-zinc-500 mt-1">{progressPct}%</div>
            </div>
          )}

          {/* Controls */}
          <div className="mt-8 space-y-4">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted-foreground)]">
                Import Limit (Anzahl Strains)
              </label>
              <input 
                type="number" 
                value={limit}
                min={1}
                max={500}
                onChange={(e) => setLimit(parseInt(e.target.value) || 50)}
                disabled={scraperStatus === 'BUSY'}
                className="w-full mt-2 bg-[var(--background)] border border-[var(--border)] rounded-xl px-4 py-3 text-lg font-bold focus:ring-2 focus:ring-emerald-500 transition-all disabled:opacity-40"
              />
            </div>

            <button
              onClick={runScraper}
              disabled={loading || scraperStatus === 'BUSY'}
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-black py-4 rounded-xl flex items-center justify-center gap-3 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading || scraperStatus === 'BUSY' ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <Play size={20} fill="currentColor" />
              )}
              {loading ? 'STARTE VPS PROZESS...' : scraperStatus === 'BUSY' ? 'SCRAPER LÄUFT...' : 'SCRAPER STARTEN'}
            </button>
          </div>

          {/* Divider */}
          <div className="relative mt-8 mb-6">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-zinc-800" /></div>
            <div className="relative flex justify-center"><span className="bg-[var(--card)] px-3 text-[10px] font-bold uppercase tracking-widest text-zinc-500">oder einzelne Strain importieren</span></div>
          </div>

          {/* Single Strain Import */}
          <div className="space-y-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Link size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  value={singleUrl}
                  onChange={(e) => setSingleUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && runSingleImport()}
                  placeholder="Slug oder URL — z.B. blue-zushi oder https://strain-database.com/api/strains/blue-zushi"
                  disabled={singleLoading || scraperStatus === 'BUSY'}
                  className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl pl-9 pr-4 py-3 text-sm font-mono focus:ring-2 focus:ring-amber-500 transition-all disabled:opacity-40 placeholder:text-zinc-600"
                />
              </div>
              <button
                onClick={runSingleImport}
                disabled={singleLoading || scraperStatus === 'BUSY' || !singleUrl.trim()}
                className="bg-amber-500 hover:bg-amber-400 text-black font-black px-5 py-3 rounded-xl flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
              >
                {singleLoading ? <Loader2 className="animate-spin" size={16} /> : <Download size={16} />}
                <span className="text-sm">DRAFT</span>
              </button>
            </div>
            <p className="text-[10px] text-zinc-600">
              Importiert als <span className="text-amber-400 font-bold">Draft</span> — Strain ist sofort in der Datenbank aber noch nicht veröffentlicht.
            </p>
            {singleStatus === 'success' && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400 text-xs flex items-center gap-2">
                <Download size={14} />
                {singleMsg}
              </div>
            )}
            {singleStatus === 'error' && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs flex items-center gap-2">
                <AlertCircle size={14} />
                {singleMsg}
              </div>
            )}
          </div>

          {triggerStatus === 'success' && (
            <div className="mt-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-sm flex items-center gap-3">
              <ShieldCheck size={18} />
              {triggerMsg}
            </div>
          )}
          {triggerStatus === 'error' && (
            <div className="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm flex items-center gap-3">
              <AlertCircle size={18} />
              {triggerMsg}
            </div>
          )}
        </div>
      </div>

      {/* Terminal */}
      <div className="bg-zinc-950 rounded-3xl border border-zinc-800 shadow-xl overflow-hidden">
        {/* Terminal Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500/70" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
              <div className="w-3 h-3 rounded-full bg-green-500/70" />
            </div>
            <span className="ml-3 text-xs font-mono text-zinc-500">
              scraper{currentRunId ? ` — ${currentRunId.slice(0, 8)}` : ''} — live
            </span>
          </div>
          <div className="flex items-center gap-2">
            {filteredLogs.length > 0 && (
              <span className="text-[10px] font-mono text-zinc-600">{filteredLogs.length} lines</span>
            )}
            <button
              onClick={() => setAutoScroll(!autoScroll)}
              className={`text-xs px-2 py-1 rounded transition-colors ${autoScroll ? 'text-emerald-400 bg-emerald-400/10' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              <ScrollText size={14} />
            </button>
            <button
              onClick={copyLogs}
              className="text-zinc-600 hover:text-zinc-400 transition-colors"
              title="Logs kopieren"
            >
              {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
            </button>
            <button
              onClick={() => { setLogs([]); setCurrentRunId(null); setLiveProgress(null); }}
              className="text-zinc-600 hover:text-zinc-400 transition-colors"
              title="Logs leeren"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        {/* Log Content */}
        <div
          ref={logContainerRef}
          className="h-96 overflow-y-auto p-4 font-mono text-xs leading-relaxed scroll-smooth"
        >
          {filteredLogs.length === 0 ? (
            <div className="text-zinc-600 h-full flex flex-col items-center justify-center gap-2">
              <Terminal size={32} className="opacity-30" />
              <span>Warte auf Scraper-Output...</span>
              <span className="text-[10px] text-zinc-700">Drücke &quot;Scraper Starten&quot; um den VPS-Importer zu triggern</span>
            </div>
          ) : (
            filteredLogs.map((entry) => {
              const color = getLineColor(entry.line);
              const strainName = getStrainName(entry.line);
              const isBypass = entry.line.includes('[VPS] Bypassing');

              return (
                <div key={entry.id} className={`${color} ${isBypass ? 'opacity-40' : ''} whitespace-pre-wrap break-all`}>
                  <span className="text-zinc-600 mr-2 select-none">
                    {new Date(entry.created_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                  {strainName ? (
                    <>
                      {entry.line.replace(strainName, '')}
                      <span className="text-white font-semibold">{strainName}</span>
                    </>
                  ) : (
                    entry.line
                  )}
                </div>
              );
            })
          )}
          <div ref={logEndRef} />
        </div>

        {/* History Toggle */}
        {runHistory.length > 1 && (
          <div className="border-t border-zinc-800">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="w-full flex items-center justify-between px-5 py-3 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              <span className="flex items-center gap-2">
                <Clock size={12} />
                Run History ({runHistory.length})
              </span>
              <ChevronDown size={14} className={`transition-transform ${showHistory ? 'rotate-180' : ''}`} />
            </button>

            {showHistory && (
              <div className="px-5 pb-4 space-y-2">
                {runHistory.map(run => {
                  const isActive = run.run_id === currentRunId;
                  const isSuccess = run.lastLine.includes('✅');
                  const isError = run.lastLine.includes('❌');
                  return (
                    <button
                      key={run.run_id}
                      onClick={() => setCurrentRunId(isActive ? null : run.run_id)}
                      className={`w-full text-left p-3 rounded-xl border transition-colors ${
                        isActive ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-zinc-800 hover:border-zinc-700 bg-zinc-900/50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs text-zinc-400">{run.run_id.slice(0, 8)}</span>
                        <span className={`text-[10px] font-bold ${isSuccess ? 'text-emerald-400' : isError ? 'text-red-400' : 'text-zinc-500'}`}>
                          {isSuccess ? '✅ DONE' : isError ? '❌ ERROR' : '⏳'}
                        </span>
                      </div>
                      <div className="text-[10px] text-zinc-600 mt-1 truncate">{run.firstLine}</div>
                      <div className="text-[10px] text-zinc-500 mt-0.5">{run.count} log lines</div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
