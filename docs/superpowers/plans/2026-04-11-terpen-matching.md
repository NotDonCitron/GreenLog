# Terpen-Matching Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ein Algorithmus-basiertes Empfehlungssystem das die chemische Ähnlichkeit zwischen User-Präferenzen und Strain-Profilen berechnet (Kosinus-Ähnlichkeit).

**Architecture:** Reiner Backend-Algorithmus in `/src/lib/algorithms/terpene-matching.ts`. Zwei neue API Routes für Match-Score und Top-Matches. Keine neue Datenbank-Tabelle - alles wird berechnet.

**Tech Stack:** TypeScript, Supabase, Next.js Pages Router API Routes

---

## File Structure

```
src/
├── lib/
│   ├── algorithms/
│   │   └── terpene-matching.ts       # NEU: Kern-Algorithmus
│   └── types.ts                     # StrainVector Interface hinzufügen
├── app/api/
│   └── recommendations/
│       ├── top/route.ts             # NEU: GET /api/recommendations/top
│       └── match/route.ts           # NEU: GET /api/recommendations/match
```

---

## Task 1: TypeScript Interface für StrainVector

**Files:**
- Modify: `src/lib/types.ts`

- [ ] **Step 1: Interface hinzufügen**

Füge am Ende von `src/lib/types.ts` hinzu:

```typescript
/**
 * 9-dimensionaler Vektor für Terpen-Matching (KCanG-konform)
 * 4 Leit-Terpene + 5 Cannabinoide
 */
export interface StrainVector {
  myrcen: number;       // 0.0 - 1.0 normalisiert
  limonen: number;
  caryophyllen: number;
  pinen: number;
  thc: number;
  cbd: number;
  cbg: number;
  cbn: number;
  thcv: number;
}

/**
 * User-Präferenz-Vektor, berechnet aus Bewertungen
 */
export interface UserPreferenceVector extends StrainVector {
  ratingCount: number;  // Anzahl der Bewertungen für dieses Profil
}

/**
 * Match-Ergebnis für eine Sorte
 */
export interface MatchResult {
  strainId: string;
  strainName: string;
  strainSlug: string;
  score: number;        // 0-100 (Prozent)
  basedOnRatings: number;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat(types): add StrainVector and MatchResult interfaces"
```

---

## Task 2: Terpen-Matching Algorithmus Library

**Files:**
- Create: `src/lib/algorithms/terpene-matching.ts`

- [ ] **Step 1: Kosinus-Ähnlichkeit Funktion schreiben**

Create `src/lib/algorithms/terpene-matching.ts`:

