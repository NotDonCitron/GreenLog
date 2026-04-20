# Quick Log Wirkprofil Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a 20-second private-first Quick Log for strain experiences, with stars, public-safe effect chips, private side effects/status/notes, and optional public short reviews.

**Architecture:** Keep privacy rules in a small shared domain module, persist sensitive Quick Log data on `consumption_logs`, and keep public review data on `ratings`/`user_activities` using the existing public-profile pipeline. Extract the current inline Tasting Log modal from `StrainDetailPageClient` into a focused component so the strain page owns data loading and the modal owns the Quick Log form.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Supabase, Vitest, Testing Library.

---

## File Structure

- Create `src/lib/quick-log.ts`: canonical chip/status constants, type guards, validation, and public payload sanitization.
- Create `src/lib/quick-log.test.ts`: unit coverage for allowed public chips and private-field stripping.
- Modify `supabase-schema.sql`: document required `consumption_logs` table and add Quick Log columns with constraints.
- Modify `src/lib/types.ts`: add `QuickLogStatus`, `QuickLogEffectChip`, `QuickLogSideEffect`, and `ConsumptionLogRow`.
- Modify `src/app/api/consumption/route.ts`: accept and validate Quick Log fields on create.
- Modify `src/app/api/consumption/[id]/route.ts`: accept and validate Quick Log fields on edit.
- Create `tests/api/consumption-quick-log.test.ts`: route-level tests for validation and privacy-shaped payloads.
- Create `src/components/strains/quick-log-modal.tsx`: mobile-first 20-second form.
- Create `src/components/strains/quick-log-modal.test.tsx`: component tests for privacy defaults and optional public review flow.
- Modify `src/app/strains/[slug]/StrainDetailPageClient.tsx`: replace inline modal with `QuickLogModal`, keep existing collect/rating behavior through callbacks.
- Modify `src/lib/public-activity.ts`: add a Quick Log public activity builder that never accepts side effects, private notes, dose, batch, pharmacy, setting, or private status.
- Modify `src/lib/public-activity.test.ts`: assert public payloads stay clean.

## Task 1: Quick Log Domain Rules

**Files:**
- Create: `src/lib/quick-log.ts`
- Create: `src/lib/quick-log.test.ts`

- [ ] **Step 1: Write failing tests for canonical options and public sanitization**

Create `src/lib/quick-log.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  PUBLIC_QUICK_LOG_EFFECTS,
  PRIVATE_QUICK_LOG_SIDE_EFFECTS,
  QUICK_LOG_STATUSES,
  isQuickLogEffect,
  sanitizePublicQuickLogPayload,
} from "./quick-log";

describe("quick-log domain rules", () => {
  it("keeps the V1 public effect set small and comparable", () => {
    expect(PUBLIC_QUICK_LOG_EFFECTS.map((effect) => effect.value)).toEqual([
      "ruhe",
      "fokus",
      "schlaf",
      "kreativitaet",
      "appetit",
    ]);
  });

  it("keeps side effects and private status out of public payloads", () => {
    const payload = sanitizePublicQuickLogPayload({
      rating: 4,
      strainSlug: "animal-mints",
      effectChips: ["ruhe", "schlaf", "trocken"],
      publicReviewText: "Abends angenehm ruhig.",
      sideEffects: ["trocken", "kopflastig"],
      privateStatus: "nicht_nochmal",
      privateNote: "0,4g war zu schwer.",
      dose: "0.4g",
      batch: "ABC-123",
      pharmacy: "Private Apotheke",
      setting: "Sofa nach Arbeit",
    });

    expect(payload).toEqual({
      rating: 4,
      strain_slug: "animal-mints",
      effect_chips: ["ruhe", "schlaf"],
      public_review_text: "Abends angenehm ruhig.",
    });
    expect(JSON.stringify(payload)).not.toContain("trocken");
    expect(JSON.stringify(payload)).not.toContain("nicht_nochmal");
    expect(JSON.stringify(payload)).not.toContain("0,4g");
    expect(JSON.stringify(payload)).not.toContain("ABC-123");
    expect(JSON.stringify(payload)).not.toContain("Apotheke");
  });

  it("recognizes only public effect chips as public-safe", () => {
    expect(isQuickLogEffect("ruhe")).toBe(true);
    expect(isQuickLogEffect("trocken")).toBe(false);
    expect(PRIVATE_QUICK_LOG_SIDE_EFFECTS.map((effect) => effect.value)).toContain("trocken");
    expect(QUICK_LOG_STATUSES.map((status) => status.value)).toEqual(["nochmal", "situativ", "nicht_nochmal"]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm test -- src/lib/quick-log.test.ts
```

Expected: FAIL because `src/lib/quick-log.ts` does not exist.

- [ ] **Step 3: Implement domain module**

Create `src/lib/quick-log.ts`:

