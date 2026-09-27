import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { startStaticServer } from "./qa-core.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const { server, baseUrl } = await startStaticServer(path.join(ROOT, "dist"));

let executablePath = process.env.GHRAB_CHROMIUM_PATH || "";
if (!executablePath) {
  for (const candidate of [
    chromium.executablePath(),
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/usr/bin/google-chrome",
  ]) {
    if (candidate && existsSync(candidate)) {
      executablePath = candidate;
      break;
    }
  }
}

const guardJs = `export async function protectApp(appId){document.documentElement.dataset.ghrabAccess='granted';document.dispatchEvent(new CustomEvent('ghrab:app-access-granted',{detail:{permit:{appId,qa:true}}}));return true}`;
let browser;
try {
  browser = await chromium.launch({
    headless: true,
    ...(executablePath ? { executablePath } : {}),
    args: ["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
  });

  const context = await browser.newContext({
    viewport: { width: 1366, height: 768 },
    // This QA harness stubs the central AI Studio guard with Playwright routes.
    // A root-scoped test service worker would otherwise intercept that synthetic
    // /AI-Studio-GHRAB/ request before Playwright can fulfil it. PWA behaviour
    // is covered separately by qa:pwa / platform conformance.
    serviceWorkers: "block",
  });
  const page = await context.newPage();
  const errors = [];

  const isIgnorableMetaFrameAncestorsWarning = (message) =>
    message.includes("Content Security Policy directive 'frame-ancestors'") &&
    message.includes("ignored when delivered via a <meta> element");

  page.on("pageerror", (error) => errors.push(String(error)));
  page.on("console", (message) => {
    if (message.type() !== "error") return;
    const text = message.text();
    if (isIgnorableMetaFrameAncestorsWarning(text)) return;
    errors.push(text);
  });

  await page.route("**/AI-Studio-GHRAB/access/app-guard.js", (route) =>
    route.fulfill({
      status: 200,
      contentType: "text/javascript",
      headers: {
        "access-control-allow-origin": "*",
        "cache-control": "no-store",
      },
      body: guardJs,
    }),
  );
  await page.route("**/AI-Studio-GHRAB/access/access-gate.css", (route) =>
    route.fulfill({
      status: 200,
      contentType: "text/css",
      headers: {
        "access-control-allow-origin": "*",
        "cache-control": "no-store",
      },
      body: "",
    }),
  );
  await page.route("**/AI-Studio-GHRAB/config/support.json", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ administratorEmail: "balaz@ghrabuvka.cz" }),
    }),
  );
  await page.route("**/AI-Studio-GHRAB/config/apps.generated.json", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "[]" }),
  );

  await page.goto(`${baseUrl}/index.html`, { waitUntil: "domcontentloaded" });
  await page.locator("#loadDemoBtn").click();
  await page.locator('[data-next="activities"]').click();
  await page.locator('[data-next="generate"]').click();
  await page
    .locator('label.choice-card:has(input[name="generationMode"][value="local"])')
    .click();
  await page.locator("#sourceConfirmed").click();
  await page.locator("#generateBtn").click();
  await page.waitForSelector(".editor-workspace", { timeout: 10000 });

  await page.goto(`${baseUrl}/manual/index.html`, {
    waitUntil: "domcontentloaded",
  });
  await page.waitForSelector("#manualSearch", { timeout: 10000 });

  await page.goto(`${baseUrl}/tests/index.html`, {
    waitUntil: "domcontentloaded",
  });
  await page.waitForSelector("#runBtn", { timeout: 10000 });

  if (errors.length) throw new Error(errors.join("\n"));
  console.log("[headless] Hlavní workflow, manuál a testovací centrum prošly.");
  await context.close();
} finally {
  if (browser) await browser.close().catch(() => {});
  await Promise.race([
    new Promise((resolve) => server.close(resolve)),
    new Promise((resolve) => setTimeout(resolve, 2000)),
  ]);
}
