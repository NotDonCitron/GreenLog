"use client";

import { useState, useRef, TouchEvent } from "react";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

// Mock-Daten
const mockStrains: Record<string, {
  id: string;
  name: string;
  slug: string;
  type: "indica" | "sativa" | "hybrid";
  thc_min: number;
  thc_max: number;
  cbd_min: number;
  cbd_max: number;
  description: string;
  effects: string[];
  flavors: string[];
  terpenes: string[];
  avg_rating: number;
  rating_count: number;
  genetics: string;
  flowering: string;
  yield: string;
  height: string;
  difficulty: string;
}> = {
  "amnesia-haze": {
    id: "1", name: "Amnesia Haze", slug: "amnesia-haze", type: "sativa",
    thc_min: 20, thc_max: 24, cbd_min: 0.1, cbd_max: 0.3,
    description: "Legendaere Sativa-dominante Sorte, bekannt fuer ihre starke zerebrale Wirkung und zitrusartigen Geschmack.",
    effects: ["Euphorisch", "Kreativ", "Energetisch", "Happy", "Fokussiert"],
    flavors: ["Zitrus", "Erdig", "Haze"],
    terpenes: ["Myrcen", "Limonen", "Caryophyllen"],
    avg_rating: 4.5, rating_count: 128,
    genetics: "South Asian x Jamaican", flowering: "10-12 Wochen", yield: "600-700g/m2", height: "80-140cm", difficulty: "Mittel",
  },
  "northern-lights": {
    id: "2", name: "Northern Lights", slug: "northern-lights", type: "indica",
    thc_min: 16, thc_max: 21, cbd_min: 0.1, cbd_max: 0.2,
    description: "Eine der bekanntesten Indica-Sorten weltweit. Perfekt zum Entspannen am Abend.",
    effects: ["Entspannt", "Schlaefrig", "Happy", "Hungrig"],
    flavors: ["Kiefer", "Suess", "Erdig"],
    terpenes: ["Myrcen", "Caryophyllen", "Pinen"],
    avg_rating: 4.7, rating_count: 95,
    genetics: "Afghani x Thai", flowering: "7-9 Wochen", yield: "500-600g/m2", height: "100-120cm", difficulty: "Einfach",
  },
  "white-widow": {
    id: "3", name: "White Widow", slug: "white-widow", type: "hybrid",
    thc_min: 18, thc_max: 25, cbd_min: 0.1, cbd_max: 0.2,
    description: "Ausgewogener Hybrid aus Brasilien und Suedindien. Bekannt fuer ihre weissen Trichome.",
    effects: ["Euphorisch", "Kreativ", "Entspannt", "Gespraechig"],
    flavors: ["Erdig", "Holzig", "Wuerzig"],
    terpenes: ["Myrcen", "Caryophyllen", "Limonen"],
    avg_rating: 4.3, rating_count: 210,
    genetics: "Brazilian x South Indian", flowering: "8-9 Wochen", yield: "450-500g/m2", height: "60-100cm", difficulty: "Einfach",
  },
  "og-kush": {
    id: "4", name: "OG Kush", slug: "og-kush", type: "hybrid",
    thc_min: 19, thc_max: 26, cbd_min: 0.1, cbd_max: 0.3,
    description: "Legendaerer Hybrid aus Kalifornien. Starkes Aroma und kraftvolle Wirkung.",
    effects: ["Entspannt", "Happy", "Euphorisch", "Hungrig"],
    flavors: ["Zitrus", "Kiefer", "Wuerzig"],
    terpenes: ["Myrcen", "Limonen", "Caryophyllen"],
    avg_rating: 4.6, rating_count: 175,
    genetics: "Chemdawg x Hindu Kush", flowering: "8-9 Wochen", yield: "400-500g/m2", height: "90-130cm", difficulty: "Mittel",
  },
  "girl-scout-cookies": {
    id: "5", name: "Girl Scout Cookies", slug: "girl-scout-cookies", type: "hybrid",
    thc_min: 25, thc_max: 28, cbd_min: 0.1, cbd_max: 0.2,
    description: "Extrem potenter Hybrid. Suesses, erdiges Aroma mit starker Koerperwirkung.",
    effects: ["Euphorisch", "Entspannt", "Happy", "Kreativ"],
    flavors: ["Suess", "Erdig", "Minze"],
    terpenes: ["Caryophyllen", "Limonen", "Humulen"],
    avg_rating: 4.8, rating_count: 302,
    genetics: "OG Kush x Durban Poison", flowering: "9-10 Wochen", yield: "350-450g/m2", height: "75-100cm", difficulty: "Mittel",
  },
  "blue-dream": {
    id: "6", name: "Blue Dream", slug: "blue-dream", type: "sativa",
    thc_min: 17, thc_max: 24, cbd_min: 0.1, cbd_max: 0.2,
    description: "Beliebte Sativa aus Kalifornien. Beeren-Aroma mit ausgewogener Wirkung.",
    effects: ["Entspannt", "Kreativ", "Happy", "Euphorisch"],
    flavors: ["Beere", "Suess", "Vanille"],
    terpenes: ["Myrcen", "Caryophyllen", "Pinen"],
    avg_rating: 4.4, rating_count: 189,
    genetics: "Blueberry x Haze", flowering: "9-10 Wochen", yield: "500-600g/m2", height: "100-150cm", difficulty: "Einfach",
  },
};

