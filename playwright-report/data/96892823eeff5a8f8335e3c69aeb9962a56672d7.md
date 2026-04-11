# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e/calendar.test.ts >> Calendar Collection Feature >> should filter collection by date
- Location: tests/e2e/calendar.test.ts:66:7

# Error details

```
Test timeout of 30000ms exceeded while running "beforeEach" hook.
```

```
Error: locator.fill: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('input[type="email"]')

```

# Page snapshot

```yaml
- generic [ref=e1]:
  - main [ref=e3]:
    - generic [ref=e6]:
      - generic [ref=e7]:
        - generic [ref=e9]:
          - heading "Sign in to CannaLOG" [level=1] [ref=e10]
          - paragraph [ref=e11]: Welcome back! Please sign in to continue
        - generic [ref=e12]:
          - generic [ref=e14]:
            - button "Sign in with Apple" [ref=e15] [cursor=pointer]:
              - generic "Sign in with Apple" [ref=e16]
            - button "Sign in with Discord" [ref=e17] [cursor=pointer]:
              - generic "Sign in with Discord" [ref=e18]
            - button "Sign in with Google" [ref=e19] [cursor=pointer]:
              - generic "Sign in with Google" [ref=e20]
          - paragraph [ref=e23]: or
          - generic [ref=e25]:
            - generic [ref=e26]:
              - generic [ref=e29]:
                - generic [ref=e31]: Email address or username
                - textbox "Email address or username" [ref=e32]:
                  - /placeholder: Enter email or username
              - generic:
                - generic:
                  - generic:
                    - generic:
                      - generic: Password
                    - generic:
                      - textbox "Password":
                        - /placeholder: Enter your password
                      - button "Show password":
                        - img
            - button "Continue" [ref=e35] [cursor=pointer]:
              - generic [ref=e36]:
                - text: Continue
                - img [ref=e37]
      - generic [ref=e39]:
        - generic [ref=e40]:
          - generic [ref=e41]: Don’t have an account?
          - link "Sign up" [ref=e42] [cursor=pointer]:
            - /url: http://localhost:3000/sign-up
        - generic [ref=e44]:
          - generic [ref=e46]:
            - paragraph [ref=e47]: Secured by
            - link "Clerk logo" [ref=e48] [cursor=pointer]:
              - /url: https://go.clerk.com/components
              - img [ref=e49]
          - paragraph [ref=e54]: Development mode
  - dialog "Cookie consent" [active] [ref=e55]:
    - generic [ref=e56]:
      - paragraph [ref=e58]:
        - text: Wir verwenden Cookies, um deine Erfahrung zu verbessern.
        - link "Mehr erfahren" [ref=e59] [cursor=pointer]:
          - /url: /datenschutz
      - generic [ref=e60]:
        - button "Nur essenzielle" [ref=e61]
        - button "Alle akzeptieren" [ref=e62]
      - button "Dismiss cookie banner" [ref=e63]:
        - img [ref=e64]
  - button "Open Next.js Dev Tools" [ref=e72] [cursor=pointer]:
    - img [ref=e73]
  - alert [ref=e76]
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | const BASE_URL = 'http://localhost:3000';
  4  | const USER_EMAIL = 'Hintermaier.pascal@gmail.com';
  5  | const USER_PASSWORD = '123456';
  6  | 
  7  | test.describe('Calendar Collection Feature', () => {
  8  |   test.beforeEach(async ({ page }) => {
  9  |     // Login
  10 |     await page.goto(`${BASE_URL}/login`);
  11 |     
  12 |     // Pass age gate if present
  13 |     const yearSelect = page.locator('select').first();
  14 |     if (await yearSelect.isVisible()) {
  15 |       await yearSelect.selectOption('1990');
  16 |       const ageBtn = page.locator('button:has-text("Alter bestätigen")').first();
  17 |       await ageBtn.click();
  18 |     }
  19 | 
> 20 |     await page.locator('input[type="email"]').fill(USER_EMAIL);
     |                                               ^ Error: locator.fill: Test timeout of 30000ms exceeded.
  21 |     await page.locator('input[type="password"]').fill(USER_PASSWORD);
  22 |     await page.locator('button[type="submit"]').click();
  23 |     
  24 |     // Wait for redirect to strains or collection
  25 |     await page.waitForURL(/.*(strains|collection|feed)/);
  26 |     
  27 |     // Navigate to collection
  28 |     await page.goto(`${BASE_URL}/collection`);
  29 |     await page.waitForLoadState('networkidle');
  30 |   });
  31 | 
  32 |   test('should toggle calendar panel', async ({ page }) => {
  33 |     const toggleBtn = page.locator('button:has-text("Kalender anzeigen")');
  34 |     await expect(toggleBtn).toBeVisible();
  35 |     
  36 |     await toggleBtn.click();
  37 |     await expect(page.locator('button:has-text("Kalender ausblenden")')).toBeVisible();
  38 |     
  39 |     // Check if calendar content is visible (e.g., weekday headers)
  40 |     await expect(page.locator('text=Mo')).toBeVisible();
  41 |     await expect(page.locator('text=So')).toBeVisible();
  42 |   });
  43 | 
  44 |   test('should toggle between week and month view', async ({ page }) => {
  45 |     await page.locator('button:has-text("Kalender anzeigen")').click();
  46 |     
  47 |     const modeBtn = page.locator('button:has-text("Woche")');
  48 |     await expect(modeBtn).toBeVisible();
  49 |     
  50 |     await modeBtn.click();
  51 |     await expect(page.locator('button:has-text("Monat")')).toBeVisible();
  52 |     
  53 |     // In week mode, we should see only 7 days in the grid (excluding headers)
  54 |     // The grid has 7 columns, so we check the number of day buttons
  55 |     // The calendar panel days grid is a div with grid-cols-7
  56 |     const days = page.locator('.grid-cols-7 button.relative');
  57 |     // In week mode, there are exactly 7 days
  58 |     await expect(days).toHaveCount(7);
  59 |     
  60 |     await page.locator('button:has-text("Monat")').click();
  61 |     // In month mode, there are usually 28-42 days
  62 |     const monthDaysCount = await days.count();
  63 |     expect(monthDaysCount).toBeGreaterThan(27);
  64 |   });
  65 | 
  66 |   test('should filter collection by date', async ({ page }) => {
  67 |     await page.locator('button:has-text("Kalender anzeigen")').click();
  68 |     
  69 |     // Find a day with an activity dot (orange dot) if any
  70 |     const activityDay = page.locator('button.relative:has(.bg-\\[\\#FF6B35\\])').first();
  71 |     
  72 |     if (await activityDay.isVisible()) {
  73 |       const dayText = await activityDay.locator('span.font-bold').textContent();
  74 |       await activityDay.click();
  75 |       
  76 |       // Check for filter indicator
  77 |       await expect(page.locator('text=Gefiltert:')).toBeVisible();
  78 |       await expect(page.locator(`text=${dayText}.`)).toBeVisible();
  79 |       
  80 |       // Deselect
  81 |       await activityDay.click();
  82 |       await expect(page.locator('text=Gefiltert:')).not.toBeVisible();
  83 |     } else {
  84 |       // If no activity, just click any day
  85 |       const anyDay = page.locator('button.relative').filter({ hasText: '15' }).first();
  86 |       await anyDay.click();
  87 |       await expect(page.locator('text=Gefiltert:')).toBeVisible();
  88 |     }
  89 |   });
  90 | });
  91 | 
```