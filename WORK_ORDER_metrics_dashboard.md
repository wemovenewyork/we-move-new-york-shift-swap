# Work Order — Operator Visibility · Metrics Dashboard + Cron Heartbeat

Branch: `feat/metrics-dashboard`
Goal: instruments for the three experiments now running blind (trust-v2 engagement, digest-mode default, share-link conversion) plus a heartbeat so a dead cron announces itself. Read-only over existing data — **zero new user-facing behavior, zero writes to user data, one optional env var, no schema changes, no new dependencies.**

House rules from all prior branches apply: stop-and-ask on spec/code conflict, zero new lint problems, tests for new logic, commit locally and report before push.

---

## Part 1 — Admin metrics API · `GET /api/admin/metrics`

Admin-gated with the same guard as the existing admin routes (reports/broadcast — reuse, don't reinvent). Query param `range` = `7d | 30d | 90d` (default 30d, reject others). All aggregation server-side via grouped/parallel Prisma queries (`Promise.all`); no N+1, no per-row loops. Weekly buckets for time series (daily for 7d). Cap total queries ~15; if any single aggregation needs raw SQL for date bucketing, `prisma.$queryRaw` with `date_trunc` is fine — read-only.

Response shape — five sections:

**growth** · signups per bucket · signups by `signupSource` (null = "organic") · total users · active users per bucket, where *active* = distinct users with any write action in the bucket (union of: swap created, message sent, proposal created/answered, review posted — derived from existing tables; do NOT add a lastActiveAt column or new writes for this).

**marketplace** · swaps posted / filled / expired per bucket · fill rate (filled ÷ posted, same-bucket approximation is fine — note it in the UI) · median + p90 hours-to-fill (swap `createdAt` → agreement `acceptedAt`, accepted/completed agreements in range) · current open inventory by category and by depot (top 10 depots).

**trust** · proposals per bucket, with accepted / declined / expired / withdrawn split · proposals-per-filled-swap average · post-shift response rate: of agreements finalized in range, % where at least one party answered vs finalized-silent · outcome split: completed-confirmed / completed-unverified / disputed / noShow · review submission rate (reviews ÷ completed-confirmed agreement-participants) · avg rating.

**notifications** · users who changed any pref off defaults (prefs JSON non-null) · `new_post` mode distribution (all / matches / digest / off — merge stored over defaults, same helper the app uses) · push-subscribed user count · digest-eligible count.

**meta** · generated-at timestamp · range echo · per-section query duration (ms) so slow aggregations are visible from day one.

## Part 2 — Admin dashboard page · `app/admin/metrics/page.tsx`

Lives beside the existing admin surfaces, same auth/layout. **No chart library** — hand-rolled inline SVG sparklines and horizontal CSS bars are plenty; this page is for one operator, not customers. Layout: four stat-card rows (one per section) — headline number, delta vs previous equal-length period where cheap to compute, sparkline for the time series, small bar lists for the categorical splits. Range switcher (7/30/90). A "refreshed at" line; client refetch button, no auto-polling. English-only (admin surface, matching existing admin pages). Loading + error states; if one section fails, render the others (the API should return per-section, not all-or-nothing — wrap each section's queries so a failure degrades to `null` + a Sentry capture rather than a 500).

## Part 3 — Cron heartbeat

New optional env `HEARTBEAT_URL_BASE` (e.g. a healthchecks.io ping base). In a tiny `lib/heartbeat.ts`: `pingHeartbeat(slug: string)` — fire-and-forget `fetch(`${base}/${slug}`)` with a short timeout, swallow all errors, no-op when env unset. Call it as the **last** line of the success path in each of the six crons (slugs: `cleanup-swaps`, `expire-swaps`, `expiring-soon`, `daily-digest`, `agreement-followups`, plus whichever sixth exists — enumerate from vercel.json). Failure paths do NOT ping — silence is the alarm. Document the six slugs + setup steps (create six checks, schedule = cron cadence + grace) in RUNBOOK.md.

## Part 4 — Sequencing & tests

Commits: (a) metrics API · (b) dashboard page · (c) heartbeat + RUNBOOK · (d) tests.

Tests: API auth (non-admin → 403/404 per house pattern) · range validation · DB-gated correctness spot-checks with seeded data (a filled swap with known accept latency → time-to-fill math; a finalized-silent agreement → response-rate math; a signupSource user → attribution bucket) · per-section degradation (one section throwing → others still returned) · heartbeat: no-op when unset, pings slug when set (mock fetch), never throws.

Acceptance: as admin, open /admin/metrics → all four sections render with real preview data in under ~2s for 30d · flip range → numbers change sensibly · non-admin gets the house denial · with HEARTBEAT_URL_BASE set locally and a cron invoked, the mock/URL receives exactly one ping on success and none on a forced failure.
