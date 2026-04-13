const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  console.log('1. Navigating to sign-in on 3000...');
  await page.goto('http://localhost:3000/sign-in', { waitUntil: 'domcontentloaded', timeout: 20000 });

  console.log('2. Waiting 10s for Clerk...');
  await page.waitForTimeout(10000);

  console.log('3. URL:', page.url());
  console.log('4. Title:', await page.title());

  // Check if page has any content
  const html = await page.content();
  console.log('5. HTML length:', html.length);
  console.log('6. HTML preview:', html.slice(0, 500));

  // Check for Clerk script tags
  const hasClerkScript = await page.evaluate(() => {
    return !!document.querySelector('script[src*="clerk"]');
  });
  console.log('7. Has Clerk script:', hasClerkScript);

  // Check for error boundary
  const bodyText = await page.evaluate(() => document.body.innerText);
  console.log('8. Body text:', bodyText.slice(0, 300));

  // Wait more
  await page.waitForTimeout(5000);
  console.log('9. URL after extra wait:', page.url());

  await browser.close();
  process.exit(0);
})();