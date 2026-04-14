---
name: grow-detail-testing-design
description: Testing architecture for grow-detail timeline, DLI, and plant-limit features
type: design
phase: grow-detail-redesign
created: 2026-04-14
status: approved
---

# Testing Strategy — Grow Detail Features

## Approval

User approved Option B (centralized `tests/` structure) on 2026-04-14.

---

## 1. Architecture Decision

**Centralized layout** — all test files live in `tests/`, co-located with existing `tests/e2e/` and `tests/api/`. This keeps the project structure uniform and makes CI configuration simpler.

| Test Type | Location | Runner | Example |
|-----------|----------|--------|---------|
| Unit | `tests/unit/` | Vitest | `dli-calculator.test.ts` |
| Integration | `tests/integration/` | Vitest | `plant-limit.test.ts` |
| E2E | `tests/e2e/` | Playwright | `timeline.test.ts` |
| API | `tests/api/` | Vitest (supertest-like) | `strains.test.ts` (exists) |

---

## 2. Unit Tests — DLI Rechner

**File:** `tests/unit/dli-calculator.test.ts`

Pure function tests, no mocks needed:
- `calculateDLI(ppfd, hours)` → correct DLI output
- `getQuickPreset('seedling'|'vegetative'|'flowering')` → correct PPFD + hours
- Edge cases: 0 hours → 0 DLI, invalid preset throws

Vitest config already has `@/` alias — no additional setup needed.

---

## 3. Integration Tests — Plant Limit (KCanG)

**File:** `tests/integration/plant-limit.test.ts`

Tests `addPlantAction` behavior at the 3-plant boundary.

Mocks:
- `auth()` from `@clerk/nextjs/server` → returns mock user
- Supabase client → returns configurable plant count

Assertions:
- 0 active plants → action succeeds
- 2 active plants → action succeeds  
- 3 active plants → returns `{ status: 400, error: 'PlantLimitWarning' }`
- 4 active plants → returns error (DB trigger should prevent, but test verifies)

---

## 4. E2E Tests — Timeline Expand + Comment Form

**File:** `tests/e2e/timeline.test.ts`

Playwright tests using existing `@clerk/testing/playwright` globalSetup.

Test steps:
1. Login via Clerk testing token (bypasses Turnstile)
2. Navigate to `/grows/[id]` (need a real grow ID fixture)
3. Find first timeline entry
4. Assert comment form NOT visible (collapsed state)
5. Click expand button
6. Assert comment form IS visible (expanded state)
7. Type comment and submit
8. Assert comment appears in list

**Fixture note:** Requires a grow with at least 1 entry. Will use a seeded test grow or mock data.

---

## 5. Test Scripts (package.json)

```json
{
  "test": "vitest run",
  "test:watch": "vitest",
  "test:e2e": "playwright test",
  "test:e2e:ui": "playwright test --ui",
  "test:all": "vitest run && playwright test"
}
```

---

## 6. Environment / CI Notes

- Vitest reads `.env.test` (if present) — no real DB connections
- Playwright globalSetup already handles Clerk token injection
- E2E tests run AFTER `npm run build` (local dev server on port 3000)
- No Turnstile keys needed in env — `clerkSetup()` handles that