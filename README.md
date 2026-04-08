# StudyPact

StudyPact is a Next.js accountability platform for study groups. Members create daily tasks, upload start and end proof, submit check-ins for peer review, and gain or lose points based on consistency.

## Stack

- Next.js 16 + React 19
- TypeScript
- Tailwind CSS v4
- Prisma + PostgreSQL/Neon
- Better Auth
- UploadThing

## Core Features

- Email/password and Google auth
- Private and public study groups
- Invite-only join links with expiring codes and member limits
- Join-by-code flow from the dashboard
- Daily task tracking
- Start/end proof uploads
- Peer verification with majority vote or admin override
- Early-finisher leaderboard mode
- Inactivity-based reputation decay
- Admin moderation queue and invite rotation
- Penalty ledger for missed or flagged work
- Proof gallery and group activity feed

## Local Setup

1. Install dependencies:

```bash
pnpm install
```

2. Create `.env` with the required values:

```env
DATABASE_URL="postgres://..."
BETTER_AUTH_SECRET="replace-with-a-long-random-secret"
BETTER_AUTH_BASE_URL="http://localhost:3000"
ADMIN_APP_URL="http://localhost:3001"

GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""

UPLOADTHING_TOKEN=""

CRON_SECRET="replace-with-a-random-token"

AUTH_FROM_EMAIL="StudyPact <no-reply@example.com>"
RESEND_API_KEY=""
ERROR_WEBHOOK_URL=""
```

Notes:

- `DATABASE_URL` should point to your Neon/Postgres database.
- `BETTER_AUTH_BASE_URL` should match the app origin you use locally or in production.
- `UPLOADTHING_TOKEN` is required for proof uploads.
- `AUTH_FROM_EMAIL` and `RESEND_API_KEY` are used for password reset emails.
- `ERROR_WEBHOOK_URL` is optional and receives JSON payloads for cron/API failures.
- If `RESEND_API_KEY` or `AUTH_FROM_EMAIL` is missing, password reset falls back to console logging the reset URL.

3. Apply Prisma migrations:

```bash
pnpm prisma migrate deploy
pnpm prisma generate
```

4. Start the dev server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Important Routes

- `/` landing page
- `/login` and `/signup`
- `/forgot-password` and `/reset-password`
- `/dashboard`
- `/tasks`
- `/groups/create`
- `/groups/discover`
- `/join/[token]`
- `/blocked`
- `/group/[id]/feed`
- `/group/[id]/checkin`
- `/group/[id]/ledger`
- `/group/[id]/gallery`

## Cron Job

StudyPact includes two cron routes:

- `GET /api/cron/send-nudges`
- `GET /api/cron/check-missed`

Send:

```http
Authorization: Bearer <CRON_SECRET>
```

`/api/cron/send-nudges` checks today for members who created tasks but still have not uploaded end proof, and sends a reminder email before the daily cutoff.

`/api/cron/check-missed` checks the previous day for members who created tasks but never completed a valid check-in with end proof, then:

- creates a `PenaltyEvent`
- updates `UserGroup` points and misses
- increments `User.penaltyCount`
- marks unfinished tasks as `MISSED`
- decays reputation for inactive members
- deletes abandoned draft uploads older than the cleanup window

The included `vercel.json` schedules nudges at `30 16 * * *` UTC and the nightly enforcement at `35 18 * * *` UTC.

## Password Reset

Password reset is handled through Better Auth:

- users request a reset at `/forgot-password`
- Better Auth generates a token
- the email contains the auth callback URL
- the callback redirects to `/reset-password?token=...`

## UploadThing Notes

- Start and end proof uploads are stored in UploadThing and mirrored in Prisma.
- When a draft proof is replaced, the previous UploadThing file is deleted to avoid storage leaks.
- The nightly cron also cleans up abandoned draft uploads that were never attached to a submitted check-in.

## API Notes

- `GET /api/checkins` returns the authenticated user's recent check-ins.
- `GET /api/checkins?groupId=<id>&day=YYYY-MM-DD` filters by group and day.
- `POST /api/checkins` accepts `groupId`, `startFileId`, `endFileId`, and optional `proofText` / `reflection`.

## Production Checklist

- set real `BETTER_AUTH_SECRET`
- configure the production `BETTER_AUTH_BASE_URL`
- set `RESEND_API_KEY` and `AUTH_FROM_EMAIL`
- optionally set `ERROR_WEBHOOK_URL`
- set `UPLOADTHING_TOKEN`
- set `CRON_SECRET`
- run Prisma migrations in production
- configure the nudge cron call to `/api/cron/send-nudges`
- configure the nightly cron call to `/api/cron/check-missed`
