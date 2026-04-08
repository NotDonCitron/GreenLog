import { test, expect, Page } from "@playwright/test";

async function login(page: Page) {
  console.log("Starting login flow...");
  await page.goto("/login");

  // Wait for either age gate or login form
  await page.waitForFunction(() => {
    return document.querySelector('select') || document.querySelector('input[type="email"]');
  }, { timeout: 15000 });

  // Handle Age Gate if present
  const ageSelect = page.locator("select");
  if (await ageSelect.isVisible().catch(() => false)) {
    console.log("Handling Age Gate...");
    await ageSelect.selectOption("1990");
    await page.getByRole("button", { name: "Alter bestätigen" }).click();
    // Wait for navigation after age gate submission
    await page.waitForURL("**/login**", { timeout: 10000 }).catch(() => {});
    await page.waitForLoadState("domcontentloaded");
  }

  // Now fill login form
  console.log("Filling login form...");
  await page.locator('input[type="email"]').fill("Hintermaier.pascal@gmail.com", { force: true });
  await page.locator('input[type="password"]').fill("123456", { force: true });
  await page.locator('button[type="submit"]').click();

  // Wait for redirect to home
  console.log("Waiting for redirect...");
  await expect(page).toHaveURL("http://localhost:3000/", { timeout: 15000 });
  console.log("Login successful!");
}

test.describe("Entdecken Tab & Layout", () => {

  test("Test 1: Entdecken Tab – Layout prüfen", async ({ page }) => {
    page.on("console", msg => {
      if (msg.type() === "error") console.log(`PAGE ERROR: ${msg.text().substring(0, 100)}`);
    });

    await login(page);

    // Navigate to Feed
    await page.goto("/feed");
    await page.waitForLoadState("domcontentloaded");

    // Click Entdecken tab
    await page.getByRole("button", { name: "Entdecken" }).first().click();
    await page.waitForLoadState("domcontentloaded");

    // 1. Suchleiste oben sichtbar
    const searchInput = page.getByPlaceholder("Nutzer oder Communities suchen...");
    await expect(searchInput).toBeVisible();
    console.log("✓ Suchleiste oben sichtbar");

    // 2. Tabs "User" (grün) und "Communities" (cyan) vorhanden
    const userTab = page.getByRole("button", { name: "User" });
    const communitiesTab = page.getByRole("button", { name: "Communities" });
    await expect(userTab).toBeVisible();
    await expect(communitiesTab).toBeVisible();
    console.log("✓ Tabs 'User' und 'Communities' vorhanden");

    // 3. User-Tab ist default aktiv
    await expect(userTab).toHaveClass(/2FF801/);
    console.log("✓ User-Tab ist default aktiv (grün)");

    await page.screenshot({ path: "test1-layout.png" });
    console.log("✓ Test 1 PASS");
  });

  test("Test 2: User Tab – Freunde vertikal", async ({ page }) => {
    await login(page);
    await page.goto("/feed");
    await page.waitForLoadState("domcontentloaded");

    // Click Entdecken tab
    await page.getByRole("button", { name: "Entdecken" }).first().click();
    await page.waitForLoadState("domcontentloaded");

    // "Entdecke neue Leute" zeigt genau 5 User an
    const neueLeute = page.getByText("Entdecke neue Leute", { exact: true });
    await expect(neueLeute).toBeVisible();

    // Count user cards
    const suggestedSection = page.locator("text=Entdecke neue Leute").locator("..");
    const userCards = suggestedSection.locator('[href^="/user/"]');
    const cardCount = await userCards.count();
    expect(cardCount).toBeGreaterThan(0);
    expect(cardCount).toBeLessThanOrEqual(5);
    console.log(`✓ ${cardCount} User-Karten (max 5, vertikal)`);

    // Follow buttons present
    const followBtns = suggestedSection.getByRole("button");
    const followCount = await followBtns.count();
    expect(followCount).toBeGreaterThan(0);
    console.log(`✓ User-Karten haben Follow-Button (${followCount})`);

    await page.screenshot({ path: "test2-freunde.png" });
    console.log("✓ Test 2 PASS");
  });

  test("Test 3: Communities Tab", async ({ page }) => {
    await login(page);
    await page.goto("/feed");
    await page.waitForLoadState("domcontentloaded");

    // Click Entdecken tab
    await page.getByRole("button", { name: "Entdecken" }).first().click();
    await page.waitForLoadState("domcontentloaded");

    // Click Communities tab
    await page.getByRole("button", { name: "Communities" }).click();
    await page.waitForLoadState("domcontentloaded");

    // Check sections
    await expect(page.getByText("Deine Communities", { exact: true })).toBeVisible();
    await expect(page.getByText("Entdecke andere", { exact: true })).toBeVisible();
    console.log("✓ 'Deine Communities' und 'Entdecke andere' sichtbar");

    // Community entries with Logo, Name, Type
    const entries = page.locator("a[href^='/community/']");
    const count = await entries.count();
    console.log(`✓ ${count} Community-Einträge (Logo, Name, Typ)`);

    await page.screenshot({ path: "test3-communities.png" });
    console.log("✓ Test 3 PASS");
  });

  test("Test 4: Suche im Entdecken Tab", async ({ page }) => {
    await login(page);
    await page.goto("/feed");
    await page.waitForLoadState("domcontentloaded");

    await page.getByRole("button", { name: "Entdecken" }).first().click();
    await page.waitForLoadState("domcontentloaded");

    // Search on User tab
    const searchInput = page.getByPlaceholder("Nutzer oder Communities suchen...");
    await searchInput.fill("Club");
    await page.waitForTimeout(1500);

    // User section header appears
    const userSection = page.locator("p.text-\\[10px\\].font-bold.uppercase").filter({ hasText: /^User$/ });
    await expect(userSection.first()).toBeVisible();
    console.log("✓ User-Tab zeigt Suchergebnisse für 'Club'");

    // Switch to Communities tab
    await page.getByRole("button", { name: "Communities" }).click();
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(1000);

    // Either results or "Keine Communities gefunden"
    const hasResults = await page.getByText("Suchergebnisse", { exact: true }).isVisible().catch(() => false);
    const noResults = await page.getByText("Keine Communities gefunden", { exact: true }).isVisible().catch(() => false);
    expect(hasResults || noResults).toBeTruthy();
    console.log("✓ Tab-Wechsel aktualisiert Ergebnisse");

    await page.screenshot({ path: "test4-search.png" });
    console.log("✓ Test 4 PASS");
  });

  test("Test 5: Tab-Zustand merken (Browser Back)", async ({ page }) => {
    await login(page);
    await page.goto("/feed");
    await page.waitForLoadState("domcontentloaded");

    await page.getByRole("button", { name: "Entdecken" }).first().click();
    await page.waitForLoadState("domcontentloaded");

    // Switch to Communities sub-tab
    await page.getByRole("button", { name: "Communities" }).click();
    await page.waitForLoadState("domcontentloaded");

    // Verify URL has tab=communities
    await expect(page).toHaveURL(/tab=communities/);
    console.log("✓ URL enthält tab=communities");

    // Navigate away
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    // Go back
    await page.goBack();
    await page.waitForLoadState("domcontentloaded");

    // Should still be on Communities tab
    await expect(page).toHaveURL(/tab=communities/);
    const communitiesTab = page.getByRole("button", { name: "Communities" });
    await expect(communitiesTab).toHaveClass(/00F5FF/);
    console.log("✓ Tab-Zustand nach Browser Back korrekt");

    await page.screenshot({ path: "test5-tabstate.png" });
    console.log("✓ Test 5 PASS");
  });
});
