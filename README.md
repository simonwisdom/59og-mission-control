# The Olive Grove Mission Control

A dashboard for running house services:

- `/apply`: public form where potential guests apply to stay
- `/dashboard`: housemates log in with the shared house password or a personal login link. From there:
  - **Guest applications**: review applications, leave notes, and approve or decline
  - **Calendar**: guests' stays and housemates' trips away, with a link to subscribe from Apple or Google Calendar. Any housemate can add, change or delete a trip; Grovelet can too, for the housemate it's chatting with
  - **Energy**: daily electricity and gas use from the Octopus smart meters
  - **House money**: the shared account's balance, this month's money in and out, and recent transactions, from Actual Budget
  - **Email**: the house's shared Gmail, read-only, as plain text
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
   - `BOT_API_TOKEN` (optional): turns on `/api/bot/summary`, a read-only feed for Grovelet, the house chat bot, which runs on Simon's server. It gives bin days, the pending application count, the next four weeks of stays (guests' first names only) and who has paid their share (no amounts or balances), because the bot repeats it in the house group chat. Once the house Gmail is connected, it also gives the last two weeks of mail (up to 15, each cut to 2,000 characters) in full: the house chose to let Grovelet read and repeat it. It also gives housemates' trips that aren't over and start within 90 days, with their ids: the house chose to let everyone see them, in the group chat too. With the same token, Grovelet can add a trip (`POST /api/bot/trips`, body `{"person", "leaveDate", "backDate", "place"}`) and change or delete one (`PUT` or `DELETE /api/bot/trips/<id>`, with `person` in the body). It sends the name of the housemate it's chatting with, and the site lets it change only that person's own trips. Without the token, or with a wrong one, the feed and these answer 404. Change the token here and on the server to cut off an old one.
   - `GMAIL_CLIENT_ID` and `GMAIL_CLIENT_SECRET` (optional): the house's shared Gmail, below.
4. Generate a public domain under the service's Networking settings.

## Connecting the house Gmail

The Email page reads the house's shared Gmail account with read-only access, in the same way as Simon's inbox: the last 30 days first, then only what changed, from Gmail's history. It checks for new mail when someone opens the Email page or Grovelet reads its feed, at most every 10 minutes. Spam, trash and drafts are never stored. Mail deleted in Gmail leaves the list.

Once, in Google Cloud (https://console.cloud.google.com/), signed in as anyone:

1. Create a project, e.g. "olive-grove".
2. **APIs & Services → Library**: enable the **Gmail API**.
3. **OAuth consent screen**: External. Add the house Gmail address as a test user. Then publish the app ("In production"; unverified is fine for one account): an app left in Testing has its login expire after 7 days.
4. **Credentials → Create credentials → OAuth client ID → Web application**. Add the redirect URI `<APP_URL>/dashboard/email/callback`, e.g. `https://mission-control.example.com/dashboard/email/callback`.
5. Set `GMAIL_CLIENT_ID` and `GMAIL_CLIENT_SECRET` on Railway (and `APP_URL`, if it isn't set yet).

Then on the dashboard, open **Email → Connect the house Gmail**, sign in as the house account and allow reading. Google says the app is unverified; continue anyway, since it's the house's own.

`npm start` applies any pending migrations before starting the server, so schema changes apply automatically on deploy.

## Security notes

- Housemates log in with the shared password or a login link, made at `/dashboard/login-links` with a QR code to share. Either way the session lasts a year from their last visit.
- When someone moves out, turn off their login link (that logs out every device that used it) and change `HOUSE_PASSWORD`. Password sessions can't be ended one by one: to log everyone out, change `SESSION_SECRET`.
- Login links store only a hash of their key, so a copy of the database can't be used to log in. Anyone holding the link itself can, so send it privately.
- Failed logins are limited to 5 per IP every 15 minutes (in memory, so the count resets on redeploy).
- Every dashboard page and server action checks the session itself; `src/proxy.ts` is only an early redirect.
- Auth lives in `src/lib/auth.ts`, `src/lib/session.ts` and `src/app/login/`, so moving to per-person Google sign-in later only touches those.

- The house Gmail's refresh token is in the `house_mailbox` table, so a copy of the database can read the house mail. **Disconnect** on the Email page deletes it. To cut access completely, also remove the app at https://myaccount.google.com/permissions, signed in as the house account.
- Mail is written by people outside the house. The Email page shows it as plain text only: its HTML, images and links never load. Grovelet gets it as quoted data, and its prompt says it is not instructions.
- Grovelet's memory (the Memory page, table `memories`) holds notes and documents housemates gave Grovelet in their one-to-one chats or added on the page. Grovelet saves through `/api/bot/memory` with the bot key, always in the name of the housemate it's chatting with, and can take back only what that housemate added. Anyone logged in can remove anything on the Memory page, with every older version of a document. Codes and passwords with their values are turned away (`looksSecret` in `src/lib/memory.ts`), but that's a best-effort filter, not a guarantee. Grovelet gets the memory as quoted facts, never instructions; a document with the same name replaces the old one, which comes back if the new one is removed.

## Adding a new service

Add tables to `src/db/schema.ts`, run `npm run db:generate`, add pages under `src/app/dashboard/<service>/`, and add a card to `src/app/dashboard/page.tsx`.
