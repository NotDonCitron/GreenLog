import { test, expect } from "@playwright/test";

test.describe("GreenLog App", () => {
  test("Home page loads without crash", async ({ page }) => {
    await page.goto("/");

    // Should show CannaLog branding
    await expect(page.getByText("CannaLog")).toBeVisible();

    // Should show bottom navigation links
    const nav = page.locator("nav");
    await expect(nav.getByText("Home")).toBeVisible();
    await expect(nav.getByText("Strains")).toBeVisible();
    await expect(nav.getByText("Social")).toBeVisible();
    await expect(nav.getByText("Profil")).toBeVisible();

    // Should NOT show a completely blank page
    const body = page.locator("body");
    await expect(body).not.toBeEmpty();
  });

  test("Login page loads", async ({ page }) => {
    await page.goto("/login");

    // Should show login elements
    await expect(page.getByText("CannaLog")).toBeVisible();
  });

  test("Scanner page loads", async ({ page }) => {
    await page.goto("/scanner");

    // Should show scanner UI
    await expect(page.getByText("Smart Scanner")).toBeVisible({ timeout: 10000 });
  });

  test("Scanner test page loads", async ({ page }) => {
    await page.goto("/scanner/test");

    // Should show test center
    await expect(page.getByRole("heading", { name: "Scanner Test-Zentrum" })).toBeVisible();

    // Should show static test labels
    await expect(page.getByRole("heading", { name: "GODFATHER OG", exact: true })).toBeVisible();
  });

  test("Strains page loads", async ({ page }) => {
    await page.goto("/strains");

    // Should show page heading
    await expect(page.getByRole("heading", { name: /Strains/i })).toBeVisible({ timeout: 10000 });
  });

  test("Bottom navigation links work", async ({ page }) => {
    await page.goto("/");

    // Navigate to Strains via nav link
    await page.locator("nav").getByText("Strains").click();
    await expect(page).toHaveURL(/\/strains/);

    // Navigate to Sammlung via nav link
    await page.locator("nav").getByText("Sammlung").click();
    await expect(page).toHaveURL(/\/collection/);
  });

  test("No console errors on home page load", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        errors.push(msg.text());
      }
    });

    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Filter out known non-critical errors
    const criticalErrors = errors.filter(
      (e) =>
        !e.includes("favicon") &&
        !e.includes("manifest") &&
        !e.includes("ERR_BLOCKED") &&
        !e.includes("third-party") &&
        !e.includes("hydrat")
    );

    expect(criticalErrors).toHaveLength(0);
  });
});

test.describe("Navigation", () => {
  test("Can navigate between main routes", async ({ page }) => {
    await page.goto("/");

    const routes = ["/", "/strains", "/collection", "/feed"];

    for (const route of routes) {
      await page.goto(route);
      await page.waitForLoadState("domcontentloaded");

      // Page should not crash (body should have content)
      const body = page.locator("body");
      await expect(body).not.toBeEmpty();

      // Should not show error boundary text
      await expect(page.getByText("Something went wrong")).not.toBeVisible({
        timeout: 2000,
      });
    }
  });
});