```ts
export const PUBLIC_QUICK_LOG_EFFECTS = [
  { value: "ruhe", label: "Ruhe" },
  { value: "fokus", label: "Fokus" },
  { value: "schlaf", label: "Schlaf" },
  { value: "kreativitaet", label: "Kreativität" },
  { value: "appetit", label: "Appetit" },
] as const;

export const PRIVATE_QUICK_LOG_SIDE_EFFECTS = [
  { value: "trocken", label: "Trocken" },
  { value: "unruhig", label: "Unruhig" },
  { value: "kopflastig", label: "Kopflastig" },
  { value: "couchlock", label: "Couchlock" },
] as const;

export const QUICK_LOG_STATUSES = [
  { value: "nochmal", label: "Nochmal" },
  { value: "situativ", label: "Situativ" },
  { value: "nicht_nochmal", label: "Nicht nochmal" },
] as const;

export type QuickLogEffectChip = (typeof PUBLIC_QUICK_LOG_EFFECTS)[number]["value"];
export type QuickLogSideEffect = (typeof PRIVATE_QUICK_LOG_SIDE_EFFECTS)[number]["value"];
export type QuickLogStatus = (typeof QUICK_LOG_STATUSES)[number]["value"];

const PUBLIC_EFFECT_VALUES = new Set<string>(PUBLIC_QUICK_LOG_EFFECTS.map((effect) => effect.value));
const PRIVATE_SIDE_EFFECT_VALUES = new Set<string>(PRIVATE_QUICK_LOG_SIDE_EFFECTS.map((effect) => effect.value));
const STATUS_VALUES = new Set<string>(QUICK_LOG_STATUSES.map((status) => status.value));

export function isQuickLogEffect(value: unknown): value is QuickLogEffectChip {
  return typeof value === "string" && PUBLIC_EFFECT_VALUES.has(value);
}

export function isQuickLogSideEffect(value: unknown): value is QuickLogSideEffect {
  return typeof value === "string" && PRIVATE_SIDE_EFFECT_VALUES.has(value);
}

export function isQuickLogStatus(value: unknown): value is QuickLogStatus {
  return typeof value === "string" && STATUS_VALUES.has(value);
}

export function normalizeQuickLogEffects(values: unknown): QuickLogEffectChip[] {
  if (!Array.isArray(values)) return [];
  return [...new Set(values.filter(isQuickLogEffect))];
}

export function normalizeQuickLogSideEffects(values: unknown): QuickLogSideEffect[] {
  if (!Array.isArray(values)) return [];
  return [...new Set(values.filter(isQuickLogSideEffect))];
}

type PublicQuickLogInput = {
  rating: number;
  strainSlug: string;
  effectChips: unknown;
  publicReviewText?: string | null;
  sideEffects?: unknown;
  privateStatus?: unknown;
  privateNote?: unknown;
  dose?: unknown;
  batch?: unknown;
  pharmacy?: unknown;
  setting?: unknown;
};

export function sanitizePublicQuickLogPayload(input: PublicQuickLogInput) {
  const review = input.publicReviewText?.trim() || null;

  return {
    rating: Number(input.rating.toFixed(1)),
    strain_slug: input.strainSlug,
    effect_chips: normalizeQuickLogEffects(input.effectChips),
    public_review_text: review,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
npm test -- src/lib/quick-log.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/quick-log.ts src/lib/quick-log.test.ts
git commit -m "feat: add quick log domain rules"
```

## Task 2: Schema and Shared Types

**Files:**
- Modify: `supabase-schema.sql`
- Modify: `src/lib/types.ts`

- [ ] **Step 1: Add schema contract for Quick Log fields**

Modify `supabase-schema.sql` immediately after the ratings policies and before the `-- 9. GROWS (Grow-Tagebuch)` heading by adding:

