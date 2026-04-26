"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Ban, Flag, Loader2, MessageSquareWarning, ShieldMinus, ShieldPlus } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

type TabKey = "content_reports" | "user_reports" | "mutes" | "blocks";

type ContentReport = {
  id: string;
  reporter_id: string;
  content_type: string;
  content_id: string;
  reason: string;
  details: string | null;
  status: string;
  created_at: string;
};

type UserReport = {
  id: string;
  reporter_id: string;
  reported_user_id: string;
  reason: string;
  details: string | null;
  status: string;
  created_at: string;
};

type MuteRow = {
  id: string;
  user_id: string;
  reason: string | null;
  expires_at: string | null;
  created_at: string;
};

type BlockRow = {
  id: string;
  blocked_user_id: string;
  reason: string | null;
  created_at: string;
};

const TABS: Array<{ id: TabKey; label: string; icon: typeof Flag }> = [
  { id: "content_reports", label: "Content Reports", icon: MessageSquareWarning },
  { id: "user_reports", label: "User Reports", icon: AlertTriangle },
  { id: "mutes", label: "Mutes", icon: ShieldMinus },
  { id: "blocks", label: "Blocks", icon: Ban },
];

async function getAuthHeader() {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
}

export function ModerationPanel({ organizationId }: { organizationId: string }) {
  const [activeTab, setActiveTab] = useState<TabKey>("content_reports");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [contentReports, setContentReports] = useState<ContentReport[]>([]);
  const [userReports, setUserReports] = useState<UserReport[]>([]);
  const [mutes, setMutes] = useState<MuteRow[]>([]);
  const [blocks, setBlocks] = useState<BlockRow[]>([]);

  const [muteUserId, setMuteUserId] = useState("");
  const [muteReason, setMuteReason] = useState("");
  const [muteExpiresAt, setMuteExpiresAt] = useState("");

  const [blockUserId, setBlockUserId] = useState("");
  const [blockReason, setBlockReason] = useState("");

  const activeRows = useMemo(() => {
    if (activeTab === "content_reports") return contentReports.length;
    if (activeTab === "user_reports") return userReports.length;
    if (activeTab === "mutes") return mutes.length;
    return blocks.length;
  }, [activeTab, contentReports.length, userReports.length, mutes.length, blocks.length]);

  const fetchTabData = useCallback(async (tab: TabKey) => {
    setLoading(true);
    setError(null);
    try {
      const authHeader = await getAuthHeader();

      if (tab === "content_reports") {
        const res = await fetch(`/api/communities/${organizationId}/reports/content?limit=50`, { headers: authHeader });
        const body = await res.json();
        if (!res.ok) throw new Error(body?.error?.message || "Failed to load content reports");
        setContentReports(body?.data?.reports ?? []);
      }

      if (tab === "user_reports") {
        const res = await fetch(`/api/communities/${organizationId}/reports/user?limit=50`, { headers: authHeader });
        const body = await res.json();
        if (!res.ok) throw new Error(body?.error?.message || "Failed to load user reports");
        setUserReports(body?.data?.reports ?? []);
      }

      if (tab === "mutes") {
        const res = await fetch(`/api/communities/${organizationId}/moderation/mutes`, { headers: authHeader });
        const body = await res.json();
        if (!res.ok) throw new Error(body?.error?.message || "Failed to load mutes");
        setMutes(body?.data?.mutes ?? []);
      }

      if (tab === "blocks") {
        const res = await fetch(`/api/communities/${organizationId}/moderation/blocks`, { headers: authHeader });
        const body = await res.json();
        if (!res.ok) throw new Error(body?.error?.message || "Failed to load blocks");
        setBlocks(body?.data?.blocks ?? []);
      }
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Moderation data failed to load");
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    void fetchTabData(activeTab);
  }, [activeTab, fetchTabData]);

  async function updateContentReportStatus(reportId: string, status: "reviewing" | "resolved" | "dismissed") {
    const authHeader = await getAuthHeader();
    const res = await fetch(`/api/communities/${organizationId}/reports/content`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...authHeader },
      body: JSON.stringify({ report_id: reportId, status }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error?.message || "Failed to update content report");
      return;
    }
    await fetchTabData("content_reports");
  }

  async function updateUserReportStatus(reportId: string, status: "reviewing" | "resolved" | "dismissed") {
    const authHeader = await getAuthHeader();
    const res = await fetch(`/api/communities/${organizationId}/reports/user`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...authHeader },
      body: JSON.stringify({ report_id: reportId, status }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error?.message || "Failed to update user report");
      return;
    }
    await fetchTabData("user_reports");
  }

  async function createMute() {
    if (!muteUserId.trim()) {
      setError("user_id is required");
      return;
    }
    const authHeader = await getAuthHeader();
    const res = await fetch(`/api/communities/${organizationId}/moderation/mutes`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeader },
      body: JSON.stringify({
        user_id: muteUserId.trim(),
        reason: muteReason.trim() || null,
        expires_at: muteExpiresAt ? new Date(muteExpiresAt).toISOString() : null,
      }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error?.message || "Failed to mute user");
      return;
    }
    setMuteUserId("");
    setMuteReason("");
    setMuteExpiresAt("");
    await fetchTabData("mutes");
  }

  async function deleteMute(userId: string) {
    const authHeader = await getAuthHeader();
    const res = await fetch(`/api/communities/${organizationId}/moderation/mutes?user_id=${encodeURIComponent(userId)}`, {
      method: "DELETE",
      headers: authHeader,
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error?.message || "Failed to unmute user");
      return;
    }
    await fetchTabData("mutes");
  }

  async function createBlock() {
    if (!blockUserId.trim()) {
      setError("user_id is required");
      return;
    }
    const authHeader = await getAuthHeader();
    const res = await fetch(`/api/communities/${organizationId}/moderation/blocks`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeader },
      body: JSON.stringify({
        user_id: blockUserId.trim(),
        reason: blockReason.trim() || null,
      }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error?.message || "Failed to block user");
      return;
    }
    setBlockUserId("");
    setBlockReason("");
    await fetchTabData("blocks");
  }

  async function deleteBlock(userId: string) {
    const authHeader = await getAuthHeader();
    const res = await fetch(`/api/communities/${organizationId}/moderation/blocks?user_id=${encodeURIComponent(userId)}`, {
      method: "DELETE",
      headers: authHeader,
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error?.message || "Failed to unblock user");
      return;
    }
    await fetchTabData("blocks");
  }

  return (
    <section className="mt-6 rounded-3xl border border-[var(--border)]/50 bg-[var(--card)] p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-sm font-black uppercase tracking-wider text-[var(--muted-foreground)]">Moderation</h3>
        <span className="rounded-full border border-[var(--border)]/60 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
          {activeRows} entries
        </span>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2 md:grid-cols-4">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold transition-colors ${
                isActive
                  ? "border-[#00F5FF]/40 bg-[#00F5FF]/10 text-[#00F5FF]"
                  : "border-[var(--border)]/50 bg-[var(--background)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              }`}
            >
              <Icon size={14} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">{error}</div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-8 text-[var(--muted-foreground)]">
          <Loader2 className="animate-spin" size={18} />
        </div>
      ) : null}

      {!loading && activeTab === "content_reports" && (
        <div className="space-y-2">
          {contentReports.length === 0 ? <p className="text-xs text-[var(--muted-foreground)]">No content reports.</p> : null}
          {contentReports.map((report) => (
            <div key={report.id} className="rounded-xl border border-[var(--border)]/50 bg-[var(--background)] p-3">
              <p className="text-xs font-semibold text-[var(--foreground)]">{report.reason}</p>
              <p className="mt-1 text-[11px] text-[var(--muted-foreground)]">
                {report.content_type} | reporter: {report.reporter_id} | status: {report.status}
              </p>
              {report.details ? <p className="mt-1 text-[11px] text-[var(--muted-foreground)]">{report.details}</p> : null}
              <div className="mt-2 flex gap-2">
                <button onClick={() => void updateContentReportStatus(report.id, "reviewing")} className="rounded-md border border-[var(--border)] px-2 py-1 text-[10px]">
                  Reviewing
                </button>
                <button onClick={() => void updateContentReportStatus(report.id, "resolved")} className="rounded-md border border-emerald-400/40 px-2 py-1 text-[10px] text-emerald-300">
                  Resolve
                </button>
                <button onClick={() => void updateContentReportStatus(report.id, "dismissed")} className="rounded-md border border-amber-400/40 px-2 py-1 text-[10px] text-amber-300">
                  Dismiss
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && activeTab === "user_reports" && (
        <div className="space-y-2">
          {userReports.length === 0 ? <p className="text-xs text-[var(--muted-foreground)]">No user reports.</p> : null}
          {userReports.map((report) => (
            <div key={report.id} className="rounded-xl border border-[var(--border)]/50 bg-[var(--background)] p-3">
              <p className="text-xs font-semibold text-[var(--foreground)]">{report.reason}</p>
              <p className="mt-1 text-[11px] text-[var(--muted-foreground)]">
                reported: {report.reported_user_id} | reporter: {report.reporter_id} | status: {report.status}
              </p>
              {report.details ? <p className="mt-1 text-[11px] text-[var(--muted-foreground)]">{report.details}</p> : null}
              <div className="mt-2 flex gap-2">
                <button onClick={() => void updateUserReportStatus(report.id, "reviewing")} className="rounded-md border border-[var(--border)] px-2 py-1 text-[10px]">
                  Reviewing
                </button>
                <button onClick={() => void updateUserReportStatus(report.id, "resolved")} className="rounded-md border border-emerald-400/40 px-2 py-1 text-[10px] text-emerald-300">
                  Resolve
                </button>
                <button onClick={() => void updateUserReportStatus(report.id, "dismissed")} className="rounded-md border border-amber-400/40 px-2 py-1 text-[10px] text-amber-300">
                  Dismiss
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && activeTab === "mutes" && (
        <div className="space-y-3">
          <div className="grid gap-2 md:grid-cols-4">
            <input
              value={muteUserId}
              onChange={(event) => setMuteUserId(event.target.value)}
              placeholder="user_id"
              className="rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-xs"
            />
            <input
              value={muteReason}
              onChange={(event) => setMuteReason(event.target.value)}
              placeholder="reason (optional)"
              className="rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-xs"
            />
            <input
              type="datetime-local"
              value={muteExpiresAt}
              onChange={(event) => setMuteExpiresAt(event.target.value)}
              className="rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-xs"
            />
            <button
              onClick={() => void createMute()}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#00F5FF]/40 bg-[#00F5FF]/10 px-3 py-2 text-xs font-bold text-[#00F5FF]"
            >
              <ShieldPlus size={14} />
              Add Mute
            </button>
          </div>
          {mutes.length === 0 ? <p className="text-xs text-[var(--muted-foreground)]">No active mutes.</p> : null}
          {mutes.map((mute) => (
            <div key={mute.id} className="flex items-center justify-between rounded-xl border border-[var(--border)]/50 bg-[var(--background)] p-3">
              <p className="text-xs text-[var(--foreground)]">
                {mute.user_id} {mute.expires_at ? `| until ${new Date(mute.expires_at).toLocaleString()}` : "| no expiry"}
              </p>
              <button
                onClick={() => void deleteMute(mute.user_id)}
                className="rounded-md border border-amber-400/40 px-2 py-1 text-[10px] text-amber-300"
              >
                Unmute
              </button>
            </div>
          ))}
        </div>
      )}

      {!loading && activeTab === "blocks" && (
        <div className="space-y-3">
          <div className="grid gap-2 md:grid-cols-3">
            <input
              value={blockUserId}
              onChange={(event) => setBlockUserId(event.target.value)}
              placeholder="user_id"
              className="rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-xs"
            />
            <input
              value={blockReason}
              onChange={(event) => setBlockReason(event.target.value)}
              placeholder="reason (optional)"
              className="rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-xs"
            />
            <button
              onClick={() => void createBlock()}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-400/40 bg-red-400/10 px-3 py-2 text-xs font-bold text-red-200"
            >
              <Ban size={14} />
              Add Block
            </button>
          </div>
          {blocks.length === 0 ? <p className="text-xs text-[var(--muted-foreground)]">No active blocks.</p> : null}
          {blocks.map((block) => (
            <div key={block.id} className="flex items-center justify-between rounded-xl border border-[var(--border)]/50 bg-[var(--background)] p-3">
              <p className="text-xs text-[var(--foreground)]">{block.blocked_user_id}</p>
              <button
                onClick={() => void deleteBlock(block.blocked_user_id)}
                className="rounded-md border border-emerald-400/40 px-2 py-1 text-[10px] text-emerald-300"
              >
                Unblock
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
