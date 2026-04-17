import { test, expect } from '@playwright/test';

const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL || 'test@greenlog.com';
const TEST_USER_PASSWORD = process.env.TEST_USER_PASSWORD || 'TestPassword123!';

test.describe('Timeline Entry — Expand + Comment Form', () => {

  test.beforeEach(async ({ page }) => {
    // Navigate directly to grows
    await page.goto('/grows', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // Handle age gate
    const yearSelect = page.locator('select').first();
    if (await yearSelect.isVisible()) {
      await yearSelect.selectOption('1990');
    }
    const ageBtn = page.getByRole('button', { name: /Alter bestätigen/i });
    if (await ageBtn.isVisible()) await ageBtn.click();

    // Handle cookie consent
    const cookieBtn = page.getByRole('button', { name: /Alle akzeptieren/i });
    if (await cookieBtn.isVisible()) await cookieBtn.click();
  });

  test('timeline entries are grouped by day', async ({ page }) => {

    // Navigate to grows
    await page.goto('/grows', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    const firstGrowLink = page.locator('a[href*="/grows/"]').first();
    if (!await firstGrowLink.isVisible({ timeout: 5000 })) {
      test.skip('No grows found');
    }
    await firstGrowLink.click();
    await page.waitForTimeout(2000);

    // Day headers should be present (chronological timeline)
    const dayHeaders = page.locator('[data-testid="day-header"], .day-header, [class*="day-header"]');
    const count = await dayHeaders.count();
    expect(count).toBeGreaterThan(0);
  });
});