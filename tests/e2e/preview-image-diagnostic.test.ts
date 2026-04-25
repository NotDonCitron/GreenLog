import { test, expect } from "@playwright/test";

test.describe("Preview image diagnostic", () => {
  test("capture network and console for image requests", async ({ page }) => {
    const imageRequests: Array<{
      url: string;
      status: number | null;
      contentType: string | null;
      error: string | null;
    }> = [];
    const consoleErrors: string[] = [];

    page.on("request", (req) => {
      const url = req.url();
      const resourceType = req.resourceType();
      if (resourceType === "image" || url.includes("/media/")) {
        imageRequests.push({ url, status: null, contentType: null, error: null });
      }
    });

    page.on("response", (res) => {
      const url = res.url();
      const idx = imageRequests.findIndex((r) => r.url === url);
      if (idx !== -1) {
        imageRequests[idx].status = res.status();
        imageRequests[idx].contentType = res.headers()["content-type"] || null;
      }
    });

    page.on("requestfailed", (req) => {
      const url = req.url();
      const idx = imageRequests.findIndex((r) => r.url === url);
      if (idx !== -1) {
        imageRequests[idx].error = req.failure()?.errorText || "unknown";
      }
    });

    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    // Navigate to the preview deployment
    await page.goto("https://green-itq3zy2gh-phhttps-projects.vercel.app", {
      waitUntil: "networkidle",
      timeout: 60000,
    });

    // Scroll to trigger lazy-loaded images
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(3000);

    console.log("=== IMAGE REQUESTS ===");
    for (const r of imageRequests) {
      console.log(JSON.stringify(r));
    }

    console.log("=== CONSOLE ERRORS ===");
    for (const e of consoleErrors) {
      console.log(e);
    }

    // Fail intentionally so the logs are surfaced in the test output
    expect(true).toBe(true);
  });
});