```sql
-- =============================================
-- 8a. CONSUMPTION LOGS (Private Quick Logs)
-- =============================================
CREATE TABLE IF NOT EXISTS consumption_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  strain_id UUID REFERENCES strains(id) ON DELETE SET NULL,
  consumption_method TEXT CHECK (consumption_method IN ('vaporizer', 'joint', 'bong', 'pipe', 'edible', 'oil', 'topical', 'other')) NOT NULL,
  amount_grams DECIMAL(6,3),
  subjective_notes TEXT,
  mood_before TEXT,
  mood_after TEXT,
  consumed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  effect_chips TEXT[] NOT NULL DEFAULT '{}',
  side_effects TEXT[] NOT NULL DEFAULT '{}',
  overall_rating SMALLINT CHECK (overall_rating BETWEEN 1 AND 5),
  private_status TEXT CHECK (private_status IN ('nochmal', 'situativ', 'nicht_nochmal')),
  private_note TEXT,
  setting_context TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE consumption_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own consumption logs" ON consumption_logs;
CREATE POLICY "Users can view own consumption logs"
  ON consumption_logs FOR SELECT USING (requesting_user_id() = user_id);

DROP POLICY IF EXISTS "Users can create own consumption logs" ON consumption_logs;
CREATE POLICY "Users can create own consumption logs"
  ON consumption_logs FOR INSERT WITH CHECK (requesting_user_id() = user_id);

DROP POLICY IF EXISTS "Users can update own consumption logs" ON consumption_logs;
CREATE POLICY "Users can update own consumption logs"
  ON consumption_logs FOR UPDATE USING (requesting_user_id() = user_id);

DROP POLICY IF EXISTS "Users can delete own consumption logs" ON consumption_logs;
CREATE POLICY "Users can delete own consumption logs"
  ON consumption_logs FOR DELETE USING (requesting_user_id() = user_id);

ALTER TABLE consumption_logs
  ADD COLUMN IF NOT EXISTS effect_chips TEXT[] NOT NULL DEFAULT '{}';

ALTER TABLE consumption_logs
  ADD COLUMN IF NOT EXISTS side_effects TEXT[] NOT NULL DEFAULT '{}';

ALTER TABLE consumption_logs
  ADD COLUMN IF NOT EXISTS overall_rating SMALLINT CHECK (overall_rating BETWEEN 1 AND 5);

ALTER TABLE consumption_logs
  ADD COLUMN IF NOT EXISTS private_status TEXT CHECK (private_status IN ('nochmal', 'situativ', 'nicht_nochmal'));

ALTER TABLE consumption_logs
  ADD COLUMN IF NOT EXISTS private_note TEXT;

ALTER TABLE consumption_logs
  ADD COLUMN IF NOT EXISTS setting_context TEXT;

CREATE INDEX IF NOT EXISTS idx_consumption_logs_user_time
  ON consumption_logs(user_id, consumed_at DESC);

CREATE INDEX IF NOT EXISTS idx_consumption_logs_strain_user
  ON consumption_logs(strain_id, user_id);
```

- [ ] **Step 2: Extend shared types**

Modify `src/lib/types.ts` by importing or mirroring the Quick Log types near the existing `RatingRow`, then add:

```ts
export type QuickLogEffectChip = "ruhe" | "fokus" | "schlaf" | "kreativitaet" | "appetit";
export type QuickLogSideEffect = "trocken" | "unruhig" | "kopflastig" | "couchlock";
export type QuickLogStatus = "nochmal" | "situativ" | "nicht_nochmal";

export interface ConsumptionLogRow {
  id: string;
  user_id: string;
  strain_id: string | null;
  consumption_method: "vaporizer" | "joint" | "bong" | "pipe" | "edible" | "oil" | "topical" | "other";
  amount_grams: number | null;
  subjective_notes: string | null;
  mood_before: string | null;
  mood_after: string | null;
  consumed_at: string;
  effect_chips: QuickLogEffectChip[];
  side_effects: QuickLogSideEffect[];
  overall_rating: number | null;
  private_status: QuickLogStatus | null;
  private_note: string | null;
  setting_context: string | null;
  created_at: string;
  updated_at: string;
}
```

- [ ] **Step 3: Run type check through lint**

Run:

```bash
npm run lint
```

Expected: PASS or existing unrelated lint warnings only. Do not change unrelated files.

- [ ] **Step 4: Commit**

```bash
git add supabase-schema.sql src/lib/types.ts
git commit -m "feat: add quick log schema fields"
```

## Task 3: Consumption API Validation

**Files:**
- Modify: `src/app/api/consumption/route.ts`
- Modify: `src/app/api/consumption/[id]/route.ts`
- Create: `tests/api/consumption-quick-log.test.ts`

- [ ] **Step 1: Write route tests for private fields**

Create `tests/api/consumption-quick-log.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "../../src/app/api/consumption/route";

const insertMock = vi.fn();
const selectMock = vi.fn();
const singleMock = vi.fn();

vi.mock("../../src/lib/api-response", async () => {
  const actual = await vi.importActual<typeof import("../../src/lib/api-response")>("../../src/lib/api-response");
  return {
    ...actual,
    authenticateRequest: vi.fn(async () => ({
      user: { id: "user-1" },
      supabase: {
        from: vi.fn(() => ({
          insert: insertMock,
        })),
      },
    })),
  };
});

vi.mock("../../src/lib/supabase/client", () => ({
  getAuthenticatedClient: vi.fn(),
}));

describe("POST /api/consumption quick log fields", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    singleMock.mockResolvedValue({
      data: { id: "log-1" },
      error: null,
    });
    selectMock.mockReturnValue({ single: singleMock });
    insertMock.mockReturnValue({ select: selectMock });
  });

  it("persists allowed quick log private fields", async () => {
    const response = await POST(
      new Request("http://localhost/api/consumption", {
        method: "POST",
        body: JSON.stringify({
          strain_id: "11111111-1111-1111-1111-111111111111",
          consumption_method: "vaporizer",
          amount_grams: 0.2,
          consumed_at: "2026-04-20T20:00:00.000Z",
          effect_chips: ["ruhe", "schlaf"],
          side_effects: ["trocken"],
          overall_rating: 4,
          private_status: "nicht_nochmal",
          private_note: "0,4g war zu schwer.",
          setting_context: "abends sofa",
        }),
      }),
    );

    expect(response.status).toBe(201);
    expect(insertMock).toHaveBeenCalledWith({
      strain_id: "11111111-1111-1111-1111-111111111111",
      consumption_method: "vaporizer",
      amount_grams: 0.2,
      subjective_notes: null,
      mood_before: null,
      mood_after: null,
      consumed_at: "2026-04-20T20:00:00.000Z",
      effect_chips: ["ruhe", "schlaf"],
      side_effects: ["trocken"],
      overall_rating: 4,
      private_status: "nicht_nochmal",
      private_note: "0,4g war zu schwer.",
      setting_context: "abends sofa",
    });
  });

  it("rejects side effects submitted as public effect chips", async () => {
    const response = await POST(
      new Request("http://localhost/api/consumption", {
        method: "POST",
        body: JSON.stringify({
          consumption_method: "vaporizer",
          consumed_at: "2026-04-20T20:00:00.000Z",
          effect_chips: ["ruhe", "trocken"],
        }),
      }),
    );

    expect(response.status).toBe(400);
    expect(insertMock).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm test -- tests/api/consumption-quick-log.test.ts
```

