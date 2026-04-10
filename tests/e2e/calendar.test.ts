import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';
const USER_EMAIL = 'Hintermaier.pascal@gmail.com';
const USER_PASSWORD = '123456';

test.describe('Calendar Collection Feature', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto(`${BASE_URL}/login`);
    
    // Pass age gate if present
    const yearSelect = page.locator('select').first();
    if (await yearSelect.isVisible()) {
      await yearSelect.selectOption('1990');
      const ageBtn = page.locator('button:has-text("Alter bestätigen")').first();
      await ageBtn.click();
    }

    await page.locator('input[type="email"]').fill(USER_EMAIL);
    await page.locator('input[type="password"]').fill(USER_PASSWORD);
    await page.locator('button[type="submit"]').click();
    
    // Wait for redirect to strains or collection
    await page.waitForURL(/.*(strains|collection|feed)/);
    
    // Navigate to collection
    await page.goto(`${BASE_URL}/collection`);
    await page.waitForLoadState('networkidle');
  });

  test('should toggle calendar panel', async ({ page }) => {
    const toggleBtn = page.locator('button:has-text("Kalender anzeigen")');
    await expect(toggleBtn).toBeVisible();
    
    await toggleBtn.click();
    await expect(page.locator('button:has-text("Kalender ausblenden")')).toBeVisible();
    
    // Check if calendar content is visible (e.g., weekday headers)
    await expect(page.locator('text=Mo')).toBeVisible();
    await expect(page.locator('text=So')).toBeVisible();
  });

  test('should toggle between week and month view', async ({ page }) => {
    await page.locator('button:has-text("Kalender anzeigen")').click();
    
    const modeBtn = page.locator('button:has-text("Woche")');
    await expect(modeBtn).toBeVisible();
    
    await modeBtn.click();
    await expect(page.locator('button:has-text("Monat")')).toBeVisible();
    
    // In week mode, we should see only 7 days in the grid (excluding headers)
    // The grid has 7 columns, so we check the number of day buttons
    // The calendar panel days grid is a div with grid-cols-7
    const days = page.locator('.grid-cols-7 button.relative');
    // In week mode, there are exactly 7 days
    await expect(days).toHaveCount(7);
    
    await page.locator('button:has-text("Monat")').click();
    // In month mode, there are usually 28-42 days
    const monthDaysCount = await days.count();
    expect(monthDaysCount).toBeGreaterThan(27);
  });

  test('should filter collection by date', async ({ page }) => {
    await page.locator('button:has-text("Kalender anzeigen")').click();
    
    // Find a day with an activity dot (orange dot) if any
    const activityDay = page.locator('button.relative:has(.bg-\\[\\#FF6B35\\])').first();
    
    if (await activityDay.isVisible()) {
      const dayText = await activityDay.locator('span.font-bold').textContent();
      await activityDay.click();
      
      // Check for filter indicator
      await expect(page.locator('text=Gefiltert:')).toBeVisible();
      await expect(page.locator(`text=${dayText}.`)).toBeVisible();
      
      // Deselect
      await activityDay.click();
      await expect(page.locator('text=Gefiltert:')).not.toBeVisible();
    } else {
      // If no activity, just click any day
      const anyDay = page.locator('button.relative').filter({ hasText: '15' }).first();
      await anyDay.click();
      await expect(page.locator('text=Gefiltert:')).toBeVisible();
    }
  });
});