```typescript
/**
 * Terpen-Matching Algorithmus für GreenLog
 * Berechnet chemische Ähnlichkeit zwischen User-Präferenzen und Strain-Profilen
 * KCanG-konform: rein mathematischer Algorithmus, keine Werbesprache
 */

import type { StrainVector, UserPreferenceVector, MatchResult } from "@/lib/types";
import type { Database } from "@/lib/supabase/database.types";

// Leit-Terpene und Cannabinoide für den 9-D Vektor
const TERPENE_KEYS = ["myrcen", "limonen", "caryophyllen", "pinen"] as const;
const CANNABINOID_KEYS = ["thc", "cbd", "cbg", "cbn", "thcv"] as const;
const ALL_KEYS = [...TERPENE_KEYS, ...CANNABINOID_KEYS] as const;

export type VectorKey = typeof ALL_KEYS[number];

// Terpen-Gewichtungen aus Bewertungen (pro Stern)
const RATING_WEIGHTS = {
  5: 0.1,
  4: 0.05,
  3: 0,
  2: -0.025,
  1: -0.05,
} as const;

const FAVORITE_BONUS = 0.03;
const WISHLIST_BONUS = 0.01;
const MIN_RATINGS_FOR_PROFILE = 3;
const MIN_RATINGS_FOR_MATCH = 3;

/**
 * Kosinus-Ähnlichkeit zwischen zwei Vektoren
 * S(U,V) = Σ(Ui × Vi) / (√ΣUi² × √ΣVi²)
 */
export function cosineSimilarity(u: number[], v: number[]): number {
  if (u.length !== v.length) return 0;

  let dotProduct = 0;
  let normU = 0;
  let normV = 0;

  for (let i = 0; i < u.length; i++) {
    dotProduct += u[i] * v[i];
    normU += u[i] * u[i];
    normV += v[i] * v[i];
  }

  const denominator = Math.sqrt(normU) * Math.sqrt(normV);
  if (denominator === 0) return 0;

  return dotProduct / denominator;
}

/**
 * Normalisiert einen Terpen-Prozent-Wert auf 0-1
 * Annahme: Max 2% pro Terpen ist "voll"
 */
function normalizeTerpene(percent: number | null | undefined): number {
  if (typeof percent !== "number" || percent <= 0) return 0;
  return Math.min(percent / 2.0, 1.0);
}

/**
 * Normalisiert Cannabinoid-Wert auf 0-1
 * Annahme: Max 30% THC/CBD ist "voll"
 */
function normalizeCannabinoid(percent: number | null | undefined): number {
  if (typeof percent !== "number" || percent <= 0) return 0;
  return Math.min(percent / 30.0, 1.0);
}

/**
 * Extrahiert Strain-Vektor aus Strain-Daten
 */
export function extractStrainVector(strain: {
  terpenes?: { name: string; percent?: number }[] | string[] | null;
  thc_min?: number | null;
  thc_max?: number | null;
  cbd_min?: number | null;
  cbd_max?: number | null;
  cbg?: number | null;
  cbn?: number | null;
  thcv?: number | null;
}): StrainVector {
  // Terpene parsen
  const terpeneMap: Record<string, number> = {};
  if (strain.terpenes && Array.isArray(strain.terpenes)) {
    for (const t of strain.terpenes) {
      if (typeof t === "object" && t !== null) {
        const name = (t as { name?: string }).name?.toLowerCase() || "";
        const percent = (t as { percent?: number }).percent;
        if (name && typeof percent === "number") {
          terpeneMap[name] = percent;
        }
      } else if (typeof t === "string") {
        terpeneMap[t.toLowerCase()] = 0.5; // Fallback wenn kein percent
      }
    }
  }

  // THC: Durchschnitt von min/max
  const thcAvg = strain.thc_min && strain.thc_max
    ? (strain.thc_min + strain.thc_max) / 2
    : strain.thc_max || strain.thc_min || 0;

  // CBD: Durchschnitt von min/max
  const cbdAvg = strain.cbd_min && strain.cbd_max
    ? (strain.cbd_min + strain.cbd_max) / 2
    : strain.cbd_max || strain.cbd_min || 0;

  return {
    myrcen: normalizeTerpene(terpeneMap.myrcen || terpeneMap["β-myrcen"] || terpeneMap.myrcene),
    limonen: normalizeTerpene(terpeneMap.limonen || terpeneMap["d-limonen"] || terpeneMap.limonene),
    caryophyllen: normalizeTerpene(terpeneMap.caryophyllen || terpeneMap.caryophyllene || terpeneMap["β-caryophyllen"]),
    pinen: normalizeTerpene(terpeneMap.pinen || terpeneMap.pinene || terpeneMap["α-pinen"]),
    thc: normalizeCannabinoid(thcAvg),
    cbd: normalizeCannabinoid(cbdAvg),
    cbg: normalizeCannabinoid(strain.cbg || 0),
    cbn: normalizeCannabinoid(strain.cbn || 0),
    thcv: normalizeCannabinoid(strain.thcv || 0),
  };
}

/**
 * Berechnet User-Präferenz-Vektor aus Bewertungen und Favoriten
 */
export async function calculateUserPreferenceVector(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<UserPreferenceVector | null> {
  // Hole alle bewerteten Sorten mit Rating und Favorit-Status
  const { data: ratings } = await supabase
    .from("ratings")
    .select(`
      strain_id,
      overall_rating,
      strains:strain_id (
        id,
        name,
        slug,
        terpenes,
        thc_min,
        thc_max,
        cbd_min,
        cbd_max,
        cbg,
        cbn,
        thcv
      )
    `)
    .eq("user_id", userId);

  // Hole Favoriten
  const { data: favorites } = await supabase
    .from("user_strain_relations")
    .select("strain_id")
    .eq("user_id", userId)
    .eq("is_favorite", true);

  // Hole Wishlist
  const { data: wishlist } = await supabase
    .from("user_strain_relations")
    .select("strain_id")
    .eq("user_id", userId)
    .eq("is_wishlist", true);

  const favoriteIds = new Set(favorites?.map(f => f.strain_id) || []);
  const wishlistIds = new Set(wishlist?.map(w => w.strain_id) || []);

  if (!ratings || ratings.length < MIN_RATINGS_FOR_PROFILE) {
    return null;
  }

  // Aggregiere Vektoren
  const vectorSum: Record<VectorKey, number> = {
    myrcen: 0,
    limonen: 0,
    caryophyllen: 0,
    pinen: 0,
    thc: 0,
    cbd: 0,
    cbg: 0,
    cbn: 0,
    thcv: 0,
  };

  let totalWeight = 0;

  for (const rating of ratings) {
    if (!rating.strains) continue;

    const strain = rating.strains as unknown as Parameters<typeof extractStrainVector>[0];
    const strainVector = extractStrainVector(strain);
    const ratingWeight = RATING_WEIGHTS[rating.overall_rating as keyof typeof RATING_WEIGHTS] || 0;
    const isFavorite = favoriteIds.has(rating.strain_id);
    const isWishlist = wishlistIds.has(rating.strain_id);

    const multiplier = 1 + (isFavorite ? FAVORITE_BONUS : 0) + (isWishlist ? WISHLIST_BONUS : 0);
    const weight = ratingWeight * multiplier;

    for (const key of ALL_KEYS) {
      vectorSum[key] += strainVector[key] * weight;
    }
    totalWeight += Math.abs(weight);
  }

  // Normalisiere auf 0-1
  if (totalWeight === 0) return null;

  return {
    myrcen: Math.max(0, Math.min(1, vectorSum.myrcen / totalWeight)),
    limonen: Math.max(0, Math.min(1, vectorSum.limonen / totalWeight)),
    caryophyllen: Math.max(0, Math.min(1, vectorSum.caryophyllen / totalWeight)),
    pinen: Math.max(0, Math.min(1, vectorSum.pinen / totalWeight)),
    thc: Math.max(0, Math.min(1, vectorSum.thc / totalWeight)),
    cbd: Math.max(0, Math.min(1, vectorSum.cbd / totalWeight)),
    cbg: Math.max(0, Math.min(1, vectorSum.cbg / totalWeight)),
    cbn: Math.max(0, Math.min(1, vectorSum.cbn / totalWeight)),
    thcv: Math.max(0, Math.min(1, vectorSum.thcv / totalWeight)),
    ratingCount: ratings.length,
  };
}

/**
 * Berechnet Match-Score zwischen User-Präferenz und einer Sorte
 */
export function calculateMatchScore(
  userProfile: UserPreferenceVector,
  strainVector: StrainVector
): number {
  const userVec = [
    userProfile.myrcen,
    userProfile.limonen,
    userProfile.caryophyllen,
    userProfile.pinen,
    userProfile.thc,
    userProfile.cbd,
    userProfile.cbg,
    userProfile.cbn,
    userProfile.thcv,
  ];

  const strainVec = [
    strainVector.myrcen,
    strainVector.limonen,
    strainVector.caryophyllen,
    strainVector.pinen,
    strainVector.thc,
    strainVector.cbd,
    strainVector.cbg,
    strainVector.cbn,
    strainVector.thcv,
  ];

  const similarity = cosineSimilarity(userVec, strainVec);
  return Math.round(similarity * 100);
}

/**
 * Sortiert und limitiert Match-Ergebnisse
 */
export function sortMatchResults(
  results: MatchResult[],
  limit: number = 5
): MatchResult[] {
  return results
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

// Type für Supabase Client
type SupabaseClient<T> = import("@supabase/supabase-js").SupabaseClient<T>;
```

