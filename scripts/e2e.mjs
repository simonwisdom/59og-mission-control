// Click through the site in the installed Google Chrome, logged in with a signed session cookie,
// and exit non-zero if anything fails. Starts its own `next dev` on a free port and stops it.
//
//   npm run e2e [-- OUT_DIR]
//
// Checks every main page loads at phone width without errors or sideways scroll, that booked
// nights on the apply calendar can't be picked, and that a test application can be sent and
// shows up on the dashboard, and that a housemate's trip and a stay for their own guest can each be
// added, changed and deleted from the calendar, as can an event, and that a memory note can be added, edited, forgotten, brought back and deleted for
// good. Its test rows (an approved stay, the application, the trip, the event and the notes) are deleted
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
const TEST_PERSON = "E2E Traveller";
const TEST_GUEST = "E2E Guest";
const PAGES = [
  "/",
  "/apply",
  "/dashboard",
  "/dashboard/applications",
  "/dashboard/calendar",
  "/dashboard/energy",
  "/dashboard/money",
  "/dashboard/email",
  "/dashboard/pages",
  "/dashboard/login-links",
  "/dashboard/memory",
];
const TEST_NOTE = "E2E memory note";

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
  await sql`delete from trips where person = ${TEST_PERSON}`;
  await sql`delete from applications where added_by = ${TEST_PERSON}`;
  await sql`delete from events where added_by = ${TEST_PERSON}`;
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

  await check("a trip can be added, changed and deleted on the calendar", async () => {
    await page.goto(`${base}/dashboard/calendar`, { waitUntil: "networkidle" });
    const leave = new Date(Date.now() + 3 * 86_400_000).toISOString().slice(0, 10);
    const back = new Date(Date.now() + 5 * 86_400_000).toISOString().slice(0, 10);
    await page.getByLabel("Who", { exact: true }).fill(TEST_PERSON);
    await page.getByLabel("Leaving").fill(leave);
    await page.getByLabel("Back").fill(back);
    await page.getByLabel("Where (optional)").fill("Testville");
    await page.getByRole("button", { name: "Add trip" }).click();
    await page.getByRole("link", { name: `${TEST_PERSON} away · Testville` }).first().waitFor({ timeout: 30_000 });

    await page.getByRole("link", { name: `${TEST_PERSON} away · Testville` }).first().click();
    await page.waitForURL(/\/dashboard\/calendar\/trips\/\d+$/);
    await page.getByLabel("Where (optional)").fill("");
    await page.getByRole("button", { name: "Save changes" }).click();
    await page.waitForURL(/\/dashboard\/calendar\?month=/);
    const [saved] = await sql`select place from trips where person = ${TEST_PERSON}`;
    expect(saved && saved.place === null, `saved as ${JSON.stringify(saved)}`);

    await page.getByRole("link", { name: `${TEST_PERSON} away` }).first().click();
    await page.getByRole("button", { name: "Delete trip" }).click();
    await page.getByRole("button", { name: "Delete", exact: true }).click();
    await page.waitForURL(/\/dashboard\/calendar$/);
    const left = await sql`select id from trips where person = ${TEST_PERSON}`;
    expect(left.length === 0, `${left.length} test trips left after deleting`);
  });

  await check("an event can be added, changed and deleted on the calendar", async () => {
    await page.goto(`${base}/dashboard/calendar`, { waitUntil: "networkidle" });
    const day = new Date(Date.now() + 3 * 86_400_000).toISOString().slice(0, 10);
    await page.getByLabel("What's on").fill("E2E dinner");
    await page.getByLabel("Day", { exact: true }).fill(day);
    await page.getByLabel("Time (optional)").fill("8pm");
    await page.getByLabel("Link (optional)").fill("https://example.com/e2e");
    await page.getByLabel("Added by").fill(TEST_PERSON);
    await page.getByRole("button", { name: "Add event" }).click();
    await page.getByRole("link", { name: /E2E dinner · 8pm/ }).first().waitFor({ timeout: 30_000 });

    await page.getByRole("link", { name: /E2E dinner · 8pm/ }).first().click();
    await page.waitForURL(/\/dashboard\/calendar\/events\/\d+$/);
    await page.getByLabel("Time (optional)").fill("");
    await page.getByRole("button", { name: "Save changes" }).click();
    await page.waitForURL(/\/dashboard\/calendar\?month=/);
    const [saved] = await sql`select time, link from events where added_by = ${TEST_PERSON}`;
    expect(saved && saved.time === null && saved.link === "https://example.com/e2e", `saved as ${JSON.stringify(saved)}`);

    await page.getByRole("link", { name: /E2E dinner/ }).first().click();
    await page.getByRole("button", { name: "Delete event" }).click();
    await page.getByRole("button", { name: "Delete", exact: true }).click();
    await page.waitForURL(/\/dashboard\/calendar$/);
    const left = await sql`select id from events where added_by = ${TEST_PERSON}`;
    expect(left.length === 0, `${left.length} test events left after deleting`);
  });

  await check("a housemate's guest can be added, changed and deleted on the calendar", async () => {
    const stays = () => sql`select party_size, status, email from applications where added_by = ${TEST_PERSON}`;
    await page.goto(`${base}/dashboard/calendar`, { waitUntil: "networkidle" });
    const arrive = new Date(Date.now() + 3 * 86_400_000).toISOString().slice(0, 10);
    const depart = new Date(Date.now() + 5 * 86_400_000).toISOString().slice(0, 10);
    await page.getByLabel("Guest", { exact: true }).fill(TEST_GUEST);
    await page.getByLabel("People").fill("2");
    await page.getByLabel("Arriving").fill(arrive);
    await page.getByLabel("Departing").fill(depart);
    await page.getByLabel("Whose guest").fill(TEST_PERSON);
    await page.getByRole("button", { name: "Add stay" }).click();
    const listed = page.getByRole("link", { name: new RegExp(`${TEST_GUEST} \\(${TEST_PERSON}'s guest\\)`) });
    await listed.waitFor({ timeout: 30_000 });
    const [added] = await stays();
    expect(added && added.status === "approved" && added.party_size === 2 && added.email === null, `saved as ${JSON.stringify(added)}`);

    await page.goto(`${base}/dashboard/applications`, { waitUntil: "networkidle" });
    expect((await page.getByText(TEST_GUEST).count()) === 0, "the stay shows on the applications list");

    await page.goto(`${base}/dashboard/calendar`, { waitUntil: "networkidle" });
    await listed.click();
    await page.waitForURL(/\/dashboard\/calendar\/stays\/\d+$/);
    await page.getByLabel("People").fill("1");
    await page.getByRole("button", { name: "Save changes" }).click();
    await page.waitForURL(/\/dashboard\/calendar\?month=/);
    const [changed] = await stays();
    expect(changed && changed.party_size === 1, `saved as ${JSON.stringify(changed)}`);

    await listed.click();
    await page.getByRole("button", { name: "Delete stay" }).click();
    await page.getByRole("button", { name: "Delete", exact: true }).click();
    await page.waitForURL(/\/dashboard\/calendar$/);
    const left = await stays();
    expect(left.length === 0, `${left.length} test stays left after deleting`);
  });

  await check("a memory note can be added, edited, forgotten, brought back and deleted", async () => {
    const live = () => sql`select body from memories where body like ${`${TEST_NOTE}%`} and replaced_at is null and removed_at is null`;
    await page.goto(`${base}/dashboard/memory`, { waitUntil: "networkidle" });
    await page.getByLabel("Note").fill(`${TEST_NOTE}, first`);
    await page.getByRole("button", { name: "Add note" }).click();
    const note = page.locator("li", { hasText: `${TEST_NOTE}, first` });
    await note.waitFor({ timeout: 30_000 });

    await note.getByRole("button", { name: "Edit" }).click();
    await note.locator("textarea").fill(`${TEST_NOTE}, edited`);
    await note.getByRole("button", { name: "Save" }).click();
    const edited = page.locator("li", { hasText: `${TEST_NOTE}, edited` }).first();
    await edited.waitFor({ timeout: 30_000 });
    expect((await live()).map((r) => r.body).join() === `${TEST_NOTE}, edited`, "the edit isn't the one live note");

    await edited.getByRole("button", { name: "Forget" }).click();
    await edited.getByRole("button", { name: "Forget" }).click();
    await page.getByText(/^History \(/).click();
    const forgotten = page.locator("li", { hasText: `${TEST_NOTE}, edited` }).last();
    await forgotten.getByText(/Forgotten/).waitFor({ timeout: 30_000 });
    expect((await live()).length === 0, "a forgotten note is still live");

    await forgotten.getByRole("button", { name: "Bring back" }).click();
    for (let i = 0; i < 30 && (await live()).length === 0; i++) await new Promise((r) => setTimeout(r, 500));
    expect((await live()).length === 1, "Bring back didn't make it live again");

    await page.goto(`${base}/dashboard/memory`, { waitUntil: "networkidle" });
    await page.getByText(/^History \(/).click();
    const older = page.locator("li", { hasText: `${TEST_NOTE}, first` }).last();
    await older.getByRole("button", { name: "Delete for good" }).click();
    await older.getByRole("button", { name: "Delete", exact: true }).click();
    for (let i = 0; i < 30; i++) {
      const [{ n }] = await sql`select count(*)::int n from memories where body = ${`${TEST_NOTE}, first`}`;
      if (n === 0) return;
      await new Promise((r) => setTimeout(r, 500));
    }
    throw new Error("Delete for good left the row");
  });
} catch (error) {
  failures.push("setup");
  console.error(error.message);
} finally {
  const deleted = await sql`delete from applications where email = ${TEST_EMAIL} returning id`;
  if (deleted.length) console.log(`     removed ${deleted.length} test applications`);
  await sql`delete from trips where person = ${TEST_PERSON}`;
  await sql`delete from applications where added_by = ${TEST_PERSON}`;
  await sql`delete from events where added_by = ${TEST_PERSON}`;
  await sql`delete from memories where body like ${`${TEST_NOTE}%`}`;
  await sql.end();
  await browser.close();
  server.kill();
}

console.log(failures.length ? `\n${failures.length} failed` : "\nAll passed");
process.exitCode = failures.length ? 1 : 0;
