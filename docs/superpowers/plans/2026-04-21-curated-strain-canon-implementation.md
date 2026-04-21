# Curated Strain Canon Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a quality-first publication workflow for strains so only complete, self-hosted, reviewed strain cards are visible in GreenLog's public catalog.

**Architecture:** Keep the existing `strains` table as the canonical record and add a publication lifecycle (`draft | review | published | rejected`) plus editorial metadata. Enforce visibility at every public read path, compute completeness in application code for admin review, and update creation/image workflows so imports remain hidden until curated.

**Tech Stack:** Supabase Postgres migrations + pgTAP, Next.js App Router, React, TypeScript, Vitest, Supabase Storage

---

## File Map

### New Files

- `supabase/migrations/20260421090000_add_strain_publication_workflow.sql` — adds publication lifecycle columns, defaults, checks, and backfill
- `supabase/tests/strain_publication_workflow.test.sql` — pgTAP coverage for the new schema behavior
- `src/lib/strains/publication.ts` — canonical publish-gate evaluator and admin-facing completeness helpers
- `src/lib/strains/publication.test.ts` — unit tests for publish-gate evaluation and score calculation
- `src/app/admin/strains/page.tsx` — admin review board for `draft` and `review` strains
- `src/app/api/admin/strains/review/route.ts` — fetch review queue with missing publish requirements
- `src/app/api/admin/strains/[id]/publication/route.ts` — transition a strain between publication states

### Modified Files

- `src/lib/types.ts` — extend `Strain` type with publication/editorial fields
- `src/app/strains/page.tsx` — hide unpublished strains from catalog reads
- `src/app/strains/[slug]/page.tsx` — prevent metadata generation for unpublished public strains
- `src/app/strains/[slug]/StrainDetailPageClient.tsx` — prevent draft/review/rejected leaks on detail view
- `src/app/api/strains/route.ts` — default creates to `draft` and keep admin-only visibility paths explicit
- `src/app/api/strains/[id]/image/route.ts` — persist canonical storage path alongside public image URL
- `src/app/sitemap.ts` — exclude unpublished strains from sitemap generation
- `scripts/kushy-direct-import.mjs` — set imported strains to `draft` and seed source metadata
- `scripts/leafly-full-scraper.mjs` — update only enrichment fields, never auto-publish
- `scripts/scrape-images-only.mjs` — store canonical image path and avoid publication changes

### Existing Files to Read Before Editing

- `src/app/strains/page.tsx`
- `src/app/strains/[slug]/page.tsx`
- `src/app/strains/[slug]/StrainDetailPageClient.tsx`
- `src/app/api/strains/route.ts`
- `src/app/api/strains/[id]/image/route.ts`
- `src/lib/types.ts`

---

### Task 1: Add Publication Workflow Columns in Postgres

**Files:**
- Create: `supabase/migrations/20260421090000_add_strain_publication_workflow.sql`
- Test: `supabase/tests/strain_publication_workflow.test.sql`

- [ ] **Step 1: Write the failing pgTAP test for defaults, checks, and publish prerequisites**

```sql
begin;
select plan(7);

insert into public.strains (
  id,
  name,
  slug,
  type
) values (
  '11111111-1111-1111-1111-111111111111',
  'Canon Draft',
  'canon-draft',
  'hybrid'
);

select is(
  (select publication_status from public.strains where id = '11111111-1111-1111-1111-111111111111'),
  'draft',
  'new strains default to draft'
);

select ok(
  (select quality_score from public.strains where id = '11111111-1111-1111-1111-111111111111') = 0,
  'new strains default quality_score to zero'
);

select throws_ok(
  $$
    insert into public.strains (id, name, slug, type, publication_status)
    values ('22222222-2222-2222-2222-222222222222', 'Bad Status', 'bad-status', 'indica', 'live');
  $$,
  '23514',
  null,
  'publication status check rejects unknown values'
);

update public.strains
set
  description = 'Complete enough for publication',
  thc_min = 18,
  thc_max = 22,
  cbd_min = 0,
  cbd_max = 1,
  terpenes = array['Myrcene', 'Limonene'],
  flavors = array['Citrus'],
  effects = array['Relaxed'],
  image_url = 'https://example.com/storage/v1/object/public/strains-images/canon-draft.webp',
  canonical_image_path = 'strains-images/canon-draft.webp',
  primary_source = 'manual-curation'
where id = '11111111-1111-1111-1111-111111111111';

update public.strains
set publication_status = 'published'
where id = '11111111-1111-1111-1111-111111111111';

select is(
  (select publication_status from public.strains where id = '11111111-1111-1111-1111-111111111111'),
  'published',
  'complete strain can be published'
);

insert into public.strains (
  id,
  name,
  slug,
  type,
  publication_status
) values (
  '33333333-3333-3333-3333-333333333333',
  'Blocked Publish',
  'blocked-publish',
  'sativa',
  'draft'
);

select throws_ok(
  $$
    update public.strains
    set publication_status = 'published'
    where id = '33333333-3333-3333-3333-333333333333';
  $$,
  'P0001',
  'strain publish gate failed',
  'incomplete strain cannot be published'
);

select ok(
  exists(
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'strains'
      and column_name = 'canonical_image_path'
  ),
  'canonical_image_path column exists'
);

select * from finish();
rollback;
```