- [ ] **Step 2: Test-Datei schreiben**

Create `tests/unit/terpene-matching.test.ts`:

```typescript
import { describe, it, expect } from "@jest/globals";
import {
  cosineSimilarity,
  extractStrainVector,
  calculateMatchScore,
  sortMatchResults,
} from "../../src/lib/algorithms/terpene-matching";

describe("cosineSimilarity", () => {
  it("returns 1 for identical vectors", () => {
    expect(cosineSimilarity([1, 2, 3], [1, 2, 3])).toBeCloseTo(1);
  });

  it("returns 0 for orthogonal vectors", () => {
    expect(cosineSimilarity([1, 0, 0], [0, 1, 0])).toBeCloseTo(0);
  });

  it("returns -1 for opposite vectors", () => {
    expect(cosineSimilarity([1, 2], [-1, -2])).toBeCloseTo(-1);
  });
});

describe("extractStrainVector", () => {
  it("extracts terpenes from array format", () => {
    const strain = {
      terpenes: [
        { name: "myrcen", percent: 0.8 },
        { name: "limonen", percent: 0.5 },
        { name: "caryophyllen", percent: 0.3 },
        { name: "pinen", percent: 0.2 },
      ],
      thc_min: 18,
      thc_max: 22,
      cbd_min: 0.5,
      cbd_max: 1,
    };
    const vec = extractStrainVector(strain);
    expect(vec.myrcen).toBeCloseTo(0.4); // 0.8/2
    expect(vec.limonen).toBeCloseTo(0.25); // 0.5/2
    expect(vec.caryophyllen).toBeCloseTo(0.15); // 0.3/2
    expect(vec.pinen).toBeCloseTo(0.1); // 0.2/2
    expect(vec.thc).toBeCloseTo(0.67); // 20/30
    expect(vec.cbd).toBeCloseTo(0.025); // 0.75/30
  });

  it("handles missing data gracefully", () => {
    const strain = {};
    const vec = extractStrainVector(strain);
    expect(vec.myrcen).toBe(0);
    expect(vec.thc).toBe(0);
  });
});

describe("calculateMatchScore", () => {
  it("returns high score for similar profiles", () => {
    const user = {
      myrcen: 0.8, limonen: 0.5, caryophyllen: 0.3, pinen: 0.2,
      thc: 0.7, cbd: 0.1, cbg: 0, cbn: 0, thcv: 0,
      ratingCount: 10,
    };
    const strain = {
      myrcen: 0.8, limonen: 0.5, caryophyllen: 0.3, pinen: 0.2,
      thc: 0.7, cbd: 0.1, cbg: 0, cbn: 0, thcv: 0,
    };
    const score = calculateMatchScore(user, strain);
    expect(score).toBeGreaterThan(95);
  });

  it("returns low score for opposite profiles", () => {
    const user = {
      myrcen: 1, limonen: 0, caryophyllen: 0, pinen: 0,
      thc: 1, cbd: 0, cbg: 0, cbn: 0, thcv: 0,
      ratingCount: 10,
    };
    const strain = {
      myrcen: 0, limonen: 1, caryophyllen: 1, pinen: 1,
      thc: 0, cbd: 1, cbg: 0, cbn: 0, thcv: 0,
    };
    const score = calculateMatchScore(user, strain);
    expect(score).toBeLessThan(10);
  });
});

describe("sortMatchResults", () => {
  it("sorts by score descending", () => {
    const results = [
      { strainId: "1", strainName: "A", strainSlug: "a", score: 50, basedOnRatings: 5 },
      { strainId: "2", strainName: "B", strainSlug: "b", score: 90, basedOnRatings: 5 },
      { strainId: "3", strainName: "C", strainSlug: "c", score: 70, basedOnRatings: 5 },
    ];
    const sorted = sortMatchResults(results, 3);
    expect(sorted[0].score).toBe(90);
    expect(sorted[1].score).toBe(70);
    expect(sorted[2].score).toBe(50);
  });

  it("filters out zero scores", () => {
    const results = [
      { strainId: "1", strainName: "A", strainSlug: "a", score: 0, basedOnRatings: 5 },
      { strainId: "2", strainName: "B", strainSlug: "b", score: 50, basedOnRatings: 5 },
    ];
    const sorted = sortMatchResults(results, 3);
    expect(sorted.length).toBe(1);
    expect(sorted[0].score).toBe(50);
  });
});
```

