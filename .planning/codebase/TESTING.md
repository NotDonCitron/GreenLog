# Testing Patterns

**Analysis Date:** 2026-04-03

## Test Framework

**E2E Testing:** Playwright
- **Package:** `@playwright/test` v1.58.2
- **Configuration:** `playwright.config.ts` at project root
- **Test files:** `tests/app.spec.ts`

**No unit tests detected** - Project uses E2E testing only via Playwright. No Jest, Vitest, or other unit testing frameworks are installed.

## Test Configuration

**File:** `playwright.config.ts`

```typescript
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: process.env.BASE_URL || "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: process.env.CI
    ? undefined
    : {
        command: "npm run dev",
        url: "http://localhost:3000",
        reuseExistingServer: !process.env.CI,
        timeout: 120 * 1000,
      },
});
```

### Key Configuration Details

| Setting | Value |
|---------|-------|
| Test directory | `./tests` |
| Browser | Chromium (Desktop Chrome) |
| Reporter | HTML (viewable at `playwright-report/`) |
| Base URL | `http://localhost:3000` |
| Parallel execution | Yes (`fullyParallel: true`) |
| CI retries | 2 |
| Dev retries | 0 |
| Web server timeout | 120 seconds |
| Trace | On first retry |

## Test File Organization

### Location

- **E2E tests:** `tests/app.spec.ts` (Playwright spec file)
- **Playwright config:** `playwright.config.ts` (project root)
- **Test results:** `test-results/` directory
- **Playwright report:** `playwright-report/` directory

### Test Directory Structure

```
GreenLog/
├── tests/
│   └── app.spec.ts          # Main E2E test file
├── playwright.config.ts     # Playwright configuration
├── playwright-report/       # HTML test reports
└── test-results/            # Test artifacts
```

## Test Structure

**File:** `tests/app.spec.ts`

### Suite Organization

```typescript
import { test, expect } from "@playwright/test";

test.describe("GreenLog App", () => {
  test("Home page loads without crash", async ({ page }) => {
    // Test implementation
  });

  test("Login page loads", async ({ page }) => {
    // Test implementation
  });
  // ...
});

test.describe("Navigation", () => {
  test("Can navigate between main routes", async ({ page }) => {
    // Test implementation
  });
});
```

### Test Patterns Used

#### Page Load Tests

```typescript
test("Home page loads without crash", async ({ page }) => {
  await page.goto("/");

  // Should show CannaLog branding
  await expect(page.getByText("CannaLog")).toBeVisible();

  // Should show bottom navigation links
  const nav = page.locator("nav");
  await expect(nav.getByText("Home")).toBeVisible();
  await expect(nav.getByText("Strains")).toBeVisible();
  await expect(nav.getByText("Social")).toBeVisible();
  await expect(nav.getByText("Profil")).toBeVisible();

  // Should NOT show a completely blank page
  const body = page.locator("body");
  await expect(body).not.toBeEmpty();
});
```

#### Navigation Tests

```typescript
test("Bottom navigation links work", async ({ page }) => {
  await page.goto("/");

  // Navigate to Strains via nav link
  await page.locator("nav").getByText("Strains").click();
  await expect(page).toHaveURL(/\/strains/);

  // Navigate to Sammlung via nav link
  await page.locator("nav").getByText("Sammlung").click();
  await expect(page).toHaveURL(/\/collection/);
});
```

#### Console Error Detection

```typescript
test("No console errors on home page load", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      errors.push(msg.text());
    }
  });

  await page.goto("/");
  await page.waitForLoadState("networkidle");

  // Filter out known non-critical errors
  const criticalErrors = errors.filter(
    (e) =>
      !e.includes("favicon") &&
      !e.includes("manifest") &&
      !e.includes("ERR_BLOCKED") &&
      !e.includes("third-party") &&
      !e.includes("hydrat")
  );

  expect(criticalErrors).toHaveLength(0);
});
```

#### Multi-Route Testing

