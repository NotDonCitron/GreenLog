# Similar Strains — Chemische Ähnlichkeit Feature

**Date:** 2026-04-11
**Status:** Approved, pending implementation

---

## 1. Overview

Add a "Ähnliche Sorten" (Similar Strains) section to the Strain Detail Page (`/strains/[slug]`). The section shows strains with the highest cosine similarity based on the user's rated strains and the current strain's 9-D vector (terpenes + cannabinoids).

**KCanG Compliance:** Pure mathematical algorithm — no behavioral advertising ("people who liked this also liked..."). Uses only chemical profile matching.

---

## 2. Architecture

### Data Flow

```
StrainDetailPageClient.tsx
  └── <SimilarStrainsSection> (new client component)
        └── API call: GET /api/recommendations/similar?strain_id={id}
              └── Response: { matches: [...], ratingCount: N }
```

### New Files

| File | Purpose |
|------|---------|
| `src/app/api/recommendations/similar/route.ts` | New API route |
| `src/components/strains/SimilarStrainsSection.tsx` | New component |

### Modified Files

| File | Change |
|------|--------|
| `src/app/strains/[slug]/StrainDetailPageClient.tsx` | Add `<SimilarStrainsSection>` after ratings |

---

## 3. API Route — `/api/recommendations/similar`

**File:** `src/app/api/recommendations/similar/route.ts`

### Algorithm

1. Authenticate user via `authenticateRequest()`
2. Call `calculateUserPreferenceVector(supabase, userId)` — returns null if < 3 ratings
3. If null → return `{ matches: [], ratingCount: N }` (caller hides section)
4. Fetch current strain's terpenes + cannabinoids
5. Extract 9-D vector for current strain via `extractStrainVector()`
6. Fetch all other strains with their vectors
7. Compute `cosineSimilarity(userVec, strainVec)` for each
8. Sort descending, take top-5 where score > 0
9. Return enriched strain data (name, slug, score)

### Response

```json
{
  "data": {
    "matches": [
      { "strainId": "uuid", "strainName": "Gorilla Glue", "strainSlug": "gorilla-glue", "score": 87 }
    ],
    "ratingCount": 5
  }
}
```

### Error Handling

- Not authenticated → 401 (section hidden)
- < 3 user ratings → `{ matches: [] }` (section hidden)
- DB error → 500 (section hidden)

---

## 4. Component — `<SimilarStrainsSection>`

**File:** `src/components/strains/SimilarStrainsSection.tsx`

### Props

```typescript
interface SimilarStrainsSectionProps {
  strainId: string;
  strainName: string;
}
```

### Behavior

| State | UI |
|-------|----|
| Loading | 3 skeleton StrainCards |
| < 3 ratings | `return null` (section not rendered) |
| Not logged in | `return null` |
| 0 matches | `return null` |
| Error | `return null` |
| Has matches | Horizontal scroll of StrainCards (max 5) |

### Visibility Condition

```typescript
// Section only renders if:
isLoggedIn && ratingCount >= 3 && matches.length > 0
```

### UI Structure

```
┌──────────────────────────────────────────────────┐
│ 🧬 Chemische Ähnlichkeit                         │
│ Sorten mit ähnlichem Profil                      │
│                                                  │
│ [StrainCard] [StrainCard] [StrainCard] →        │
└──────────────────────────────────────────────────┘
```

- Heading: "Chemische Ähnlichkeit"
- Subheading: "Sorten mit ähnlichem Profil"
- Horizontal scroll on mobile, grid on desktop
- Max 5 cards shown

---

## 5. Placement in StrainDetailPageClient

Added after the ratings section:

```
<RatingsSection />
<SimilarStrainsSection strainId={strain.id} strainName={strain.name} />
```

No changes to existing components — purely additive.

---

## 6. Database

No new tables or columns required. Uses existing:
- `strains` (terpenes, cbg, cbn, thcv)
- `ratings` (user's rated strains)
- `user_strain_relations` (favorites/wishlist for vector weighting)

**Note:** Migration `20260411120000_add_matching_cannabinoids.sql` (adds cbg, cbn, thcv) must be pushed before this feature ships.

---

## 7. Testing Checklist

- [ ] User with < 3 ratings → section hidden
- [ ] User not logged in → section hidden
- [ ] User with 3+ ratings → section shows top matches
- [ ] Score is 0-100 based on cosine similarity
- [ ] Current strain excluded from results
- [ ] Already-rated strains excluded from results
- [ ] Loading skeletons shown during fetch
- [ ] API error → silent fail, section hidden
