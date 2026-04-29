# Staging Environment Setup

A staging environment mirrors production but uses separate infrastructure so you can test deploys before they go live.

---

## 1. Create a staging Neon database

1. Neon console → New Project → name it `we-move-ny-staging`
2. Copy the **pooled connection string** (used as `DATABASE_URL`)
3. Copy the **direct connection string** (used to run migrations)
4. Run migrations against staging:
   ```bash
   DATABASE_URL="<staging-direct-url>" npx prisma migrate deploy
   ```

---

## 2. Create a staging Upstash Redis database

1. Upstash console → New Database → name it `we-move-ny-staging`
2. Copy `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`

---

## 3. Create a staging Vercel project

1. Vercel dashboard → Add New Project → import the same GitHub repo
2. Name it `we-move-ny-staging`
3. Set the **Production Branch** to `staging` (create this branch: `git checkout -b staging`)
4. Add all environment variables (copy from production, swap out service-specific values):

| Variable | Staging value |
|---|---|
| `DATABASE_URL` | Staging Neon pooled URL |
| `JWT_SECRET` | New random value (`openssl rand -base64 48`) |
| `JWT_REFRESH_SECRET` | New random value |
| `JWT_RESET_SECRET` | New random value |
| `UPSTASH_REDIS_REST_URL` | Staging Upstash URL |
| `UPSTASH_REDIS_REST_TOKEN` | Staging Upstash token |
| `NEXT_PUBLIC_APP_URL` | `https://we-move-ny-staging.vercel.app` |
| `RESEND_API_KEY` | Same as production (or create a test key) |
| `EMAIL_FROM` | Same as production |
| `VAPID_*` | Can reuse production VAPID keys |
| `CRON_SECRET` | New random value |
| `NEXT_PUBLIC_SENTRY_DSN` | Create a separate Sentry project for staging |
| `SENTRY_*` | Staging Sentry project credentials |

---

## 4. Deploy workflow

```
feature branch → PR → merge to staging → verify on staging → merge to main → production
```

- All feature branches PR into `staging` first
- Staging Vercel auto-deploys on push to `staging`
- After verification, open a PR from `staging` → `main`

---

## 5. Seed staging with test data

After migrations, seed a few test accounts and depots:
```bash
DATABASE_URL="<staging-direct-url>" npx ts-node prisma/seed.ts
```
(Create `prisma/seed.ts` with test depots and operator accounts if it doesn't exist.)

---

## 6. Disable crons on staging (optional)

Staging crons can fire against real external services (Resend, push notifications). To disable:
- Remove or comment out the `crons` block in `vercel.json` on the `staging` branch
- Or set `CRON_SECRET` to a different value so manual triggers still work but scheduled ones are easy to identify

---

## Notes

- Staging Neon should be on the **free tier** — it's not persistent storage
- Never run staging against the production database
- Push notification subscriptions from staging devices will not work in production (different VAPID keys if you chose separate ones)
