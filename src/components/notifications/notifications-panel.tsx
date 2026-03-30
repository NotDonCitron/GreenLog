"use client";

import { useEffect, useState, useCallback } from "react";
import { Bell, Loader2, UserPlus, X, Check } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth-provider";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string | null;
  data: Record<string, unknown>;
  read: boolean;
  created_at: string;
}

interface PendingInvite {
  id: string;
  organization_id: string;
  organization_name?: string;
  role: string;
  created_at: string;
}

export function NotificationsPanel() {
  const { session } = useAuth();
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  const totalUnread = notifications.filter(n => !n.read).length + pendingInvites.length;

  const fetchData = useCallback(async () => {
    if (!session?.access_token) return;

    setLoading(true);
    try {
      // Fetch notifications
      const notifRes = await fetch("/api/notifications", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (notifRes.ok) {
        const notifData = await notifRes.json();
        setNotifications(notifData.notifications || []);
      }

      // Fetch pending invites
      const invitesRes = await fetch("/api/invites/pending", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (invitesRes.ok) {
        const invitesData = await invitesRes.json();
        setPendingInvites(invitesData.invites || []);
      }
    } catch (err) {
      console.error("Error fetching notifications:", err);
    } finally {
      setLoading(false);
    }
  }, [session?.access_token]);

  useEffect(() => {
    void fetchData();
    const interval = setInterval(() => void fetchData(), 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const markAsRead = async (id: string) => {
    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("id", id);
    void fetchData();
  };

  const acceptInvite = async (inviteId: string, orgId: string) => {
    const res = await fetch("/api/invites/accept", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify({ invite_id: inviteId, organization_id: orgId }),
    });
    if (res.ok) {
      void fetchData();
    }
  };

  const declineInvite = async (inviteId: string) => {
    const res = await fetch(`/api/invites/${inviteId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${session?.access_token}` },
    });
    if (res.ok) {
      void fetchData();
    }
  };

  if (!session) return null;

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="relative w-10 h-10 rounded-xl bg-[var(--card)] border border-[var(--border)] flex items-center justify-center text-[var(--muted-foreground)] hover:text-[#00F5FF] hover:border-[#00F5FF]/50 transition-all"
        title="Benachrichtigungen"
      >
        {loading ? (
          <Loader2 size={18} className="animate-spin" />
        ) : (
          <Bell size={18} />
        )}
        {totalUnread > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#00F5FF] text-black text-[10px] font-black flex items-center justify-center animate-pulse">
            {totalUnread > 9 ? "9+" : totalUnread}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsOpen(false)} />
          <div className="relative w-full max-w-md bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
              <h2 className="text-lg font-bold">Benachrichtigungen</h2>
              <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-[var(--muted)] rounded-lg" aria-label="Benachrichtigungen schliessen">
                <X size={20} />
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto">
              {/* Follower Notifications */}
              {notifications.length > 0 && (
                <div className="p-4 border-b border-[var(--border)]">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)] mb-3">
                    Neue Follower
                  </h3>
                  <div className="space-y-2">
                    {notifications.map(n => (
                      <div
                        key={n.id}
                        className={`flex items-center gap-3 p-3 rounded-xl ${n.read ? "bg-[var(--muted)]/30" : "bg-[#00F5FF]/10 border border-[#00F5FF]/30"}`}
                      >
                        <div className="w-10 h-10 rounded-full bg-[var(--primary)] flex items-center justify-center">
                          <UserPlus size={18} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{n.title}</p>
                          <p className="text-xs text-[var(--muted-foreground)] truncate">{n.message}</p>
                        </div>
                        {!n.read && (
                          <button
                            onClick={() => void markAsRead(n.id)}
                            className="text-xs text-[#00F5FF] hover:underline"
                          >
                            Gelesen
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Pending Invites */}
              {pendingInvites.length > 0 && (
                <div className="p-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)] mb-3">
                    Ausstehende Einladungen
                  </h3>
                  <div className="space-y-2">
                    {pendingInvites.map(invite => (
                      <div
                        key={invite.id}
                        className="flex items-center gap-3 p-3 rounded-xl bg-[var(--muted)]/30 border border-[var(--border)]"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{invite.organization_name || "Organization"}</p>
                          <p className="text-xs text-[var(--muted-foreground)]">
                            Rolle: {invite.role}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => void acceptInvite(invite.id, invite.organization_id)}
                            className="p-2 bg-[#00F5FF] text-black rounded-lg hover:bg-[#00F5FF]/80"
                          >
                            <Check size={16} />
                          </button>
                          <button
                            onClick={() => void declineInvite(invite.id)}
                            className="p-2 bg-[var(--muted)] rounded-lg hover:bg-[#ff716c]/20"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Empty State */}
              {notifications.length === 0 && pendingInvites.length === 0 && (
                <div className="p-8 text-center text-[var(--muted-foreground)]">
                  <Bell size={32} className="mx-auto mb-2 opacity-50" />
                  <p>Keine Benachrichtigungen</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
