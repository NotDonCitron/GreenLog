# GreenLog Curated Strain Canon Design

Date: 2026-04-21
Status: Approved in conversation, written for review before implementation planning
Scope: Replace the current "large but messy" strain catalog behavior with a quality-first publication model for strain cards

## 1. Goal

GreenLog should not behave like an open dump of partially enriched strains. It should behave like a curated catalog where every visible strain card feels intentional, complete, and visually trustworthy.

The primary product goal is:

1. quality over completeness

Supporting rules confirmed in conversation:

1. incomplete strains must not be shown in the user-facing catalog
2. images must be self-hosted
3. the public catalog should contain only strains that pass a defined publish gate

This design treats the strain problem as an editorial and publication problem, not just an import problem.

## 2. Product Decision

GreenLog will adopt a curated "Strain Canon" model.

Core principle:

1. import is not publication

Imported or auto-enriched strain data can exist in the system, but it is not visible to users until it has been reviewed and promoted into the canon.

This avoids the current failure mode where thousands of weak or inconsistent records degrade the entire catalog UX.

## 3. Publication Model

Each strain will have an explicit publication lifecycle:

1. `draft` — imported or created, incomplete, hidden from all user-facing catalog surfaces
2. `review` — nearly complete, awaiting editorial validation
3. `published` — approved for user-facing display
4. `rejected` — intentionally excluded due to duplication, poor quality, or unusable sourcing

Visibility rule:

1. only `published` strains appear in the public catalog, search, recommendations, and normal strain pickers unless a specific internal/admin workflow opts into draft visibility

The user explicitly chose the stricter path: incomplete strains should be completely hidden rather than shown as partial cards.

## 4. Publish Gate

A strain may be promoted to `published` only when all of the following are true:

1. `name` exists
2. `slug` exists
3. `type` exists
4. `description` exists and is usable for display
5. THC data exists as either a single representative value or a min/max range
6. CBD data exists as either a single representative value or a min/max range
7. at least `2` terpenes exist
8. at least `1` aroma/flavor exists
9. at least `1` effect exists
10. a self-hosted image exists
11. an internal source trail exists
12. the strain is not an obvious duplicate of an existing canon entry

These thresholds are intentionally pragmatic. They are strict enough to prevent weak cards from shipping, but not so strict that good strains remain blocked forever waiting for unnecessary data density.

## 5. Data Model

The existing `strains` table already contains most display-facing fields GreenLog needs, including:

1. `image_url`
2. THC/CBD fields
3. `description`
4. `terpenes`
5. `flavors`
6. `effects`

Because of that, the best near-term move is to extend the existing model instead of replacing it.

### New fields on `strains`

Recommended additions:

1. `publication_status` — enum/text constrained to `draft | review | published | rejected`
2. `quality_score` — numeric helper for internal ranking, never used as a direct publish substitute
3. `primary_source` — short source label for the main editorial source
4. `source_notes` — internal notes about provenance, conflicts, or manual decisions
5. `canonical_image_path` — self-hosted storage path for the approved image asset
6. `reviewed_at` — timestamp of final editorial decision
7. `reviewed_by` — user reference for the reviewer

### Optional but useful helper field

1. `completeness_flags` — JSON or computed structure describing which publish-gate requirements are missing

This field is optional because the same information can also be derived in queries or admin code. It is useful if GreenLog wants a fast admin queue with explicit "why this is blocked" explanations.

### Not recommended for the first iteration

Do not introduce a fully separate `strain_candidates` table in the first pass. That would be the cleanest long-term editorial model, but it is not necessary to solve the immediate product problem. The existing `strains` table can carry the publication lifecycle without forcing a broader refactor.

## 6. Source and Provenance Model

GreenLog needs internal provenance even if that information is not always exposed to end users.

Minimum requirement:

1. every publishable strain must have a recorded primary source and internal notes if enrichment required judgment or merging

Short-term approach:

1. store provenance directly on `strains` through `primary_source` and `source_notes`

Future expansion if needed:

1. add a `strain_sources` table with one-to-many source records for raw URLs, timestamps, licenses, and archived payload metadata

This normalization should be deferred until the editorial workflow is proven. The immediate need is better publication discipline, not source graph complexity.

## 7. Image Strategy

The user explicitly chose self-hosted images. Therefore:

1. no external image hotlinks in the public catalog
2. no publication without an approved local asset
3. the public card always renders GreenLog-controlled media

### Image tiers

