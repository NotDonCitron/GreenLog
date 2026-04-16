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

    // Step 2: Navigate to grows list, click first grow
    await page.goto('/grows', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    const firstGrowLink = page.locator('a[href*="/grows/"]').first();
    if (!await firstGrowLink.isVisible({ timeout: 5000 })) {
      test.skip('No grows found — requires seeded test data');
    }
    await firstGrowLink.click();
    await page.waitForURL(/\/grows\/[^/]+$/, { timeout: 10000 });
    await page.waitForTimeout(2000);

    // Step 3: Find first timeline entry
    const timelineEntry = page.locator('[data-testid="timeline-entry"]').first();
    const useFallback = !await timelineEntry.isVisible({ timeout: 3000 });

    if (useFallback) {
      // Fallback: look for entry rows by class patterns
      const possibleEntries = page.locator('.timeline-entry, [class*="timeline-entry"]');
      if (!await possibleEntries.first().isVisible({ timeout: 3000 })) {
        test.skip('No timeline entries found on this grow');
      }
    }

    // Step 4: Comment form should NOT be visible in collapsed state
    const commentForm = page.locator('form[data-testid="comment-form"]');
    await expect(commentForm).not.toBeVisible();

    // Step 5: Click expand button (try multiple selectors)
    const expandBtn = timelineEntry.locator(
      'button[aria-label*="expand"], .expand-btn, [aria-expanded="false"]'
    ).first();

    if (await expandBtn.isVisible()) {
      await expandBtn.click();
    } else {
      // Fallback: click the whole entry row
      await timelineEntry.click();
    }
    await page.waitForTimeout(800);

    // Step 6: Comment form should now be visible
    await expect(commentForm).toBeVisible({ timeout: 5000 });
    const textarea = commentForm.locator('textarea[name="comment"], input[name="comment"]');
    await expect(textarea).toBeEnabled();

    // Step 7: Submit a comment
    const testComment = `Test comment — ${Date.now()}`;
    await textarea.fill(testComment);
    const submitBtn = commentForm.locator('button[type="submit"]');
    await submitBtn.click();

    // Step 8: Verify comment appears in list
    await page.waitForTimeout(2000);
    await expect(page.locator(`text="${testComment}"]`).first()).toBeVisible({ timeout: 5000 });
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