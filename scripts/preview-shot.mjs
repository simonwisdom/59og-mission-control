// Used by scripts/preview.sh: screenshot URL in the installed Google Chrome
// with a valid house_session cookie. Usage: preview-shot.mjs URL OUT_PNG WIDTH
import { chromium } from "playwright-core";
import { createSessionToken } from "../src/lib/session.ts";

const [url, out, width] = process.argv.slice(2);
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
  await page.screenshot({ path: out, fullPage: true });
  console.log(`${response?.status()} ${url}\n${out}`);
} finally {
  await browser.close();
}
