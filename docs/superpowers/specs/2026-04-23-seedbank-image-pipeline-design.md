# Design: Seedbank Product Image Pipeline

**Goal:** Source authentic, high-quality seedbank product photos for ~100–200 well-known cannabis strains and upload them directly to MinIO. Remaining ~1,900 strains stay on the clean type-based placeholder.

**Status:** Draft → Approved by phhttps (2026-04-23)

---

## 1. Problem Statement

After migrating from Supabase Storage to self-hosted MinIO, ~2,000 strains lost their images. The current fix uses a single generic cannabis placeholder (`placeholder-hybrid.jpg`) for all missing images. While this prevents broken layouts, it looks repetitive and unprofessional for a strain database.

We need a curated set of **real product photos** for the most popular strains, sourced directly from seedbanks who own the rights to showcase their genetics.

## 2. Target Outcome

| Metric | Target |
|--------|--------|
| Strains with real seedbank photos | 100–200 |
| Image quality | Professional product shots, ≥400×400 px, ≥20 KB |
| Source attribution | Tracked per image (seedbank name, license) |
| Remaining strains | Keep existing clean placeholder (no degradation) |
| MinIO storage impact | ~50–100 MB |

## 3. Architecture

### 3.1 Source Adapters (extend `scripts/lib/seedbank-scraper.mjs`)

Priority order for searching:

| Priority | Source | Search Method | Notes |
|----------|--------|---------------|-------|
| 1 | **Sensi Seeds** | Autocomplete API (`/catalog/searchtermautocomplete?term=`) | Already implemented in codebase |
| 2 | **Royal Queen Seeds** | Site search + HTML scraping | Major EU seedbank, wide catalog |
| 3 | **Barney's Farm** | Site search + HTML scraping | Popular genetics, good imagery |
| 4 | **Dutch Passion** | Site search + HTML scraping | Long-standing bank, consistent photos |
| 5 | **Dinafem** | Site search + HTML scraping | Fallback for Spanish strains |

Each adapter implements:
```typescript
interface SeedbankAdapter {
  name: string;
  search(strainName: string): Promise<SearchResult[]>;
  downloadImage(url: string): Promise<Buffer | null>;
}

interface SearchResult {
  strainName: string;        // normalized name from seedbank
  imageUrl: string;          // direct image URL
  productUrl: string;        // product page for attribution
  confidence: number;        // 0.0–1.0 match score
}
```

### 3.2 Smart Matching

**Normalization pipeline:**
1. Lowercase
2. Remove non-alphanumeric (except spaces/hyphens)
3. Expand common abbreviations: `og` → `og kush`, `gdp` → `granddaddy purple`
4. Remove brand prefixes if embedded: `royal queen seeds —` → ``

**Match scoring:**
- Exact match: 1.0
- Fuzzy Levenshtein distance < 3: 0.8
- Contains token match (e.g., "skunk" in "skunk #1"): 0.6
- No match: skip

**Tie-breaker:** If multiple results with same score, prefer larger image dimensions.

### 3.3 Validation Rules

A downloaded image is accepted only if ALL of these pass:

| Check | Threshold | Rejection Reason |
|-------|-----------|------------------|
| File size | ≥ 20,000 bytes | Thumbnail / icon |
| Magic bytes | JPEG/PNG/WEBP only | Wrong format |
| Dimensions | ≥ 400×400 px (via sharp probe) | Too small |
| Content-type | `image/*` only | HTML error page |
| Duplication | MD5 hash not already in known set | Already have this exact image |

### 3.4 Upload to MinIO

Direct S3-style upload via `@aws-sdk/client-s3` (same pattern as `migrate-images-to-minio.mjs`):

- **Bucket:** `strains`
- **Key:** `{strain-slug}.jpg` (normalized, lowercase, kebab-case)
- **Content-Type:** `image/jpeg` (convert WEBP/PNG → JPEG if needed)
- **Cache-Control:** `public, max-age=31536000, immutable`

### 3.5 Database Update

Update `strains` table per successful upload:

```sql
UPDATE strains
SET
  image_url = '/media/strains/{slug}.jpg',
  canonical_image_path = 'strains/{slug}.jpg',
  image_attribution = jsonb_build_object(
    'source', 'seedbank',
    'author', '{Seedbank Name}',
    'license', 'promotional_use',
    'url', '{product_page_url}'
  )
WHERE slug = '{slug}';
```

## 4. Implementation Plan

### Phase 1: Infrastructure (30 min)
- [ ] Add `sharp` dependency for image validation + format conversion
- [ ] Create `scripts/lib/seedbank-adapters/` directory
- [ ] Refactor existing `seedbank-scraper.mjs` into `sensi-seeds.mjs`

### Phase 2: Adapters (2–3 h)
- [ ] Implement Royal Queen Seeds adapter (search + image extraction)
- [ ] Implement Barney's Farm adapter
- [ ] Implement Dutch Passion adapter
- [ ] Implement Dinafem adapter (optional, time permitting)

### Phase 3: Pipeline Script (1 h)
- [ ] Create `scripts/fetch-seedbank-images.mjs`
- [ ] Integrate adapters with priority fallback
- [ ] Add fuzzy matching + confidence scoring
- [ ] Add validation layer (sharp + MD5 dedup)
- [ ] Add MinIO upload + DB update
- [ ] Add resume/lock-file support (`scripts/.seedbank-image-lock.json`)
- [ ] Rate-limiting: 500 ms between requests per domain

### Phase 4: Test & Run (1 h)
- [ ] Dry-run with 20 strains
- [ ] Verify image quality manually (spot-check 5 images)
- [ ] Full run for all 2,153 strains (background process)
- [ ] Final stats report

## 5. Error Handling

| Scenario | Response |
|----------|----------|
| Seedbank site down / blocked | Log warning, skip to next adapter |
| Rate-limited (429) | Exponential backoff: 5s → 10s → 30s |
| Image too small / invalid | Reject, try next adapter or skip strain |
| MinIO upload fails | Retry once, then log error + skip |
| DB update fails | Log error, do NOT delete MinIO file (idempotent re-run) |

## 6. Attribution & Legal

- All images are sourced from seedbanks' own public product listings
- Attribution stored in `image_attribution` JSONB column
- If a seedbank requests takedown, we can quickly nullify specific `canonical_image_path` entries
- No watermarking or modification of original images (only format conversion to JPEG)

## 7. Rollback Plan

- Lock file tracks every processed strain
- Re-running the script skips already-done strains (`isProcessed()` check)
- If we want to revert a strain to placeholder: `UPDATE strains SET image_url = NULL, canonical_image_path = NULL WHERE slug = '...'`
- MinIO files are immutable with long cache; deleting DB reference is sufficient for rollback

## 8. Success Criteria

- [ ] ≥ 100 strains have real, high-quality seedbank photos
- [ ] Zero broken layouts on `/strains` page
- [ ] All photos load via `/media/strains/{slug}.jpg` in < 500 ms
- [ ] Attribution data present for every real photo
- [ ] Pipeline can be re-run safely (idempotent)

---

**Next step:** Write implementation plan (`writing-plans` skill) and execute.
