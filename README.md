# 59OG Mission Control

A dashboard for running house services. The first service is **guest applications**:

- `/apply`: public form where potential guests apply to stay
- `/dashboard`: housemates log in with the shared house password to review applications, leave notes, and approve or decline

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
| `npm run db:migrate`  | Apply migrations                                 |

## Deploying to Railway

1. Create a Railway project and add a **Postgres** database.
2. Add a service from this repo (GitHub) or run `railway up` from this folder.
3. Set the service variables:
   - `DATABASE_URL` = `${{Postgres.DATABASE_URL}}`
   - `HOUSE_PASSWORD`: long and random, shared with housemates
   - `SESSION_SECRET`: 32+ random characters
4. Generate a public domain under the service's Networking settings.

`railway.json` runs migrations as the pre-deploy command, so schema changes apply automatically.

## Security notes

- There's one shared password. Change `HOUSE_PASSWORD` when someone moves out. To log everyone out immediately, also change `SESSION_SECRET`.
- Failed logins are limited to 5 per IP every 15 minutes (in memory, so the count resets on redeploy).
- Every dashboard page and server action checks the session itself; `src/proxy.ts` is only an early redirect.
- Auth lives in `src/lib/auth.ts`, `src/lib/session.ts` and `src/app/login/`, so moving to per-person Google sign-in later only touches those.

## Adding a new service

Add tables to `src/db/schema.ts`, run `npm run db:generate`, add pages under `src/app/dashboard/<service>/`, and add a card to `src/app/dashboard/page.tsx`.