- [ ] **Step 2: Run the pgTAP test to verify it fails before the migration exists**

Run: `supabase test db --test-file supabase/tests/strain_publication_workflow.test.sql`
Expected: FAIL with missing column or missing constraint/trigger errors

- [ ] **Step 3: Write the migration with columns, defaults, and a trigger-backed publish gate**

```sql
alter table public.strains
  add column if not exists publication_status text not null default 'draft',
  add column if not exists quality_score integer not null default 0,
  add column if not exists primary_source text,
  add column if not exists source_notes text,
  add column if not exists canonical_image_path text,
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewed_by text;

alter table public.strains
  drop constraint if exists strains_publication_status_check;

alter table public.strains
  add constraint strains_publication_status_check
  check (publication_status in ('draft', 'review', 'published', 'rejected'));

update public.strains
set publication_status = 'draft'
where publication_status is distinct from 'published';

create or replace function public.enforce_strain_publish_gate()
returns trigger
language plpgsql
as $$
begin
  if new.publication_status <> 'published' then
    return new;
  end if;

  if new.name is null
     or new.slug is null
     or new.type is null
     or new.description is null
     or coalesce(array_length(new.terpenes, 1), 0) < 2
     or coalesce(array_length(new.flavors, 1), 0) < 1
     or coalesce(array_length(new.effects, 1), 0) < 1
     or (new.thc_min is null and new.thc_max is null and new.avg_thc is null)
     or (new.cbd_min is null and new.cbd_max is null and new.avg_cbd is null)
     or new.image_url is null
     or new.canonical_image_path is null
     or new.primary_source is null then
    raise exception 'strain publish gate failed';
  end if;

  if new.reviewed_at is null then
    new.reviewed_at := now();
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_strain_publish_gate on public.strains;
create trigger trg_enforce_strain_publish_gate
before insert or update on public.strains
for each row
execute function public.enforce_strain_publish_gate();
```

- [ ] **Step 4: Run the pgTAP test to verify the migration passes**

Run: `supabase test db --test-file supabase/tests/strain_publication_workflow.test.sql`
Expected: PASS with `ok` lines for defaults, checks, and publish-gate enforcement

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260421090000_add_strain_publication_workflow.sql supabase/tests/strain_publication_workflow.test.sql
git commit -m "feat: add strain publication workflow schema"
```

---

### Task 2: Add a Canonical Publish-Gate Evaluator in TypeScript

**Files:**
- Create: `src/lib/strains/publication.ts`
- Create: `src/lib/strains/publication.test.ts`
- Modify: `src/lib/types.ts`

- [ ] **Step 1: Write the failing Vitest coverage for completeness and score calculation**

```ts
import { describe, expect, it } from "vitest";
import { getStrainPublicationSnapshot } from "./publication";