```typescript
test.describe("Navigation", () => {
  test("Can navigate between main routes", async ({ page }) => {
    await page.goto("/");

    const routes = ["/", "/strains", "/collection", "/feed"];

    for (const route of routes) {
      await page.goto(route);
      await page.waitForLoadState("domcontentloaded");

      // Page should not crash (body should have content)
      const body = page.locator("body");
      await expect(body).not.toBeEmpty();

      // Should not show error boundary text
      await expect(page.getByText("Something went wrong")).not.toBeVisible({
        timeout: 2000,
      });
    }
  });
});
```

## Run Commands

```bash
# Run all tests (requires dev server running or uses webServer config)
npx playwright test

# Run with UI
npx playwright test --ui

# Run headed (visible browser)
npx playwright test --headed

# Run specific test file
npx playwright test tests/app.spec.ts

# Run specific test by name
npx playwright test "Home page loads"

# Update snapshots (if any)
npx playwright test --update-snapshots

# Show report
npx playwright show-report
```

## Test Coverage Areas

### What IS Tested

| Area | Tests |
|------|-------|
| Home page load | Verifies page renders with branding and nav |
| Login page load | Verifies page renders |
| Scanner page load | Verifies "Smart Scanner" heading visible |
| Scanner test page load | Verifies test center renders |
| Strains page load | Verifies page heading renders |
| Navigation links | Verifies nav links navigate to correct routes |
| Multi-route stability | Verifies pages don't crash on navigation |
| Console errors | Detects console errors on home page load |

### What is NOT Tested

| Area | Coverage Status |
|------|-----------------|
| API routes | No unit/integration tests |
| Database operations | No tests |
| Authentication flows | Partial (login page loads only) |
| Collection mutations | Not tested |
| Badge system | Not tested |
| Organization features | Not tested |
| Social features | Not tested |
| GDPR features | Not tested |
| Component logic | No unit tests for hooks or utilities |
| Error handling | Limited to console error detection |
| Form submissions | Not tested |
| Real-time features | Not tested |

## Test Execution Flow

1. **Prerequisites:** Dev server must be running or Playwright will start it via `webServer` config
2. **Test isolation:** Each test runs in a fresh browser context
3. **Base URL:** Configured via `BASE_URL` env var or defaults to `http://localhost:3000`
4. **Artifacts:** Traces saved on first retry failure in `test-results/`
5. **Reports:** HTML report generated in `playwright-report/`

## Test Data

### Test Users/Accounts

- Tests use actual application UI without mocking
- No test database or fixtures detected
- Tests rely on real Supabase database in development environment

### Sample Data Dependencies

| Page | Data Required |
|------|---------------|
| Home | Existing strains, user session |
| Strains | 470+ strains in database |
| Scanner | OCR functionality |
| Collection | Authenticated user with collected strains |

## Mocking

**No mocking framework detected** - Playwright E2E tests interact with real UI and real backend. No mocks, stubs, or spies used for unit testing.

## CI Integration

The `playwright.config.ts` supports CI execution:

```typescript
// In CI environment:
forbidOnly: !!process.env.CI  // Fails if test.only() is committed
retries: process.env.CI ? 2 : 0  // Retry failed tests in CI
workers: process.env.CI ? 1 : undefined  // Run serially in CI
webServer: process.env.CI ? undefined : {...}  // No auto-start in CI (assume running)
```

## Known Testing Gaps

1. **No unit tests** - All testing is E2E via Playwright
2. **No API route tests** - API error handling not tested
3. **No component tests** - React components not tested in isolation
4. **No hook tests** - Custom hooks not tested
5. **No type tests** - TypeScript types not validated by tests
6. **No database tests** - RLS policies not verified
7. **No integration tests** - Multi-step workflows not tested
8. **Limited auth tests** - Only login page load tested, not actual auth flows
9. **No performance tests** - No load or stress testing
10. **No accessibility tests** - No axe-core or similar automated a11y checks

## Test Execution Requirements

| Requirement | Details |
|-------------|---------|
| Node.js | Required |
| npm | Required |
| Playwright browsers | Auto-installed via `npx playwright install` |
| Dev server | Started automatically via webServer config (dev only) |
| Environment | `.env.local` or environment variables for Supabase |

---

*Testing analysis: 2026-04-03*