Expected: FAIL because the API does not validate or persist the new fields.

- [ ] **Step 3: Update POST validation**

Modify `src/app/api/consumption/route.ts` imports:

```ts
import {
  isQuickLogStatus,
  normalizeQuickLogEffects,
  normalizeQuickLogSideEffects,
} from '@/lib/quick-log';
```

Inside `POST`, include these fields from `await request.json()`:

```ts
    effect_chips,
    side_effects,
    overall_rating,
    private_status,
    private_note,
    setting_context,
```

Before insert, add:

```ts
  const normalizedEffects = normalizeQuickLogEffects(effect_chips);
  if (Array.isArray(effect_chips) && normalizedEffects.length !== effect_chips.length) {
    return jsonError('effect_chips contains unsupported values', 400);
  }

  const normalizedSideEffects = normalizeQuickLogSideEffects(side_effects);
  if (Array.isArray(side_effects) && normalizedSideEffects.length !== side_effects.length) {
    return jsonError('side_effects contains unsupported values', 400);
  }

  if (overall_rating !== undefined && overall_rating !== null) {
    if (!Number.isInteger(overall_rating) || overall_rating < 1 || overall_rating > 5) {
      return jsonError('overall_rating must be an integer between 1 and 5', 400);
    }
  }

  if (private_status !== undefined && private_status !== null && !isQuickLogStatus(private_status)) {
    return jsonError('private_status is invalid', 400);
  }
```

Extend the insert payload:

```ts
      effect_chips: normalizedEffects,
      side_effects: normalizedSideEffects,
      overall_rating: overall_rating ?? null,
      private_status: private_status || null,
      private_note: private_note?.trim() || null,
      setting_context: setting_context?.trim() || null,
```

- [ ] **Step 4: Update PATCH allowed fields with the same validation**

Modify `src/app/api/consumption/[id]/route.ts` imports:

```ts
import {
  isQuickLogStatus,
  normalizeQuickLogEffects,
  normalizeQuickLogSideEffects,
} from '@/lib/quick-log';
```

Add the new field names to `allowedFields`:

```ts
    'effect_chips', 'side_effects', 'overall_rating',
    'private_status', 'private_note', 'setting_context'
```

Inside the field loop, handle new fields:

```ts
      if (field === 'consumed_at') {
        updates[field] = new Date(body[field]).toISOString();
      } else if (field === 'effect_chips') {
        const normalized = normalizeQuickLogEffects(body[field]);
        if (!Array.isArray(body[field]) || normalized.length !== body[field].length) {
          return jsonError('effect_chips contains unsupported values', 400);
        }
        updates[field] = normalized;
      } else if (field === 'side_effects') {
        const normalized = normalizeQuickLogSideEffects(body[field]);
        if (!Array.isArray(body[field]) || normalized.length !== body[field].length) {
          return jsonError('side_effects contains unsupported values', 400);
        }
        updates[field] = normalized;
      } else if (field === 'overall_rating') {
        if (body[field] !== null && (!Number.isInteger(body[field]) || body[field] < 1 || body[field] > 5)) {
          return jsonError('overall_rating must be an integer between 1 and 5', 400);
        }
        updates[field] = body[field];
      } else if (field === 'private_status') {
        if (body[field] !== null && !isQuickLogStatus(body[field])) {
          return jsonError('private_status is invalid', 400);
        }
        updates[field] = body[field];
      } else if (field === 'private_note' || field === 'setting_context') {
        updates[field] = body[field]?.trim() || null;
      } else {
        updates[field] = body[field];
      }
```

- [ ] **Step 5: Run API tests**

Run:

```bash
npm test -- tests/api/consumption-quick-log.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/consumption/route.ts src/app/api/consumption/[id]/route.ts tests/api/consumption-quick-log.test.ts
git commit -m "feat: validate quick log consumption fields"
```

## Task 4: Public Activity Payload