describe("getStrainPublicationSnapshot", () => {
  it("reports missing publish requirements for incomplete strains", () => {
    const snapshot = getStrainPublicationSnapshot({
      id: "strain-1",
      name: "Incomplete Dream",
      slug: "incomplete-dream",
      type: "hybrid",
      terpenes: ["Myrcene"],
      flavors: [],
      effects: [],
    });

    expect(snapshot.canPublish).toBe(false);
    expect(snapshot.missing).toEqual([
      "description",
      "thc",
      "cbd",
      "terpenes",
      "flavors",
      "effects",
      "image",
      "source",
    ]);
    expect(snapshot.qualityScore).toBeLessThan(100);
  });

  it("accepts complete strains as publishable", () => {
    const snapshot = getStrainPublicationSnapshot({
      id: "strain-2",
      name: "Canon Dream",
      slug: "canon-dream",
      type: "hybrid",
      description: "Dense flowers with a sweet citrus finish.",
      thc_min: 18,
      thc_max: 22,
      cbd_min: 0,
      cbd_max: 1,
      terpenes: ["Myrcene", "Limonene"],
      flavors: ["Citrus"],
      effects: ["Relaxed"],
      image_url: "https://cdn.example/strains-images/canon-dream.webp",
      canonical_image_path: "strains-images/canon-dream.webp",
      primary_source: "manual-curation",
    });

    expect(snapshot.canPublish).toBe(true);
    expect(snapshot.missing).toEqual([]);
    expect(snapshot.qualityScore).toBe(100);
  });
});
```

- [ ] **Step 2: Run the Vitest file to confirm the helper does not exist yet**

Run: `npm run test -- src/lib/strains/publication.test.ts`
Expected: FAIL with module or export not found

- [ ] **Step 3: Extend `Strain` with publication/editorial fields**

```ts
export type StrainPublicationStatus = "draft" | "review" | "published" | "rejected";

export interface Strain {
  id: string;
  name: string;
  slug: string;
  type: "indica" | "sativa" | "hybrid" | "ruderalis";
  farmer?: string;
  brand?: string;
  manufacturer?: string;
  thc_min?: number;
  thc_max?: number;
  cbd_min?: number;
  cbd_max?: number;
  avg_thc?: number;
  avg_cbd?: number;
  image_url?: string;
  canonical_image_path?: string;
  description?: string;
  terpenes?: string[];
  flavors?: string[];
  effects?: string[];
  publication_status?: StrainPublicationStatus;
  quality_score?: number;
  primary_source?: string;
  source_notes?: string;
  reviewed_by?: string;
  reviewed_at?: string;
}
```

- [ ] **Step 4: Implement the publication helper**

```ts
import { Strain } from "@/lib/types";

export type StrainPublicationRequirement =
  | "description"
  | "thc"
  | "cbd"
  | "terpenes"
  | "flavors"
  | "effects"
  | "image"
  | "source";

export interface StrainPublicationSnapshot {
  canPublish: boolean;
  missing: StrainPublicationRequirement[];
  qualityScore: number;
}

export function getStrainPublicationSnapshot(strain: Partial<Strain>): StrainPublicationSnapshot {
  const missing: StrainPublicationRequirement[] = [];

  if (!strain.description?.trim()) missing.push("description");
  if (strain.avg_thc == null && strain.thc_min == null && strain.thc_max == null) missing.push("thc");
  if (strain.avg_cbd == null && strain.cbd_min == null && strain.cbd_max == null) missing.push("cbd");
  if ((strain.terpenes?.length ?? 0) < 2) missing.push("terpenes");
  if ((strain.flavors?.length ?? 0) < 1) missing.push("flavors");
  if ((strain.effects?.length ?? 0) < 1) missing.push("effects");
  if (!strain.image_url || !strain.canonical_image_path) missing.push("image");
  if (!strain.primary_source?.trim()) missing.push("source");

  const totalChecks = 8;
  const completedChecks = totalChecks - missing.length;

  return {
    canPublish: missing.length === 0,
    missing,
    qualityScore: Math.round((completedChecks / totalChecks) * 100),
  };
}
```

- [ ] **Step 5: Run the Vitest file and then the full targeted type-safe test set**

Run: `npm run test -- src/lib/strains/publication.test.ts src/app/strains/[slug]/page.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/lib/types.ts src/lib/strains/publication.ts src/lib/strains/publication.test.ts
git commit -m "feat: add strain publication evaluator"
```

---

### Task 3: Gate Every Public Strain Read Path to `published`

**Files:**
- Modify: `src/app/strains/page.tsx`
- Modify: `src/app/strains/[slug]/page.tsx`
- Modify: `src/app/strains/[slug]/StrainDetailPageClient.tsx`
- Modify: `src/app/api/strains/route.ts`
- Modify: `src/app/sitemap.ts`
- Test: `src/app/strains/[slug]/page.test.ts`

- [ ] **Step 1: Extend the existing detail-page metadata test to enforce published-only reads**

```ts
it("does not generate public metadata for unpublished strains", async () => {
  createServerSupabaseClientMock.mockResolvedValue({
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: async () => ({
            data: null,
            error: { message: "No rows" },
          }),
        }),
      }),
    }),
  });

  const metadata = await generateMetadata({
    params: Promise.resolve({ slug: "hidden-dream" }),
  });

  expect(metadata.title).toBe("Strain nicht gefunden");
});
```

- [ ] **Step 2: Run the focused test before changing the query**

Run: `npm run test -- src/app/strains/[slug]/page.test.ts`
Expected: FAIL because the current query does not filter by `publication_status`

- [ ] **Step 3: Add `publication_status = 'published'` to every public read path**

```ts
// src/app/strains/page.tsx
let strainsQuery = supabase
  .from("strains")
  .select("*", { count: "exact" })
  .eq("publication_status", "published");

