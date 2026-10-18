# The Olive Grove Mission Control

A dashboard for running house services:

- `/apply`: public form where potential guests apply to stay
- `/dashboard`: housemates log in with the shared house password or a personal login link. From there:
  - **Guest applications**: review applications, leave notes, and approve or decline
  - **Energy**: daily electricity and gas use from the Octopus smart meters
  - **House money**: the shared account's balance, this month's money in and out, and recent transactions, from Actual Budget
  - Links to the house accounts (Sainsbury's, Octopus, Thames Water, Hyperoptic, Hackney permits and bike hangars)

Built with Next.js 16, Drizzle ORM and Postgres. Hosted on Railway.

## Local development

You need Node 24 and a Postgres database.

```bash
cp .env.example .env        # then fill in the values
npm install
npm run db:migrate
npm run dev                 # http://localhost:3000
```

Generate the secrets with:

```bash
openssl rand -base64 18     # HOUSE_PASSWORD
openssl rand -base64 48     # SESSION_SECRET
```

## Scripts

| Command               | What it does                                     |
| --------------------- | ------------------------------------------------ |
| `npm test`            | Unit tests (vitest)                              |
| `npm run lint`        | ESLint                                           |
| `npm run db:generate` | Create a migration after editing `src/db/schema.ts` |
| `npm run db:migrate`  | Apply migrations (also runs on `npm start`)      |

## Deploying to Railway

1. Create a Railway project and add a **Postgres** database.
2. Add a service from this repo (GitHub) or run `railway up` from this folder.
3. Set the service variables:
   - `DATABASE_URL` = `${{Postgres.DATABASE_URL}}`
   - `HOUSE_PASSWORD`: long and random, shared with housemates
   - `SESSION_SECRET`: 32+ random characters
   - `OCTOPUS_API_KEY` and `OCTOPUS_ACCOUNT_NUMBER` (optional): from the Octopus website under Personal details > API access. Without them the Energy page just says what to set.
   - `ACTUAL_SERVER_URL`, `ACTUAL_PASSWORD` and `ACTUAL_SYNC_ID` (optional): the house budget in Actual. Actual has no web API, so the app uses Actual's official Node client: it logs in with the server password, downloads the budget to a temp folder and reads it, at most every 5 minutes. The sync ID is in Actual under Settings > Show advanced settings. Add `ACTUAL_ENCRYPTION_PASSWORD` if the budget is end-to-end encrypted, and `ACTUAL_ACCOUNTS` (comma-separated names) to show only some accounts. Keep `@actual-app/api` on the same version as the Actual server. Until these are set, the dashboard has no money card.
   - `NTFY_TOPIC` and `APP_URL` (optional): phone notifications for new applications. Housemates install the free ntfy app and subscribe to the topic. Anyone who knows the topic can read it, so make it long and random (`olive-grove-` plus `openssl rand -hex 8`). The message only has the guest's first name, dates and party size. `APP_URL` is the site's public address, so tapping the notification opens the application.
   - `BOT_API_TOKEN` (optional): turns on `/api/bot/summary`, a read-only feed for Grovelet, the house chat bot, which runs on Simon's server. It gives bin days, the pending application count, the next four weeks of stays (guests' first names only) and who has paid their share (no amounts or balances), because the bot repeats it in the house group chat. Without the token, or with a wrong one, the feed answers 404. Change the token here and on the server to cut off an old one.
4. Generate a public domain under the service's Networking settings.

`npm start` applies any pending migrations before starting the server, so schema changes apply automatically on deploy.

## Security notes

- Housemates log in with the shared password or a login link, made at `/dashboard/login-links` with a QR code to share. Either way the session lasts a year from their last visit.
- When someone moves out, turn off their login link (that logs out every device that used it) and change `HOUSE_PASSWORD`. Password sessions can't be ended one by one: to log everyone out, change `SESSION_SECRET`.
- Login links store only a hash of their key, so a copy of the database can't be used to log in. Anyone holding the link itself can, so send it privately.
- Failed logins are limited to 5 per IP every 15 minutes (in memory, so the count resets on redeploy).
- Every dashboard page and server action checks the session itself; `src/proxy.ts` is only an early redirect.
- Auth lives in `src/lib/auth.ts`, `src/lib/session.ts` and `src/app/login/`, so moving to per-person Google sign-in later only touches those.

## Adding a new service

Add tables to `src/db/schema.ts`, run `npm run db:generate`, add pages under `src/app/dashboard/<service>/`, and add a card to `src/app/dashboard/page.tsx`.
