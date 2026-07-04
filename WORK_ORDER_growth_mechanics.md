# Work Order — Growth Mechanics · Share Links, Calendar Export, Install Prompt

Branch: `feat/growth-mechanics`
Goal: win the migration war against the depot group chats. Three features, one theme — every swap becomes a doorway into the app, every agreement makes the app the system of record, and every phone gets push reach.

House rules from the audit branches all apply: secret discipline, stop-and-ask on spec/code conflict, additive-only migrations verified on preview before their commit exists, zero new lint problems, tests for new behavior.

---

## Feature 1 — Shareable swap links that unfurl (the trojan horse)

Workers are still in the WhatsApp/Facebook groups. Give every swap a share button that produces a link with a rich preview card, and users will post app links into the old groups every time they need coverage — turning the incumbent into a funnel.

### 1a · Public teaser page — `app/s/[id]/page.tsx`
A **logged-out-safe** view of a single swap. Server component, no auth required.

**Shows:** category badge · date(s) (or vacation weeks) · shift times if present in structured fields · depot name · status (open / no longer available) · poster as the existing masked format ("First L.") · reputation label only (e.g. "Trusted"), no counts.
**Never shows:** `details` free text, `contact` field, last names, messages, anything about proposals. Treat every field as public-internet-visible, because it will be.
**CTA:** signed-in users with depot access — redirect (or link) straight to the real swap detail. Everyone else — "Sign in to respond" + "New here? WMNY Shift Swap is invite-only — ask a coworker for a code." (The invite gate is a feature; say it proudly.)
**States:** open — full teaser. pending/filled/expired/archived — "This swap is no longer available" + count of currently open swaps at that depot ("12 open swaps at Flatbush right now") + the same CTA. Nonexistent id — generic not-found, no existence oracle beyond that.
**SEO/meta:** `generateMetadata` with OG + Twitter tags pointing at 1b. `noindex` — these are for chat unfurls, not Google.

### 1b · Dynamic OG image — `app/s/[id]/opengraph-image.tsx`
`ImageResponse` from `next/og` (built into Next — no new dependency). 1200×630. WMNY brand: Transit Black `#0D0D0D` background, WMNY Gold `#C9A84C` accents, MTA Blue `#006AA4` category chip. Layout: big date, category, depot name, "WMNY Shift Swap" wordmark, masked poster. Same field discipline as 1a. Unavailable swaps render a "no longer available" variant so stale links in old group chats still look intentional.

### 1c · Share button
On swap detail (all statuses while open) and on the poster's own my-swaps cards. `navigator.share({ url })` when available (mobile), clipboard-copy fallback with a "Link copied" toast. Share URL is `getAppUrl()/s/[id]` — reuse the audit's `lib/appUrl.ts`. i18n EN/ES/中文.

### 1d · Attribution (cheap, do it now)
Append `?src=share` to shared URLs. On the teaser page, when present, set a short-lived cookie; on register, if the cookie exists, stamp a new `signupSource String?` column on User (additive migration, this branch's only schema change). No dashboards yet — just capture, so the growth data exists from day one.

## Feature 2 — Add-to-calendar on accepted agreements

### 2a · ICS route — `app/api/swaps/[id]/agreement/calendar/route.ts`
GET, participants only (owner or proposer of the agreement), agreement status `accepted` or `completed`, else 404. Returns `text/calendar` with `Content-Disposition: attachment; filename="shift-swap.ics"`.

VEVENT: all-day event on `shiftDate` (date-only — the app doesn't model shift times structurally; do NOT parse the free-text details for times). SUMMARY: "Shift swap with {other party's masked name}". DESCRIPTION: category + depot + "Details: {app link to the agreement}". URL: the agreement deep link via `getAppUrl()`. UID: `agreement-{id}@wmnyshiftswap.com`. Escape per RFC 5545 (commas, semicolons, newlines). For daysoff swaps with two dates, emit two VEVENTs in one calendar. Undated vacation agreements: hide the button (nothing sane to export).

### 2b · Button
"Add to calendar 📅" on the agreement page once accepted — plain `<a href>` to the route (mobile OSes hand .ics to the native calendar). Also mention it in the acceptance notification body copy ("Add it to your calendar from the agreement page"). i18n.

## Feature 3 — PWA install prompt (unlocks push for iPhones)

iOS only delivers web push to installed (home-screen) PWAs — every un-installed iPhone user is invisible to the notification system the audit built. Android buries the install affordance. Fix both with one component.

### 3a · `components/InstallPrompt.tsx`
Client component, mounted in the depot layout (post-login surfaces only — never on the public teaser).

**Detection:** already-installed check first — `display-mode: standalone` media query or `navigator.standalone` — render nothing, ever.
**Android/desktop Chrome:** capture `beforeinstallprompt`, `preventDefault()`, stash the event; render a dismissible banner ("Install Shift Swap — faster access + notifications that work") whose button calls `prompt()`.
**iOS Safari:** no event exists — detect iOS + not-standalone, render the same banner; tapping opens a small sheet with the two-step visual: Share button icon → "Add to Home Screen." Note push requires iOS 16.4+; don't version-gate, the instructions are harmless below that.
**Timing & dismissal:** show only after the user is authenticated AND has interacted (2nd session or first swap view — simplest reliable signal available in the code; pick one, note the choice). Dismiss — localStorage `installPromptDismissedAt`, cooldown 14 days, max 3 lifetime shows. Never show two prompts in one session with the push-permission prompt — if the existing push-subscribe flow is about to ask, install banner yields.

### 3b · Post-install push hook
On `appinstalled` event (Android) — and on iOS on first standalone launch — if no push subscription exists, surface the existing push-enable flow once. This is the whole point: install → push reach.

## Sequencing & tests

Commits: (a) teaser page + OG image · (b) share button + attribution (incl. the `signupSource` migration) · (c) ICS route + button · (d) install prompt + post-install hook · (e) i18n · (f) tests.

Tests: teaser field-discipline (response for a swap with contact/details set contains neither string, logged-out) · unavailable/nonexistent states · ICS: participant-only 404s, RFC escaping, two-VEVENT daysoff, correct all-day DTSTART · attribution cookie → signupSource stamped on register · install-prompt logic unit-tested where extractable (detection/cooldown as pure functions).

Acceptance walk-through: paste a share link into any chat app — card shows date/category/depot on brand colors, no personal details · open it logged out — teaser + invite-gated CTA · logged in — lands on the real swap · accept an agreement — calendar button — event lands on the phone's calendar on the right date with a working link back · fresh iPhone Safari login, second session — install banner — follow sheet — app on home screen — push prompt appears once.
