import { test, expect } from '@playwright/test';

const USER_EMAIL = 'pascal.hintermaier@gmail.com';
const USER_PASSWORD = '123456';

test.describe('GreenLog Inspection', () => {
  test('login and inspect grows timeline', async ({ page }) => {
    test.setTimeout(120000);

    // Collect console logs
    const consoleLogs: string[] = [];
    page.on('console', msg => {
      consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
    });

    // Collect errors
    const errors: string[] = [];
    page.on('pageerror', error => {
      errors.push(error.message);
    });

    // 1. Go to sign-in directly (login page redirects here)
    await page.goto('http://localhost:3001/sign-in', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    console.log('SIGN-IN PAGE URL:', page.url());
    await page.screenshot({ path: '/tmp/signin-page.png' });

    // 2. Handle age gate if shown
    const yearSelect = page.locator('select').first();
    if (await yearSelect.isVisible({ timeout: 3000 }).catch(() => false)) {
      await yearSelect.selectOption('1990');
      const ageBtn = page.getByRole('button', { name: /Alter bestätigen/i });
      if (await ageBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await ageBtn.click();
        await page.waitForTimeout(1000);
      }
    }

    // 3. Handle cookie consent
    const cookieBtn = page.getByRole('button', { name: /Alle akzeptieren/i });
    if (await cookieBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await cookieBtn.click();
      await page.waitForTimeout(1000);
    }

    // 4. Fill login form
    console.log('Filling login form...');
    
    // Try different selectors for email/password
    const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="Email" i], input[placeholder*="E-Mail" i]').first();
    const passwordInput = page.locator('input[type="password"], input[name="password"], input[placeholder*="Password" i], input[placeholder*="Passwort" i]').first();
    
    const emailVisible = await emailInput.isVisible({ timeout: 5000 }).catch(() => false);
    const passwordVisible = await passwordInput.isVisible({ timeout: 3000 }).catch(() => false);
    
    console.log('Email input visible:', emailVisible);
    console.log('Password input visible:', passwordVisible);

    if (emailVisible && passwordVisible) {
      await emailInput.fill(USER_EMAIL);
      await passwordInput.fill(USER_PASSWORD);
      
      // Find submit button
      const submitBtn = page.getByRole('button', { name: /continue|weiter|login|anmelden|sign in|einloggen/i });
      if (await submitBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await submitBtn.click();
      } else {
        // Try any button
        const anyBtn = page.locator('button').first();
        if (await anyBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
          await anyBtn.click();
        }
      }
    } else {
      // Screenshot to see what's on page
      await page.screenshot({ path: '/tmp/signin-form.png' });
      console.log('Could not find email/password inputs');
      
      // Try to find the form structure
      const allInputs = page.locator('input');
      const inputCount = await allInputs.count();
      console.log('Number of inputs found:', inputCount);
      
      for (let i = 0; i < inputCount; i++) {
        const type = await allInputs.nth(i).getAttribute('type');
        const placeholder = await allInputs.nth(i).getAttribute('placeholder');
        const name = await allInputs.nth(i).getAttribute('name');
        console.log(`Input ${i}: type=${type}, placeholder=${placeholder}, name=${name}`);
      }
    }

    // Wait for redirect after login
    await page.waitForTimeout(5000);
    console.log('AFTER LOGIN URL:', page.url());
    await page.screenshot({ path: '/tmp/after-login.png' });

    // 5. Navigate to grows
    await page.goto('http://localhost:3000/grows', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    console.log('GROWS PAGE URL:', page.url());
    await page.screenshot({ path: '/tmp/grows-page.png' });

    // 6. Check if there are any grows
    const growLinks = page.locator('a[href*="/grows/"]');
    const growCount = await growLinks.count();
    console.log('NUMBER OF GROW LINKS:', growCount);

    // Check for "Keine aktiven Grows" message
    const noGrowsText = await page.getByText(/Keine aktiven Grows|No grows yet|Noch keine Grows/i).isVisible({ timeout: 3000 }).catch(() => false);
    console.log('NO GROWS MESSAGE VISIBLE:', noGrowsText);

    if (growCount > 0) {
      // Click first grow
      const firstGrowHref = await growLinks.first().getAttribute('href');
      console.log('FIRST GROW HREF:', firstGrowHref);
      
      await growLinks.first().click();
      await page.waitForURL(/\/grows\/[^/]+$/, { timeout: 10000 });
      await page.waitForTimeout(3000);
      console.log('GROW DETAIL URL:', page.url());
      await page.screenshot({ path: '/tmp/grow-detail.png', fullPage: true });

      // 7. Check for TimelineSection
      const timelineSection = page.locator('[class*="timeline-section"], [class*="TimelineSection"]');
      const timelineVisible = await timelineSection.isVisible({ timeout: 5000 }).catch(() => false);
      console.log('TIMELINE SECTION VISIBLE:', timelineVisible);

      // 8. Check for filter chips
      const filterChips = page.getByRole('button', { name: /Alle|Gießen|Füttern|Fotos|Notizen|pH\/EC/i });
      const chipCount = await filterChips.count();
      console.log('FILTER CHIP COUNT:', chipCount);

      // 9. Check for photo highlights
      const photoHighlights = page.locator('text="Foto-Highlights"');
      const photosVisible = await photoHighlights.isVisible({ timeout: 3000 }).catch(() => false);
      console.log('PHOTO HIGHLIGHTS VISIBLE:', photosVisible);

      // 10. Check for entries
      const entries = page.locator('[class*="timeline-entry"], [class*="TimelineEntry"]');
      const entryCount = await entries.count();
      console.log('TIMELINE ENTRY COUNT:', entryCount);

      // 11. Check for "Noch keine Einträge" message
      const noEntriesText = await page.getByText(/Noch keine Einträge|Keine Einträge|No entries yet/i).isVisible({ timeout: 3000 }).catch(() => false);
      console.log('NO ENTRIES MESSAGE VISIBLE:', noEntriesText);

      // 12. Check page body text for clues
      const pageText = await page.textContent('body');
      console.log('PAGE TEXT (first 1000 chars):', pageText?.substring(0, 1000));

      // 13. Check for image errors
      const imgErrors = page.locator('img').evaluateAll(
        (imgs) => imgs.filter(img => img.naturalWidth === 0).length
      );
      console.log('IMAGES WITH 0 WIDTH:', await imgErrors);

      // 14. Check console for specific errors
      const relevantErrors = consoleLogs.filter(log => 
        log.includes('error') || log.includes('Error') || log.includes('fail') || log.includes('401') || log.includes('403')
      );
      console.log('RELEVANT CONSOLE LOGS:', relevantErrors.slice(0, 20));

      // 15. Check network requests to media endpoints
      const mediaRequests = consoleLogs.filter(log => log.includes('/media/') || log.includes('storage.cannalog'));
      console.log('MEDIA REQUESTS:', mediaRequests.slice(0, 10));

      // Final full page screenshot
      await page.screenshot({ path: '/tmp/final-inspection.png', fullPage: true });
    } else {
      console.log('NO GROWS FOUND');
      const pageText = await page.textContent('body');
      console.log('PAGE TEXT:', pageText?.substring(0, 1000));
    }

    // Print all console logs at the end
    console.log('\n=== ALL CONSOLE LOGS ===');
    consoleLogs.forEach(log => console.log(log));
    
    console.log('\n=== ALL ERRORS ===');
    errors.forEach(err => console.log(err));
  });
});
