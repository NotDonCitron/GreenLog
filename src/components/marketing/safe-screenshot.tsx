import {
  Bell,
  BookMarked,
  Calendar,
  Camera,
  CheckCircle2,
  ChevronLeft,
  CloudOff,
  Download,
  Home,
  Leaf,
  Plus,
  Search,
  Shield,
  ShieldCheck,
  SlidersHorizontal,
  Smartphone,
  Sprout,
  User,
  Users,
  WifiOff,
} from "lucide-react";
import type { ComponentType, ReactNode } from "react";

import { MARKETING_SCREENS } from "@/lib/marketing-screenshots.mjs";
import type { Strain } from "@/lib/types";
import { cn } from "@/lib/utils";
import { StrainCard } from "@/components/strains/strain-card";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const MARKETING_SAFE_DISCLAIMER =
  "18+ | Keine Verkaufsplattform | Keine Vermittlung | Keine Konsumaufforderung";

export type ScreenshotKind = (typeof MARKETING_SCREENS)[number];

type SafeScreenshotProps = {
  kind: ScreenshotKind;
};

const demoStrains: Strain[] = [
  {
    id: "marketing-demo-a",
    name: "Demo Sorte A",
    slug: "demo-sorte-a",
    type: "hybrid",
    source: "grow",
    image_url: null,
    terpenes: [],
    flavors: [],
    effects: [],
  },
  {
    id: "marketing-demo-b",
    name: "Demo Sorte B",
    slug: "demo-sorte-b",
    type: "sativa",
    source: "grow",
    image_url: null,
    terpenes: [],
    flavors: [],
    effects: [],
  },
  {
    id: "marketing-demo-c",
    name: "Demo Sorte C",
    slug: "demo-sorte-c",
    type: "indica",
    source: "grow",
    image_url: null,
    terpenes: [],
    flavors: [],
    effects: [],
  },
];

const screenCopy: Record<ScreenshotKind, { title: string; summary: string }> = {
  dashboard: {
    title: "Dashboard",
    summary: "Echte Home-Struktur mit CannaLog Header, Tageskarte, Quick Actions und Bottom Navigation.",
  },
  strains: {
    title: "Strains",
    summary: "Echte Strain-Listenstruktur mit Suche, Filtern, Kartenraster und neutralisierten Demo-Sorten.",
  },
  grow: {
    title: "Grow Diary",
    summary: "Echte Grow-Tracker-Optik mit Listenkarten, Status, Datum und Pflanzen-Platzhaltern.",
  },
  privacy: {
    title: "Privacy",
    summary: "Echte Settings/Privacy-Struktur mit Profilfeldern, Consent-Toggles und Datenkontrolle.",
  },
  "age-gate": {
    title: "Age Gate",
    summary: "Echte Age-Gate-Optik mit 18+ Bestätigung und klarer Sicherheitspositionierung.",
  },
  pwa: {
    title: "PWA",
    summary: "Echte Offline/PWA-Signale mit Install-Status, Offline-Seite und App-Shell.",
  },
};

export function SafeScreenshot({ kind }: SafeScreenshotProps) {
  const copy = screenCopy[kind];

  if (kind === "age-gate") {
    return (
      <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
        <AgeGateScreen />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#070808] text-white">
      <div className="mx-auto grid min-h-screen w-full max-w-[1220px] grid-cols-[0.88fr_1.12fr] items-center gap-10 px-10 py-8">
        <section className="space-y-7">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#2FF801]/25 bg-[#2FF801]/10 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-[#baffae]">
            <ShieldCheck className="h-4 w-4" aria-hidden />
            Marketing Safe Mode
          </div>
          <div>
            <p className="text-sm font-black uppercase tracking-[0.26em] text-[#00F5FF]/75">CannaLog / GreenLog</p>
            <h1 className="mt-4 font-display text-6xl font-black italic leading-[0.95] tracking-tighter">{copy.title}</h1>
            <p className="mt-5 max-w-[520px] text-lg leading-8 text-white/62">{copy.summary}</p>
          </div>
          <div className="grid max-w-[520px] grid-cols-3 gap-3">
            <SafetyPill label="Demo Daten" value="100%" />
            <SafetyPill label="Bud Fotos" value="0" />
            <SafetyPill label="Public Safe" value="18+" />
          </div>
          <div className="max-w-[560px] rounded-xl border border-white/10 bg-white/[0.045] p-4 text-sm font-semibold leading-6 text-white/72">
            {MARKETING_SAFE_DISCLAIMER}
          </div>
        </section>

        <MarketingPhone active={kind}>{renderScreen(kind)}</MarketingPhone>
      </div>
    </main>
  );
}

function SafetyPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.045] p-4">
      <p className="text-2xl font-black text-white">{value}</p>
      <p className="mt-1 text-[10px] font-black uppercase tracking-[0.14em] text-white/42">{label}</p>
    </div>
  );
}

