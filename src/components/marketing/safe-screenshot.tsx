import {
  BarChart3,
  Bell,
  CheckCircle2,
  ClipboardCheck,
  CloudOff,
  Fingerprint,
  Leaf,
  LockKeyhole,
  Moon,
  ShieldCheck,
  Smartphone,
  Sprout,
} from "lucide-react";
import type { ComponentType } from "react";

import { cn } from "@/lib/utils";

export const MARKETING_SAFE_DISCLAIMER =
  "18+ | Keine Verkaufsplattform | Keine Vermittlung | Keine Konsumaufforderung";

type ScreenshotKind = "dashboard" | "grow" | "privacy" | "age-gate" | "pwa";

type SafeScreenshotProps = {
  kind: ScreenshotKind;
};

const screenMeta: Record<ScreenshotKind, { eyebrow: string; title: string; subtitle: string }> = {
  dashboard: {
    eyebrow: "Dashboard",
    title: "Dein privates GreenLog Cockpit",
    subtitle: "Demo-Ansicht mit neutralen Platzhaltern, Fortschritt und Erinnerungen.",
  },
  grow: {
    eyebrow: "Grow Diary",
    title: "Dokumentation ohne Werbeoptik",
    subtitle: "Pflanzenpflege, Aufgaben und Notizen in einer ruhigen Arbeitsansicht.",
  },
  privacy: {
    eyebrow: "Privacy",
    title: "Kontrolle vor Sichtbarkeit",
    subtitle: "Teile nur, was du bewusst freigibst. Private Daten bleiben privat.",
  },
  "age-gate": {
    eyebrow: "Age Gate",
    title: "18+ Zugang mit klarer Grenze",
    subtitle: "GreenLog ist auf volljaehrige Nutzer und dokumentierende Nutzung ausgelegt.",
  },
  pwa: {
    eyebrow: "PWA",
    title: "Installierbar, schnell, offline vorbereitet",
    subtitle: "Eine App-Erfahrung fuer Web und Mobile, ohne App-Store-Abhaengigkeit.",
  },
};

const neutralProfiles = [
  { name: "Profil A", tone: "from-cyan-300/50 via-emerald-300/35 to-slate-900", icon: Leaf },
  { name: "Profil B", tone: "from-sky-300/50 via-teal-300/35 to-zinc-900", icon: Moon },
  { name: "Profil C", tone: "from-lime-200/45 via-cyan-200/30 to-neutral-900", icon: Sprout },
];

export function SafeScreenshot({ kind }: SafeScreenshotProps) {
  const meta = screenMeta[kind];

  return (
    <main className="min-h-screen bg-[#0e0e0f] text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-[1180px] flex-col px-8 py-7">
        <header className="flex items-center justify-between border-b border-white/10 pb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-cyan-300 text-[#00383b]">
              <Leaf className="h-6 w-6" aria-hidden />
            </div>
            <div>
              <p className="font-heading text-xl font-semibold leading-none">GreenLog</p>
              <p className="mt-1 text-xs uppercase tracking-[0.18em] text-white/45">Marketing Safe Mode</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-cyan-200/25 bg-cyan-200/10 px-4 py-2 text-sm text-cyan-100">
            <ShieldCheck className="h-4 w-4" aria-hidden />
            Neutrale Demo-Daten
          </div>
        </header>

        <section className="grid flex-1 grid-cols-[0.88fr_1.12fr] items-center gap-10 py-8">
          <div className="space-y-7">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-cyan-200/70">{meta.eyebrow}</p>
              <h1 className="mt-4 max-w-[540px] font-heading text-6xl font-semibold leading-[1.02] text-white">
                {meta.title}
              </h1>
              <p className="mt-5 max-w-[500px] text-lg leading-8 text-white/65">{meta.subtitle}</p>
            </div>

            <div className="grid max-w-[520px] grid-cols-3 gap-3">
              <Metric label="Eintraege" value="128" />
              <Metric label="Check-ins" value="42" />
              <Metric label="Privat" value="100%" />
            </div>

            <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4 text-sm leading-6 text-white/65">
              {MARKETING_SAFE_DISCLAIMER}
            </div>
          </div>

          <AppFrame kind={kind} />
        </section>
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.045] p-4">
      <p className="text-2xl font-semibold text-white">{value}</p>
      <p className="mt-1 text-xs uppercase tracking-[0.16em] text-white/45">{label}</p>
    </div>
  );
}

