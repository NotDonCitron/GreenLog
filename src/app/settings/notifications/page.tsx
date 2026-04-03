"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import {
  ChevronLeft,
  Bell,
  BellOff,
  Loader2,
  Check,
  AlertTriangle,
  UserPlus,
  Award,
  Leaf,
} from "lucide-react";

interface PreferenceToggleProps {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  enabled: boolean;
  onToggle: (id: string, value: boolean) => void | Promise<void>;
  saving: boolean;
}

function PreferenceToggle({
  id,
  label,
  description,
  icon,
  enabled,
  onToggle,
  saving,
}: PreferenceToggleProps) {
  return (
    <div className="flex items-center gap-4 p-4 rounded-xl border border-[var(--border)] bg-[var(--card)]">
      <div className="w-10 h-10 rounded-lg bg-[var(--muted)] flex items-center justify-center text-[var(--muted-foreground)]">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm">{label}</p>
        <p className="text-xs text-[var(--muted-foreground)]">{description}</p>
      </div>
      <button
        onClick={() => onToggle(id, !enabled)}
        disabled={saving}
        className={`relative w-12 h-7 rounded-full transition-all duration-200 ${
          enabled ? "bg-[#2FF801]" : "bg-[var(--muted)]"
        }`}
        aria-label={enabled ? `Deaktiviere ${label}` : `Aktiviere ${label}`}
      >
        {saving ? (
          <Loader2 size={14} className="absolute inset-0 m-auto animate-spin text-black/50" />
        ) : (
          <span
            className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
              enabled ? "translate-x-6" : "translate-x-1"
            }`}
          />
        )}
      </button>
    </div>
  );
}

const PREFERENCES_KEY = "cannalog_notification_prefs";

interface NotificationPrefs {
  follows: boolean;
  badges: boolean;
  strain_updates: boolean;
  org_invites: boolean;
}

const defaultPrefs: NotificationPrefs = {
  follows: true,
  badges: true,
  strain_updates: true,
  org_invites: true,
};

export default function SettingsNotificationsPage() {
  const { session } = useAuth();
  const router = useRouter();

  const [prefs, setPrefs] = useState<NotificationPrefs>(defaultPrefs);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [checkingPush, setCheckingPush] = useState(true);

  useEffect(() => {
    if (!session) {
      router.push("/login");
      return;
    }

    // Load preferences from localStorage
    try {
      const stored = localStorage.getItem(PREFERENCES_KEY);
      if (stored) {
        setPrefs({ ...defaultPrefs, ...JSON.parse(stored) });
      }
    } catch {
      // ignore
    }

    // Check push subscription status
    if ("Notification" in window && Notification.permission === "granted") {
      navigator.serviceWorker.ready.then((registration) =>
        registration.pushManager.getSubscription().then((sub) => {
          setPushEnabled(!!sub);
          setCheckingPush(false);
        })
      );
    } else {
      setCheckingPush(false);
    }
  }, [session, router]);

  const handleToggle = async (id: string, value: boolean) => {
    const newPrefs = { ...prefs, [id]: value } as NotificationPrefs;
    setPrefs(newPrefs);
    localStorage.setItem(PREFERENCES_KEY, JSON.stringify(newPrefs));

    setSaving(true);
    setSaved(false);

    // Simulate a small delay for feedback
    await new Promise((r) => setTimeout(r, 400));
    setSaving(false);
    setSaved(true);

    setTimeout(() => setSaved(false), 2000);
  };

  const handlePushToggle = async () => {
    if (!("Notification" in window)) return;

    if (!pushEnabled) {
      // Enable push
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        setPushEnabled(true);
      }
    } else {
      // Disable push - unsubscribe from push manager
      try {
        const registration = await navigator.serviceWorker.ready;
        const sub = await registration.pushManager.getSubscription();
        if (sub) {
          await sub.unsubscribe();
          setPushEnabled(false);
        }
      } catch (err) {
        console.warn("[Push] Unsubscribe failed:", err);
      }
    }
  };

  if (!session) return null;

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[var(--background)]/95 backdrop-blur-sm border-b border-[var(--border)]">
        <div className="flex items-center gap-3 px-4 py-3">
          <Link
            href="/profile"
            className="w-10 h-10 rounded-xl bg-[var(--card)] border border-[var(--border)] flex items-center justify-center text-[var(--muted-foreground)] hover:text-[#00F5FF] transition-all"
          >
            <ChevronLeft size={20} />
          </Link>
          <h1 className="text-lg font-bold">Benachrichtigungen</h1>
          {saved && (
            <span className="ml-auto flex items-center gap-1 text-xs text-[#2FF801]">
              <Check size={14} /> Gespeichert
            </span>
          )}
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Push Notifications */}
        <section>
          <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)] mb-3">
            Push-Benachrichtigungen
          </h2>
          <div className="space-y-3">
            <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--card)]">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-[#00F5FF]/10 flex items-center justify-center text-[#00F5FF]">
                  {checkingPush ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : pushEnabled ? (
                    <Bell size={18} />
                  ) : (
                    <BellOff size={18} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">Push aktiviert</p>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    {pushEnabled
                      ? "Du erhältst Browser-Benachrichtigungen"
                      : "Klicke um Push-Benachrichtigungen zu aktivieren"}
                  </p>
                </div>
                <button
                  onClick={handlePushToggle}
                  disabled={checkingPush}
                  className={`relative w-12 h-7 rounded-full transition-all duration-200 ${
                    pushEnabled ? "bg-[#2FF801]" : "bg-[var(--muted)]"
                  }`}
                >
                  <span
                    className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                      pushEnabled ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
            </div>

            {!pushEnabled && (
              <p className="text-xs text-[var(--muted-foreground)] flex items-center gap-2 px-1">
                <AlertTriangle size={12} />
                Aktiviere Push in deinem Browser um Benachrichtigungen zu erhalten
              </p>
            )}
          </div>
        </section>

        {/* Notification Types */}
        <section>
          <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)] mb-3">
            Was möchtest du sehen?
          </h2>
          <div className="space-y-2">
            <PreferenceToggle
              id="follows"
              label="Neue Follower"
              description="Jemand folgt dir"
              icon={<UserPlus size={18} />}
              enabled={prefs.follows}
              onToggle={handleToggle}
              saving={saving}
            />
            <PreferenceToggle
              id="badges"
              label="Badges & Achievements"
              description="Neue Badges die du verdient hast"
              icon={<Award size={18} />}
              enabled={prefs.badges}
              onToggle={handleToggle}
              saving={saving}
            />
            <PreferenceToggle
              id="strain_updates"
              label="Strain-Updates"
              description="Neue Strains in deiner Sammlung"
              icon={<Leaf size={18} />}
              enabled={prefs.strain_updates}
              onToggle={handleToggle}
              saving={saving}
            />
            <PreferenceToggle
              id="org_invites"
              label="Organisations-Einladungen"
              description="Einladungen einer Organisation"
              icon={<Bell size={18} />}
              enabled={prefs.org_invites}
              onToggle={handleToggle}
              saving={saving}
            />
          </div>
        </section>

        {/* GDPR */}
        <section>
          <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)] mb-3">
            Deine Daten
          </h2>
          <div className="space-y-2">
            <Link
              href="/profile"
              className="flex items-center gap-4 p-4 rounded-xl border border-[var(--border)] bg-[var(--card)] hover:border-[#00F5FF]/30 transition-all"
            >
              <div className="w-10 h-10 rounded-lg bg-[var(--muted)] flex items-center justify-center text-[var(--muted-foreground)]">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm">Daten exportieren</p>
                <p className="text-xs text-[var(--muted-foreground)]">Alle deine Daten als Download</p>
              </div>
              <ChevronLeft size={18} className="rotate-180 text-[var(--muted-foreground)]" />
            </Link>

            <Link
              href="/profile"
              className="flex items-center gap-4 p-4 rounded-xl border border-[var(--border)] bg-[var(--card)] hover:border-[#ff716c]/30 transition-all"
            >
              <div className="w-10 h-10 rounded-lg bg-[var(--muted)] flex items-center justify-center text-[var(--muted-foreground)]">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm">Account löschen</p>
                <p className="text-xs text-[var(--muted-foreground)]">Alle deine Daten unwiderruflich löschen</p>
              </div>
              <ChevronLeft size={18} className="rotate-180 text-[var(--muted-foreground)]" />
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