const mockReviews = [
  { id: "r1", username: "grower420", overall: 5, taste: 4, effect: 5, look: 5, review: "Absolut top! Bester Haze den ich je geraucht habe.", method: "vaporizer", date: "15.03.2026" },
  { id: "r2", username: "kushking", overall: 4, taste: 5, effect: 4, look: 4, review: "Sehr guter Geschmack, Wirkung koennte etwas staerker sein.", method: "joint", date: "10.03.2026" },
  { id: "r3", username: "maryjane", overall: 5, taste: 5, effect: 5, look: 4, review: "Mein absoluter Favorit. Perfekt fuer kreative Sessions.", method: "bong", date: "05.03.2026" },
];

const typeGradients = {
  indica: "from-purple-600 to-purple-900",
  sativa: "from-orange-500 to-amber-700",
  hybrid: "from-green-500 to-emerald-800",
};

const typeBg = {
  indica: "bg-purple-500/20",
  sativa: "bg-orange-500/20",
  hybrid: "bg-green-500/20",
};

const methodLabels: Record<string, string> = {
  joint: "Joint", bong: "Bong", vaporizer: "Vaporizer", pipe: "Pfeife", edible: "Edible", other: "Andere",
};

// Terpene Datenbank (Quelle: aboutweed.com)
type TerpeneInfo = {
  name: string;
  aroma: string;
  effects: string[];
  boilingPoint: number;
  color: string;
  sources: string[];
  description: string;
};