**Files:**
- Modify: `src/lib/public-activity.ts`
- Modify: `src/lib/public-activity.test.ts`

- [ ] **Step 1: Add failing public payload test**

Modify the import in `src/lib/public-activity.test.ts` from:

```ts
import { buildPublicRatingActivityPayload } from "./public-activity";
```

to:

```ts
import { buildPublicQuickLogActivityPayload, buildPublicRatingActivityPayload } from "./public-activity";
```

Then add this test inside the existing `describe("public activity payloads", () => { ... })` block:

```ts
it("builds public quick log payloads without private quick log fields", () => {
  const payload = buildPublicQuickLogActivityPayload({
    rating: 4,
    strainSlug: "animal-mints",
    effectChips: ["ruhe", "schlaf", "trocken"],
    publicReviewText: "Abends angenehm ruhig.",
    sideEffects: ["trocken"],
    privateStatus: "nicht_nochmal",
    privateNote: "0,4g war zu schwer.",
    dose: "0.4g",
    batch: "ABC-123",
    pharmacy: "Private Apotheke",
    setting: "Sofa",
  });

  expect(payload).toEqual({
    rating: 4,
    strain_slug: "animal-mints",
    effect_chips: ["ruhe", "schlaf"],
    public_review_text: "Abends angenehm ruhig.",
  });
  expect(JSON.stringify(payload)).not.toContain("trocken");
  expect(JSON.stringify(payload)).not.toContain("nicht_nochmal");
  expect(JSON.stringify(payload)).not.toContain("ABC-123");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm test -- src/lib/public-activity.test.ts
```

Expected: FAIL because `buildPublicQuickLogActivityPayload` does not exist.

- [ ] **Step 3: Implement builder**

Modify `src/lib/public-activity.ts`:

```ts
import { sanitizePublicQuickLogPayload } from "./quick-log";
```

Add:

```ts
type PublicQuickLogActivityInput = {
  rating: number;
  strainSlug: string;
  effectChips: unknown;
  publicReviewText?: string | null;
  sideEffects?: unknown;
  privateStatus?: unknown;
  privateNote?: unknown;
  dose?: unknown;
  batch?: unknown;
  pharmacy?: unknown;
  setting?: unknown;
};

export function buildPublicQuickLogActivityPayload(input: PublicQuickLogActivityInput) {
  return sanitizePublicQuickLogPayload(input);
}
```

- [ ] **Step 4: Run test**

Run:

```bash
npm test -- src/lib/public-activity.test.ts src/lib/quick-log.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/public-activity.ts src/lib/public-activity.test.ts
git commit -m "feat: sanitize public quick log activity"
```

## Task 5: Quick Log Modal Component

**Files:**
- Create: `src/components/strains/quick-log-modal.tsx`
- Create: `src/components/strains/quick-log-modal.test.tsx`

- [ ] **Step 1: Write component tests**

Create `src/components/strains/quick-log-modal.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { QuickLogModal } from "./quick-log-modal";

const baseProps = {
  open: true,
  strainName: "Animal Mints",
  isSaving: false,
  onClose: vi.fn(),
  onSave: vi.fn(),
};

describe("QuickLogModal", () => {
  it("renders a fast private-first quick log", () => {
    render(<QuickLogModal {...baseProps} />);

    expect(screen.getByText("Quick Log")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ruhe" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Trocken" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Nicht nochmal" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "+ Private Notiz" })).toBeInTheDocument();
    expect(screen.getByText(/Nebenwirkungen bleiben privat/i)).toBeInTheDocument();
  });

  it("sends public review data only when the optional public step is enabled", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<QuickLogModal {...baseProps} onSave={onSave} />);

    await user.click(screen.getByRole("button", { name: "Ruhe" }));
    await user.click(screen.getByRole("button", { name: "Trocken" }));
    await user.click(screen.getByRole("button", { name: "Nicht nochmal" }));
    await user.click(screen.getByRole("button", { name: "4 Sterne" }));
    await user.click(screen.getByRole("button", { name: "+ Öffentlichen Kurzreview hinzufügen" }));
    await user.type(screen.getByLabelText("Öffentlicher Kurzreview"), "Abends angenehm ruhig.");
    await user.click(screen.getByRole("button", { name: "Save Log" }));

    expect(onSave).toHaveBeenCalledWith({
      effectChips: ["ruhe"],
      sideEffects: ["trocken"],
      overallRating: 4,
      privateStatus: "nicht_nochmal",
      privateNote: "",
      settingContext: "",
      isPublic: true,
      publicReviewText: "Abends angenehm ruhig.",
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm test -- src/components/strains/quick-log-modal.test.tsx
```

Expected: FAIL because `QuickLogModal` does not exist.

- [ ] **Step 3: Implement component**

