const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  console.log('1. Navigating to sign-in...');
  await page.goto('http://localhost:3010/sign-in', { waitUntil: 'domcontentloaded', timeout: 20000 });

  // Wait longer for Clerk to load
  console.log('2. Waiting 10s for Clerk to initialize...');
  await page.waitForTimeout(10000);

  console.log('3. Current URL:', page.url());

  const result = await page.evaluate(() => {
    const emailInput = document.querySelector('input[name="identifier"]');
    const passInput = document.querySelector('input[name="password"]');
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.trim() === 'Continue');

    return {
      hasEmail: !!emailInput,
      hasPass: !!passInput,
      hasButton: !!btn,
      bodyText: document.body.innerText.slice(0, 200)
    };
  });

  console.log('4. Email input:', result.hasEmail);
  console.log('5. Pass input:', result.hasPass);
  console.log('6. Button:', result.hasButton);
  console.log('7. Body preview:', result.bodyText);

  if (!result.hasEmail || !result.hasPass || !result.hasButton) {
    console.log('RESULT: Clerk not loaded yet');
    await browser.close();
    process.exit(1);
  }

  // Fill credentials
  await page.evaluate(() => {
    const emailInput = document.querySelector('input[name="identifier"]');
    const passInput = document.querySelector('input[name="password"]');
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.trim() === 'Continue');

    const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    nativeSetter.call(emailInput, 'playwright-test-final@example.com');
    emailInput.dispatchEvent(new Event('input', { bubbles: true }));

    btn.click();
  });

  console.log('8. Clicked continue, waiting 6s...');
  await page.waitForTimeout(6000);

  console.log('9. URL after wait:', page.url());
  const bodyText = await page.textContent('body');
  console.log('10. Body preview:', bodyText.slice(0, 400));

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