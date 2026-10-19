// Click through the site in the installed Google Chrome, logged in with a signed session cookie,
// and exit non-zero if anything fails. Starts its own `next dev` on a free port and stops it.
//
//   npm run e2e [-- OUT_DIR]
//
// Checks every main page loads at phone width without errors or sideways scroll, that booked
// nights on the apply calendar can't be picked, and that a test application can be sent and
// shows up on the dashboard. Its test rows (an approved stay and the application) are deleted
// at the end. It refuses to run unless .env points at a database on this Mac, and blanks
// NTFY_TOPIC so housemates' phones don't get a notification. With OUT_DIR, saves a screenshot
// of each page there.
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { createServer } from "node:net";
import { chromium } from "playwright-core";
import postgres from "postgres";
import { createSessionToken } from "../src/lib/session.ts";

process.chdir(new URL("..", import.meta.url).pathname);
process.loadEnvFile(".env");
const [outDir] = process.argv.slice(2);
if (outDir) mkdirSync(outDir, { recursive: true });

const dbHost = new URL(process.env.DATABASE_URL).hostname;
if (!["localhost", "127.0.0.1", "::1", "[::1]"].includes(dbHost)) {
  console.error(`DATABASE_URL points at ${dbHost}, not this Mac; refusing to send a test application`);
  process.exit(1);
}

const WIDTH = 390;
const TEST_EMAIL = "e2e-test@example.invalid";
const PAGES = [
  "/",
  "/apply",
  "/dashboard",
  "/dashboard/applications",
  "/dashboard/calendar",
  "/dashboard/energy",
  "/dashboard/money",
  "/dashboard/pages",
  "/dashboard/login-links",
];

const failures = [];
async function check(name, fn) {
  try {
    await fn();
    console.log(`ok   ${name}`);
  } catch (error) {
    failures.push(name);
    console.log(`FAIL ${name}\n     ${error.message.split("\n")[0]}`);
  }
}
function expect(condition, message) {
  if (!condition) throw new Error(message);
}

const port = await new Promise((resolve) => {
  const server = createServer().listen(0, () => {
    resolve(server.address().port);
    server.close();
  });
});
const base = `http://localhost:${port}`;
let serverLog = "";
const server = spawn("node_modules/.bin/next", ["dev", "-p", String(port)], {
  env: { ...process.env, NTFY_TOPIC: "" },
});
server.stdout.on("data", (chunk) => (serverLog += chunk));
server.stderr.on("data", (chunk) => (serverLog += chunk));

const sql = postgres(process.env.DATABASE_URL);
const browser = await chromium.launch({ channel: "chrome" });
try {
  for (let i = 0; ; i++) {
    if (server.exitCode !== null) throw new Error(`next dev stopped:\n${serverLog}`);
    if (await fetch(`${base}/login`).then(() => true, () => false)) break;
    if (i === 60) throw new Error(`next dev didn't start in 60s:\n${serverLog}`);
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  await sql`delete from applications where email = ${TEST_EMAIL}`;
  console.log(`Database: ${dbHost}${new URL(process.env.DATABASE_URL).pathname}`);

  const context = await browser.newContext({ viewport: { width: WIDTH, height: 900 } });
  const token = createSessionToken(process.env.SESSION_SECRET, Date.now() + 60 * 60 * 1000);
  await context.addCookies([{ name: "house_session", value: token, url: base }]);
  const page = await context.newPage();
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  for (const path of PAGES) {
    await check(`${path} loads`, async () => {
      pageErrors.length = 0;
      const response = await page.goto(base + path, { waitUntil: "networkidle", timeout: 120_000 });
      expect(new URL(page.url()).pathname !== "/login", "redirected to /login: session cookie rejected");
      expect(response.status() < 400, `status ${response.status()}`);
      expect(pageErrors.length === 0, `page errors: ${pageErrors.join("; ")}`);
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(scrollWidth <= WIDTH, `scrolls sideways at ${WIDTH}px (${scrollWidth}px wide)`);
      if (outDir) {
        const file = (path.replace(/\//g, "-").replace(/^-/, "") || "home") + ".png";
        await page.screenshot({ path: `${outDir}/${file}`, fullPage: true });
      }
    });
  }

  // An approved test stay of three nights, two weeks out, so there's always a booked night to check
  await sql`
    insert into applications (name, email, arrival_date, departure_date, party_size, about, agreed_to_rules, status)
    values ('E2E Booked', ${TEST_EMAIL}, current_date + 14, current_date + 17, 1, 'Test stay', true, 'approved')`;
  await page.goto(`${base}/apply`, { waitUntil: "networkidle" });
  const days = page.locator("fieldset button:not([aria-label$='month'])");
  const next = page.getByRole("button", { name: "Next month" });

  await check("booked nights on the apply calendar can't be picked", async () => {
    let seen = 0;
    for (let month = 0; month < 12; month++) {
      for (const day of await page.locator("fieldset button[aria-label$='already booked']").all()) {
        expect(await day.isDisabled(), `${await day.getAttribute("aria-label")} can be picked`);
        seen++;
      }
      await next.click();
    }
    expect(seen >= 3, `only ${seen} booked days on the calendar; the test stay alone books 3`);
    console.log(`     ${seen} booked days checked over 12 months`);
  });

  await check("a test application can be sent", async () => {
    await page.goto(`${base}/apply`, { waitUntil: "networkidle" });
    // A free stretch of three days next month or later: arrive on the first, leave on the third
    let picked = false;
    for (let month = 0; month < 12 && !picked; month++) {
      await next.click();
      const enabled = await days.evaluateAll((buttons) => buttons.map((b) => !b.disabled));
      const start = enabled.findIndex((_, i) => enabled[i] && enabled[i + 1] && enabled[i + 2]);
      if (start >= 0) {
        picked = true;
        await days.nth(start).click();
        await days.nth(start + 2).click();
      }
    }
    expect(picked, "no three free days in the next 12 months");

    await page.locator("textarea[name=about]").fill("Automated click-through test from scripts/e2e.mjs.");
    await page.locator("textarea[name=offering]").fill("Nothing, I'm a test.");
    await page.getByLabel("Name").fill("E2E Test");
    await page.locator("input[name=email]").fill(TEST_EMAIL);
    await page.locator("input[name=partySize]").fill("2");
    await page.locator("input[name=agreedToRules]").check();
    await page.getByRole("button", { name: /Send postcard/ }).click();
    await page.getByText("Posted!").waitFor({ timeout: 30_000 });

    const rows = await sql`
      select status, party_size from applications where email = ${TEST_EMAIL} and name = 'E2E Test'`;
    expect(rows.length === 1, `${rows.length} rows saved`);
    expect(rows[0].status === "pending" && rows[0].party_size === 2, `saved as ${JSON.stringify(rows[0])}`);
  });

  await check("the test application shows on the dashboard", async () => {
    await page.goto(`${base}/dashboard/applications?status=pending`, { waitUntil: "networkidle" });
    await page.getByRole("link", { name: /E2E Test/ }).first().click();
    await page.waitForURL(/\/dashboard\/applications\/\d+$/);
    await page.getByText(TEST_EMAIL).first().waitFor();
  });
} catch (error) {
  failures.push("setup");
  console.error(error.message);
} finally {
  const deleted = await sql`delete from applications where email = ${TEST_EMAIL} returning id`;
  if (deleted.length) console.log(`     removed ${deleted.length} test applications`);
  await sql.end();
  await browser.close();
  server.kill();
}

console.log(failures.length ? `\n${failures.length} failed` : "\nAll passed");
process.exitCode = failures.length ? 1 : 0;
