import { test, expect } from '@playwright/test';

test.describe('TerpeneRadarChart Visual Test', () => {
  test.beforeEach(async ({ page }) => {
    // Inject localStorage for AgeGate and Demo Mode
    await page.addInitScript(() => {
      window.localStorage.setItem('cannalog_age_verified', 'true');
      window.localStorage.setItem('cannalog_demo_mode', 'true');
    });
  });

  test('should render radar chart for strains with >= 3 terpenes on detail page', async ({ page }) => {
    // 1. Navigate to Gorilla Glue (>= 3 terpenes)
    await page.goto('/strains/gorilla-glue');
    
    // Wait for the page to load
    await page.waitForSelector('h1:has-text("Gorilla Glue #4")');
    
    // Flip the card
    const card = page.locator('.perspective-1000');
    await card.click();
    
    // Check if Radar Chart is visible on back side
    const radarChart = page.locator('svg >> polygon').nth(3); // The data polygon is the 4th polygon (after 3 grid lines)
    await expect(radarChart).toBeVisible();
    
    // Verify labels (terpene names)
    await expect(page.locator('text:has-text("Caryophyllene")')).toBeVisible();
    await expect(page.locator('text:has-text("Myrcene")')).toBeVisible();
    await expect(page.locator('text:has-text("Limonene")')).toBeVisible();

    // Check theme color (Hybrid = mixed/yellowish? actually getStrainTheme for hybrid is #FFD700 or similar)
    // Let's check the color in the SVG
    const stroke = await radarChart.getAttribute('stroke');
    expect(stroke).not.toBeNull();
  });

  test('should render chips fallback for strains with < 3 terpenes', async ({ page }) => {
    // 2. Navigate to Sour Diesel (2 terpenes)
    await page.goto('/strains/sour-diesel');
    await page.waitForSelector('h1:has-text("Sour Diesel")');
    
    // Flip the card
    await page.locator('.perspective-1000').click();
    
    // Should NOT have radar chart
    await expect(page.locator('svg >> polygon')).toHaveCount(0);
    
    // Should have chips
    await expect(page.locator('span:has-text("Limonene")')).toBeVisible();
    await expect(page.locator('span:has-text("Myrcene")')).toBeVisible();
  });

  test('should NOT show terpenes section for strains with 0 terpenes', async ({ page }) => {
    // 3. Navigate to Blue Dream (0 terpenes)
    await page.goto('/strains/blue-dream');
    await page.waitForSelector('h1:has-text("Blue Dream")');
    
    // Flip the card
    await page.locator('.perspective-1000').click();
    
    // Should NOT have Terpene section label
    await expect(page.locator('p:has-text("Terpene")')).toHaveCount(0);
  });

  test('should render radar chart on compare page', async ({ page }) => {
    // 4. Navigate to compare page with gorilla-glue and sour-diesel
    // Gorilla Glue has 3 terpenes, so it should show radar chart there too (size=140)
    await page.goto('/strains/compare?slugs=gorilla-glue,sour-diesel');
    
    await page.waitForSelector('h1:has-text("Strain Vergleich")');
    
    // Gorilla Glue card in compare grid should have radar chart
    const gorillaGlueCompareCard = page.locator('div:has-text("Gorilla Glue #4")');
    const radarInCompare = gorillaGlueCompareCard.locator('svg >> polygon').nth(3);
    await expect(radarInCompare).toBeVisible();
    
    // Check SVG size (it should be 140 as defined in strain-compare-card.tsx)
    const svg = gorillaGlueCompareCard.locator('svg').first();
    await expect(svg).toHaveAttribute('width', '140');
  });

  test('Mobile: should scale correctly on 375px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    
    await page.goto('/strains/gorilla-glue');
    await page.locator('.perspective-1000').click();
    
    const radarChart = page.locator('svg >> polygon').nth(3);
    await expect(radarChart).toBeVisible();
    
    // Just verify it's not overflowing or broken
    const boundingBox = await radarChart.boundingBox();
    expect(boundingBox?.width).toBeGreaterThan(50);
  });
});
