---
phase: 02-react-query-advanced
plan: "02"
status: complete
completed: "2026-04-04"
wave: 2
---

## Plan 02-02: Strains Page Infinite Scroll

**Objective:** Convert the strains page from regular useQuery with keepPreviousData to useInfiniteQuery for cursor-based infinite scroll.

### Changes Made

**Task 1: fetchStrains pagination support**
- Added `STRAINS_PAGE_SIZE = 50` constant
- Changed `fetchStrains()` to accept `pageParam?: number` parameter
- Added `.range(offset, offset + STRAINS_PAGE_SIZE - 1)` to Supabase query for cursor pagination
- Changed return type from `{ strains, sourceOverrides }` to `{ strains, nextCursor }`
- Added `hasMore` check using `count: 'exact'` from Supabase
- Demo mode returns all mock strains without pagination

**Task 2: useQuery → useInfiniteQuery**
- Replaced `useQuery` with `useInfiniteQuery`
- `initialPageParam: 0`, `getNextPageParam: (lastPage) => lastPage.nextCursor`
- Flattened pages: `const strains = data?.pages.flatMap((page) => page.strains) ?? []`
- `hasNextPage` and `fetchNextPage` now available for load-more trigger

**Task 3: Infinite scroll trigger**
- Added `loadMoreRef = useRef<HTMLDivElement>(null)`
- Added IntersectionObserver `useEffect` that triggers `fetchNextPage()` when `loadMoreRef` becomes visible
- Added load-more UI with "Mehr laden" button (appears when `hasNextPage` is true)
- Added loading spinner with "Lade mehr..." text during `isFetchingNextPage`
- Added skeleton cards (4 cards) during `isFetchingNextPage`
- Filters changing reset scroll via query key change (useInfiniteQuery auto-resets)

### Verification

| Criterion | Evidence |
|-----------|----------|
| `useInfiniteQuery` replaces `useQuery` | grep: "useInfiniteQuery" ✓ |
| `fetchStrains` uses `.range()` for pagination | grep: ".range(" ✓ |
| `getNextPageParam` returns nextCursor | grep: "getNextPageParam" ✓ |
| `IntersectionObserver` triggers `fetchNextPage` | grep: "IntersectionObserver" ✓ |
| Skeleton cards during `isFetchingNextPage` | grep: "isFetchingNextPage" ✓ |
| Demo mode returns all without pagination | Line 204-246 ✓ |

### Self-Check
No issues found. All 3 tasks complete.

### Files Modified
- `src/app/strains/page.tsx` — 100 lines added, 35 removed
