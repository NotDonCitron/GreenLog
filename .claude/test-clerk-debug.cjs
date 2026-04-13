const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Collect console messages
  const consoleLogs = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleLogs.push(`ERROR: ${msg.text()}`);
    }
  });

  page.on('pageerror', err => {
    consoleLogs.push(`PAGE ERROR: ${err.message}`);
  });

  console.log('1. Navigating to sign-in...');
  await page.goto('http://localhost:3000/sign-in', { waitUntil: 'load', timeout: 20000 });

  console.log('2. Waiting 12s...');
  await page.waitForTimeout(12000);

  console.log('3. URL:', page.url());

  // Get all console errors
  console.log('4. Console errors:');
  consoleLogs.forEach(l => console.log('  ', l));

  // Check for Next.js error overlay
  const errorOverlay = await page.$('#nextjs__error_overlay');
  console.log('5. Error overlay present:', !!errorOverlay);

  // Get page HTML
  const html = await page.content();
  console.log('6. HTML length:', html.length);

  // Check what's in body
  const bodyHTML = await page.evaluate(() => document.body ? document.body.innerHTML.slice(0, 1000) : 'no body');
  console.log('7. Body HTML:', bodyHTML);

  await browser.close();
  process.exit(0);
})();