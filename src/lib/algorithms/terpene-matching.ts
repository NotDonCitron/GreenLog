/**
 * Terpen-Matching Algorithmus für GreenLog
 * Berechnet chemische Ähnlichkeit zwischen User-Präferenzen und Strain-Profilen
 * KCanG-konform: rein mathematischer Algorithmus, keine Werbesprache
 */

import { SupabaseClient } from "@supabase/supabase-js";
import type { StrainVector, UserPreferenceVector, MatchResult } from "@/lib/types";

// Leit-Terpene und Cannabinoide für den 9-D Vektor
const TERPENE_KEYS = ["myrcen", "limonen", "caryophyllen", "pinen"] as const;
const CANNABINOID_KEYS = ["thc", "cbd", "cbg", "cbn", "thcv"] as const;
const ALL_KEYS = [...TERPENE_KEYS, ...CANNABINOID_KEYS] as const;

export type VectorKey = typeof ALL_KEYS[number];

// Terpen-Gewichtungen aus Bewertungen (pro Stern)
// Wichtig: DB speichert als String "4.5", "5.0" etc.
const RATING_WEIGHTS: Record<string, number> = {
  "5": 0.1, "5.0": 0.1,
  "4": 0.05, "4.5": 0.05,
  "3": 0,
  "2": -0.025,
  "1": -0.05, "1.5": -0.025,
};

const FAVORITE_BONUS = 0.03;
const WISHLIST_BONUS = 0.01;
export const MIN_RATINGS_FOR_PROFILE = 3;
export const MIN_RATINGS_FOR_MATCH = 3;

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
  supabase: SupabaseClient,
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
    .eq("is_wishlisted", true);

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
    const ratingWeight = RATING_WEIGHTS[String(rating.overall_rating)] || 0;
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