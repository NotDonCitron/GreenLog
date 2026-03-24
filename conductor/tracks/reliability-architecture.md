# CannaLog Reliability & Architecture Track

## Status: Completed
## Track ID: reliability-architecture

### Goal
Improve data persistence, scanner accuracy, and code maintainability.

### Tasks
- [x] **Data Reliability**: Move strain source settings (Apotheke vs. Street) from `localStorage` to Supabase user preferences.
- [x] **Scanner Logic**: Implement Fuzzy Search (Levenshtein) to improve strain matching on scanned labels.
- [x] **Refactoring**: Split `src/app/page.tsx` (Home) into smaller, reusable components (`CollectionStack`, `EmptyState`).
- [x] **Privacy Audit**: Double-check RLS policies for the new social features using the Security extension.

### Progress
- 2026-03-24: Track created. Starting with Data Reliability.
- 2026-03-24: Data Reliability (Supabase Sync) implemented.
- 2026-03-24: Refactoring of Home page into modular components completed.
- 2026-03-24: Fuzzy Search for Scanner implemented.
- 2026-03-24: Security Audit of RLS policies performed and documented. Track completed.