GreenLog should support a simple internal image strategy:

1. Tier A — approved authentic asset with clear rights or acceptable internal use basis
2. Tier B — internally generated or art-directed fallback image that is consistent with GreenLog's visual language
3. no Tier C for published strains; if no acceptable image exists, the strain stays unpublished

### Direction

Images should not feel scraped and inconsistent. Even when generated or heavily curated, they should follow one visual system:

1. consistent crop ratio
2. consistent lighting and background treatment
3. no dependence on third-party delivery URLs
4. stable storage path and asset ownership under GreenLog control

## 8. Editorial Workflow

The intended operating model is:

1. import raw strain data into `draft`
2. run enrichment scripts against missing fields
3. acquire or generate a self-hosted image asset
4. compute missing-field/completeness state
5. move strong entries to `review`
6. perform human validation for duplicates, wording quality, and image acceptability
7. publish only after the gate is fully satisfied

This keeps scripts useful without letting scripts define the public product standard.

## 9. Read Path Changes

The current catalog page reads directly from `strains` and assumes those records are displayable.

That assumption must change.

### Required catalog rule

User-facing strain reads should filter to canon entries only:

1. `publication_status = 'published'`

This applies to:

1. `/strains`
2. strain detail pages
3. standard search
4. recommendation surfaces that should not expose hidden catalog entries
5. non-admin strain selectors where the product expectation is "real available catalog"

Internal/admin tools may opt into `draft` and `review` visibility, but that should be explicit and isolated.

## 10. Admin and Review Experience

GreenLog needs a compact review surface rather than broad CRUD sprawl.

Minimum viable admin review board:

1. queue of `draft` and `review` strains
2. visible completeness checklist per record
3. duplicate suspicion indicator
4. image presence and source metadata visibility
5. one-click transitions between `draft`, `review`, `published`, and `rejected`

The admin UI should answer one practical question quickly:

1. what exactly is blocking this strain from publication?

That matters more than building a full CMS.

## 11. Duplicates and Canon Rules

Duplicates are currently part of the mess. Publication logic should define a canon entry clearly.

Recommended canon rules:

1. one published record per canonical strain identity
2. alternative source records or variants should be merged before publication whenever they describe the same end-user strain card
3. duplicate detection should key off normalized name/slug plus human review, not slug uniqueness alone

Automation can help detect likely duplicates, but final canon decisions should stay reviewable by a human.

## 12. Quality Score

`quality_score` is useful, but it must not become a hidden autopublish mechanism.

Use it for:

1. sorting review queues
2. prioritizing enrichment work
3. identifying high-potential strains close to publishable quality

Do not use it for:

1. automatic publication without a publish-gate check

The reason is simple: score can detect presence of fields, but not whether the card actually reads well or looks credible.

## 13. Rollout Strategy

The safest rollout path is incremental.

### Phase 1

1. add publication fields to `strains`
2. default non-reviewed entries to `draft`
3. update public catalog reads to only show `published`

This immediately stops user-facing chaos.

### Phase 2

1. build admin review queue
2. add completeness evaluation
3. support editorial transitions

### Phase 3

1. align import/enrichment scripts with the new gate
2. make image workflow deterministic and self-hosted
3. optionally add richer provenance modeling if operationally needed

## 14. Testing and Validation

Implementation should validate both product correctness and data safety.

Minimum checks:

1. unpublished strains never appear in `/strains`
2. unpublished strains do not leak through search or recommendation endpoints unless explicitly intended for admin use
3. publish gate blocks strains missing image, description, or required metadata
4. admin queue correctly identifies missing publish requirements
5. transitions between statuses are auditable and role-limited
6. image paths point only to GreenLog-controlled storage for published strains

## 15. Deferred Decisions

These questions do not block the architecture and should be deferred until implementation planning:

1. whether `completeness_flags` is persisted or computed on demand
2. whether image generation is AI-first, manual-first, or mixed in the first release
3. whether provenance remains inline on `strains` or moves to a normalized `strain_sources` table later
4. whether organization-scoped strains should ever support their own separate publication model

## 16. Recommended Implementation Direction

The implementation should start with the smallest changes that immediately restore product quality:

1. add publication lifecycle fields to `strains`
2. hide everything except `published` from public catalog reads
3. build a minimal internal review queue
4. update enrichment and image workflows to target the publish gate instead of raw volume

This gives GreenLog a quality-first strain system without forcing a large schema split before the workflow has proven itself.