function renderScreen(kind: ScreenshotKind) {
  if (kind === "dashboard") return <DashboardScreen />;
  if (kind === "strains") return <StrainsScreen />;
  if (kind === "grow") return <GrowScreen />;
  if (kind === "privacy") return <PrivacyScreen />;
  if (kind === "pwa") return <PwaScreen />;
  return null;
}

function MarketingPhone({ active, children }: { active: ScreenshotKind; children: ReactNode }) {
  return (
    <div className="relative mx-auto w-full max-w-[430px]">
      <div className="absolute -inset-5 rounded-[2rem] border border-[#00F5FF]/10 bg-[#00F5FF]/[0.025]" />
      <div className="relative h-[880px] overflow-hidden rounded-[2.1rem] border border-white/12 bg-[var(--background)] shadow-2xl shadow-black/60">
        <div className="h-full overflow-hidden pb-20">
          {children}
        </div>
        <MarketingBottomNav active={active} />
      </div>
    </div>
  );
}

function MarketingBottomNav({ active }: { active: ScreenshotKind }) {
  const activeHref = active === "dashboard" ? "/" : active === "strains" ? "/strains" : active === "privacy" ? "/profile" : active === "grow" ? "/collection" : "/feed";
  const items = [
    { href: "/", label: "Home", icon: Home },
    { href: "/strains", label: "Strains", icon: Leaf },
    { href: "/collection", label: "Sammlung", icon: BookMarked },
    { href: "/feed", label: "Social", icon: Users },
    { href: "/profile", label: "Profil", icon: User },
  ];

  return (
    <nav className="absolute bottom-0 left-0 right-0 z-50 border-t border-[var(--border)]/50 bg-[rgba(26,25,27,0.92)] backdrop-blur-2xl" aria-label="Marketing navigation">
      <div className="mx-auto flex h-16 w-full max-w-lg items-center justify-around px-2">
        {items.map((item) => {
          const isActive = item.href === activeHref;
          return (
            <div
              key={item.href}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 py-1 text-[11px] font-bold uppercase tracking-tight",
                isActive ? "text-[#00F5FF]" : "text-[var(--muted-foreground)]"
              )}
            >
              <div className="relative">
                <item.icon size={22} className={isActive ? "text-[#00F5FF]" : "text-[var(--muted-foreground)]"} />
                {isActive && <div className="absolute -bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-[#00F5FF]" />}
              </div>
              {item.label}
            </div>
          );
        })}
      </div>
    </nav>
  );
}

function AppHeader({ eyebrow, title, icon: Icon = Leaf }: { eyebrow: string; title: string; icon?: ComponentType<{ className?: string; size?: number }> }) {
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border)]/50 bg-[rgba(14,14,15,0.92)] px-6 pb-4 pt-12 backdrop-blur-2xl">
      <div className="flex items-end justify-between">
        <div>
          <span className="text-[10px] font-black uppercase tracking-[0.36em] text-[#2FF801]">{eyebrow}</span>
          <h2 className="font-display text-3xl font-black italic uppercase leading-none tracking-tighter text-[var(--foreground)]">
            {title}
          </h2>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--border)]/50 bg-[var(--card)]">
          <Icon className="text-[#00F5FF]" size={22} aria-hidden />
        </div>
      </div>
    </header>
  );
}

