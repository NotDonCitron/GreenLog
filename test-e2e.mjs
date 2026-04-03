/**
 * GreenLog E2E Test - Existing User
 * Testet alle Features mit bestehendem Account
 */

import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:3000';
const USER_EMAIL = 'Hintermaier.pascal@gmail.com';
const USER_PASSWORD = '123456';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
const page = await context.newPage();

const log = (s, m) => console.log(`[${s}] ${m}`);

const errors = [];
page.on('console', msg => {
  if (msg.type() === 'error') errors.push(msg.text().substring(0, 150));
});

page.on('dialog', async d => { log('DIALOG', d.message()); await d.accept(); });

try {
  log('START', '=== GreenLog E2E Test ===');

  // Login
  await page.goto(`${BASE_URL}/login`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);

  // Pass age gate
  const yearSelect = await page.locator('select').first();
  if (await yearSelect.isVisible()) await yearSelect.selectOption('1990');

  const ageBtn = await page.locator('button:has-text("Alter bestätigen")').first();
  if (await ageBtn.isVisible()) { await ageBtn.click(); await page.waitForTimeout(500); }

  // Login form
  log('LOGIN', 'Logging in...');
  await page.locator('input[type="email"]').fill(USER_EMAIL);
  await page.locator('input[type="password"]').fill(USER_PASSWORD);
  await page.locator('button[type="submit"]').click();
  await page.waitForTimeout(3000);
  log('LOGIN', `URL: ${page.url()}`);

  // Test all pages
  const pages = [
    { url: '/strains', name: 'STRAINS' },
    { url: '/collection', name: 'COLLECTION' },
    { url: '/feed', name: 'FEED' },
    { url: '/profile', name: 'PROFILE' },
    { url: '/discover', name: 'DISCOVER' },
    { url: '/scanner', name: 'SCANNER' },
    { url: '/community', name: 'COMMUNITY' },
    { url: '/settings/organization', name: 'SETTINGS' },
    { url: '/settings/organization/analytics', name: 'ANALYTICS' },
  ];

  for (const p of pages) {
    await page.goto(`${BASE_URL}${p.url}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    const content = await page.locator('main').textContent().catch(() => '');
    log(p.name, `Loaded (${content.length} chars): ${page.url()}`);
  }

  // Compare page
  await page.goto(`${BASE_URL}/strains/compare?slugs=gorilla-glue,amnesia`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1500);
  log('COMPARE', `Loaded: ${page.url()}`);

  // Test collecting a strain
  log('TEST', '=== Testing Collect Flow ===');
  await page.goto(`${BASE_URL}/strains/gorilla-glue`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  const isCollected = await page.locator('button:has-text("In Collection")').count();
  if (isCollected > 0) {
    log('STRAIN', 'Already collected');
  } else {
    const collectBtn = await page.locator('button:has-text("Collect & Rate")');
    if (await collectBtn.isVisible()) {
      log('STRAIN', 'Clicking Collect & Rate...');
      await collectBtn.click();
      await page.waitForTimeout(500);

      const saveBtn = await page.locator('button:has-text("SAVE LOG")');
      if (await saveBtn.isVisible()) {
        log('STRAIN', 'Clicking SAVE LOG...');
        await saveBtn.click();
        await page.waitForTimeout(3000);
        log('STRAIN', 'Collection saved');
      }
    }
  }

  // Check counters
  log('FINAL', '=== Final Counter Check ===');
  await page.goto(`${BASE_URL}/collection`);
  await page.waitForTimeout(2000);
  const counter = await page.locator('.neon-text-green').first().textContent().catch(() => 'not found');
  log('FINAL', `Collection Counter: ${counter}`);

  await page.goto(`${BASE_URL}/strains`);
  await page.waitForTimeout(2000);
  const strainsCounter = await page.locator('.neon-text-green').first().textContent().catch(() => 'not found');
  log('FINAL', `Strains Counter: ${strainsCounter}`);

  // Results
  log('RESULTS', '===========================================');
  if (errors.length > 0) {
    log('ERRORS', `Found ${errors.length} errors:`);
    errors.slice(0, 10).forEach(e => log('ERR', `  ${e}`));
  } else {
    log('SUCCESS', 'No console errors!');
  }

  await page.screenshot({ path: '/tmp/test-result.png', fullPage: true });
  log('SCREENSHOT', 'Saved to /tmp/test-result.png');

} catch (err) {
  log('FATAL', `Failed: ${err.message}`);
  await page.screenshot({ path: '/tmp/test-error.png' });
} finally {
  await browser.close();
  log('DONE', 'Complete');
}