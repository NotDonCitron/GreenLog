"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import Link from "next/link";

type Strain = {
  id: string;
  name: string;
  slug: string;
  type: "indica" | "sativa" | "hybrid";
  thc: string;
  avg_rating: number;
  rating_count: number;
  flavors: string[];
  effects: string[];
};

// Mock-Daten bis Supabase angebunden ist
const mockStrains: Strain[] = [
  {
    id: "1",
    name: "Amnesia Haze",
    slug: "amnesia-haze",
    type: "sativa",
    thc: "20-24%",
    avg_rating: 4.5,
    rating_count: 128,
    flavors: ["Zitrus", "Erdig"],
    effects: ["Euphorisch", "Kreativ", "Energetisch"],
  },
  {
    id: "2",
    name: "Northern Lights",
    slug: "northern-lights",
    type: "indica",
    thc: "16-21%",
    avg_rating: 4.7,
    rating_count: 95,
    flavors: ["Kiefer", "Suss"],
    effects: ["Entspannt", "Schlafrig", "Happy"],
  },
  {
    id: "3",
    name: "White Widow",
    slug: "white-widow",
    type: "hybrid",
    thc: "18-25%",
    avg_rating: 4.3,
    rating_count: 210,
    flavors: ["Erdig", "Holzig"],
    effects: ["Euphorisch", "Kreativ", "Entspannt"],
  },
  {
    id: "4",
    name: "OG Kush",
    slug: "og-kush",
    type: "hybrid",
    thc: "19-26%",
    avg_rating: 4.6,
    rating_count: 175,
    flavors: ["Zitrus", "Kiefer", "Wurzig"],
    effects: ["Entspannt", "Happy", "Euphorisch"],
  },
  {
    id: "5",
    name: "Girl Scout Cookies",
    slug: "girl-scout-cookies",
    type: "hybrid",
    thc: "25-28%",
    avg_rating: 4.8,
    rating_count: 302,
    flavors: ["Suss", "Erdig", "Minze"],
    effects: ["Euphorisch", "Entspannt", "Happy"],
  },
  {
    id: "6",
    name: "Blue Dream",
    slug: "blue-dream",
    type: "sativa",
    thc: "17-24%",
    avg_rating: 4.4,
    rating_count: 189,
    flavors: ["Beere", "Suss"],
    effects: ["Entspannt", "Kreativ", "Happy"],
  },
];

const typeColors = {
  indica: "bg-purple-100 text-purple-700",
  sativa: "bg-orange-100 text-orange-700",
  hybrid: "bg-green-100 text-green-700",
};

const typeLabels = {
  indica: "Indica",
  sativa: "Sativa",
  hybrid: "Hybrid",
};

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill={star <= Math.round(rating) ? "#f59e0b" : "none"}
          stroke="#f59e0b"
          strokeWidth="2"
        >
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ))}
      <span className="ml-1 text-xs text-muted-foreground">
        {rating.toFixed(1)} ({rating_count_format(0)})
      </span>
    </div>
  );
}

function rating_count_format(count: number) {
  return count;
}

function StrainCard({ strain }: { strain: Strain }) {
  return (
    <Link href={`/strains/${strain.slug}`}>
      <Card className="border-border active:scale-[0.98] transition-transform">
      <CardContent className="flex items-center gap-4 py-3 px-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-green-100 text-2xl">
          🌿
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold truncate">{strain.name}</h3>
            <Badge
              variant="secondary"
              className={`shrink-0 text-[10px] px-1.5 py-0 ${typeColors[strain.type]}`}
            >
              {typeLabels[strain.type]}
            </Badge>
          </div>
          <div className="mt-1 flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <svg
                key={star}
                xmlns="http://www.w3.org/2000/svg"
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill={star <= Math.round(strain.avg_rating) ? "#f59e0b" : "none"}
                stroke="#f59e0b"
                strokeWidth="2"
              >
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            ))}
            <span className="text-xs text-muted-foreground ml-1">
              {strain.avg_rating.toFixed(1)} ({strain.rating_count})
            </span>
          </div>
          <div className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
            <span>THC {strain.thc}</span>
            <span>·</span>
            <span className="truncate">{strain.flavors.join(", ")}</span>
          </div>
        </div>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="shrink-0 text-muted-foreground"
        >
          <path d="m9 18 6-6-6-6" />
        </svg>
      </CardContent>
    </Card>
    </Link>
  );
}

type FilterType = "all" | "indica" | "sativa" | "hybrid";

export default function StrainsPage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");

  const filtered = mockStrains.filter((s) => {
    const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === "all" || s.type === filter;
    return matchesSearch && matchesFilter;
  });

  const filters: { value: FilterType; label: string }[] = [
    { value: "all", label: "Alle" },
    { value: "indica", label: "Indica" },
    { value: "sativa", label: "Sativa" },
    { value: "hybrid", label: "Hybrid" },
  ];

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm px-5 pt-5 pb-3">
        <h1 className="text-2xl font-bold">Strains</h1>
        <div className="mt-3">
          <Input
            placeholder="Sorte suchen..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 rounded-xl bg-muted/50"
          />
        </div>
        <div className="mt-3 flex gap-2 overflow-x-auto no-scrollbar">
          {filters.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                filter === f.value
                  ? "bg-green-600 text-white"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Strain List */}
      <div className="flex flex-col gap-2 px-5 pt-2 pb-4">
        <p className="text-xs text-muted-foreground">
          {filtered.length} {filtered.length === 1 ? "Sorte" : "Sorten"} gefunden
        </p>
        {filtered.map((strain) => (
          <StrainCard key={strain.id} strain={strain} />
        ))}
        {filtered.length === 0 && (
          <div className="py-12 text-center text-muted-foreground">
            <span className="text-4xl">🔍</span>
            <p className="mt-3 text-sm">Keine Sorten gefunden.</p>
          </div>
        )}
      </div>
    </div>
  );
}
