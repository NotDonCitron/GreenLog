"use client";

import { useEffect, useState, useCallback } from "react";
import { Bell, Loader2, UserPlus, X, Check, BellRing, Award, Star, CheckCircle2 } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth-provider";
import { usePushSubscription, requestPushPermission } from "@/hooks/usePushSubscription";
import { motion, AnimatePresence } from "framer-motion";

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
  const [pushEnabled, setPushEnabled] = useState(false);
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
        setNotifications(notifData.data?.notifications || []);
      }

      // Fetch pending invites
      const invitesRes = await fetch("/api/invites/pending", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (invitesRes.ok) {
        const invitesData = await invitesRes.json();
        setPendingInvites(invitesData.data?.invites || []);
      }
    } catch (err) {
      console.error("Error fetching notifications:", err);
    } finally {
      setLoading(false);
    }
  }, [session?.access_token]);

  // Subscribe to push notifications
  usePushSubscription(session?.user?.id);

  useEffect(() => {
    // Initialize push state from localStorage (persisted unsubscriptions)
    // Only override with permission if localStorage flag doesn't exist
    if ("Notification" in window) {
      const stored = localStorage.getItem("cannalog_push_enabled");
      if (stored !== null) {
        setPushEnabled(stored === "true");
      } else {
        setPushEnabled(Notification.permission === "granted");
      }
    }
  }, []);

  useEffect(() => {
    void fetchData();
    const interval = setInterval(() => void fetchData(), 10000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const markAsRead = async (id: string) => {
    // Optimistic UI update
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );

    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("id", id);
    
    if (error) {
      // Rollback on error if something went wrong
      void fetchData();
    }
  };

  const acceptInvite = async (inviteId: string) => {
    const res = await fetch(`/api/invites/${inviteId}/accept`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.access_token}`,
      },
    });
    if (res.ok) {
      void fetchData();
    }
  };

  const declineInvite = async (inviteId: string, orgId: string) => {
    const res = await fetch(`/api/organizations/${orgId}/invites?id=${inviteId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${session?.access_token}` },
    });
    if (res.ok) {
      void fetchData();
    }
  };

  if (!session) return null;

  const pushAvailable = "Notification" in window && Notification.permission !== "denied";
  const showPushHint = pushAvailable && !pushEnabled;

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
        {showPushHint && (
          <span className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-[#F5A623] border-2 border-[var(--card)]" title="Push deaktiviert – Klicke für Benachrichtigungen" />
        )}
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsOpen(false)} />
          <div className="relative w-full max-w-md bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
              <h2 className="text-lg font-bold">Benachrichtigungen</h2>
              <div className="flex items-center gap-2">
                {"Notification" in window && Notification.permission !== "denied" && (
                  <button
                    onClick={async () => {
                      if (pushEnabled) {
                        // Optimistic UI update immediately
                        setPushEnabled(false);
                        localStorage.setItem("cannalog_push_enabled", "false");

                        // Then unsubscribe from push manager
                        try {
                          const registration = await navigator.serviceWorker.ready;
                          const sub = await registration.pushManager.getSubscription();
                          if (sub) {
                            await sub.unsubscribe();
                            await fetch("/api/push/unsubscribe", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ endpoint: sub.endpoint }),
                            });
                          }
                        } catch (err) {
                          console.warn("[Push] Unsubscribe failed:", err);
                          // Revoke on failure so state stays consistent
                          const permission = Notification.permission;
                          if (permission === "granted") {
                            // stay disabled, localStorage already set
                          }
                        }
                      } else {
                        const granted = await requestPushPermission();
                        if (granted) {
                          setPushEnabled(true);
                          localStorage.setItem("cannalog_push_enabled", "true");
                        }
                      }
                    }}
                    className={`p-2 rounded-lg transition-all ${pushEnabled ? "bg-[#2FF801]/10 text-[#2FF801]" : "hover:bg-[var(--muted)] text-[var(--muted-foreground)]"}`}
                    title={pushEnabled ? "Push aktiviert" : "Push aktivieren"}
                  >
                    {pushEnabled ? <BellRing size={18} /> : <Bell size={18} />}
                  </button>
                )}
                <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-[var(--muted)] rounded-lg" aria-label="Benachrichtigungen schliessen">
                  <X size={20} />
                </button>
              </div>
            </div>

            {showPushHint && (
              <div className="mx-4 mt-4 p-3 rounded-xl bg-[#F5A623]/10 border border-[#F5A623]/30 flex items-center gap-3">
                <Bell size={18} className="text-[#F5A623] flex-shrink-0" />
                <p className="text-xs text-[var(--foreground)] flex-1">
                  <span className="font-bold">Push deaktiviert.</span> Aktiviere Benachrichtigungen, um aktuell zu bleiben.
                </p>
                <button
                  onClick={async () => {
                    const granted = await requestPushPermission();
                    if (granted) setPushEnabled(true);
                  }}
                  className="text-[10px] font-black text-black bg-[#F5A623] px-3 py-1.5 rounded-lg uppercase tracking-wider hover:bg-[#F5A623]/80 transition-colors"
                >
                  Aktivieren
                </button>
              </div>
            )}

            <div className="max-h-[60vh] overflow-y-auto">
              {/* Notifications */}
              {notifications.length > 0 && (
                <div className="p-4 border-b border-[var(--border)]">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)] mb-3">
                    Aktivität
                  </h3>
                  <div className="space-y-2">
                    <AnimatePresence initial={false}>
                      {notifications.map(n => (
                        <motion.div
                          key={n.id}
                          layout
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          className={`flex items-center gap-3 p-3 rounded-xl transition-all duration-300 ${n.read ? "bg-[var(--muted)]/20 opacity-60 grayscale-[0.5]" : "bg-[#00F5FF]/5 border border-[#00F5FF]/20 shadow-[0_0_15px_rgba(0,245,255,0.05)]"}`}
                        >
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${n.read ? "bg-[var(--muted)]" : "bg-[var(--muted)]"}`}>
                            {n.type === "new_follower" || n.type === "follow_request" ? (
                              <UserPlus size={18} className={n.read ? "text-[var(--muted-foreground)]" : "text-[#00F5FF]"} />
                            ) : n.type === "badge_unlocked" ? (
                              <Award size={18} className={n.read ? "text-[var(--muted-foreground)]" : "text-yellow-500"} />
                            ) : n.type === "strain_review" ? (
                              <Star size={18} className={n.read ? "text-[var(--muted-foreground)]" : "text-[#2FF801]"} />
                            ) : (
                              <Bell size={18} className={n.read ? "text-[var(--muted-foreground)]" : "text-[var(--foreground)]"} />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`font-bold text-sm transition-colors ${n.read ? "text-[var(--muted-foreground)]" : "text-[var(--foreground)]"}`}>{n.title}</p>
                            <p className="text-xs text-[var(--muted-foreground)] line-clamp-2">{n.message}</p>
                          </div>
                          <div className="flex-shrink-0 min-w-[60px] flex justify-end">
                            {n.read ? (
                              <CheckCircle2 size={16} className="text-[#2FF801]/50" />
                            ) : (
                              <button
                                onClick={() => void markAsRead(n.id)}
                                className="text-[10px] font-black text-[#00F5FF] uppercase tracking-widest hover:text-[#00F5FF]/80 transition-colors bg-[#00F5FF]/10 px-2 py-1 rounded-md border border-[#00F5FF]/20"
                              >
                                Gelesen
                              </button>
                            )}
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
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
                            onClick={() => void acceptInvite(invite.id)}
                            className="p-2 bg-[#00F5FF] text-black rounded-lg hover:bg-[#00F5FF]/80"
                          >
                            <Check size={16} />
                          </button>
                          <button
                            onClick={() => void declineInvite(invite.id, invite.organization_id)}
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
