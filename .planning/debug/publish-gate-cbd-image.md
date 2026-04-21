---
name: publish-gate-cbd-image
description: Debug publish gate showing 'cbd, image missing' when trying to publish strain
status: investigating
trigger: "Publish gate not satisfied Fehlend: cbd, image kommt wenn man bei eine strain publishen will"
created: 2026-04-21
updated: 2026-04-21
symptoms:
  expected: Strain publishes successfully
  actual: Gate shows 'cbd, image missing' message and blocks publishing
  timeline: "Never worked - this is a new feature or hasn't been completed"
  error: "Fehlend: cbd, image" (German: missing cbd, image)
---

# Publish Gate CBD/Image Missing — Debug Session

## Evidence
- **src/lib/strains/publication.ts:26** — `avg_cbd` is checked but does NOT exist in the strains table schema (only `cbd_min`, `cbd_max` exist)
- **src/lib/strains/publication.ts:30** — `canonical_image_path` is checked, but this is a brand-new column added via migration `add_strain_publication_fields.sql` — existing strains have NULL values
- **supabase-schema.sql:344-345** — `cbd_min`, `cbd_max` exist; `avg_cbd`, `avg_thc` do NOT exist
- **add_strain_publication_fields.sql** — migration adds `canonical_image_path` and `primary_source` columns with no data backfill for existing strains

## Root Cause
Two issues:
1. `publication.ts` checks for `avg_cbd`/`avg_thc` but these columns don't exist in the schema — SELECT returns null, causing false "missing cbd" failures even when `cbd_min`/`cbd_max` are populated
2. `canonical_image_path` was added via migration but no backfill happened — existing strains have NULL there, always triggering the "image" gate failure

## Fix
1. In `getStrainPublicationSnapshot()`: change `avg_cbd == null` check to only check `cbd_min`/`cbd_max` (remove `avg_cbd`/`avg_thc` references)
2. Alternatively: add `avg_cbd`/`avg_thc` columns to the schema and populate them
3. For `canonical_image_path`: either backfill existing strains with their `image_url` value, or make the publish gate only require `image_url` (not both fields)