// src/app/strains/[slug]/page.tsx
const { data } = await supabase
  .from("strains")
  .select("name, description, thc_max, farmer")
  .eq("slug", slug)
  .eq("publication_status", "published")
  .single();

// src/app/strains/[slug]/StrainDetailPageClient.tsx
let { data, error } = await supabase
  .from("strains")
  .select(`*`)
  .eq("slug", slug)
  .eq("publication_status", "published")
  .single();

// src/app/api/strains/route.ts
let query = supabase
  .from("strains")
  .select("id, name, slug, type, farmer, thc_min, thc_max, cbd_min, cbd_max, image_url, effects, flavors, description, terpenes, created_at, publication_status")
  .eq("publication_status", "published")
  .range(offset, offset + limit - 1)
  .order("name", { ascending: true });

// src/app/sitemap.ts
const { data: strains } = await supabase
  .from("strains")
  .select("slug, updated_at")
  .eq("publication_status", "published");
```

- [ ] **Step 4: Keep creation API on draft by default**

```ts
const { data: strain, error: strainError } = await supabase
  .from("strains")
  .insert({
    name,
    slug,
    type,
    thc_min: thc_min ?? null,
    thc_max: thc_max ?? null,
    cbd_min: cbd_min ?? null,
    cbd_max: cbd_max ?? null,
    effects: effects ?? null,
    flavors: flavors ?? null,
    description: description ?? null,
    organization_id: organization_id ?? null,
    is_custom: is_custom ?? false,
    source: source ?? "pharmacy",
    created_by: user.id,
    publication_status: "draft",
    primary_source: source ?? "manual-create",
  })
  .select()
  .single();
```

- [ ] **Step 5: Run the targeted tests and a smoke check of the strains page**

Run: `npm run test -- src/app/strains/[slug]/page.test.ts`
Expected: PASS

Run: `npm run lint -- src/app/strains/page.tsx src/app/strains/[slug]/page.tsx src/app/strains/[slug]/StrainDetailPageClient.tsx src/app/api/strains/route.ts src/app/sitemap.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/app/strains/page.tsx src/app/strains/[slug]/page.tsx src/app/strains/[slug]/StrainDetailPageClient.tsx src/app/api/strains/route.ts src/app/sitemap.ts
git commit -m "feat: hide unpublished strains from public reads"
```

---

### Task 4: Build the Admin Review Queue and Publication Transition API

**Files:**
- Create: `src/app/api/admin/strains/review/route.ts`
- Create: `src/app/api/admin/strains/[id]/publication/route.ts`
- Create: `src/app/admin/strains/page.tsx`
- Test: `src/lib/strains/publication.test.ts`

- [ ] **Step 1: Extend the helper test with a review payload use-case**

```ts
it("returns a stable review payload for admin queues", () => {
  const snapshot = getStrainPublicationSnapshot({
    id: "strain-3",
    name: "Queue Dream",
    slug: "queue-dream",
    type: "indica",
    description: "Almost ready",
    thc_max: 24,
    cbd_max: 1,
    terpenes: ["Myrcene", "Limonene"],
    flavors: ["Berry"],
    effects: ["Sleepy"],
    image_url: "https://cdn.example/strains-images/queue-dream.webp",
    canonical_image_path: "strains-images/queue-dream.webp",
    primary_source: "leafly-curation",
  });

  expect(snapshot).toEqual({
    canPublish: true,
    missing: [],
    qualityScore: 100,
  });
});
```

- [ ] **Step 2: Run the helper test before adding admin endpoints**

Run: `npm run test -- src/lib/strains/publication.test.ts`
Expected: PASS, confirming the helper contract is stable before API wiring

- [ ] **Step 3: Create the review-queue API route**

```ts
import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-response";
import { getAuthenticatedClient } from "@/lib/supabase/client";
import { isAppAdmin } from "@/lib/auth";
import { getStrainPublicationSnapshot } from "@/lib/strains/publication";