Create `src/components/strains/quick-log-modal.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Loader2, Star } from "lucide-react";
import { Card } from "@/components/ui/card";
import {
  PRIVATE_QUICK_LOG_SIDE_EFFECTS,
  PUBLIC_QUICK_LOG_EFFECTS,
  QUICK_LOG_STATUSES,
  QuickLogEffectChip,
  QuickLogSideEffect,
  QuickLogStatus,
} from "@/lib/quick-log";

export type QuickLogSaveInput = {
  effectChips: QuickLogEffectChip[];
  sideEffects: QuickLogSideEffect[];
  overallRating: number;
  privateStatus: QuickLogStatus | null;
  privateNote: string;
  settingContext: string;
  isPublic: boolean;
  publicReviewText: string;
};

type QuickLogModalProps = {
  open: boolean;
  strainName: string;
  isSaving: boolean;
  onClose: () => void;
  onSave: (input: QuickLogSaveInput) => void;
};

function toggleValue<T extends string>(values: T[], value: T) {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

export function QuickLogModal({ open, strainName, isSaving, onClose, onSave }: QuickLogModalProps) {
  const [effectChips, setEffectChips] = useState<QuickLogEffectChip[]>([]);
  const [sideEffects, setSideEffects] = useState<QuickLogSideEffect[]>([]);
  const [overallRating, setOverallRating] = useState(4);
  const [privateStatus, setPrivateStatus] = useState<QuickLogStatus | null>(null);
  const [showPrivateNote, setShowPrivateNote] = useState(false);
  const [privateNote, setPrivateNote] = useState("");
  const [settingContext, setSettingContext] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [publicReviewText, setPublicReviewText] = useState("");

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center p-0 sm:items-center sm:p-6">
      <button aria-label="Close quick log" className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />
      <Card className="relative max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-t-3xl border border-[var(--border)]/50 bg-[var(--card)] p-6 pb-12 shadow-2xl sm:rounded-3xl sm:p-8">
        <div className="space-y-6">
          <div className="text-center">
            <p className="text-[10px] font-black uppercase tracking-widest text-[var(--muted-foreground)]">{strainName}</p>
            <h2 className="font-display text-2xl font-black uppercase italic text-[#00F5FF]">Quick Log</h2>
          </div>

          <section className="space-y-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-[var(--muted-foreground)]">Wirkt bei mir</p>
            <div className="flex flex-wrap gap-2">
              {PUBLIC_QUICK_LOG_EFFECTS.map((effect) => (
                <button
                  key={effect.value}
                  type="button"
                  onClick={() => setEffectChips((current) => toggleValue(current, effect.value))}
                  className={`rounded-lg border px-3 py-2 text-xs font-bold ${effectChips.includes(effect.value) ? "border-[#2FF801] bg-[#2FF801]/10 text-[#2FF801]" : "border-[var(--border)]/50 bg-[var(--input)]"}`}
                >
                  {effect.label}
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-[var(--muted-foreground)]">Nebenwirkungen bleiben privat</p>
            <div className="flex flex-wrap gap-2">
              {PRIVATE_QUICK_LOG_SIDE_EFFECTS.map((effect) => (
                <button
                  key={effect.value}
                  type="button"
                  onClick={() => setSideEffects((current) => toggleValue(current, effect.value))}
                  className={`rounded-lg border px-3 py-2 text-xs font-bold ${sideEffects.includes(effect.value) ? "border-orange-400 bg-orange-400/10 text-orange-300" : "border-[var(--border)]/50 bg-[var(--input)]"}`}
                >
                  {effect.label}
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-[var(--muted-foreground)]">Gesamt für dich</p>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button key={star} type="button" aria-label={`${star} Sterne`} onClick={() => setOverallRating(star)}>
                  <Star size={26} className={overallRating >= star ? "fill-[#ffd700] text-[#ffd700]" : "text-[#484849]"} />
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-[var(--muted-foreground)]">Privater Status</p>
            <div className="grid grid-cols-3 gap-2">
              {QUICK_LOG_STATUSES.map((status) => (
                <button
                  key={status.value}
                  type="button"
                  onClick={() => setPrivateStatus(status.value)}
                  className={`rounded-lg border px-2 py-2 text-xs font-bold ${privateStatus === status.value ? "border-[#00F5FF] bg-[#00F5FF]/10 text-[#00F5FF]" : "border-[var(--border)]/50 bg-[var(--input)]"}`}
                >
                  {status.label}
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <button type="button" className="text-xs font-black uppercase text-[#00F5FF]" onClick={() => setShowPrivateNote((value) => !value)}>
              + Private Notiz
            </button>
            {showPrivateNote && (
              <div className="space-y-3">
                <textarea value={privateNote} onChange={(event) => setPrivateNote(event.target.value)} placeholder="Nur für dich sichtbar" className="min-h-24 w-full rounded-lg border border-[var(--border)]/50 bg-[var(--input)] p-3 text-sm" />
                <input value={settingContext} onChange={(event) => setSettingContext(event.target.value)} placeholder="Setting, z.B. abends sofa" className="w-full rounded-lg border border-[var(--border)]/50 bg-[var(--input)] p-3 text-sm" />
              </div>
            )}
          </section>

          <section className="rounded-lg border border-[#00F5FF]/20 bg-[#00F5FF]/5 p-3">
            <button type="button" className="text-left text-xs font-black uppercase text-[var(--foreground)]" onClick={() => setIsPublic((value) => !value)}>
              + Öffentlichen Kurzreview hinzufügen
            </button>
            {isPublic && (
              <div className="mt-3 space-y-2">
                <label htmlFor="public-review" className="block text-[10px] font-black uppercase tracking-widest text-[var(--muted-foreground)]">Öffentlicher Kurzreview</label>
                <textarea id="public-review" value={publicReviewText} onChange={(event) => setPublicReviewText(event.target.value)} className="min-h-20 w-full rounded-lg border border-[var(--border)]/50 bg-[var(--input)] p-3 text-sm" />
                <p className="text-[10px] text-[var(--muted-foreground)]">Öffentlich: Sterne, Wirkchips, Kurzreview. Privat: Nebenwirkungen, Status, Notiz, Dosis, Charge.</p>
              </div>
            )}
          </section>

          <button
            type="button"
            onClick={() => onSave({ effectChips, sideEffects, overallRating, privateStatus, privateNote, settingContext, isPublic, publicReviewText })}
            disabled={isSaving}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-lg bg-[#00F5FF] font-black uppercase text-black"
          >
            {isSaving ? <Loader2 className="animate-spin" /> : "Save Log"}
          </button>
        </div>
      </Card>
    </div>
  );
}
```