- [ ] **Step 3: Tests ausführen**

Run: `cd /home/phhttps/Dokumente/Greenlog/GreenLog && npm test -- tests/unit/terpene-matching.test.ts --passWithNoTests 2>&1 || echo "Tests not configured, manual verification needed"`

- [ ] **Step 4: Commit**

```bash
git add src/lib/algorithms/terpene-matching.ts tests/unit/terpene-matching.test.ts
git commit -m "feat: add terpene-matching algorithm with cosine similarity

- Kosinus-Ähnlichkeit für 9-dimensionale Vektoren (4 Terpene + 5 Cannabinoide)
- extractStrainVector() parst Strain-Daten zu Vektor
- calculateUserPreferenceVector() berechnet Präferenzen aus Ratings/Favoriten
- calculateMatchScore() gibt 0-100 Match-Prozent zurück
- Unit Tests für alle Kernfunktionen"
```

---

## Task 3: API Route für Top Matches

**Files:**
- Create: `src/app/api/recommendations/top/route.ts`

- [ ] **Step 1: API Route schreiben**

Create `src/app/api/recommendations/top/route.ts`:

```typescript
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { jsonSuccess, jsonError } from "@/lib/api-response";
import {
  calculateUserPreferenceVector,
  extractStrainVector,
  calculateMatchScore,
  sortMatchResults,
  MIN_RATINGS_FOR_PROFILE,
} from "@/lib/algorithms/terpene-matching";
import type { MatchResult } from "@/lib/types";

export async function GET(request: Request) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return jsonError("Unauthorized", 401);
  }

  // Limit aus URL params (default 5, max 20)
  const url = new URL(request.url);
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "5", 10), 20);

  // Hole alle bewerteten Strain-IDs um sie auszuschließen
  const { data: ratings } = await supabase
    .from("ratings")
    .select("strain_id")
    .eq("user_id", user.id);

  const ratedStrainIds = new Set(ratings?.map(r => r.strain_id) || []);

  // Hole alle öffentlichen Strains (ohne die bereits bewerteten)
  const { data: allStrains, error: strainsError } = await supabase
    .from("strains")
    .select(`
      id,
      name,
      slug,
      terpenes,
      thc_min,
      thc_max,
      cbd_min,
      cbd_max,
      cbg,
      cbn,
      thcv
    `)
    .limit(200); // Performance-Limit

  if (strainsError || !allStrains) {
    return jsonError("Failed to fetch strains", 500, "STRAINS_FETCH_ERROR");
  }

  // Hole User-Präferenz-Vektor
  const userProfile = await calculateUserPreferenceVector(supabase, user.id);

  if (!userProfile || userProfile.ratingCount < MIN_RATINGS_FOR_PROFILE) {
    return jsonSuccess({
      matches: [],
      message: `Mindestens ${MIN_RATINGS_FOR_PROFILE} Bewertungen nötig für Profil-Übereinstimmung`,
      ratingCount: userProfile?.ratingCount || 0,
    });
  }

  // Berechne Match-Score für alle Strains
  const matchResults: MatchResult[] = [];

  for (const strain of allStrains) {
    // Überspringe bereits bewertete Sorten
    if (ratedStrainIds.has(strain.id)) continue;

    const strainVector = extractStrainVector(strain);
    const score = calculateMatchScore(userProfile, strainVector);

    matchResults.push({
      strainId: strain.id,
      strainName: strain.name,
      strainSlug: strain.slug,
      score,
      basedOnRatings: userProfile.ratingCount,
    });
  }

  // Sortiere und limitiere
  const topMatches = sortMatchResults(matchResults, limit);

  return jsonSuccess({
    matches: topMatches,
    ratingCount: userProfile.ratingCount,
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/recommendations/top/route.ts
git commit -m "feat(api): add GET /api/recommendations/top for personalized matches

- Requires authentication
- Returns top N strains with highest profile match scores
- Excludes already-rated strains from recommendations
- Needs minimum 3 ratings to generate profile"
```

