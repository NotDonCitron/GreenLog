const { clerkSetup } = require('@clerk/testing/playwright');

/**
 * Global setup for Playwright E2E tests with Clerk authentication.
 *
 * Runs once before all tests. Calls clerkSetup() from @clerk/testing which
 * sets CLERK_FAPI and CLERK_TESTING_TOKEN env vars to bypass Cloudflare
 * Turnstile protection during localhost testing.
 */
module.exports = async () => {
  await clerkSetup();
};