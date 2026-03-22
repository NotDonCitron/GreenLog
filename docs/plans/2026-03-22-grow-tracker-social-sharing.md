# Grow-Tracker & Social Sharing Implementation Plan

> **For Gemini:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement a comprehensive Grow-Tracker for documenting plant progress and a Social Sharing feature to export collectible strain cards as images.

**Architecture:** The Grow-Tracker will use a new `/grows` route with sub-pages for individual grow projects, leveraging the existing `grows` and `grow_entries` tables in Supabase. Social Sharing will be implemented using the `html-to-image` library to capture DOM elements (cards) and trigger browser downloads or native share intents.

**Tech Stack:** Next.js (App Router), Supabase (Auth, DB, Storage), Tailwind CSS, Lucide Icons, `html-to-image`.

---

### Task 1: Setup Grow-Tracker Infrastructure

**Files:**
- Create: `src/app/grows/page.tsx`
- Modify: `src/components/bottom-nav.tsx`

**Step 1: Create the basic Grows overview page**
Create `src/app/grows/page.tsx` with a list view of active grows.

**Step 2: Update navigation to link to Grows**
Ensure `src/components/bottom-nav.tsx` correctly points to the new `/grows` route.

**Step 3: Commit**
```bash
git add src/app/grows/page.tsx src/components/bottom-nav.tsx
git commit -m "feat: setup grow-tracker overview and navigation"
```

---

### Task 2: Implement "Add New Grow" Functionality

**Files:**
- Create: `src/app/grows/new/page.tsx`

**Step 1: Create the form to start a new grow**
Include fields for Strain selection (from DB), Start Date, and Grow Name.

**Step 2: Implement DB insertion logic**
Use `supabase.from('grows').insert(...)`.

**Step 3: Commit**
```bash
git add src/app/grows/new/page.tsx
git commit -m "feat: add functionality to create new grow projects"
```

---

### Task 3: Social Card Export (Phase 1)

**Files:**
- Modify: `src/app/strains/[slug]/page.tsx`
- Install: `npm install html-to-image`

**Step 1: Install library**
`npm install html-to-image`

**Step 2: Add export button to Detail Page**
Add a "Download as Image" button that captures the card element.

**Step 3: Implement capture logic**
Use `toPng` from `html-to-image` to generate a shareable file.

**Step 4: Commit**
```bash
git add src/app/strains/[slug]/page.tsx package.json
git commit -m "feat: implement social card export functionality"
```

---

### Task 4: User Profile Statistics (XP for Grows)

**Files:**
- Modify: `src/app/profile/page.tsx`

**Step 1: Update XP calculation**
Add XP for active grows (e.g., +100 XP per grow started).

**Step 2: Display grow count in profile**
Fetch and show the real number of grows from the database.

**Step 3: Commit**
```bash
git add src/app/profile/page.tsx
git commit -m "feat: link grow activities to user level and XP"
```