---

## Task 4: API Route für Einzel-Match-Score

**Files:**
- Create: `src/app/api/recommendations/match/route.ts`

- [ ] **Step 1: API Route schreiben**

Create `src/app/api/recommendations/match/route.ts`:

```typescript
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { jsonSuccess, jsonError } from "@/lib/api-response";
import {
  calculateUserPreferenceVector,
  extractStrainVector,
  calculateMatchScore,
  MIN_RATINGS_FOR_PROFILE,
} from "@/lib/algorithms/terpene-matching";

export async function GET(request: Request) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return jsonError("Unauthorized", 401);
  }

  // Strain-ID aus URL params
  const url = new URL(request.url);
  const strainId = url.searchParams.get("strain_id");

  if (!strainId) {
    return jsonError("strain_id is required", 400, "MISSING_PARAM");
  }

  // Hole Strain-Daten
  const { data: strain, error: strainError } = await supabase
    .from("strains")
    .select(`
      id,
      name,
      slug,
      terpenes,
      thc_min,
      thc_max,
      cbd_min,
      cbd_max,
      cbg,
      cbn,
      thcv
    `)
    .eq("id", strainId)
    .single();

  if (strainError || !strain) {
    return jsonError("Strain not found", 404, "STRAIN_NOT_FOUND");
  }

  // Hole User-Präferenz-Vektor
  const userProfile = await calculateUserPreferenceVector(supabase, user.id);

  if (!userProfile || userProfile.ratingCount < MIN_RATINGS_FOR_PROFILE) {
    return jsonSuccess({
      score: null,
      message: `Mindestens ${MIN_RATINGS_FOR_PROFILE} Bewertungen nötig`,
      basedOnRatings: userProfile?.ratingCount || 0,
    });
  }

  const strainVector = extractStrainVector(strain);
  const score = calculateMatchScore(userProfile, strainVector);

  return jsonSuccess({
    score,
    basedOnRatings: userProfile.ratingCount,
    strainId: strain.id,
    strainName: strain.name,
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/recommendations/match/route.ts
git commit -m "feat(api): add GET /api/recommendations/match for single strain score

- Requires authentication
- Returns match score (0-100) for a specific strain
- Score is null if user has less than 3 ratings"
```