function AppFrame({ kind }: { kind: ScreenshotKind }) {
  return (
    <div className="relative">
      <div className="absolute -inset-5 rounded-[2rem] border border-cyan-200/10 bg-cyan-200/[0.03]" />
      <div className="relative overflow-hidden rounded-[1.75rem] border border-white/12 bg-[#171719] shadow-2xl shadow-black/50">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-rose-300/80" />
            <span className="h-3 w-3 rounded-full bg-amber-300/80" />
            <span className="h-3 w-3 rounded-full bg-emerald-300/80" />
          </div>
          <div className="rounded-full bg-white/[0.08] px-4 py-1.5 text-xs text-white/45">greenlog.app</div>
        </div>
        <div className="grid min-h-[610px] grid-cols-[210px_1fr]">
          <aside className="border-r border-white/10 bg-white/[0.025] p-5">
            <nav className="space-y-2">
              <NavItem icon={BarChart3} label="Dashboard" active={kind === "dashboard"} />
              <NavItem icon={Sprout} label="Diary" active={kind === "grow"} />
              <NavItem icon={LockKeyhole} label="Privacy" active={kind === "privacy"} />
              <NavItem icon={Smartphone} label="PWA" active={kind === "pwa"} />
            </nav>
            <div className="mt-8 rounded-lg border border-white/10 bg-white/[0.04] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-white/40">Status</p>
              <div className="mt-3 flex items-center gap-2 text-sm text-emerald-200">
                <CheckCircle2 className="h-4 w-4" aria-hidden />
                Beta bereit
              </div>
            </div>
          </aside>
          <section className="p-6">
            {kind === "dashboard" && <DashboardPanel />}
            {kind === "grow" && <GrowPanel />}
            {kind === "privacy" && <PrivacyPanel />}
            {kind === "age-gate" && <AgeGatePanel />}
            {kind === "pwa" && <PwaPanel />}
          </section>
        </div>
      </div>
    </div>
  );
}

function NavItem({
  icon: Icon,
  label,
  active,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  active: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-white/55",
        active && "bg-cyan-200/[0.14] text-cyan-100"
      )}
    >
      <Icon className="h-4 w-4" aria-hidden />
      {label}
    </div>
  );
}

function DashboardPanel() {
  return (
    <div className="space-y-5">
      <PanelHeader title="Heute im Blick" action="Privat" />
      <div className="grid grid-cols-3 gap-4">
        {neutralProfiles.map((item) => (
          <NeutralProfile key={item.name} {...item} />
        ))}
      </div>
      <div className="grid grid-cols-[1.15fr_0.85fr] gap-4">
        <TimelineCard />
        <ChecklistCard />
      </div>
    </div>
  );
}

function GrowPanel() {
  return (
    <div className="space-y-5">
      <PanelHeader title="Diary Demo" action="Keine echten Daten" />
      <div className="grid grid-cols-[0.95fr_1.05fr] gap-4">
        <div className="rounded-xl border border-white/10 bg-white/[0.04] p-5">
          <div className="flex h-56 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-300/25 via-teal-300/20 to-black">
            <Sprout className="h-20 w-20 text-cyan-100/85" aria-hidden />
          </div>
          <h2 className="mt-5 text-xl font-semibold">Pflanzenpflege dokumentieren</h2>
          <p className="mt-2 text-sm leading-6 text-white/55">
            Aufgaben, Beobachtungen und Fortschritt ohne oeffentliche Konsum- oder Produktoptik.
          </p>
        </div>
        <TimelineCard />
      </div>
    </div>
  );
}