function DemoDisclaimerBar() {
  return (
    <div className="mx-6 mb-4 rounded-xl border border-[#2FF801]/20 bg-[#2FF801]/10 px-3 py-2 text-center text-[9px] font-black uppercase tracking-[0.08em] text-[#baffae]">
      {MARKETING_SAFE_DISCLAIMER}
    </div>
  );
}

function DashboardScreen() {
  return (
    <section className="h-full overflow-hidden bg-[var(--background)] text-[var(--foreground)]">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-1/4 h-[45%] w-[120%] -translate-x-1/2 rounded-full bg-[#00F5FF]/5 blur-[110px]" />
        <div className="absolute bottom-1/4 left-1/2 h-[34%] w-full -translate-x-1/2 rounded-full bg-[#2FF801]/4 blur-[90px]" />
      </div>
      <div className="relative flex h-full flex-col px-4 pt-12">
        <header className="flex shrink-0 items-center justify-between">
          <div className="flex items-center gap-3">
            <Bell className="text-[#00F5FF]" size={21} aria-hidden />
            <h2 className="font-display text-3xl font-black italic uppercase leading-none tracking-tighter">CannaLog</h2>
          </div>
          <div className="relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl border border-[var(--border)]/50 bg-[var(--card)]">
            <img src="/logo.png" alt="CannaLog Logo" className="absolute inset-0 h-full w-full object-contain p-1.5" />
          </div>
        </header>

        <div className="flex flex-1 flex-col py-8">
          <Card className="mb-6 overflow-hidden border border-[#2FF801]/30 bg-gradient-to-br from-[#2FF801]/10 to-transparent">
            <div className="flex items-center gap-4 p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#2FF801]/10">
                <Sprout size={24} className="text-[#2FF801]" aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <p className="mb-0.5 text-[10px] font-black uppercase tracking-widest text-[#2FF801]">Aktives Grow</p>
                <h3 className="truncate font-display text-sm font-black uppercase leading-none tracking-tight">Demo Grow</h3>
                <p className="mt-0.5 text-[10px] text-[var(--muted-foreground)]">Demo Sorte A · Tag 18</p>
              </div>
            </div>
          </Card>

          <div className="flex min-h-0 flex-1 items-center justify-center px-2">
            <div className="w-[72%]">
              <StrainCard strain={demoStrains[0]} index={0} isCollected={false} marketingSafe />
            </div>
          </div>

          <div className="grid shrink-0 grid-cols-2 gap-3 pt-6">
            <QuickAction icon={Search} label="Entdecken" tone="green" />
            <QuickAction icon={Sprout} label="Grows" tone="cyan" />
          </div>
        </div>
        <DemoDisclaimerBar />
      </div>
    </section>
  );
}

function QuickAction({ icon: Icon, label, tone }: { icon: ComponentType<{ size?: number; className?: string }>; label: string; tone: "green" | "cyan" }) {
  const color = tone === "green" ? "#2FF801" : "#00F5FF";
  return (
    <div className="relative h-16 overflow-hidden rounded-2xl">
      <div className="absolute inset-0" style={{ backgroundColor: `${color}1A` }} />
      <div className="absolute inset-0 rounded-2xl border border-[var(--border)]/50" />
      <div className="relative flex h-full items-center justify-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ backgroundColor: `${color}26` }}>
          <Icon size={16} className={tone === "green" ? "text-[#2FF801]" : "text-[#00F5FF]"} aria-hidden />
        </div>
        <span className="font-display text-xs font-bold uppercase tracking-wide">{label}</span>
      </div>
    </div>
  );
}

function StrainsScreen() {
  return (
    <section className="h-full overflow-hidden bg-[var(--background)] text-[var(--foreground)]">
      <AppHeader eyebrow="Katalog" title="Strains" icon={SlidersHorizontal} />
      <div className="px-6 pb-4 pt-4">
        <div className="relative mb-4">
          <Search className="absolute left-4 top-3.5 text-[#484849]" size={18} aria-hidden />
          <input
            readOnly
            value=""
            placeholder="Sorte suchen..."
            className="w-full rounded-2xl border border-[var(--border)]/50 bg-[var(--input)] py-3.5 pl-12 pr-4 text-sm text-[var(--foreground)] placeholder:text-[#484849]"
          />
        </div>
        <div className="flex gap-2 overflow-hidden pb-1">
          {["Katalog", "Demo", "Neutral", "Favoriten"].map((label, index) => (
            <div
              key={label}
              className={cn(
                "whitespace-nowrap rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-wider",
                index === 0 ? "bg-[#2FF801] text-black" : "border border-[var(--border)]/50 bg-[var(--card)] text-[var(--muted-foreground)]"
              )}
            >
              {label}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 px-6">
        {demoStrains.map((strain, index) => (
          <StrainCard key={strain.id} strain={strain} index={index} isCollected={index === 1} marketingSafe />
        ))}
        <Card className="flex aspect-[4/5] items-center justify-center rounded-[20px] border border-dashed border-[#00F5FF]/35 bg-[#00F5FF]/5">
          <div className="text-center">
            <Plus className="mx-auto text-[#00F5FF]" size={28} aria-hidden />
            <p className="mt-3 text-[10px] font-black uppercase tracking-[0.18em] text-[#00F5FF]">Demo Notiz</p>
          </div>
        </Card>
      </div>
      <div className="mt-5">
        <DemoDisclaimerBar />
      </div>
    </section>
  );
}

function GrowScreen() {
  const grows = [
    { title: "Demo Grow", kind: "indoor", status: "active", date: "2026-04-01", count: "2 Pflanzen" },
    { title: "Demo Notiz", kind: "outdoor", status: "planned", date: "2026-04-18", count: "1 Pflanze" },
  ];

  return (
    <section className="h-full overflow-hidden bg-[var(--background)] text-[var(--foreground)]">
      <AppHeader eyebrow="Grow Tracker" title="Meine Grows" icon={Plus} />
      <div className="relative z-10 space-y-4 p-6">
        <div className="flex items-center justify-center gap-2 rounded-xl border border-[var(--border)]/50 bg-[var(--card)] p-3">
          <Users size={16} className="text-[#00F5FF]" aria-hidden />
          <span className="text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)]">Demo Community</span>
        </div>
        {grows.map((grow) => (
          <Card key={grow.title} className="overflow-hidden rounded-3xl border border-[var(--border)]/50 bg-[var(--card)]">
            <div className="flex flex-col gap-4 p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn("flex h-12 w-12 items-center justify-center rounded-2xl", grow.status === "active" ? "bg-[#2FF801]/10 text-[#2FF801]" : "bg-[var(--muted)] text-[var(--muted-foreground)]")}>
                    <Sprout size={24} aria-hidden />
                  </div>
                  <div>
                    <h3 className="font-display text-lg font-black uppercase leading-none tracking-tight">{grow.title}</h3>
                    <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-[var(--muted-foreground)]">Demo Sorte A · {grow.kind}</p>
                  </div>
                </div>
                <div className={cn("rounded-full px-2.5 py-1 text-[10px] font-bold uppercase", grow.status === "active" ? "bg-[#2FF801] text-black" : "bg-[var(--muted)] text-[var(--muted-foreground)]")}>
                  {grow.status}
                </div>
              </div>
              <div className="flex items-center justify-between border-t border-[var(--border)]/50 pt-3">
                <div className="flex items-center gap-2 text-[var(--muted-foreground)]">
                  <Calendar size={12} aria-hidden />
                  <span className="text-[10px] font-bold uppercase">{grow.date}</span>
                </div>
                <div className="flex items-center gap-1 text-[10px] text-[var(--muted-foreground)]">
                  <Leaf size={10} className="text-[#2FF801]" aria-hidden />
                  <span>{grow.count}</span>
                </div>
              </div>
            </div>
          </Card>
        ))}
        <Card className="rounded-3xl border border-[#00F5FF]/20 bg-[#00F5FF]/5 p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-sm font-black uppercase">Timeline</h3>
            <Camera size={18} className="text-[#00F5FF]" aria-hidden />
          </div>
          {["Demo Notiz gespeichert", "Pflegeaufgabe dokumentiert", "Neutraler Foto-Platzhalter"].map((item) => (
            <div key={item} className="mb-2 flex items-center gap-2 rounded-xl bg-black/20 p-3 text-xs text-[var(--muted-foreground)]">
              <CheckCircle2 size={14} className="text-[#2FF801]" aria-hidden />
              {item}
            </div>
          ))}
        </Card>
      </div>
      <DemoDisclaimerBar />
    </section>
  );
}

function PrivacyScreen() {
  return (
    <section className="h-full overflow-hidden bg-[var(--background)] text-[var(--foreground)]">
      <header className="flex items-center gap-4 px-6 pb-4 pt-12">
        <div className="rounded-full border border-[var(--border)]/50 bg-[var(--card)] p-2">
          <ChevronLeft size={20} aria-hidden />
        </div>
        <h2 className="font-display text-2xl font-black italic uppercase">Einstellungen</h2>
      </header>
      <div className="space-y-6 px-6">
        <SettingsSection icon={User} title="Profil-Informationen">
          <Input readOnly value="Demo Profil" className="h-12 rounded-xl border-[var(--border)]/50 bg-[var(--background)]" />
          <Input readOnly value="demo_profil" className="h-12 rounded-xl border-[var(--border)]/50 bg-[var(--background)] font-mono text-sm" />
          <Button className="h-12 w-full rounded-xl bg-[#2FF801] font-black uppercase tracking-widest text-black">Profil speichern</Button>
        </SettingsSection>

        <SettingsSection icon={Shield} title="Datenschutz">
          <p className="text-xs leading-relaxed text-[var(--muted-foreground)]">Verwalte hier deine Freigaben und Demo-Einwilligungen.</p>
          {[
            ["Profil sichtbar", true],
            ["Aktivitäten sichtbar", false],
            ["Community-Freigabe", false],
          ].map(([label, enabled]) => (
            <div key={String(label)} className="flex items-center justify-between border-b border-[var(--border)]/30 py-2 last:border-0">
              <p className="text-xs font-bold">{label}</p>
              <Toggle enabled={Boolean(enabled)} />
            </div>
          ))}
        </SettingsSection>

        <SettingsSection icon={Download} title="Meine Daten">
          <p className="text-xs leading-relaxed text-[var(--muted-foreground)]">Demo Export als JSON vorbereiten.</p>
          <Button className="h-12 w-full rounded-xl bg-[#00F5FF] font-black uppercase tracking-widest text-black">Daten herunterladen</Button>
        </SettingsSection>
      </div>
      <div className="mt-5">
        <DemoDisclaimerBar />
      </div>
    </section>
  );
}

function SettingsSection({ icon: Icon, title, children }: { icon: ComponentType<{ size?: number; className?: string }>; title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2 px-1">
        <Icon size={16} className="text-[#2FF801]" aria-hidden />
        <h3 className="text-xs font-black uppercase tracking-widest">{title}</h3>
      </div>
      <Card className="space-y-4 rounded-3xl border border-[var(--border)]/50 bg-[var(--card)] p-5">
        {children}
      </Card>
    </section>
  );
}

function Toggle({ enabled }: { enabled: boolean }) {
  return (
    <div className={cn("relative h-6 w-12 rounded-full", enabled ? "bg-[#2FF801]" : "bg-[var(--muted)]")}>
      <span className={cn("absolute top-1 h-4 w-4 rounded-full bg-white shadow", enabled ? "left-7" : "left-1")} />
    </div>
  );
}

function AgeGateScreen() {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#0a0a0a]/95 p-4 backdrop-blur-md">
      <Card className="relative w-full max-w-sm overflow-hidden border border-[var(--border)] bg-[var(--card)] p-8">
        <div className="pointer-events-none absolute -right-20 -top-20 h-40 w-40 rounded-full bg-[#00F5FF]/5 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 h-40 w-40 rounded-full bg-[#2FF801]/5 blur-3xl" />
        <div className="relative z-10 space-y-6 text-center">
          <img src="/logo.webp" alt="GreenLog" className="mx-auto mb-4 h-32 w-32 object-contain drop-shadow-2xl" />
          <div className="space-y-2">
            <h1 className="font-display text-2xl font-black italic uppercase tracking-tight text-[var(--foreground)]">GreenLog</h1>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">Altersverifikation</p>
          </div>
          <p className="text-sm leading-relaxed text-[var(--muted-foreground)]">GreenLog richtet sich an Personen ab 18 Jahren. Bitte bestätige dein Alter.</p>
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted-foreground)]">Geburtsjahr</label>
            <select className="w-full cursor-pointer rounded-xl border border-[var(--border)] bg-[var(--input)] px-4 py-3 text-sm text-[var(--foreground)] outline-none">
              <option>2000</option>
            </select>
          </div>
          <button className="w-full rounded-xl bg-[#2FF801] py-3 text-sm font-black uppercase tracking-widest text-black">Alter bestätigen</button>
          <button className="w-full py-2 text-xs uppercase tracking-widest text-[var(--muted-foreground)]">Nein, ich bin jünger</button>
          <p className="rounded-xl border border-[#2FF801]/20 bg-[#2FF801]/10 px-3 py-2 text-[9px] font-black uppercase leading-4 tracking-[0.08em] text-[#baffae]">
            {MARKETING_SAFE_DISCLAIMER}
          </p>
        </div>
      </Card>
    </div>
  );
}

function PwaScreen() {
  return (
    <section className="h-full overflow-hidden bg-[var(--background)] text-[var(--foreground)]">
      <AppHeader eyebrow="PWA" title="Installierbar" icon={Smartphone} />
      <div className="space-y-4 p-6">
        <Card className="rounded-3xl border border-[var(--border)]/50 bg-[var(--card)] p-6 text-center">
          <WifiOff className="mx-auto mb-5 text-[#22c55e]" size={58} aria-hidden />
          <h3 className="mb-3 text-2xl font-bold text-[#22c55e]">Du bist offline</h3>
          <p className="mx-auto max-w-[320px] text-sm leading-6 text-[var(--muted-foreground)]">
            Keine Internetverbindung. Bitte prüfe deine Netzwerkverbindung und versuche es erneut.
          </p>
          <button className="mt-6 rounded-lg bg-[#22c55e] px-6 py-3 font-semibold text-[#0a0a0a]">Erneut versuchen</button>
        </Card>
        <div className="grid grid-cols-2 gap-3">
          <PwaFeature icon={Smartphone} title="App-Shell" body="Startet wie eine mobile Web-App." />
          <PwaFeature icon={CloudOff} title="Offline" body="Offline-Ansicht ist vorbereitet." />
        </div>
        <Card className="rounded-3xl border border-[#00F5FF]/20 bg-[#00F5FF]/5 p-5">
          <div className="mb-4 flex items-center justify-between text-sm text-[var(--muted-foreground)]">
            <span className="font-bold uppercase tracking-wider">Installationsstatus</span>
            <span>Demo</span>
          </div>
          <div className="h-3 rounded-full bg-white/[0.08]">
            <div className="h-3 w-[78%] rounded-full bg-[#00F5FF]" />
          </div>
        </Card>
      </div>
      <DemoDisclaimerBar />
    </section>
  );
}

function PwaFeature({ icon: Icon, title, body }: { icon: ComponentType<{ size?: number; className?: string }>; title: string; body: string }) {
  return (
    <Card className="rounded-2xl border border-[var(--border)]/50 bg-[var(--card)] p-4">
      <Icon className="text-[#00F5FF]" size={24} aria-hidden />
      <h3 className="mt-4 text-sm font-black uppercase">{title}</h3>
      <p className="mt-2 text-xs leading-5 text-[var(--muted-foreground)]">{body}</p>
    </Card>
  );
}
