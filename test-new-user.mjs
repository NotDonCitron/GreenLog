/**
 * GreenLog E2E Test - NEW USER + CREATION
 */

import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:3000';
const timestamp = Date.now();
const NEW_EMAIL = `greenlog${timestamp}@test.com`;
const NEW_PASS = 'Test123456!';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
const page = await context.newPage();

const log = (s, m) => console.log(`[${s}] ${m}`);

const errors = [];
page.on('console', msg => {
  if (msg.type() === 'error') {
    const text = msg.text().substring(0, 200);
    if (!text.includes('user_badges') && !text.includes('400') && !text.includes('401')) {
      errors.push(text);
    }
  }
});

page.on('dialog', async d => {
  log('DIALOG', d.message());
  await d.accept();
});

// Helper to dismiss any overlay/banner
async function dismissOverlays() {
  // Cookie consent buttons
  const cookieBtns = await page.locator('button:has-text("Alle akzeptieren"), button:has-text("Nur essenzielle"), button:has-text("Accept")').all();
  for (const btn of cookieBtns) {
    if (await btn.isVisible({ timeout: 500 }).catch(() => false)) {
      await btn.click();
      await page.waitForTimeout(300);
      log('COOKIE', 'Dismissed cookie consent');
      break;
    }
  }
}