function PrivacyPanel() {
  return (
    <div className="space-y-5">
      <PanelHeader title="Sichtbarkeit" action="Private-first" />
      <div className="grid grid-cols-2 gap-4">
        {[
          ["Profil", "Nur Basisdaten sichtbar"],
          ["Diary", "Privat"],
          ["Aktivitaeten", "Aus"],
          ["Community", "Manuell freigeben"],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-white/10 bg-white/[0.04] p-5">
            <div className="flex items-center gap-3">
              <Fingerprint className="h-5 w-5 text-cyan-200" aria-hidden />
              <p className="text-sm uppercase tracking-[0.14em] text-white/40">{label}</p>
            </div>
            <p className="mt-4 text-2xl font-semibold">{value}</p>
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-emerald-200/[0.15] bg-emerald-200/[0.08] p-5 text-sm leading-6 text-emerald-100/80">
        Demo-Hinweis: Diese Ansicht nutzt keine echten Nutzerprofile und keine personenbezogenen Inhalte.
      </div>
    </div>
  );
}

function AgeGatePanel() {
  return (
    <div className="flex min-h-[540px] items-center justify-center">
      <div className="w-full max-w-[480px] rounded-2xl border border-white/10 bg-white/[0.045] p-8 text-center">
        <ShieldCheck className="mx-auto h-14 w-14 text-cyan-200" aria-hidden />
        <h2 className="mt-6 font-heading text-4xl font-semibold">Bist du mindestens 18 Jahre alt?</h2>
        <p className="mt-4 text-sm leading-6 text-white/60">
          GreenLog ist eine dokumentierende PWA fuer volljaehrige Nutzer. Kein Verkauf, keine Vermittlung,
          keine Konsumaufforderung.
        </p>
        <div className="mt-7 grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-cyan-200 px-4 py-3 font-semibold text-[#00383b]">Ja, fortfahren</div>
          <div className="rounded-lg border border-white/12 px-4 py-3 text-white/65">Nein</div>
        </div>
      </div>
    </div>
  );
}

function PwaPanel() {
  return (
    <div className="space-y-5">
      <PanelHeader title="PWA Status" action="Installierbar" />
      <div className="grid grid-cols-3 gap-4">
        <Feature icon={Smartphone} title="Mobile Web" body="Responsive und installierbar." />
        <Feature icon={CloudOff} title="Offline" body="Statische App-Shell vorbereitet." />
        <Feature icon={Bell} title="Push" body="Nur bei korrekter Opt-in-Konfiguration." />
      </div>
      <div className="rounded-xl border border-white/10 bg-white/[0.04] p-5">
        <div className="mb-4 flex items-center justify-between text-sm text-white/45">
          <span>Installationsfluss</span>
          <span>Demo</span>
        </div>
        <div className="h-3 rounded-full bg-white/[0.08]">
          <div className="h-3 w-[78%] rounded-full bg-cyan-200" />
        </div>
      </div>
    </div>
  );
}

function PanelHeader({ title, action }: { title: string; action: string }) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="font-heading text-3xl font-semibold">{title}</h2>
      <div className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-white/55">
        {action}
      </div>
    </div>
  );
}

function NeutralProfile({
  name,
  tone,
  icon: Icon,
}: {
  name: string;
  tone: string;
  icon: ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
      <div className={cn("flex h-32 items-center justify-center rounded-lg bg-gradient-to-br", tone)}>
        <Icon className="h-12 w-12 text-white/85" aria-hidden />
      </div>
      <p className="mt-4 font-semibold">{name}</p>
      <p className="mt-1 text-sm text-white/45">Neutraler Platzhalter</p>
    </div>
  );
}

function TimelineCard() {
  const rows = ["Check-in gespeichert", "Pflegeaufgabe erledigt", "Foto-Platzhalter aktualisiert"];

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] p-5">
      <h3 className="font-semibold">Aktivitaet</h3>
      <div className="mt-4 space-y-3">
        {rows.map((row) => (
          <div key={row} className="flex items-center gap-3 rounded-lg bg-black/[0.18] p-3">
            <ClipboardCheck className="h-4 w-4 text-cyan-200" aria-hidden />
            <span className="text-sm text-white/70">{row}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ChecklistCard() {
  const items = ["Age Gate aktiv", "Rechtliche Seiten erreichbar", "Service Worker geprueft"];

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] p-5">
      <h3 className="font-semibold">Launch Check</h3>
      <div className="mt-4 space-y-3">
        {items.map((item) => (
          <div key={item} className="flex items-center gap-3 text-sm text-white/70">
            <CheckCircle2 className="h-4 w-4 text-emerald-200" aria-hidden />
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}

function Feature({
  icon: Icon,
  title,
  body,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] p-5">
      <Icon className="h-7 w-7 text-cyan-200" aria-hidden />
      <h3 className="mt-5 font-semibold">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-white/50">{body}</p>
    </div>
  );
}