- [ ] **Step 4: Run component test**

Run:

```bash
npm test -- src/components/strains/quick-log-modal.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/strains/quick-log-modal.tsx src/components/strains/quick-log-modal.test.tsx
git commit -m "feat: add quick log modal"
```

## Task 6: Strain Detail Integration

**Files:**
- Modify: `src/app/strains/[slug]/StrainDetailPageClient.tsx`

- [ ] **Step 1: Import the modal and payload builder**

Modify imports:

```ts
import { QuickLogModal, QuickLogSaveInput } from "@/components/strains/quick-log-modal";
import { buildPublicQuickLogActivityPayload } from "@/lib/public-activity";
```

Remove unused inline-modal state after integration:

```ts
const [isRatingPublic, setIsRatingPublic] = useState(false);
const [ratings, setRatings] = useState({ taste: 4.5, effect: 4.5, look: 4.5 });
const handleStarClick = ...
```

- [ ] **Step 2: Replace `saveRating` with Quick Log save callback**

Replace the existing `saveRating` function with:

```ts
  const saveQuickLog = async (input: QuickLogSaveInput) => {
    if (!user || !strain || isDemoMode) return;
    setIsSaving(true);
    try {
      const now = new Date().toISOString();

      const { error: logError } = await supabase.from("consumption_logs").insert({
        user_id: user.id,
        strain_id: strain.id,
        consumption_method: "other",
        consumed_at: now,
        effect_chips: input.effectChips,
        side_effects: input.sideEffects,
        overall_rating: input.overallRating,
        private_status: input.privateStatus,
        private_note: input.privateNote.trim() || null,
        setting_context: input.settingContext.trim() || null,
      });

      if (logError) throw logError;

      const { error: ratingError } = await supabase.from("ratings").upsert({
        strain_id: strain.id,
        user_id: user.id,
        overall_rating: input.overallRating,
        taste_rating: null,
        effect_rating: null,
        look_rating: null,
        organization_id: isOrgStrain ? strain.organization_id : null,
        is_public: input.isPublic,
        public_review_text: input.isPublic ? input.publicReviewText.trim() || null : null,
      }, { onConflict: "strain_id,user_id" });

      if (ratingError) throw ratingError;

      const { error: activityDeleteError } = await supabase
        .from("user_activities")
        .delete()
        .eq("user_id", user.id)
        .eq("activity_type", "rating")
        .eq("target_id", strain.id);
      if (activityDeleteError) throw activityDeleteError;

      if (input.isPublic) {
        const publicPayload = buildPublicQuickLogActivityPayload({
          rating: input.overallRating,
          strainSlug: slug as string,
          effectChips: input.effectChips,
          publicReviewText: input.publicReviewText,
          sideEffects: input.sideEffects,
          privateStatus: input.privateStatus,
          privateNote: input.privateNote,
          batch: batchInfo,
          setting: input.settingContext,
        });

        const { error: activityError } = await supabase.from("user_activities").insert({
          user_id: user.id,
          activity_type: "rating",
          target_id: strain.id,
          target_name: strain.name,
          target_image_url: strain.image_url || null,
          metadata: publicPayload,
          public_payload: publicPayload,
          private_payload: {},
          is_public: true,
        });

        if (activityError) throw activityError;
      }

      queryClient.invalidateQueries({ queryKey: strainKeys.detail(slug as string) });
      setShowRatingModal(false);

      await collectAction(strain.id, {
        batchInfo,
        userNotes: input.privateNote,
        userImageUrl: userImageUrl || undefined,
        userThc: (strain as any).avg_thc ?? strain.thc_max ?? undefined,
        userCbd: (strain as any).avg_cbd ?? strain.cbd_max ?? undefined,
      });

      setHasCollected(true);
      toastSuccess("Quick Log gespeichert", {
        label: "Teilen",
        onClick: () => setShowShareModal(true),
      });
    } catch (error: unknown) {
      console.error("Save quick log error:", error);
      toastError("Error: " + getErrorMessage(error, "Quick Log konnte nicht gespeichert werden."));
    } finally {
      setIsSaving(false);
    }
  };
```

