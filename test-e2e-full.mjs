/**
 * Comprehensive E2E Test Script für GreenLog
 * Testet alle Features wie ein echter User - inklusive NEW USER Flow
 *
 * Usage: node test-e2e-full.mjs
 *
 * Voraussetzungen:
 * - npm install playwright
 * - Dev Server laufen auf localhost:3000
 * - Alternativ: BASE_URL auf Vercel URL ändern
 */

import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:3000'; // Ändern für Vercel: 'https://green-log-two.vercel.app'

// Generiere unique email für neuen User
const timestamp = Date.now();
const NEW_USER_EMAIL = `testuser${timestamp}@test.com`;
const NEW_USER_PASSWORD = 'Test123456!';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
const page = await context.newPage();

// Helper function for logging
const log = (section, message) => console.log(`\n[${section}] ${message}`);

// Track errors
const errors = [];
page.on('console', msg => {
  if (msg.type() === 'error') {
    errors.push(`[${new Date().toISOString()}] ${msg.text()}`);
  }
});

page.on('dialog', async dialog => {
  log('ALERT', `Dialog: ${dialog.message()}`);
  await dialog.accept();
});

// ========================================
// 1. REGISTRATION (NEUER USER)
// ========================================
async function registerNewUser() {
  log('REGISTER', '=== 1. Registriere neuen User ===');

  await page.goto(`${BASE_URL}/login`);
  await page.waitForLoadState('networkidle');

  // Warte auf Login Form
  await page.waitForTimeout(1000);

  // Check ob registrieren link existiert
  const registerLink = await page.locator('a[href*="register"], a[href*="signup"], button:has-text("Registrieren"), button:has-text("Sign up")').first();
  if (await registerLink.isVisible()) {
    log('REGISTER', 'Klicke auf Registrieren...');
    await registerLink.click();
    await page.waitForTimeout(1500);
  }

  // Alternative: Scrolle zum Login Form und suche nach Register Link
  const pageContent = await page.content();
  if (pageContent.includes('registrieren') || pageContent.includes('sign up') || pageContent.includes('Sign up')) {
    log('REGISTER', 'Registrieren Link gefunden');
  }

  // Fill registration form if visible
  const emailInput = await page.locator('input[type="email"], input[name="email"], input[placeholder*="E-Mail"]').first();
  if (await emailInput.isVisible()) {
    log('REGISTER', 'Fülle Registrierungsformular...');
    await emailInput.fill(NEW_USER_EMAIL);

    const passwordInput = await page.locator('input[type="password"], input[name="password"]').first();
    await passwordInput.fill(NEW_USER_PASSWORD);

    const passwordConfirm = await page.locator('input[name*="confirm"], input[name*="repeat"], input[name*="password2"]').first();
    if (await passwordConfirm.isVisible()) {
      await passwordConfirm.fill(NEW_USER_PASSWORD);
    }

    const submitBtn = await page.locator('button[type="submit"], button:has-text("Registrieren"), button:has-text("Sign up")').first();
    await submitBtn.click();
    await page.waitForTimeout(3000);

    log('REGISTER', `Registrierung abgeschlossen: ${NEW_USER_EMAIL}`);
  } else {
    log('REGISTER', 'Registration form nicht direkt sichtbar - versuche Login direkt');
    await emailInput.fill(NEW_USER_EMAIL);
    await page.locator('input[type="password"]').first().fill(NEW_USER_PASSWORD);
    await page.locator('button[type="submit"]').first().click();
    await page.waitForTimeout(3000);
  }

  return page.url().includes('/onboarding') || page.url() !== `${BASE_URL}/login`;
}

// ========================================
// 2. ONBOARDING FLOW (NEUER USER)
// ========================================
async function completeOnboarding() {
  log('ONBOARDING', '=== 2. Onboarding Flow ===');

  const skipBtn = await page.locator('button:has-text("Überspringen"), button:has-text("Skip"), button:has-text("Weiter")').first();
  if (await skipBtn.isVisible()) {
    log('ONBOARDING', 'Überspringe Onboarding...');
    await skipBtn.click();
    await page.waitForTimeout(1000);
  }

  // Mehrere Steps durchlaufen
  for (let i = 0; i < 5; i++) {
    const nextBtn = await page.locator('button:has-text("Weiter"), button:has-text("Next"), button:has-text("Fortfahren"), button:has-text("Starten")').first();
    if (await nextBtn.isVisible()) {
      await nextBtn.click();
      await page.waitForTimeout(500);
    }
  }

  log('ONBOARDING', `Onboarding abgeschlossen, URL: ${page.url()}`);
}

