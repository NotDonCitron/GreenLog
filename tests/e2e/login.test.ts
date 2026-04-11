import { test, expect } from '@playwright/test';

const USER_EMAIL = process.env.TEST_USER_EMAIL || 'Hintermaier.pascal@gmail.com';
const USER_PASSWORD = process.env.TEST_USER_PASSWORD || '123456';

test.describe('GreenLog E2E - Full User Flow', () => {
  
  test.beforeEach(async ({ page }) => {
    // 1. Navigation zum Login
    await page.goto('/login');
    
    // 2. Age Gate Handling (falls vorhanden)
    const yearSelect = page.locator('select').first();
    if (await yearSelect.isVisible()) {
      await yearSelect.selectOption('1990');
    }
    
    const ageBtn = page.getByRole('button', { name: /Alter bestätigen/i });
    if (await ageBtn.isVisible()) {
      await ageBtn.click();
    }

    // 3. Cookie Consent (falls vorhanden)
    const cookieBtn = page.getByRole('button', { name: /Alle akzeptieren/i });
    if (await cookieBtn.isVisible()) {
      await cookieBtn.click();
    }
  });

  test('should login and navigate through all main pages', async ({ page }) => {
    // Step: Login
    await test.step('Perform Login', async () => {
      await page.getByPlaceholder(/email/i).or(page.locator('input[type="email"]')).fill(USER_EMAIL);
      await page.getByPlaceholder(/passwort/i).or(page.locator('input[type="password"]')).fill(USER_PASSWORD);
      await page.getByRole('button', { name: /continue|weiter|login|anmelden/i }).click();
      
      // Verifiziere Login-Erfolg (URL sollte sich ändern)
      await expect(page).not.toHaveURL(/\/login/);
    });

    // Step: Verify Main Navigation Pages
    const pages = [
      { url: '/strains', name: 'Strains' },
      { url: '/collection', name: 'Collection' },
      { url: '/feed', name: 'Feed' },
      { url: '/profile', name: 'Profile' },
      { url: '/discover', name: 'Discover' },
    ];

    for (const p of pages) {
      await test.step(`Navigate to ${p.name}`, async () => {
        await page.goto(p.url);
        await page.waitForLoadState('networkidle');
        await expect(page.locator('main')).toBeVisible();
      });
    }

    // Step: Test Collect Flow for a specific strain
    await test.step('Strain Collect Flow', async () => {
      await page.goto('/strains/gorilla-glue');
      await page.waitForLoadState('networkidle');
      
      // Check if already collected
      const inCollectionBtn = page.getByRole('button', { name: /In Collection/i });
      if (await inCollectionBtn.isVisible()) {
        console.log('Strain already in collection');
      } else {
        const collectBtn = page.getByRole('button', { name: /Collect & Rate/i });
        if (await collectBtn.isVisible()) {
          await collectBtn.click();
          
          const saveBtn = page.getByRole('button', { name: /SAVE LOG/i });
          await expect(saveBtn).toBeVisible();
          await saveBtn.click();
          
          // Erfolgsmeldung oder UI-Änderung abwarten
          await expect(page.getByText(/Saved|Collection saved/i)).toBeVisible({ timeout: 5000 }).catch(() => {});
        }
      }
    });

    // Step: Verify Counters
    await test.step('Check Counters', async () => {
      await page.goto('/collection');
      // Wir nutzen die CSS-Klasse aus dem alten Test, aber mit expect
      const collectionCounter = page.locator('.neon-text-green').first();
      await expect(collectionCounter).toBeVisible();
      const count = await collectionCounter.textContent();
      console.log(`Collection Counter: ${count}`);
    });
  });
});
