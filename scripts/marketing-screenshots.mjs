import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { chromium } from "playwright";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const outputDir = join(root, "content", "screenshots", "marketing");
const localPort = process.env.MARKETING_SCREENSHOT_PORT || "3010";
const shouldStartLocalServer = !process.env.BASE_URL;
const baseUrl = process.env.BASE_URL || `http://localhost:${localPort}`;
const screens = ["dashboard", "grow", "privacy", "age-gate", "pwa"];

await mkdir(outputDir, { recursive: true });

let server;
const reusedServer = await isReachable(`${baseUrl}/marketing/screenshots/dashboard`);

if (!reusedServer) {
  if (!shouldStartLocalServer) {
    throw new Error(`BASE_URL is not reachable or marketing safe mode is disabled: ${baseUrl}`);
  }

  server = spawn("npm", ["run", "dev", "--", "--port", localPort], {
    cwd: root,
    env: {
      ...process.env,
      NEXT_PUBLIC_MARKETING_SAFE_MODE: "true",
      NEXT_PUBLIC_SUPABASE_URL:
        process.env.NEXT_PUBLIC_SUPABASE_URL || "https://uwjyvvvykyueuxtdkscs.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "marketing-safe-demo",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  server.stdout.on("data", (chunk) => process.stdout.write(chunk));
  server.stderr.on("data", (chunk) => process.stderr.write(chunk));
  await waitFor(`${baseUrl}/marketing/screenshots/dashboard`, 120_000);
}

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1080 }, deviceScaleFactor: 1 });
  await page.addInitScript(() => {
    localStorage.setItem("cookie_consent", "essential");
  });
  await page.context().addCookies([
    {
      name: "greenlog_age_verified",
      value: "true",
      url: baseUrl,
    },
  ]);

  for (const screen of screens) {
    await gotoWithRetry(page, `${baseUrl}/marketing/screenshots/${screen}`);
    await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" }).catch(() => {});
    await page.screenshot({
      path: join(outputDir, `${screen}.png`),
      fullPage: true,
    });
    console.log(`Saved content/screenshots/marketing/${screen}.png`);
  }
} finally {
  await browser.close();
  if (server) {
    server.kill("SIGTERM");
  }
}

async function waitFor(url, timeoutMs) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (await isReachable(url)) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

async function gotoWithRetry(page, url, attempts = 3) {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await page.goto(url, { waitUntil: "domcontentloaded" });
      if (!response?.ok()) {
        throw new Error(`Unexpected status ${response?.status() ?? "unknown"}`);
      }
      await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});
      return;
    } catch (error) {
      if (attempt === attempts) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
}

async function isReachable(url) {
  try {
    const response = await fetch(url, {
      redirect: "manual",
      headers: {
        cookie: "greenlog_age_verified=true",
      },
    });
    return response.ok;
  } catch {
    return false;
  }
}