export async function GET(request: Request) {
  const auth = await authenticateRequest(request, getAuthenticatedClient);
  if (auth instanceof Response) return auth;
  const { user, supabase } = auth;

  if (!isAppAdmin(user.id)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("strains")
    .select("id, name, slug, type, description, thc_min, thc_max, cbd_min, cbd_max, avg_thc, avg_cbd, terpenes, flavors, effects, image_url, canonical_image_path, primary_source, publication_status, quality_score")
    .in("publication_status", ["draft", "review"])
    .order("quality_score", { ascending: false })
    .order("name", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const strains = (data ?? []).map((strain) => ({
    ...strain,
    review: getStrainPublicationSnapshot(strain),
  }));

  return NextResponse.json({ strains });
}
```

- [ ] **Step 4: Create the publication transition API**

```ts
import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-response";
import { getAuthenticatedClient } from "@/lib/supabase/client";
import { isAppAdmin } from "@/lib/auth";
import { getStrainPublicationSnapshot } from "@/lib/strains/publication";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticateRequest(request, getAuthenticatedClient);
  if (auth instanceof Response) return auth;
  const { user, supabase } = auth;

  if (!isAppAdmin(user.id)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const { publication_status, source_notes } = await request.json();

  const { data: strain, error: loadError } = await supabase
    .from("strains")
    .select("id, name, slug, type, description, thc_min, thc_max, cbd_min, cbd_max, avg_thc, avg_cbd, terpenes, flavors, effects, image_url, canonical_image_path, primary_source")
    .eq("id", id)
    .single();

  if (loadError || !strain) {
    return NextResponse.json({ error: "Strain not found" }, { status: 404 });
  }

  const review = getStrainPublicationSnapshot(strain);
  if (publication_status === "published" && !review.canPublish) {
    return NextResponse.json({ error: "Publish gate not satisfied", missing: review.missing }, { status: 400 });
  }

  const { data: updated, error: updateError } = await supabase
    .from("strains")
    .update({
      publication_status,
      source_notes: source_notes ?? null,
      quality_score: review.qualityScore,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("id, publication_status, quality_score, reviewed_by, reviewed_at")
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ strain: updated, review });
}
```

- [ ] **Step 5: Build the minimal admin page**

```tsx
"use client";

import { useEffect, useState } from "react";

interface ReviewRow {
  id: string;
  name: string;
  slug: string;
  publication_status: "draft" | "review";
  quality_score: number;
  review: { canPublish: boolean; missing: string[] };
}

export default function AdminStrainsPage() {
  const [rows, setRows] = useState<ReviewRow[]>([]);

  useEffect(() => {
    fetch("/api/admin/strains/review")
      .then((res) => res.json())
      .then((payload) => setRows(payload.strains ?? []));
  }, []);

  return (
    <main className="p-6">
      <h1 className="text-2xl font-black uppercase">Strain Review Queue</h1>
      <div className="mt-6 grid gap-4">
        {rows.map((row) => (
          <article key={row.id} className="rounded-2xl border border-white/10 p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="font-bold">{row.name}</h2>
                <p className="text-xs text-white/60">{row.slug}</p>
              </div>
              <div className="text-right">
                <p className="text-xs uppercase text-white/50">{row.publication_status}</p>
                <p className="font-bold">{row.quality_score}%</p>
              </div>
            </div>
            <p className="mt-3 text-sm text-white/70">
              Missing: {row.review.missing.length > 0 ? row.review.missing.join(", ") : "ready to publish"}
            </p>
          </article>
        ))}
      </div>
    </main>
  );
}
```

- [ ] **Step 6: Run the targeted tests and lint the admin paths**

Run: `npm run test -- src/lib/strains/publication.test.ts`
Expected: PASS

Run: `npm run lint -- src/app/admin/strains/page.tsx src/app/api/admin/strains/review/route.ts src/app/api/admin/strains/[id]/publication/route.ts`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/app/admin/strains/page.tsx src/app/api/admin/strains/review/route.ts src/app/api/admin/strains/[id]/publication/route.ts src/lib/strains/publication.test.ts
git commit -m "feat: add strain review queue and publication controls"
```

---

### Task 5: Align Image Upload and Import Scripts With the Canon Workflow

**Files:**
- Modify: `src/app/api/strains/[id]/image/route.ts`
- Modify: `scripts/kushy-direct-import.mjs`
- Modify: `scripts/leafly-full-scraper.mjs`
- Modify: `scripts/scrape-images-only.mjs`

- [ ] **Step 1: Write a narrow image-route regression test as a script-level contract note**

```ts
// Add this case to src/lib/strains/publication.test.ts
it("requires canonical_image_path even when image_url exists", () => {
  const snapshot = getStrainPublicationSnapshot({
    name: "URL Only Kush",
    slug: "url-only-kush",
    type: "hybrid",
    description: "Looks complete but image path is missing",
    thc_max: 20,
    cbd_max: 1,
    terpenes: ["Myrcene", "Limonene"],
    flavors: ["Earthy"],
    effects: ["Calm"],
    image_url: "https://cdn.example/url-only-kush.webp",
    primary_source: "manual-curation",
  });

  expect(snapshot.canPublish).toBe(false);
  expect(snapshot.missing).toContain("image");
});
```

- [ ] **Step 2: Run the helper test to lock the image contract**

Run: `npm run test -- src/lib/strains/publication.test.ts`
Expected: PASS

- [ ] **Step 3: Update the image route to persist canonical storage metadata**

```ts
const storagePath = `strains-images/${strainId}.${fileExt}`;

const { error: updateError } = await supabaseAuth
  .from("strains")
  .update({
    image_url: publicUrl,
    canonical_image_path: storagePath,
  })
  .eq("id", strainId);
```

- [ ] **Step 4: Update imports and enrichment scripts so they never auto-publish**

```js
// scripts/kushy-direct-import.mjs
const row = {
  name,
  slug,
  type,
  brand,
  genetics,
  publication_status: "draft",
  primary_source: "kushy-csv",
};

// scripts/leafly-full-scraper.mjs
const fields = {
  description,
  thc_min,
  thc_max,
  cbd_min,
  cbd_max,
  terpenes,
  flavors,
  effects,
  primary_source: existing.primary_source || "leafly-curation",
};

// scripts/scrape-images-only.mjs
await supabase
  .from("strains")
  .update({
    image_url: publicUrl,
    canonical_image_path: storagePath,
  })
  .eq("id", strain.id);
```

- [ ] **Step 5: Run the targeted tests and one dry-run script smoke check**

Run: `npm run test -- src/lib/strains/publication.test.ts`
Expected: PASS

Run: `node scripts/kushy-direct-import.mjs --help`
Expected: existing help/usage output without syntax errors

Run: `node scripts/leafly-full-scraper.mjs --help`
Expected: existing help/usage output without syntax errors

- [ ] **Step 6: Commit**

```bash
git add src/app/api/strains/[id]/image/route.ts scripts/kushy-direct-import.mjs scripts/leafly-full-scraper.mjs scripts/scrape-images-only.mjs src/lib/strains/publication.test.ts
git commit -m "feat: align strain image and import workflows with canon"
```

---

## Self-Review

### Spec coverage

- Publication lifecycle: Task 1, Task 4
- Publish gate thresholds: Task 1, Task 2, Task 4
- Public catalog hidden until published: Task 3
- Self-hosted image requirement: Task 1, Task 5
- Internal review queue: Task 4
- Import is not publication: Task 3, Task 5
- Quality score only as helper: Task 2, Task 4

### Placeholder scan

- No `TODO`, `TBD`, or deferred implementation markers appear in task steps.
- Every code-edit step includes concrete code.
- Every verification step includes exact commands and expected outcomes.

### Type consistency

- Uses one shared status type: `draft | review | published | rejected`
- Uses one shared helper name: `getStrainPublicationSnapshot`
- Uses one canonical storage field name: `canonical_image_path`