try {
  log('START', '=== GreenLog NEW USER TEST ===');

  // ========================================
  // 1. REGISTER NEW USER
  // ========================================
  log('REGISTER', '--- 1. Register new user ---');

  await page.goto(`${BASE_URL}/login`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);

  // Dismiss any overlays
  await dismissOverlays();

  // Pass age gate
  const yearSelect = await page.locator('select').first();
  if (await yearSelect.isVisible()) {
    await yearSelect.selectOption('1990');
  }
  const ageBtn = await page.locator('button:has-text("Alter bestätigen")').first();
  if (await ageBtn.isVisible()) {
    await ageBtn.click();
    await page.waitForTimeout(500);
  }

  // Dismiss any overlays again
  await dismissOverlays();

  // Toggle to sign up mode
  log('REGISTER', 'Clicking toggle to sign up mode...');
  const toggleBtn = await page.locator('button:has-text("Neues Konto erstellen")').first();
  if (await toggleBtn.isVisible()) {
    await toggleBtn.click();
    await page.waitForTimeout(500);
  }

  // Dismiss overlays again
  await dismissOverlays();

  // Fill sign up form
  log('REGISTER', 'Filling sign up form...');
  await page.locator('input[placeholder*="dein_name"]').fill(`testuser${timestamp}`);
  await page.waitForTimeout(200);
  await page.locator('input[type="email"]').fill(NEW_EMAIL);
  await page.waitForTimeout(200);
  await page.locator('input[type="password"]').fill(NEW_PASS);
  await page.waitForTimeout(200);

  // Click create
  log('REGISTER', 'Clicking KONTO ERSTELLEN...');
  await page.locator('button:has-text("KONTO ERSTELLEN")').first().click();
  await page.waitForTimeout(4000);

  log('REGISTER', `URL after signup: ${page.url()}`);

  const successMsg = await page.locator('text=/Konto erstellt|erfolgreich/i').count();
  log('REGISTER', `Success message visible: ${successMsg > 0}`);

  // Since Supabase requires email verification, account is created but not logged in
  // Try to login
  log('REGISTER', 'Trying to login...');

  // Wait for form to be ready
  await page.waitForTimeout(1000);

  // The form might still show "Zurück zum Login" - use force click if needed
  const backToLogin = await page.locator('button:has-text("Zurück zum Login")').first();
  if (await backToLogin.isVisible()) {
    await backToLogin.click({ force: true });
    await page.waitForTimeout(500);
  }

  // Fill login form
  await page.locator('input[type="email"]').fill(NEW_EMAIL);
  await page.locator('input[type="password"]').fill(NEW_PASS);
  await page.locator('button:has-text("INITIALIZE LOGIN")').click();
  await page.waitForTimeout(4000);

  log('REGISTER', `Login URL: ${page.url()}`);

  // ========================================
  // 2. COMPLETE ONBOARDING
  // ========================================
  log('ONBOARD', '--- 2. Complete Onboarding ---');

  for (let i = 0; i < 10; i++) {
    const btn = await page.locator('button:has-text("Überspringen"), button:has-text("Skip"), button:has-text("Weiter"), button:has-text("Next"), button:has-text("Fortfahren"), button:has-text("Starten")').first();
    if (await btn.isVisible({ timeout: 500 }).catch(() => false)) {
      await btn.click({ force: true });
      await page.waitForTimeout(300);
    } else {
      break;
    }
  }
  log('ONBOARD', `Onboarding done, URL: ${page.url()}`);

  // ========================================
  // 3. COLLECT A STRAIN
  // ========================================
  log('COLLECT', '--- 3. Collect First Strain ---');

  await page.goto(`${BASE_URL}/strains`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  const counter = await page.locator('.neon-text-green').first().textContent().catch(() => '0');
  log('COLLECT', `Initial counter: ${counter}`);

  // Click first strain
  const firstStrain = await page.locator('[class*="StrainCard"]').first();
  if (await firstStrain.isVisible({ timeout: 2000 }).catch(() => false)) {
    await firstStrain.click();
    await page.waitForTimeout(2000);
    log('COLLECT', `Strain detail URL: ${page.url()}`);

    const collectBtn = await page.locator('button:has-text("Collect & Rate")');
    if (await collectBtn.isVisible()) {
      await collectBtn.click();
      await page.waitForTimeout(500);
      await page.locator('button:has-text("SAVE LOG")').click();
      await page.waitForTimeout(3000);
      log('COLLECT', 'First strain collected!');
    }
  }

  // ========================================
  // 4. CHECK COLLECTION
  // ========================================
  log('CHECK', '--- 4. Check Collection Counter ---');

  await page.goto(`${BASE_URL}/collection`);
  await page.waitForTimeout(2000);

  const collCounter = await page.locator('.neon-text-green').first().textContent().catch(() => 'not found');
  log('CHECK', `Collection counter: ${collCounter}`);

  // ========================================
  // 5. CREATE COMMUNITY
  // ========================================
  log('COMMUNITY', '--- 5. Create Community ---');

  await page.goto(`${BASE_URL}/community/new`);
  await page.waitForTimeout(2000);
  log('COMMUNITY', `URL: ${page.url()}`);

  const nameInput = await page.locator('input[name*="name"], input[placeholder*="Name"]').first();
  if (await nameInput.isVisible({ timeout: 1000 }).catch(() => false)) {
    await nameInput.fill(`Test Community ${timestamp}`);
    await page.waitForTimeout(300);

    const createBtn = await page.locator('button:has-text("Erstellen"), button:has-text("Create")').first();
    if (await createBtn.isVisible()) {
      await createBtn.click();
      await page.waitForTimeout(3000);
      log('COMMUNITY', `Created! URL: ${page.url()}`);
    }
  } else {
    log('COMMUNITY', 'Form not visible');
  }

  // ========================================
  // 6. CREATE STRAIN
  // ========================================
  log('STRAIN', '--- 6. Create Strain ---');

  await page.goto(`${BASE_URL}/strains`);
  await page.waitForTimeout(2000);

  // Click the last FAB button (create)
  const fab = await page.locator('button').filter({ has: page.locator('svg') }).last();
  if (await fab.isVisible({ timeout: 1000 }).catch(() => false)) {
    await fab.click({ force: true });
    await page.waitForTimeout(2000);
    log('STRAIN', `Create URL: ${page.url()}`);

    const strainName = await page.locator('input[name*="name"], input[placeholder*="Sorte"]').first();
    if (await strainName.isVisible({ timeout: 1000 }).catch(() => false)) {
      await strainName.fill(`My Custom Strain ${timestamp}`);
      await page.waitForTimeout(300);

      const saveBtn = await page.locator('button:has-text("Speichern"), button:has-text("Save")').first();
      if (await saveBtn.isVisible()) {
        await saveBtn.click();
        await page.waitForTimeout(3000);
        log('STRAIN', `Created! URL: ${page.url()}`);
      }
    }
  }

  // ========================================
  // 7. PROFILE
  // ========================================
  log('PROFILE', '--- 7. Profile ---');

  await page.goto(`${BASE_URL}/profile`);
  await page.waitForTimeout(2000);

  const profileName = await page.locator('h1').first().textContent().catch(() => 'not found');
  const badges = await page.locator('[class*="Badge"]').count();
  log('PROFILE', `Profile: ${profileName}, Badges: ${badges}`);

  // ========================================
  // FINAL
  // ========================================
  log('FINAL', '===========================================');
  log('FINAL', '           TEST COMPLETE');
  log('FINAL', `New User: ${NEW_EMAIL}`);
  log('FINAL', '===========================================');

  if (errors.length > 0) {
    log('ERRORS', `Critical errors: ${errors.length}`);
    errors.slice(0, 5).forEach(e => log('ERR', `  ${e}`));
  } else {
    log('SUCCESS', 'No critical errors!');
  }

  await page.screenshot({ path: '/tmp/test-newuser-result.png', fullPage: true });

} catch (err) {
  log('FATAL', `Failed: ${err.message}`);
  await page.screenshot({ path: '/tmp/test-newuser-error.png' });
} finally {
  await browser.close();
  log('DONE', 'Complete');
}