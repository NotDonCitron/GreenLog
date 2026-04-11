# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e/OMA-immediate-reflection.test.ts >> Organization Member Approval - Immediate UI Reflection >> should remove member from list immediately after approval
- Location: tests/e2e/OMA-immediate-reflection.test.ts:4:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText('Test User')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByText('Test User')

```

# Page snapshot

```yaml
- generic [ref=e1]:
  - main [ref=e3]:
    - main [ref=e4]:
      - generic [ref=e5]:
        - generic [ref=e6]:
          - heading "Profil" [level=1] [ref=e8]
          - generic [ref=e9]:
            - img "CannaLog" [ref=e11]
            - link "Login" [ref=e12] [cursor=pointer]:
              - /url: /login
              - img [ref=e13]
              - text: Login
        - generic [ref=e17]:
          - img [ref=e19]
          - generic [ref=e22]:
            - heading "Profil gesperrt" [level=2] [ref=e23]
            - paragraph [ref=e24]:
              - text: Logge dich ein, um deine Sammlung zu verwalten,
              - text: Achievements zu sammeln und dich mit der
              - text: Community zu vernetzen.
          - generic [ref=e25]:
            - link "Jetzt Anmelden" [ref=e26] [cursor=pointer]:
              - /url: /login
              - button "Jetzt Anmelden" [ref=e27]
            - link "Neues Konto erstellen" [ref=e28] [cursor=pointer]:
              - /url: /login?signup=true
              - button "Neues Konto erstellen" [ref=e29]
      - navigation "Main navigation" [ref=e30]:
        - generic [ref=e31]:
          - link "Home" [ref=e32] [cursor=pointer]:
            - /url: /
            - img [ref=e34]
            - text: Home
          - link "Strains" [ref=e37] [cursor=pointer]:
            - /url: /strains
            - img [ref=e39]
            - text: Strains
          - link "Sammlung" [ref=e42] [cursor=pointer]:
            - /url: /collection
            - img [ref=e44]
            - text: Sammlung
          - button "Social" [ref=e47]:
            - img [ref=e49]
            - text: Social
          - link "Profil" [ref=e54] [cursor=pointer]:
            - /url: /profile
            - img [ref=e56]
            - text: Profil
  - dialog "Cookie consent" [active] [ref=e60]:
    - generic [ref=e61]:
      - paragraph [ref=e63]:
        - text: Wir verwenden Cookies, um deine Erfahrung zu verbessern.
        - link "Mehr erfahren" [ref=e64] [cursor=pointer]:
          - /url: /datenschutz
      - generic [ref=e65]:
        - button "Nur essenzielle" [ref=e66]
        - button "Alle akzeptieren" [ref=e67]
      - button "Dismiss cookie banner" [ref=e68]:
        - img [ref=e69]
  - button "Open Next.js Dev Tools" [ref=e77] [cursor=pointer]:
    - img [ref=e78]
  - alert [ref=e81]
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('Organization Member Approval - Immediate UI Reflection', () => {
  4  |   test('should remove member from list immediately after approval', async ({ page }) => {
  5  |     // 1. Mock the initial pending members fetch
  6  |     await page.addInitScript(() => {
  7  |       // Create a mock active organization for the AuthProvider
  8  |       localStorage.setItem('greenlog_active_organization_id', 'org-123');
  9  |       // Mock any other auth state if needed
  10 |     });
  11 | 
  12 |     await page.route('**/api/organizations/*/pending-members', async (route) => {
  13 |       await route.fulfill({
  14 |         status: 200,
  15 |         contentType: 'application/json',
  16 |         body: JSON.stringify({
  17 |           data: {
  18 |             pendingMembers: [
  19 |               {
  20 |                 id: 'member-123',
  21 |                 user_id: 'user-456',
  22 |                 joined_at: new Date().toISOString(),
  23 |                 user: {
  24 |                   id: 'user-456',
  25 |                   username: 'testuser',
  26 |                   display_name: 'Test User',
  27 |                   avatar_url: null,
  28 |                 },
  29 |               },
  30 |             ],
  31 |           },
  32 |           error: null,
  33 |         }),
  34 |       });
  35 |     });
  36 | 
  37 |     // 2. Mock the approve PATCH request with a delay to test "processing" state if needed
  38 |     // but the goal is to check if it's removed *after* success without reload
  39 |     await page.route('**/api/organizations/*/members/member-123/approve', async (route) => {
  40 |       await route.fulfill({
  41 |         status: 200,
  42 |         contentType: 'application/json',
  43 |         body: JSON.stringify({
  44 |           data: {
  45 |             member: { id: 'member-123', membership_status: 'active' },
  46 |           },
  47 |           error: null,
  48 |         }),
  49 |       });
  50 |     });
  51 | 
  52 |     // 3. Navigate to the page
  53 |     // We need to bypass the Auth check or mock the AuthProvider
  54 |     // Since we are mocking the API, if the page loads and tries to fetch, it will get our mock data
  55 |     await page.goto('/settings/organization/pending-members');
  56 | 
  57 |     // 4. Verify member is visible
> 58 |     await expect(page.getByText('Test User')).toBeVisible();
     |                                               ^ Error: expect(locator).toBeVisible() failed
  59 | 
  60 |     // 5. Click Approve
  61 |     await page.getByRole('button', { name: /Genehmigen/i }).click();
  62 | 
  63 |     // 6. Verify member disappears IMMEDIATELY (or after the mocked success)
  64 |     await expect(page.getByText('Test User')).not.toBeVisible({ timeout: 5000 });
  65 |     
  66 |     // 7. Verify empty state message appears
  67 |     await expect(page.getByText('Keine ausstehenden Anfragen')).toBeVisible();
  68 |   });
  69 | });
  70 | 
```