# We Move NY — Operations Runbook

## Quick Reference

| Service | Dashboard |
|---|---|
| Vercel (hosting) | vercel.com → wemovenewyork team |
| Neon (database) | console.neon.tech |
| Upstash (Redis) | console.upstash.com |
| Resend (email) | resend.com/emails |
| Sentry (errors) | sentry.io |

Contact: wemovenewyork.net@gmail.com

---

## Rollback a Bad Deploy

### Option A — Instant rollback via Vercel dashboard (preferred)
1. Vercel dashboard → Project → Deployments tab
2. Find the last known-good deployment
3. Click the `…` menu → **Promote to Production**
4. Production traffic shifts in ~30 seconds. No code change, no git history affected.

### Option B — Git revert
```bash
git log --oneline -10          # find the bad commit hash
git revert <bad-commit-hash>   # creates a revert commit
git push origin main           # triggers new Vercel deploy
```

### Option C — Hard reset (last resort — destroys history)
```bash
git reset --hard <good-commit-hash>
git push --force-with-lease origin main
```
Only use Option C if the bad commit contains secrets that must be scrubbed from history.

---

## Database Rollback

Migrations are in `prisma/migrations/`. They are **not automatically reversible**.

### To undo the most recent migration:
1. Write a reverse migration SQL manually (e.g. `DROP TABLE blocks;` to undo `20260416_block_enforcement`)
2. Save it as `prisma/migrations/YYYYMMDD_rollback_<name>/migration.sql`
3. Apply with:
```bash
DATABASE_URL="<direct-url>" npx prisma migrate deploy
```
4. Update `prisma/schema.prisma` to match

**Never run `prisma migrate reset` in production** — it drops all data.

---

## Environment Variable Rotation

### Rotate JWT secrets (forces all users to re-login):
1. Vercel → Project → Settings → Environment Variables
2. Update `JWT_SECRET` and/or `JWT_REFRESH_SECRET` with a new random value:
   ```bash
   openssl rand -base64 48
   ```
3. Redeploy (new deployments pick up the new value; existing sessions expire within 15 min for access tokens, 7 days for refresh tokens)

### Rotate Neon DB password:
1. Neon console → Project → Roles → Reset password for `neondb_owner`
2. Update `DATABASE_URL` in Vercel env vars with the new password
3. Redeploy

### Rotate Upstash Redis credentials:
1. Upstash console → Database → Reset token
2. Update `UPSTASH_REDIS_REST_TOKEN` and `UPSTASH_REDIS_REST_URL` in Vercel
3. Redeploy

---

## Maintenance Mode

Set `MAINTENANCE_MODE=true` in Vercel environment variables, then redeploy.
All traffic is redirected to `/maintenance` except `/api/health` and static assets.

To disable: remove or set to `false`, redeploy.

---

## Emergency User Actions

All admin actions require an account with `role = "admin"` or `"subAdmin"`.

### Suspend a user immediately:
Admin dashboard → Users → find user → set `suspendedUntil` to a future date.
Or directly via Neon SQL console:
```sql
UPDATE users SET suspended_until = NOW() + INTERVAL '30 days' WHERE email = 'user@example.com';
```

### Delete/anonymize a user:
Admin dashboard → Users → Delete. This anonymizes (does not hard-delete) the account.

### Revoke an invite code:
Admin dashboard → Invite Codes → Revoke.

---

## Monitoring

- **Errors**: Sentry dashboard — set up alerts for new issues and spike detection
- **Uptime**: `/api/health` returns `{"status":"ok"}` when DB is reachable; use an external uptime monitor (e.g. Better Uptime, UptimeRobot) to ping this endpoint every minute
- **Redis failures**: Watch Vercel function logs for `[rateLimit] Redis error` — rate limiting is failing open when this appears
- **Email deliverability**: Resend dashboard → Emails tab — check bounce/complaint rates

---

## Cron Jobs

Cron schedules are in `vercel.json`. All require the `CRON_SECRET` env var as a Bearer token.

| Job | Schedule | Purpose |
|---|---|---|
| `/api/cron/expire-swaps` | Daily | Mark past-date swaps as expired |
| `/api/cron/expiring-soon` | Daily | Notify operators of swaps expiring tomorrow (NYC time) |
| `/api/cron/cleanup-swaps` | Weekly | Delete swaps expired >7 days ago |
| `/api/cron/expire-announcements` | Daily | Delete expired depot announcements |
| `/api/cron/daily-digest` | Daily morning | Send new-swaps digest to subscribers |

To manually trigger a cron during an incident:
```bash
curl -X GET https://<your-domain>/api/cron/expire-swaps \
  -H "Authorization: Bearer <CRON_SECRET>"
```