- [ ] **Step 3: Replace inline modal JSX**

Replace the whole `{showRatingModal && (...)}` inline block with:

```tsx
      <QuickLogModal
        open={showRatingModal}
        strainName={strain?.name || "Strain"}
        isSaving={isSaving}
        onClose={() => setShowRatingModal(false)}
        onSave={saveQuickLog}
      />
```

Keep:

```tsx
      {!showRatingModal && <BottomNav />}
```

- [ ] **Step 4: Run focused tests and lint**

Run:

```bash
npm test -- src/components/strains/quick-log-modal.test.tsx src/lib/public-activity.test.ts src/lib/quick-log.test.ts
npm run lint
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/strains/[slug]/StrainDetailPageClient.tsx
git commit -m "feat: wire quick log into strain detail"
```

## Task 7: Public Profile Privacy Regression

**Files:**
- Modify: `src/lib/public-profile.test.ts`

- [ ] **Step 1: Add regression assertions**

Append assertions to the existing public profile tests where sanitized ratings are checked:

```ts
expect(JSON.stringify(sanitized)).not.toContain("side_effects");
expect(JSON.stringify(sanitized)).not.toContain("private_status");
expect(JSON.stringify(sanitized)).not.toContain("private_note");
expect(JSON.stringify(sanitized)).not.toContain("setting_context");
```

Add this test to `src/lib/public-profile.test.ts`:

```ts
it("allows public review text and stars without quick log private fields", () => {
  const sanitized = sanitizePublicRating({
    id: "rating-quick-log",
    strain_id: "strain-1",
    overall_rating: 4,
    public_review_text: "Abends angenehm ruhig.",
    created_at: "2026-04-20T20:00:00.000Z",
    strains: { name: "Animal Mints", slug: "animal-mints" },
    dose: "0.4g",
    batch: "ABC-123",
    side_effects: ["trocken"],
    private_status: "nicht_nochmal",
    private_note: "Nicht tagsüber.",
  } as any);

  expect(sanitized).toEqual({
    id: "rating-quick-log",
    strain_id: "strain-1",
    strain_name: "Animal Mints",
    strain_slug: "animal-mints",
    overall_rating: 4,
    public_review_text: "Abends angenehm ruhig.",
    created_at: "2026-04-20T20:00:00.000Z",
  });
});
```

- [ ] **Step 2: Run public profile tests**

Run:

```bash
npm test -- src/lib/public-profile.test.ts tests/api/public-profiles.test.ts
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/lib/public-profile.test.ts
git commit -m "test: cover quick log public privacy"
```

## Task 8: End-to-End Verification

**Files:**
- No code changes unless verification exposes a defect in files touched above.

- [ ] **Step 1: Run full unit test suite**

Run:

```bash
npm test
```

Expected: PASS.

- [ ] **Step 2: Run lint**

Run:

```bash
npm run lint
```

Expected: PASS.

- [ ] **Step 3: Run build**

Run:

```bash
npm run build
```

Expected: PASS.

- [ ] **Step 4: Manual browser check**

Run:

```bash
npm run dev
```

Open a strain detail page and verify:

- `Collect & Rate` opens `Quick Log`.
- The modal is usable on mobile width.
- Selecting `Ruhe`, `Trocken`, `4 Sterne`, and `Nicht nochmal` works.
- `+ Private Notiz` reveals note and setting fields.
- `+ Öffentlichen Kurzreview hinzufügen` reveals only the public review field.
- The public helper text says side effects, status, notes, dose, and charge stay private.
- Saving closes the modal and marks the strain collected.

- [ ] **Step 5: Commit verification fixes if any**

If verification required a fix:

```bash
git add <changed-files>
git commit -m "fix: stabilize quick log flow"
```

If no fixes were needed, do not create an empty commit.

## Self-Review

- Spec coverage: Quick Log, stars, public chips, private side effects, private status, private note, optional public short review, and privacy boundaries are covered in Tasks 1-7.
- Scope: V1 excludes recommendations, sliders, public side-effect stats, automatic ratings from multiple logs, free public chip expansion, and medical claims.
- Privacy: Public payload builders and public profile tests explicitly reject side effects, private status, private note, dose, batch, pharmacy, and setting.
- Type consistency: Domain values use `ruhe`, `fokus`, `schlaf`, `kreativitaet`, `appetit`, `trocken`, `unruhig`, `kopflastig`, `couchlock`, `nochmal`, `situativ`, and `nicht_nochmal` across domain, API, UI, and schema.