const terpeneDB: Record<string, TerpeneInfo> = {
  Myrcen: {
    name: "Myrcen",
    aroma: "Erdig, moschusartig, krautig",
    effects: ["Entspannung", "Beruhigung", "Koerperliche Schwere"],
    boilingPoint: 167,
    color: "#22c55e",
    sources: ["Hopfen", "Mango", "Thymian", "Zitronengras"],
    description: "Haeufigstes Terpen in Cannabis. Sorten mit >0.5% Myrcen wirken besonders entspannend. Verstaerkt die THC-Aufnahme ueber die Blut-Hirn-Schranke.",
  },
  Limonen: {
    name: "Limonen",
    aroma: "Zitrone, Orange, Grapefruit",
    effects: ["Stimmungsaufhellung", "Energie", "Stressabbau"],
    boilingPoint: 176,
    color: "#facc15",
    sources: ["Zitrusfruechte", "Wacholder", "Pfefferminze"],
    description: "Verleiht Sorten ihr zitrusartiges Aroma. In Kombination mit CBD besonders stressabbauend.",
  },
  Caryophyllen: {
    name: "Caryophyllen",
    aroma: "Pfeffrig, wuerzig, holzig",
    effects: ["Entspannung", "Wohlbefinden", "Entzuendungshemmend"],
    boilingPoint: 130,
    color: "#a855f7",
    sources: ["Schwarzer Pfeffer", "Nelken", "Zimt", "Oregano"],
    description: "Einzigartiges Terpen — bindet direkt an CB2-Rezeptoren. Wird teils als Cannabinoid klassifiziert. Synergistisch mit CBD.",
  },
  Linalool: {
    name: "Linalool",
    aroma: "Blumig, lavendelig, suess",
    effects: ["Beruhigung", "Stressabbau", "Schlaffoerderung"],
    boilingPoint: 198,
    color: "#c084fc",
    sources: ["Lavendel", "Birke", "Koriander"],
    description: "Das Terpen das Lavendel seinen beruhigenden Duft verleiht. Traegt zu entspannenden Sorten bei.",
  },
  Pinen: {
    name: "Pinen",
    aroma: "Kiefer, Tannennadeln, harzig",
    effects: ["Klarheit", "Wachheit", "Fokus"],
    boilingPoint: 155,
    color: "#10b981",
    sources: ["Kiefern", "Rosmarin", "Basilikum", "Salbei"],
    description: "Am weitesten verbreitetes Terpen in der Natur. Kann den Kurzzeit-Gedaechtnisverlust durch THC teilweise kompensieren.",
  },
  Humulen: {
    name: "Humulen",
    aroma: "Hopfig, erdig, holzig",
    effects: ["Appetithemmung", "Erdung", "Entzuendungshemmend"],
    boilingPoint: 106,
    color: "#78716c",
    sources: ["Hopfen", "Salbei", "Ginseng"],
    description: "Gibt Bier seinen typischen Geschmack. Eines der wenigen Terpene das appetithemmend wirkt.",
  },
  Terpinolen: {
    name: "Terpinolen",
    aroma: "Blumig, krautig, zitrusartig",
    effects: ["Anregend", "Aufhellend", "Antioxidativ"],
    boilingPoint: 186,
    color: "#f472b6",
    sources: ["Flieder", "Teebaum", "Muskatnuss"],
    description: "Selteneres Terpen, oft dominant in Sativa-Sorten wie Jack Herer.",
  },
  Ocimen: {
    name: "Ocimen",
    aroma: "Suess, krautig, holzig",
    effects: ["Frische", "Leichte Energie", "Antiviral"],
    boilingPoint: 100,
    color: "#06b6d4",
    sources: ["Basilikum", "Mango", "Orchideen"],
    description: "Verstaerkt das suesse, tropische Aroma vieler Sorten.",
  },
};

// Terpene-Anteile pro Strain (in %)
const strainTerpeneProfiles: Record<string, Record<string, number>> = {
  "amnesia-haze": { Myrcen: 0.45, Limonen: 0.32, Caryophyllen: 0.18, Terpinolen: 0.08, Pinen: 0.05 },
  "northern-lights": { Myrcen: 0.85, Caryophyllen: 0.25, Pinen: 0.15, Linalool: 0.12, Humulen: 0.06 },
  "white-widow": { Myrcen: 0.55, Caryophyllen: 0.30, Limonen: 0.20, Pinen: 0.10, Linalool: 0.08 },
  "og-kush": { Myrcen: 0.62, Limonen: 0.45, Caryophyllen: 0.38, Linalool: 0.15, Humulen: 0.10 },
  "girl-scout-cookies": { Caryophyllen: 0.48, Limonen: 0.35, Humulen: 0.22, Linalool: 0.18, Myrcen: 0.15 },
  "blue-dream": { Myrcen: 0.70, Caryophyllen: 0.22, Pinen: 0.18, Terpinolen: 0.12, Ocimen: 0.08 },
};

function Stars({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <svg key={s} xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
          fill={s <= Math.round(rating) ? "#fbbf24" : "none"} stroke="#fbbf24" strokeWidth="2">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ))}
    </div>
  );
}

function InteractiveStars({ rating, onChange, size = 28 }: { rating: number; onChange: (r: number) => void; size?: number }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((s) => (
        <button key={s} type="button" onClick={() => onChange(s)} className="active:scale-125 transition-transform">
          <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
            fill={s <= rating ? "#fbbf24" : "none"} stroke="#fbbf24" strokeWidth="2">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        </button>
      ))}
    </div>
  );
}

