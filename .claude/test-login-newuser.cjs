const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  console.log('1. Navigating to sign-in on 3010...');
  await page.goto('http://localhost:3010/sign-in', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForTimeout(5000);

  console.log('2. Current URL:', page.url());

  const result = await page.evaluate(() => {
    const emailInput = document.querySelector('input[name="identifier"]');
    const passInput = document.querySelector('input[name="password"]');
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.trim() === 'Continue');

    if (!emailInput) return 'NO_EMAIL_INPUT';
    if (!passInput) return 'NO_PASS_INPUT';
    if (!btn) return 'NO_BUTTON';

    const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    nativeSetter.call(emailInput, 'playwright-test-final@example.com');
    emailInput.dispatchEvent(new Event('input', { bubbles: true }));

    btn.click();
    return 'CLICKED';
  });

  console.log('3. Evaluate result:', result);
  await page.waitForTimeout(6000);

  console.log('4. URL after wait:', page.url());
  const bodyText = await page.textContent('body');
  console.log('5. Body preview:', bodyText.slice(0, 400));

  if (bodyText.includes("Couldn't find your account")) {
    console.log('RESULT: FAILED - account not found');
  } else if (bodyText.includes('Password')) {
    console.log('RESULT: SUCCESS - password step shown');
  } else if (page.url() !== 'http://localhost:3010/sign-in') {
    console.log('RESULT: SUCCESS - redirected to', page.url());
  }

  await browser.close();
  process.exit(0);
})();