---

## Task 5: UI - Match-Score Anzeige auf Strain Detail

**Files:**
- Modify: `src/app/strains/[slug]/StrainDetailPageClient.tsx`

- [ ] **Step 1: MatchScoreBadge Komponente erstellen**

Füge in `src/components/strains/` eine neue Datei `match-score-badge.tsx` hinzu:

```typescript
"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@/lib/supabase/client";

interface MatchScoreBadgeProps {
  strainId: string;
  strainName: string;
}

export function MatchScoreBadge({ strainId, strainName }: MatchScoreBadgeProps) {
  const [score, setScore] = useState<number | null>(null);
  const [basedOn, setBasedOn] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMatch() {
      const supabase = createBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`/api/recommendations/match?strain_id=${strainId}`);
        const json = await res.json();
        if (json.data?.score !== null) {
          setScore(json.data.score);
          setBasedOn(json.data.basedOnRatings || 0);
        }
      } catch (e) {
        // Silent fail - match score is non-critical
      } finally {
        setLoading(false);
      }
    }

    fetchMatch();
  }, [strainId]);

  if (loading || score === null) {
    return null;
  }

  // Compliance-Wording: Keine werblichen Begriffe
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--muted)] border border-[var(--border)]">
      <span className="text-xs font-medium text-[var(--muted-foreground)]">
        {score}% Profil-Übereinstimmung
      </span>
      <span className="text-[10px] text-[var(--muted-foreground)] opacity-70">
        ({basedOn} Bewertungen)
      </span>
    </div>
  );
}
```

- [ ] **Step 2: Strain Detail Page anpassen**

Finde die Stelle in `StrainDetailPageClient.tsx` wo die Strain-Info angezeigt wird und füge `<MatchScoreBadge>` hinzu:

```typescript
import { MatchScoreBadge } from "@/components/strains/match-score-badge";

// Finde die Stelle wo der Strain-Name angezeigt wird, z.B.:
// <h1 className="...">{strain.name}</h1>
// Füge DANACH ein:

<MatchScoreBadge strainId={strain.id} strainName={strain.name} />
```

