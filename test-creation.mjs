/**
 * GreenLog E2E - Community & Strain Creation Test
 * Uses existing user account
 */

import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:3000';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
const page = await context.newPage();

const log = (s, m) => console.log(`[${s}] ${m}`);
const errors = [];

page.on('console', msg => {
  if (msg.type() === 'error') {
    const t = msg.text().substring(0, 150);
    if (!t.includes('user_badges') && !t.includes('400')) errors.push(t);
  }
});

page.on('dialog', async d => { await d.accept(); });

try {
  log('START', '=== Community & Strain Creation Test ===');

  // Login
  await page.goto(`${BASE_URL}/login`);
  await page.waitForLoadState('networkidle');

  const yearSelect = await page.locator('select').first();
  if (await yearSelect.isVisible()) await yearSelect.selectOption('1990');
  const ageBtn = await page.locator('button:has-text("Alter bestätigen")').first();
  if (await ageBtn.isVisible()) { await ageBtn.click(); await page.waitForTimeout(500); }

  log('LOGIN', 'Logging in...');
  await page.locator('input[type="email"]').fill('Hintermaier.pascal@gmail.com');
  await page.locator('input[type="password"]').fill('123456');
  await page.locator('button[type="submit"]').click();
  await page.waitForTimeout(3000);
  log('LOGIN', `URL: ${page.url()}`);

  // ========================================
  // 1. CREATE COMMUNITY
  // ========================================
  log('COMMUNITY', '--- Create Community ---');

  await page.goto(`${BASE_URL}/community/new`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  const communityURL = page.url();
  log('COMMUNITY', `URL: ${communityURL}`);

  const communityContent = await page.locator('main').textContent().catch(() => '');
  log('COMMUNITY', `Page content: ${communityContent.substring(0, 300)}...`);

  // Try to fill form
  const nameInput = await page.locator('input[placeholder*="Name"], input[name*="name"]').first();
  if (await nameInput.isVisible({ timeout: 2000 }).catch(() => false)) {
    log('COMMUNITY', 'Found form, filling...');
    await nameInput.fill('My Test Club');
    await page.waitForTimeout(300);

    // Select type if visible
    const typeSelect = await page.locator('select').first();
    if (await typeSelect.isVisible()) {
      const options = await typeSelect.locator('option').allTextContents();
      log('COMMUNITY', `Type options: ${options.join(', ')}`);
      await typeSelect.selectOption({ index: 1 });
    }

    // Submit
    const createBtn = await page.locator('button:has-text("Erstellen"), button:has-text("Create")').first();
    if (await createBtn.isVisible()) {
      log('COMMUNITY', 'Clicking Erstellen...');
      await createBtn.click();
      await page.waitForTimeout(3000);
      log('COMMUNITY', `After create URL: ${page.url()}`);
    }
  } else {
    log('COMMUNITY', 'Form not found - checking page structure');
    const inputs = await page.locator('input').count();
    const selects = await page.locator('select').count();
    const buttons = await page.locator('button').count();
    log('COMMUNITY', `Inputs: ${inputs}, Selects: ${selects}, Buttons: ${buttons}`);
  }

  // ========================================
  // 2. CREATE STRAIN
  // ========================================
  log('STRAIN', '--- Create Strain ---');

  await page.goto(`${BASE_URL}/strains`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  // Click create FAB (last button with svg = plus icon)
  const fabButtons = await page.locator('button').filter({ has: page.locator('svg') }).all();
  log('STRAIN', `FAB buttons found: ${fabButtons.length}`);

  if (fabButtons.length > 0) {
    // The create button should be the plus button
    const createBtn = fabButtons[fabButtons.length - 1];
    if (await createBtn.isVisible()) {
      log('STRAIN', 'Clicking create button...');
      await createBtn.click();
      await page.waitForTimeout(2000);
      log('STRAIN', `URL after click: ${page.url()}`);

      // Check for form
      const formContent = await page.locator('main').textContent().catch(() => '');
      log('STRAIN', `Form page content: ${formContent.substring(0, 200)}...`);

      // Fill form if visible
      const nameInput = await page.locator('input[placeholder*="Sorte"], input[placeholder*="Name"], input[name*="name"]').first();
      if (await nameInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        log('STRAIN', 'Found strain form, filling...');
        await nameInput.fill('My Custom Test Strain');
        await page.waitForTimeout(300);

        // Select type
        const typeSelect = await page.locator('select').first();
        if (await typeSelect.isVisible()) {
          await typeSelect.selectOption('hybrid');
        }

        // Submit
        const saveBtn = await page.locator('button:has-text("Speichern"), button:has-text("Save"), button:has-text("Erstellen")').first();
        if (await saveBtn.isVisible()) {
          log('STRAIN', 'Clicking Speichern...');
          await saveBtn.click();
          await page.waitForTimeout(3000);
          log('STRAIN', `After save URL: ${page.url()}`);
        }
      }
    }
  }

  // ========================================
  // 3. COLLECT STRAIN (Test counter)
  // ========================================
  log('COLLECT', '--- Collect & Test Counter ---');

  await page.goto(`${BASE_URL}/strains`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  const counterBefore = await page.locator('.neon-text-green').first().textContent().catch(() => '?');
  log('COLLECT', `Counter before: ${counterBefore}`);

  // Click a strain
  const strainCard = await page.locator('[class*="StrainCard"]').first();
  if (await strainCard.isVisible({ timeout: 2000 }).catch(() => false)) {
    await strainCard.click();
    await page.waitForTimeout(2000);

    // Check if already collected
    const alreadyCollected = await page.locator('button:has-text("In Collection")').count();
    if (alreadyCollected > 0) {
      log('COLLECT', 'Already collected this strain, trying different one');
      // Go back and try another
      await page.goBack();
      await page.waitForTimeout(1000);
      const cards = await page.locator('[class*="StrainCard"]').all();
      if (cards.length > 1) {
        await cards[1].click();
        await page.waitForTimeout(2000);
      }
    }

    // Now try to collect
    const collectBtn = await page.locator('button:has-text("Collect & Rate")');
    if (await collectBtn.isVisible()) {
      log('COLLECT', 'Clicking Collect & Rate...');
      await collectBtn.click();
      await page.waitForTimeout(500);
      await page.locator('button:has-text("SAVE LOG")').click();
      await page.waitForTimeout(3000);
      log('COLLECT', 'Collection saved!');
    }
  }

  // Check counter after
  await page.goto(`${BASE_URL}/collection`);
  await page.waitForTimeout(2000);
  const counterAfter = await page.locator('.neon-text-green').first().textContent().catch(() => '?');
  log('COLLECT', `Counter after: ${counterAfter}`);

  // ========================================
  // 4. PROFILE & BADGES
  // ========================================
  log('PROFILE', '--- Profile & Badges ---');

  await page.goto(`${BASE_URL}/profile`);
  await page.waitForTimeout(2000);

  const profileName = await page.locator('h1, h2').first().textContent().catch(() => 'not found');
  const badgeCount = await page.locator('[class*="Badge"]').count();
  log('PROFILE', `Name: ${profileName}, Badge elements: ${badgeCount}`);

  // ========================================
  // FINAL
  // ========================================
  log('FINAL', '===========================================');
  log('FINAL', '           TEST COMPLETE');
  log('FINAL', '===========================================');

  if (errors.length > 0) {
    log('ERRORS', `Errors: ${errors.length}`);
    errors.slice(0, 5).forEach(e => log('ERR', `  ${e}`));
  } else {
    log('SUCCESS', 'No critical errors!');
  }

  await page.screenshot({ path: '/tmp/test-creation-result.png', fullPage: true });

} catch (err) {
  log('FATAL', `Failed: ${err.message}`);
  await page.screenshot({ path: '/tmp/test-creation-error.png' });
} finally {
  await browser.close();
  log('DONE', 'Complete');
}