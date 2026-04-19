# Organization Logo And Badge Gallery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show the current organization logo more prominently on organization settings and make the profile badge "Alle" sheet feel like a polished gallery.

**Architecture:** Keep all data flows unchanged. Update the existing organization settings page markup around `OrgLogoUpload`, and refine the existing `BadgeShowcase` modal with better progress, selection, and grid presentation.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Tailwind CSS v4, Vitest, React Testing Library.

---

### Task 1: Badge Gallery Test

**Files:**
- Create: `src/components/profile/badge-showcase.test.tsx`
- Modify: `src/components/profile/badge-showcase.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BadgeShowcase } from "./badge-showcase";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));

describe("BadgeShowcase", () => {
  it("renders gallery progress and featured selection controls", () => {
    render(
      <BadgeShowcase
        isOpen
        userBadges={[{ badge_id: "first-strain" }, { badge_id: "collector-10" }]}
        featuredBadges={["first-strain"]}
        onSelect={vi.fn()}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText("2 freigeschaltet")).toBeInTheDocument();
    expect(screen.getByText("1 von 4 ausgewählt")).toBeInTheDocument();
    expect(screen.getByText("Auswahl")).toBeInTheDocument();
    expect(screen.getByText("Galerie")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/profile/badge-showcase.test.tsx`

Expected: FAIL because the current component does not render `2 freigeschaltet`, `1 von 4 ausgewählt`, `Auswahl`, and `Galerie`.

- [ ] **Step 3: Implement the gallery UI**

Update `BadgeShowcase` to render:
- A modal header with close button, title, unlocked count, and selected count.
- A compact selected-badge strip labeled `Auswahl`.
- A gallery grid labeled `Galerie`.
- A sticky save button.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/profile/badge-showcase.test.tsx`

Expected: PASS.

### Task 2: Organization Logo Preview

**Files:**
- Modify: `src/app/settings/organization/page.tsx`

- [ ] **Step 1: Add a visual current-logo preview**

Update the logo card to compute `currentOrgLogoUrl` from local upload state or `activeOrganization.organizations?.logo_url`.

Render a wider preview panel with the image when present and an icon fallback when missing. Keep `OrgLogoUpload` in the same card so upload behavior is unchanged.

- [ ] **Step 2: Verify TypeScript and lint**

Run: `npm run lint -- src/app/settings/organization/page.tsx src/components/profile/badge-showcase.tsx src/components/profile/badge-showcase.test.tsx`

Expected: PASS or only unrelated existing project warnings outside these files.

### Task 3: Final Verification

**Files:**
- Verify: `src/app/settings/organization/page.tsx`
- Verify: `src/components/profile/badge-showcase.tsx`

- [ ] **Step 1: Run focused tests**

Run: `npx vitest run src/components/profile/badge-showcase.test.tsx`

Expected: PASS.

- [ ] **Step 2: Inspect diff**

Run: `git diff -- src/app/settings/organization/page.tsx src/components/profile/badge-showcase.tsx src/components/profile/badge-showcase.test.tsx`

Expected: Diff only contains the logo preview UI, badge gallery UI, and the focused test.
