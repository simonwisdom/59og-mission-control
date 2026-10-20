// Used by scripts/preview.sh: screenshot URL in the installed Google Chrome
// with a valid house_session cookie. Usage: preview-shot.mjs URL OUT_PNG WIDTH [SELECTOR]
// With SELECTOR, only the first matching element is captured. OPEN_DETAILS=1 opens every folded
// section (<details>) first, e.g. History on the Memory page.
import { chromium } from "playwright-core";
import { createSessionToken } from "../src/lib/session.ts";

const [url, out, width, selector] = process.argv.slice(2);
const token = createSessionToken(process.env.SESSION_SECRET, Date.now() + 60 * 60 * 1000);

const browser = await chromium.launch({ channel: "chrome" });
try {
  const context = await browser.newContext({ viewport: { width: Number(width), height: 900 } });
  await context.addCookies([{ name: "house_session", value: token, url }]);
  const page = await context.newPage();
  const response = await page.goto(url, { waitUntil: "networkidle", timeout: 120_000 });
  if (new URL(page.url()).pathname === "/login") {
    throw new Error("Redirected to /login: the session cookie was rejected");
  }
  if (process.env.OPEN_DETAILS) {
    await page.evaluate(() => document.querySelectorAll("details").forEach((d) => (d.open = true)));
  }
  if (selector) {
    await page.locator(selector).first().screenshot({ path: out });
  } else {
    await page.screenshot({ path: out, fullPage: true });
  }
  console.log(`${response?.status()} ${url}\n${out}`);
} finally {
  await browser.close();
}