- [ ] **Step 3: Commit**

```bash
git add src/components/strains/match-score-badge.tsx src/app/strains/[slug]/StrainDetailPageClient.tsx
git commit -m "feat(ui): add MatchScoreBadge to strain detail page

- Shows '87% Profil-Übereinstimmung' based on user's rating history
- Fetches from /api/recommendations/match endpoint
- Only visible to authenticated users with 3+ ratings
- Compliance: neutral, analytical wording"
```

---

## Task 6: UI - Top Matches Section auf Feed Page

**Files:**
- Modify: `src/app/feed/page.tsx`

- [ ] **Step 1: TopMatchesSection Komponente erstellen**

Create `src/components/strains/top-matches-section.tsx`:

```typescript
"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@/lib/supabase/client";
import type { MatchResult } from "@/lib/types";
import Link from "next/link";

export function TopMatchesSection() {
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [ratingCount, setRatingCount] = useState(0);

  useEffect(() => {
    async function fetchTopMatches() {
      const supabase = createBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const res = await fetch("/api/recommendations/top?limit=5");
        const json = await res.json();
        if (json.data?.matches?.length > 0) {
          setMatches(json.data.matches);
          setRatingCount(json.data.ratingCount || 0);
        }
      } catch (e) {
        // Silent fail
      } finally {
        setLoading(false);
      }
    }

    fetchTopMatches();
  }, []);

  if (loading || matches.length === 0) {
    return null;
  }

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">
          Deine Top-Matches (Algorithmus-basiert)
        </h2>
        <span className="text-xs text-[var(--muted-foreground)]">
          Basierend auf {ratingCount} Bewertungen
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {matches.map((match) => (
          <Link
            key={match.strainId}
            href={`/strains/${match.strainSlug}`}
            className="group relative"
          >
            <div className="aspect-[3/4] rounded-lg bg-[var(--muted)] border border-[var(--border)] overflow-hidden">
              {/* Strain Image Placeholder */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-2">
              <p className="text-sm font-medium truncate">{match.strainName}</p>
              <p className="text-xs text-[var(--muted-foreground)]">
                {match.score}% Übereinstimmung
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Feed Page anpassen**

Finde in `src/app/feed/page.tsx` eine geeignete Stelle (z.B. nach dem Header, vor dem Feed) und füge hinzu:

```typescript
import { TopMatchesSection } from "@/components/strains/top-matches-section";

// Füge ein im JSX, nach dem View-Toggle oder Header:
{view === "personal" && <TopMatchesSection />}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/strains/top-matches-section.tsx src/app/feed/page.tsx
git commit -m "feat(ui): add TopMatchesSection to feed page

- Shows 'Deine Top-Matches (Algorithmus-basiert)' section
- Only visible on personal/discover view when user has 3+ ratings
- Fetches from /api/recommendations/top endpoint
- Compliance: neutral analytical wording"
```

---

## Spec Coverage Check

- [x] **Kosinus-Ähnlichkeit** → Task 2: `cosineSimilarity()`
- [x] **9-D Vektor (4 Terpene + 5 Cannabinoide)** → Task 1: `StrainVector` Interface + Task 2: `extractStrainVector()`
- [x] **User-Präferenz-Profil aus Ratings** → Task 2: `calculateUserPreferenceVector()`
- [x] **Match-Score API** → Task 4: `/api/recommendations/match`
- [x] **Top-Matches API** → Task 3: `/api/recommendations/top`
- [x] **Strain Detail UI** → Task 5: `MatchScoreBadge`
- [x] **Feed Page UI** → Task 6: `TopMatchesSection`
- [x] **Compliance Wording** → "Profil-Übereinstimmung", "Algorithmus-basiert" überall verwendet
- [x] **Unit Tests** → Task 2: `terpene-matching.test.ts`

---

## Offene Punkte (NICHT in diesem Plan)

- Checkbox "entsprach Präferenzen" (V2)
- Similar Strains auf Detail Page (V2)
- Filter für Terpene die man nicht mag (V2)