export default function StrainDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const strain = mockStrains[slug];

  const [currentCard, setCurrentCard] = useState(0);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  // Rating form state
  const { user } = useAuth();
  const [overall, setOverall] = useState(0);
  const [taste, setTaste] = useState(0);
  const [effect, setEffect] = useState(0);
  const [look, setLook] = useState(0);
  const [method, setMethod] = useState("");
  const [review, setReview] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const totalCards = 5;

  const handleTouchStart = (e: TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    const diff = touchStartX.current - touchEndX.current;
    const threshold = 50;
    if (diff > threshold && currentCard < totalCards - 1) {
      setCurrentCard((c) => c + 1);
    } else if (diff < -threshold && currentCard > 0) {
      setCurrentCard((c) => c - 1);
    }
  };

  if (!strain) {
    return (
      <div className="flex flex-col items-center px-5 pt-20 text-center">
        <span className="text-5xl">🤷</span>
        <h1 className="mt-4 text-xl font-bold">Strain nicht gefunden</h1>
        <Link href="/strains">
          <Button className="mt-4 bg-green-600 hover:bg-green-700 text-white">Zurueck</Button>
        </Link>
      </div>
    );
  }

  const handleSubmit = () => {
    if (overall === 0) return;
    console.log({ strainId: strain.id, overall, taste, effect, look, method, review });
    setSubmitted(true);
  };

  const cards = [
    // CARD 0: TCG Trading Card Style
    <div key="main" className="flex flex-col h-full py-3">
      {/* Card inner frame */}
      <div className="relative flex-1 rounded-2xl border-2 border-white/30 bg-gradient-to-b from-white/15 to-white/5 p-3 flex flex-col">

        {/* Top bar: Rating + Name + Type */}
        <div className="flex items-start gap-3 mb-3">
          {/* Big Rating Number (FIFA style) */}
          <div className="flex flex-col items-center">
            <span className="text-4xl font-black text-white leading-none">
              {strain.avg_rating.toFixed(1)}
            </span>
            <span className="text-[9px] uppercase tracking-widest text-white/50 mt-0.5">Rating</span>
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-black tracking-tight text-white truncate">{strain.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded ${
                strain.type === "indica" ? "bg-purple-400/30 text-purple-200" :
                strain.type === "sativa" ? "bg-orange-400/30 text-orange-200" :
                "bg-emerald-400/30 text-emerald-200"
              }`}>{strain.type}</span>
              <span className="text-[10px] text-white/40">{strain.genetics}</span>
            </div>
          </div>
        </div>

        {/* Card Art Area */}
        <div className="relative rounded-xl bg-black/20 border border-white/10 flex items-center justify-center overflow-hidden mb-3" style={{ height: "38%" }}>
          {/* Holographic shimmer overlay */}
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-bl from-transparent via-white/3 to-transparent" />
          <div className="text-7xl">🌿</div>
          {/* Reviews count badge */}
          <div className="absolute top-2 right-2 bg-black/40 rounded-full px-2 py-0.5 flex items-center gap-1">
            <Stars rating={strain.avg_rating} size={10} />
            <span className="text-[10px] text-white/70">({strain.rating_count})</span>
          </div>
          {/* Difficulty badge */}
          <div className="absolute bottom-2 left-2 bg-black/40 rounded-full px-2 py-0.5">
            <span className="text-[10px] text-white/70">{strain.difficulty}</span>
          </div>
        </div>

        {/* Stats Grid — rein informativ */}
        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 mb-3">
          <StatRow label="THC" value={strain.thc_max} max={30} displayValue={`${strain.thc_max}%`} />
          <StatRow label="CBD" value={strain.cbd_max * 10} max={5} displayValue={`${strain.cbd_max}%`} />
          <StatRow label="BLUETE" value={parseInt(strain.flowering)} max={14} displayValue={strain.flowering.replace(" Wochen", "w")} />
          <StatRow label="ERTRAG" value={strain.yield.includes("600") ? 4.5 : strain.yield.includes("500") ? 4 : 3.5} max={5} displayValue={strain.yield.split("-")[1]?.replace("/m2", "") || "400g"} />
          <StatRow label="HOEHE" value={parseInt(strain.height.split("-")[1] || "100")} max={200} displayValue={strain.height.split("-")[1] || "100cm"} />
          <StatRow label="LEVEL" value={strain.difficulty === "Einfach" ? 2 : strain.difficulty === "Mittel" ? 3.5 : 5} max={5} displayValue={strain.difficulty} />
        </div>

        {/* Bottom: Flavor tags */}
        <div className="flex flex-wrap gap-1 justify-center mt-auto">
          {strain.flavors.map((f) => (
            <span key={f} className="rounded-full bg-white/10 border border-white/10 px-2.5 py-0.5 text-[10px] text-white/70 font-medium">{f}</span>
          ))}
          {strain.terpenes.slice(0, 2).map((t) => (
            <span key={t} className="rounded-full bg-white/5 border border-white/10 px-2.5 py-0.5 text-[10px] text-white/50">{t}</span>
          ))}
        </div>

        {/* Card serial / rarity */}
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/10">
          <span className="text-[9px] font-mono text-white/25">GL-{strain.id.padStart(4, "0")}</span>
          <div className="flex gap-0.5">
            {[...Array(strain.type === "indica" ? 3 : strain.type === "sativa" ? 4 : 2)].map((_, i) => (
              <div key={i} className="h-1.5 w-1.5 rounded-full bg-yellow-400/60" />
            ))}
          </div>
          <span className="text-[9px] font-mono text-white/25">GREENLOG</span>
        </div>
      </div>

      <p className="text-white/40 text-[10px] mt-2 text-center">Swipe oder tippe fuer Details →</p>
    </div>,

    // CARD 1: Details & Beschreibung
    <div key="details" className="flex flex-col h-full py-6 overflow-y-auto">
      <h2 className="text-lg font-bold text-white mb-4">Steckbrief</h2>

      <div className="grid grid-cols-2 gap-3 mb-5">
        <InfoBox label="Genetik" value={strain.genetics} />
        <InfoBox label="Bluete" value={strain.flowering} />
        <InfoBox label="Ertrag" value={strain.yield} />
        <InfoBox label="Hoehe" value={strain.height} />
        <InfoBox label="THC" value={`${strain.thc_min}-${strain.thc_max}%`} />
        <InfoBox label="Schwierigkeit" value={strain.difficulty} />
      </div>

      <p className="text-sm text-white/70 leading-relaxed mb-5">{strain.description}</p>

      <div className="mb-4">
        <h3 className="text-sm font-semibold text-white/90 mb-2">Wirkung</h3>
        <div className="flex flex-wrap gap-1.5">
          {strain.effects.map((e) => (
            <span key={e} className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/80">{e}</span>
          ))}
        </div>
      </div>

      <div className="mb-4">
        <h3 className="text-sm font-semibold text-white/90 mb-2">Geschmack</h3>
        <div className="flex flex-wrap gap-1.5">
          {strain.flavors.map((f) => (
            <span key={f} className="rounded-full bg-amber-500/20 px-3 py-1 text-xs text-amber-200">{f}</span>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-white/90 mb-2">Terpene</h3>
        <div className="flex flex-wrap gap-1.5">
          {strain.terpenes.map((t) => (
            <span key={t} className="rounded-full bg-blue-500/20 px-3 py-1 text-xs text-blue-200">{t}</span>
          ))}
        </div>
      </div>
    </div>,

    // CARD 2: Terpenprofil
    <div key="terpenes" className="flex flex-col h-full py-6 overflow-y-auto">
      <h2 className="text-lg font-bold text-white mb-1">Terpenprofil</h2>
      <p className="text-xs text-white/50 mb-4">Aroma- & Wirkungskomposition</p>

      {/* Radar-artige Darstellung mit Balken */}
      <div className="space-y-3 mb-5">
        {Object.entries(strainTerpeneProfiles[strain.slug] || {}).map(([name, percent]) => {
          const info = terpeneDB[name];
          if (!info) return null;
          const barWidth = Math.min((percent / 1.0) * 100, 100);
          return (
            <div key={name}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-semibold text-white">{name}</span>
                <span className="text-xs font-mono text-white/60">{percent.toFixed(2)}%</span>
              </div>
              <div className="h-4 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${barWidth}%`, backgroundColor: info.color }}
                />
              </div>
              <p className="text-[11px] text-white/50 mt-1">{info.aroma}</p>
            </div>
          );
        })}
      </div>

      {/* Terpene Detail Cards */}
      <div className="space-y-2">
        {Object.entries(strainTerpeneProfiles[strain.slug] || {})
          .slice(0, 3)
          .map(([name]) => {
            const info = terpeneDB[name];
            if (!info) return null;
            return (
              <div key={name} className="rounded-xl bg-white/10 p-3">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: info.color }} />
                  <span className="text-sm font-semibold text-white">{info.name}</span>
                  <span className="text-[10px] text-white/40 ml-auto">{info.boilingPoint}°C</span>
                </div>
                <p className="text-xs text-white/60 mb-2">{info.description}</p>
                <div className="flex flex-wrap gap-1">
                  {info.effects.map((e) => (
                    <span key={e} className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                      style={{ backgroundColor: info.color + "30", color: info.color }}>
                      {e}
                    </span>
                  ))}
                </div>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {info.sources.map((s) => (
                    <span key={s} className="text-[10px] text-white/30">
                      {s}{info.sources.indexOf(s) < info.sources.length - 1 ? " · " : ""}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
      </div>

      <p className="text-[10px] text-white/30 mt-3 text-center">Quelle: aboutweed.com</p>
    </div>,

    // CARD 3: Reviews
    <div key="reviews" className="flex flex-col h-full py-6 overflow-y-auto">
      <h2 className="text-lg font-bold text-white mb-4">Reviews ({mockReviews.length})</h2>

      <div className="space-y-3 flex-1">
        {mockReviews.map((r) => (
          <div key={r.id} className="rounded-xl bg-white/10 p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold text-white">
                  {r.username.charAt(0).toUpperCase()}
                </div>
                <span className="text-sm font-medium text-white">{r.username}</span>
              </div>
              <span className="text-xs text-white/50">{r.date}</span>
            </div>
            <div className="flex items-center gap-2 mb-2">
              <Stars rating={r.overall} size={12} />
              <span className="text-xs text-white/50">{methodLabels[r.method]}</span>
            </div>
            <p className="text-sm text-white/70">{r.review}</p>
            <div className="mt-2 flex gap-3 text-[11px] text-white/40">
              <span>Geschmack {r.taste}/5</span>
              <span>Wirkung {r.effect}/5</span>
              <span>Aussehen {r.look}/5</span>
            </div>
          </div>
        ))}
      </div>
    </div>,

    // CARD 4: Bewerten
    <div key="rate" className="flex flex-col h-full py-6 overflow-y-auto">
      <h2 className="text-lg font-bold text-white mb-4">Bewerten</h2>

      {!user ? (
        <div className="flex-1 flex flex-col items-center justify-center">
          <span className="text-4xl">✍️</span>
          <p className="mt-3 text-white/70 text-sm">Melde dich an um zu bewerten.</p>
          <Link href="/login">
            <Button className="mt-4 bg-white text-green-700 hover:bg-white/90">Anmelden</Button>
          </Link>
        </div>
      ) : submitted ? (
        <div className="flex-1 flex flex-col items-center justify-center">
          <span className="text-5xl">✅</span>
          <p className="mt-3 text-white font-semibold">Bewertung abgeschickt!</p>
          <p className="text-white/60 text-sm mt-1">Danke fuer deinen Beitrag.</p>
        </div>
      ) : (
        <div className="space-y-5">
          <div>
            <label className="text-sm font-medium text-white/90">Gesamt *</label>
            <div className="mt-1"><InteractiveStars rating={overall} onChange={setOverall} /></div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-white/60">Geschmack</label>
              <div className="mt-1"><InteractiveStars rating={taste} onChange={setTaste} size={18} /></div>
            </div>
            <div>
              <label className="text-xs text-white/60">Wirkung</label>
              <div className="mt-1"><InteractiveStars rating={effect} onChange={setEffect} size={18} /></div>
            </div>
            <div>
              <label className="text-xs text-white/60">Aussehen</label>
              <div className="mt-1"><InteractiveStars rating={look} onChange={setLook} size={18} /></div>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-white/90">Methode</label>
            <div className="mt-2 flex flex-wrap gap-2">
              {Object.entries(methodLabels).map(([key, label]) => (
                <button key={key} type="button" onClick={() => setMethod(key)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                    method === key ? "bg-white text-green-700" : "bg-white/10 text-white/70"
                  }`}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-white/90">Review</label>
            <Textarea className="mt-1.5 rounded-xl bg-white/10 border-white/20 text-white placeholder:text-white/30"
              placeholder="Wie war dein Erlebnis?" rows={3} value={review} onChange={(e) => setReview(e.target.value)} />
          </div>

          <Button onClick={handleSubmit} disabled={overall === 0}
            className="w-full h-11 bg-white text-green-700 hover:bg-white/90 text-base font-semibold">
            Abschicken
          </Button>
        </div>
      )}
    </div>,
  ];

  const pageLabels = ["Karte", "Details", "Terpene", "Reviews", "Bewerten"];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      {/* Close button */}
      <button onClick={() => router.back()}
        className="absolute top-4 right-4 z-50 h-10 w-10 rounded-full bg-black/50 flex items-center justify-center">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
          <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
        </svg>
      </button>

      {/* Card */}
      <div
        className={`card-holo relative w-full max-w-sm h-[75vh] rounded-3xl bg-gradient-to-br ${typeGradients[strain.type]} shadow-2xl overflow-hidden`}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Card border glow */}
        <div className="absolute inset-0 rounded-3xl border border-white/20 pointer-events-none" />

        {/* Content */}
        <div className="relative h-full px-5 flex flex-col">
          {/* Page indicator */}
          <div className="flex items-center justify-center gap-2 pt-4 pb-2">
            {pageLabels.map((label, i) => (
              <button
                key={label}
                onClick={() => setCurrentCard(i)}
                className={`text-xs px-2 py-1 rounded-full transition-all ${
                  i === currentCard
                    ? "bg-white/30 text-white font-semibold"
                    : "text-white/40"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Card content with transition */}
          <div className="flex-1 min-h-0">
            {cards[currentCard]}
          </div>
        </div>
      </div>

      {/* Desktop: Arrow buttons */}
      <div className="hidden sm:flex absolute inset-y-0 left-0 right-0 items-center justify-between px-2 pointer-events-none">
        {currentCard > 0 && (
          <button onClick={() => setCurrentCard((c) => c - 1)}
            className="pointer-events-auto h-10 w-10 rounded-full bg-black/50 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <path d="m15 18-6-6 6-6"/>
            </svg>
          </button>
        )}
        <div />
        {currentCard < totalCards - 1 && (
          <button onClick={() => setCurrentCard((c) => c + 1)}
            className="pointer-events-auto h-10 w-10 rounded-full bg-black/50 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <path d="m9 18 6-6-6-6"/>
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

function StatBar({ label, value, max, unit }: { label: string; value: number; max: number; unit: string }) {
  const percent = Math.min((value / max) * 100, 100);
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs font-semibold text-white/70 w-12">{label}</span>
      <div className="flex-1 h-3 rounded-full bg-white/10 overflow-hidden">
        <div className="h-full rounded-full bg-white/60 transition-all duration-500" style={{ width: `${percent}%` }} />
      </div>
      <span className="text-xs font-bold text-white w-10 text-right">{value}{unit}</span>
    </div>
  );
}

function StatRow({ label, value, max, displayValue }: { label: string; value: number; max: number; displayValue: string }) {
  const percent = Math.min((value / max) * 100, 100);
  const barColor = percent > 80 ? "bg-green-400" : percent > 60 ? "bg-yellow-400" : percent > 40 ? "bg-orange-400" : "bg-red-400";
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[9px] font-bold uppercase tracking-wider text-white/50 w-10 shrink-0">{label}</span>
      <div className="flex-1 h-2 rounded-full bg-black/20 overflow-hidden min-w-6">
        <div className={`h-full rounded-full ${barColor} transition-all duration-700`} style={{ width: `${percent}%` }} />
      </div>
      <span className="text-[10px] font-black text-white shrink-0 text-right whitespace-nowrap">{displayValue}</span>
    </div>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/10 px-3 py-2.5">
      <p className="text-[10px] uppercase tracking-wider text-white/40">{label}</p>
      <p className="text-sm font-semibold text-white mt-0.5">{value}</p>
    </div>
  );
}
