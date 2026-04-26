import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import dotenv from "dotenv";
import { chromium } from "playwright";
import { MARKETING_SCREENS } from "../src/lib/marketing-screenshots.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const outputDir = join(root, "content", "screenshots", "marketing");

dotenv.config({ path: join(root, ".env") });
dotenv.config({ path: join(root, ".env.local"), override: true });

const localPort = process.env.MARKETING_SCREENSHOT_PORT || "3010";
const shouldStartLocalServer = !process.env.BASE_URL;
const baseUrl = process.env.BASE_URL || `http://localhost:${localPort}`;
const dashboardUrl = `${baseUrl}/marketing/screenshots/dashboard`;

await mkdir(outputDir, { recursive: true });

let server;
const reusedServer = await isReachable(dashboardUrl);

if (!reusedServer) {
  if (!shouldStartLocalServer) {
    const baseReachable = await isServerReachable(baseUrl);
    if (!baseReachable) {
      throw new Error(`BASE_URL is not reachable: ${baseUrl}`);
    }
    throw new Error(`Marketing screenshot route is not available. Set MARKETING_SAFE_MODE=true for ${baseUrl}.`);
  }

  server = startLocalServer();

  try {
    await waitFor(dashboardUrl, 120_000);
  } catch (error) {
    stopServer(server);
    server = undefined;
    throw error;
  }
}

let browser;
try {
  browser = await chromium.launch();
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

  for (const screen of MARKETING_SCREENS) {
    await gotoWithRetry(page, `${baseUrl}/marketing/screenshots/${screen}`);
    await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" }).catch(() => {});
    await page.screenshot({
      path: join(outputDir, `${screen}.png`),
      fullPage: true,
    });
    console.log(`Saved content/screenshots/marketing/${screen}.png`);
  }
} finally {
  if (browser) {
    await browser.close();
  }
  if (server) {
    stopServer(server);
  }
}

function startLocalServer() {
  const child = spawn("npm", ["run", "dev", "--", "--port", localPort], {
    cwd: root,
    detached: true,
    env: {
      ...process.env,
      MARKETING_SAFE_MODE: "true",
      NEXT_PUBLIC_SUPABASE_URL: requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
      NEXT_PUBLIC_SUPABASE_ANON_KEY: requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  child.stdout.on("data", (chunk) => process.stdout.write(chunk));
  child.stderr.on("data", (chunk) => process.stderr.write(chunk));
  return child;
}

function stopServer(child) {
  if (!child.pid) {
    return;
  }

  try {
    process.kill(-child.pid, "SIGTERM");
  } catch {
    child.kill("SIGTERM");
  }
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name}. Set it in .env.local or export it before running screenshots:marketing.`);
  }
  return value;
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

async function isServerReachable(url) {
  try {
    const response = await fetch(url, {
      redirect: "manual",
      headers: {
        cookie: "greenlog_age_verified=true",
      },
    });
    return response.status < 500;
  } catch {
    return false;
  }
}