// ========================================
// 3. AGE GATE
// ========================================
async function passAgeGate() {
  log('AGE', '=== Age Gate ===');

  const yearSelect = await page.locator('select').first();
  if (await yearSelect.isVisible()) {
    await yearSelect.selectOption('1990');
    log('AGE', 'Selected birth year 1990');
  }

  const ageBtn = await page.locator('button:has-text("Alter bestätigen"), button:has-text("Confirm"), button:has-text("Weiter")').first();
  if (await ageBtn.isVisible()) {
    await ageBtn.click();
    await page.waitForTimeout(500);
    log('AGE', 'Age Gate bestanden');
  }
}

// ========================================
// MAIN TEST FLOW
// ========================================
try {
  // TEST NEUER USER REGISTRATION
  log('TEST', '===========================================');
  log('TEST', '   GREENLOG E2E TEST - NEW USER FLOW');
  log('TEST', '===========================================');

  const isNewUser = true; // Flag für neuen User Test

  if (isNewUser) {
    // Registriere neuen User
    await registerNewUser();

    // Complete onboarding
    await completeOnboarding();

    // Pass age gate
    await passAgeGate();

    // ========================================
    // NEW USER: Erste Strain sammeln (FIRST BADGE test)
    // ========================================
    log('TEST', '=== NEW USER: Erste Strain sammeln ===');

    await page.goto(`${BASE_URL}/strains`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Sammle erste Strain
    const firstStrain = await page.locator('[class*="StrainCard"]').first();
    if (await firstStrain.isVisible()) {
      log('NEWUSER', 'Klicke auf erste Strain...');
      await firstStrain.click();
      await page.waitForTimeout(2000);

      // Collect & Rate
      const collectBtn = await page.locator('button:has-text("Collect & Rate")');
      if (await collectBtn.isVisible()) {
        await collectBtn.click();
        await page.waitForTimeout(500);

        const saveBtn = await page.locator('button:has-text("SAVE LOG")');
        if (await saveBtn.isVisible()) {
          await saveBtn.click();
          await page.waitForTimeout(3000);
          log('NEWUSER', 'Erste Strain gesammelt! (Greenie Badge sollte freigeschaltet sein)');
        }
      }
    }

    // Prüfe Badge Notification
    const badgeNotif = await page.locator('text=/Badges?, ?neu/i').count();
    log('NEWUSER', `Badge Benachrichtigung sichtbar: ${badgeNotif > 0}`);

    // Gehe zu Collection und prüfe Counter
    await page.goto(`${BASE_URL}/collection`);
    await page.waitForTimeout(2000);
    const newUserCollectionCount = await page.locator('.neon-text-green').first().textContent().catch(() => 'not found');
    log('NEWUSER', `Neuer User Collection Counter: ${newUserCollectionCount}`);
  }

  // ========================================
  // EXISTING USER: Login und alle Features testen
  // ========================================
  log('TEST', '===========================================');
  log('TEST', '   GREENLOG E2E TEST - EXISTING USER');
  log('TEST', '===========================================');

  const EXISTING_EMAIL = 'Hintermaier.pascal@gmail.com';
  const EXISTING_PASSWORD = '123456';

  // Logout und als existierender User einloggen
  await page.goto(`${BASE_URL}/profile`);
  await page.waitForTimeout(1000);

  // Alternativ: einfach einloggen
  await page.goto(`${BASE_URL}/login`);
  await passAgeGate();

  log('LOGIN', 'Logge ein als existierender User...');
  await page.locator('input[type="email"]').fill(EXISTING_EMAIL);
  await page.locator('input[type="password"]').fill(EXISTING_PASSWORD);
  await page.locator('button[type="submit"]').click();
  await page.waitForTimeout(3000);
  log('LOGIN', `Eingeloggt, URL: ${page.url()}`);

  // ========================================
  // 1. STRAINS CATALOG
  // ========================================
  log('TEST', '=== 1. Strains Catalog ===');

  await page.goto(`${BASE_URL}/strains`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  const counter = await page.locator('.neon-text-green').first().textContent().catch(() => 'not found');
  log('STRAINS', `Counter shows: ${counter}`);

  // Test search
  await page.locator('input[placeholder*="suchen"]').fill('gorilla');
  await page.waitForTimeout(500);
  const searchResults = await page.locator('[class*="StrainCard"]').count();
  log('STRAINS', `Search "gorilla": ${searchResults} results`);
  await page.locator('input[placeholder*="suchen"]').clear();

  // ========================================
  // 2. STRAIN DETAIL & COLLECT
  // ========================================
  log('TEST', '=== 2. Strain Detail & Collect ===');

  await page.goto(`${BASE_URL}/strains/amnesia`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  const alreadyCollected = await page.locator('button:has-text("In Collection")').count();
  if (alreadyCollected > 0) {
    log('STRAIN', 'Already collected');
  } else {
    const collectBtn = await page.locator('button:has-text("Collect & Rate")');
    if (await collectBtn.isVisible()) {
      await collectBtn.click();
      await page.waitForTimeout(500);
      await page.locator('button:has-text("SAVE LOG")').click();
      await page.waitForTimeout(3000);
      log('STRAIN', 'Collected Amnesia');
    }
  }

  // ========================================
  // 3. COLLECTION PAGE
  // ========================================
  log('TEST', '=== 3. Collection Page ===');

  await page.goto(`${BASE_URL}/collection`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  const collectionCounter = await page.locator('.neon-text-green').first().textContent().catch(() => 'not found');
  log('COLLECTION', `Counter: ${collectionCounter}`);

  // Test filter
  const apothekeFilter = await page.locator('button:has-text("Apotheke")').first();
  if (await apothekeFilter.isVisible()) {
    await apothekeFilter.click();
    await page.waitForTimeout(500);
    log('COLLECTION', 'Filter: Apotheke');
  }

  // ========================================
  // 4. NAVIGATION
  // ========================================
  log('TEST', '=== 4. Bottom Navigation ===');

  for (const href of ['/', '/strains', '/collection', '/feed', '/profile']) {
    await page.locator(`nav a[href="${href}"]`).click();
    await page.waitForTimeout(800);
    log('NAV', `${href} -> ${page.url()}`);
  }

  // ========================================
  // 5. PROFILE & BADGES
  // ========================================
  log('TEST', '=== 5. Profile & Badges ===');

  await page.goto(`${BASE_URL}/profile`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  const badges = await page.locator('[class*="BadgeCard"]').count();
  log('PROFILE', `Badge cards: ${badges}`);

  // ========================================
  // 6. SOCIAL FEATURES
  // ========================================
  log('TEST', '=== 6. Social / Feed ===');

  await page.goto(`${BASE_URL}/feed`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  log('FEED', `Loaded: ${(await page.locator('main').textContent()).length > 50}`);

  // ========================================
  // 7. DISCOVER
  // ========================================
  log('TEST', '=== 7. Discover ===');

  await page.goto(`${BASE_URL}/discover`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  log('DISCOVER', `Loaded: ${(await page.locator('main').textContent()).length > 50}`);

  // ========================================
  // 8. STRAIN COMPARE
  // ========================================
  log('TEST', '=== 8. Strain Compare ===');

  await page.goto(`${BASE_URL}/strains/compare?slugs=gorilla-glue,amnesia`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  log('COMPARE', `Loaded: ${(await page.locator('main').textContent()).length > 50}`);

  // ========================================
  // 9. SCANNER
  // ========================================
  log('TEST', '=== 9. Scanner ===');

  await page.goto(`${BASE_URL}/scanner`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  log('SCANNER', `Loaded: ${(await page.locator('main').textContent()).length > 50}`);

  // ========================================
  // 10. ORGANIZATION SETTINGS
  // ========================================
  log('TEST', '=== 10. Organization Settings ===');

  await page.goto(`${BASE_URL}/settings/organization`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  log('ORG', `Loaded: ${(await page.locator('main').textContent()).length > 50}`);

  // ========================================
  // 11. ANALYTICS
  // ========================================
  log('TEST', '=== 11. Analytics ===');

  await page.goto(`${BASE_URL}/settings/organization/analytics`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  log('ANALYTICS', `Loaded: ${(await page.locator('main').textContent()).length > 50}`);

  // ========================================
  // FINAL COUNTER CHECK
  // ========================================
  log('FINAL', '=== Final Counter Check ===');

  await page.goto(`${BASE_URL}/strains`);
  await page.waitForTimeout(2000);
  log('FINAL', `Strains Counter: ${await page.locator('.neon-text-green').first().textContent().catch(() => 'not found')}`);

  await page.goto(`${BASE_URL}/collection`);
  await page.waitForTimeout(2000);
  log('FINAL', `Collection Counter: ${await page.locator('.neon-text-green').first().textContent().catch(() => 'not found')}`);

  // ========================================
  // RESULTS
  // ========================================
  log('RESULTS', '===========================================');
  log('RESULTS', '                 TEST COMPLETE');
  log('RESULTS', '===========================================');

  if (errors.length > 0) {
    log('ERRORS', `Found ${errors.length} console errors:`);
    errors.slice(0, 15).forEach(e => log('ERROR', `  ${e.substring(0, 200)}`));
    if (errors.length > 15) log('ERROR', `  ... and ${errors.length - 15} more`);
  } else {
    log('SUCCESS', 'No console errors detected!');
  }

  await page.screenshot({ path: '/tmp/test-final.png', fullPage: true });
  log('SCREENSHOT', 'Saved to /tmp/test-final.png');

} catch (error) {
  log('FATAL', `Test failed: ${error.message}`);
  await page.screenshot({ path: '/tmp/test-error.png' });
} finally {
  await browser.close();
  log('DONE', 'Browser closed');
}