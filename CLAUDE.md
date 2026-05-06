 # CLAUDE.md — ShiftSync Project Instructions

> This file is read by Claude Code at the start of every session. Follow everything here without being asked. Never deviate from the stack, decisions, or patterns defined below.

---

## Project Overview

ShiftSync is a multi-location staff scheduling platform for "Coastal Eats" — a fictional restaurant group with 4 locations across 2 time zones (2x Pacific, 2x Eastern). Built as a 72-hour take-home engineering assessment.

**Business pain points the system must solve:**
- Staff calling out with no coverage → fast coverage flow via drop requests + qualified-staff suggestions
- Overtime costs spiraling → visible warnings, hard blocks, projected cost dashboard, what-if preview
- Unfair shift distribution → fairness analytics with premium shift tracking
- Managers hoarding "good" employees → cross-location admin visibility + cross-location certifications
- No central view → unified schedule + on-duty dashboard

---

## Stack — Fixed, Do Not Change

| Layer | Choice |
|---|---|
| Framework | Next.js 14 App Router |
| Language | TypeScript (strict mode) |
| Package manager | pnpm (NEVER use npm or yarn) |
| Database | PostgreSQL via Supabase |
| Auth | Supabase Auth |
| ORM | Prisma |
| Real-time | Supabase Realtime (subscriptions) |
| Data fetching | TanStack Query v5 + Next.js Server Components |
| UI Components | shadcn/ui |
| Styling | Tailwind CSS |
| Timezone handling | date-fns-tz + date-fns |
| Deployment | Vercel (frontend) + Supabase (db/auth) |

**Never suggest switching any of these.** If a library is missing, install it with pnpm. Do not propose alternatives.

### Data fetching rules

- **Server Components** — use for all initial page loads (schedule view, analytics, audit log, lists). No client-side fetch needed for these.
- **TanStack Query** — use for ALL mutations (assign, swap, drop, approve, reject, publish), all optimistic updates, and all cache invalidation triggered by realtime events.
- **Never fetch in `useEffect`.** If client-side fetching is needed, use TanStack Query.
- **Realtime + TanStack Query pattern:** Supabase Realtime subscriptions call `queryClient.invalidateQueries(['key'])` to trigger re-fetch — never manually update cache from realtime payloads.
- **Mutation pattern:** every mutation uses `onMutate` (optimistic update), `onError` (rollback), `onSettled` (invalidate). Claude Code follows this pattern in every mutation hook.
---
## Design System

- Light mode only (no dark mode toggle for v1)
- Primary accent: deep teal (#0F6E56) — used for primary buttons, links, active states
- Status colors:
  - Draft: slate-400 (gray)
  - Published: teal-600 (primary)
  - On-duty now: green-500 (live indicator)
  - Warning: amber-500 (overtime warnings, 6th day)
  - Block: red-500 (hard blocks, conflicts)
- Density: compact — shift cards no taller than 80px, sidebar nav 56px tall
- Typography: Inter for everything, mono (JetBrains Mono) for shift times
- Border radius: rounded-md (6px) on cards, rounded-sm on buttons
- Shadows: minimal — use borders for separation, not shadows
- Layout: max-w-screen-2xl content area, sidebar nav (240px) on dashboard
---
### Package manager rules — pnpm only

- All install commands use `pnpm add` not `npm install`
- All script commands use `pnpm` not `npm run`
- Lockfile is `pnpm-lock.yaml` — commit it, never delete it
- `package.json` includes `"packageManager": "pnpm@9.x.x"` field
- Vercel auto-detects pnpm from the lockfile — no extra config needed

### MCP servers available

- **shadcn MCP** — connected via `.mcp.json` at project root. Use it for component lookups and installs instead of guessing at component APIs from training data. When adding any shadcn component, prefer using the MCP tools to fetch the live component definition. This avoids hallucinated props.

---

## Project Structure

```
/app                  → Next.js App Router pages
  /api                → API route handlers
  /(auth)             → Login, register pages
  /(dashboard)        → Protected app pages
    /admin            → Admin-only views
    /manager          → Manager views
    /staff            → Staff views
  /providers.tsx      → QueryClientProvider + Supabase context wrappers
/components
  /ui                 → shadcn/ui primitives
  /shifts             → Shift create/edit/assign components
  /schedule           → Calendar/schedule views
  /swaps              → Swap and drop UIs
  /notifications      → Notification center
  /analytics          → Fairness + overtime charts
  /admin              → Admin user/location management
/lib
  /constraints.ts     → Core constraint engine (single source of truth)
  /timezone.ts        → All timezone utilities
  /scope.ts           → Manager/admin location-scope enforcement (security)
  /audit.ts           → Audit log helpers (writes before/after JSON)
  /notifications.ts   → Notification dispatch + email simulation
  /supabase.ts        → Supabase browser client
  /supabase-server.ts → Supabase server client (reads cookies)
  /query-client.ts    → TanStack Query client config (staleTime, gcTime defaults)
/hooks
  /queries            → useShifts, useStaff, useSwapRequests, etc.
  /mutations          → useAssignStaff, useApproveSwap, usePublishWeek, etc.
  /useRealtimeSync.ts → Bridges Supabase Realtime → TanStack Query invalidation
/prisma
  /schema.prisma      → Database schema
  /seed.ts            → Realistic seed data
/docs
  /DOCS.md            → Living documentation (update after each feature)
README.md             → Public-facing project description
TASKS.md              → Feature checklist (check off as you complete)
```

---

## Role & Access Rules — Enforce Everywhere

| Role | Can do |
|---|---|
| **Admin** | See and modify everything across all 4 locations. Manage users, locations, certifications, system settings. Export audit logs. |
| **Manager** | Manage ONE OR MORE assigned locations only. Cannot see shifts/staff at locations they're not assigned to. Approve swaps for shifts at their locations. |
| **Staff** | View own shifts and schedule. Set own availability and desired hours. Initiate swap/drop requests. Pick up available drop shifts they're qualified for. View own notifications. |

**Scope enforcement is mandatory in every API route.** Use `/lib/scope.ts` helpers — never query without first filtering by the caller's allowed locations. A manager from SF must NEVER see NY shift data through ANY endpoint.

---

## Environment Variables

All environment variables live in `.env.local` (never committed). A `.env.example` with empty values IS committed.

### Required variables

```bash
# Supabase — public (safe to expose to browser)
NEXT_PUBLIC_SUPABASE_URL=https://[ref].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...

# Supabase — server only (NEVER expose to browser, only used in server actions / API routes / seed script)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...

# Prisma — TWO URLs required for Vercel serverless
# DATABASE_URL goes through the connection pooler (Supavisor) — used at runtime
# DIRECT_URL is a direct connection — used only for migrations
DATABASE_URL=postgresql://postgres:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1
DIRECT_URL=postgresql://postgres:[password]@db.[ref].supabase.co:5432/postgres

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Rules for env vars

- `NEXT_PUBLIC_*` prefix means the variable is bundled into client-side JS. Use ONLY for non-secret values.
- `SUPABASE_SERVICE_ROLE_KEY` — server-only, used in seed script and admin server actions only. Never import in any file under `/components` or any client component.
- `DATABASE_URL` includes `?pgbouncer=true&connection_limit=1` — required for serverless on Vercel (Prisma + transaction-mode pooling).
- `DIRECT_URL` is used by Prisma for `migrate` and `db push` commands only.
- All five variables must be added to Vercel dashboard before deploying.
- `.env.example` mirrors all keys with empty values and IS committed to git.
- `.env.local`, `.env.*.local`, and `.env` are in `.gitignore` and NEVER committed.

### Prisma config to match

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

---

## Constraint Engine Rules

These live in `/lib/constraints.ts`. Every assignment must pass ALL of these checks before saving. Each violation must return a human-readable explanation AND a list of alternative staff where applicable.

### Hard blocks (assignment cannot proceed)

1. **No double-booking** — A staff member cannot be assigned to overlapping shifts, even across different locations. Compare UTC start/end times.
2. **10-hour rest rule** — There must be at least 10 hours between the END of one shift and the START of the next for the same person.
3. **Skill match** — Staff can only be assigned to shifts requiring a skill they hold.
4. **Location certification** — Staff can only work at locations they are certified for. Revoked certifications block new assignments at that location.
5. **Availability** — Staff can only be assigned during their declared available hours. Check recurring weekly availability AND one-off exceptions.
6. **Daily 12-hour cap** — Cannot exceed 12 hours in a single calendar day in the location's timezone.
7. **Headcount cap** — Cannot assign beyond a shift's `headcount` field.

### Hard blocks with manager override (require documented reason)

8. **Weekly 40-hour cap** — Block at 40h in the work week. Manager can override with reason saved to `overtime_overrides`.
9. **7th consecutive day** — Block on 7th consecutive worked day. Manager override + reason required.

### Warnings (proceed but flag in UI)

- Daily hours exceeding 8 (warning)
- Weekly hours at 35+ (warning)
- 6th consecutive day worked (warning)

### Error response format

When a constraint fails, the response must include:
- `rule` — which rule was violated (machine-readable identifier)
- `message` — plain-English explanation including specific numbers (e.g. "Sarah would have only 7h between her shift ending at 11pm and the new shift starting at 6am — minimum is 10h")
- `severity` — "block" | "override" | "warning"
- `alternatives` — up to 3 qualified, available staff with their names, skills, current weekly hours, and home location

---

## Resolved Ambiguities — Apply These Decisions Everywhere

These are deliberate decisions made for this implementation. Reference them whenever relevant.

### 1. De-certification from a location
**Decision:** Historical shift data is fully preserved. De-certification is non-destructive — set `revokedAt` on the certification row, never delete. Past completed shifts remain in the audit trail unchanged. Future PUBLISHED shifts at that location are flagged with a warning and require manager action (reassign or override). The staff member cannot be assigned to NEW shifts at that location after revocation.

### 2. "Desired hours" vs availability windows
**Decision:** These are separate concepts that do not block each other. Availability windows are hard constraints (staff cannot be scheduled outside them). Desired hours are a soft preference used only in the fairness analytics dashboard to show under/over-scheduling. Desired hours never prevent an assignment.

### 3. Consecutive day calculation — does shift length matter?
**Decision:** Any shift of any length counts as a worked day. A 1-hour shift counts the same as an 11-hour shift. The rule is about calendar days worked (in the staff member's home timezone — defaults to the timezone of their first certified location), not hours. This protects staff from being called in for "just one hour" on a 7th day.

### 4. Shift edited after swap approval but before it occurs
**Decision:** If the swap was already approved and the manager edits the shift afterward, the new shift state is the source of truth. Staff B (who now holds the shift) keeps it but receives a notification about the change. If Staff B no longer meets constraints due to the edit (e.g. now requires a skill they don't have), the system flags this to the manager with the option to reassign. Spec already covers the pre-approval case: pending swaps auto-cancel on edit.

### 5. Location spanning a timezone boundary
**Decision:** Each location has exactly one canonical timezone stored in the database. The system uses that timezone for all display, availability checks, and DST handling for that location. We do not attempt to split a location across timezone boundaries. This is documented as a known limitation in DOCS.md.

---

## Shift Lifecycle & Manager Powers

### Manager can:
- **Create** shifts: location (must be in their scope), date/time, required skill, headcount needed (≥1)
- **Edit** shifts: any field, but only if shift is `draft` OR within the cutoff window (default 48h before start, configurable in `system_settings`)
- **Delete** shifts: only `draft` shifts. Published shifts cannot be deleted, only edited or unpublished.
- **Assign** staff: up to `headcount` staff per shift, must pass all constraint checks
- **Publish** week schedule: bulk action, all `draft` shifts in selected week → `published`. Triggers notifications to all assigned staff.
- **Unpublish** week schedule: only allowed if cutoff has not passed. Triggers notifications.
- **Approve / reject** swap and drop requests at their locations

### Editable cutoff is configurable
- Stored in `system_settings` table (key: `edit_cutoff_hours`, default `48`)
- Admin can change this via admin settings page
- Apply consistently to: shift edits, unpublish, deletion of draft shifts

### Headcount tracking
- Each shift has `headcount` (required) and a derived `assigned_count`
- UI must show "2 / 3 assigned" on every shift card
- Shifts under-assigned in the published week are flagged red in manager dashboard
- Cannot over-assign beyond headcount

---

## Swap & Drop Workflow

```
PRE-APPROVAL CANCELLATION RULES
  Staff A can cancel their own request before manager approval, regardless of
  whether Staff B has accepted (swap) or another staff has claimed (drop).
  Max 3 PENDING swap/drop requests per staff member at any time.
  Drop requests auto-expire 24h before shift start if unclaimed.
  Manager editing a shift auto-cancels any PENDING swap for that shift.

WORKFLOW
  Staff A initiates swap or drop
    → If swap: Staff B receives notification + must accept
    → If drop: shift goes to "available" pool, qualified staff get notified
  
  Staff B accepts (swap) OR claims (drop)
    → Manager receives approval request notification
    → Original assignment REMAINS until manager approval
  
  Manager approves
    → Assignment updated, all parties notified
    → Audit log entry created with before/after JSON
  
  Manager rejects
    → Original assignment confirmed, all parties notified
    → Audit log entry created
```

### Validation rules during swap/drop
- Target staff in a swap must pass ALL constraint checks for the shift before the request can be created
- A staff member already at 3 pending requests cannot initiate new ones
- A swap cannot target a staff member who is themselves at 3 pending

---

## Timezone Handling Rules

- **Always store in UTC** in the database (use `timestamptz` in Postgres)
- **Always display in location's local timezone** for shift times — use the location's `timezone` field (e.g., `America/Los_Angeles`, `America/New_York`)
- **Each user has a `homeTimezone`** field (defaults to the timezone of their first certified location). Availability windows are interpreted in this home timezone.
- **Cross-timezone availability example:** Staff with home timezone PT sets "9am–5pm". When evaluating for a shift at an ET location, that window converts: 9am PT = 12pm ET, 5pm PT = 8pm ET. Display this conversion in the assign UI when assigning across zones.
- **Overnight shifts** (e.g., 11pm–3am) are valid — the end time is on the next calendar day. Never reject based on end < start without checking for overnight case.
- **DST transitions**: use `date-fns-tz` `zonedTimeToUtc` and `utcToZonedTime` — never manual offset arithmetic. On spring-forward, a 2:30am local time does not exist (treat as the moment of the gap, +1 hour); on fall-back, ambiguous times occur twice (treat as the SECOND occurrence, after DST ended). Document this in DOCS.md.

---

## Real-Time Implementation

Use Supabase Realtime channel subscriptions. Subscribe to:
- `shifts` table changes → update schedule view for users at affected locations
- `shift_assignments` table changes → update schedule + on-duty dashboard
- `swap_requests` table changes → update affected users (requester, target, manager)
- `notifications` table changes → update notification bell + unread count

### Concurrent assignment conflicts
For the "two managers assign same staff at same time" scenario:
- Wrap assignment INSERT in a transaction with `SELECT ... FOR UPDATE` on the staff member's row
- Re-check ALL constraints inside the transaction (including double-booking)
- The second request fails with: `"This staff member was just assigned to [Other Shift] by [Manager Name]. Please refresh."`
- Both managers see updated state via realtime within ~1 second

### On-duty dashboard
- "Currently working now" view per location
- A shift assignment is "on-duty" if: shift `status='published'` AND current UTC time is between `startUtc` and `endUtc`
- v1 has NO clock-in/clock-out — assignment IS the source of truth (documented as known limitation)
- Updates live via realtime + a 60-second polling fallback for time-based transitions (a shift becoming on-duty as time passes)

---

## Notification Triggers — Required List

Every notification has: `userId`, `type`, `title`, `body`, `read=false`, `createdAt`, `metadata` (jsonb with deep-link).

| Recipient | Trigger |
|---|---|
| Staff | New shift assigned to me |
| Staff | My shift edited (date/time/location/skill changed) |
| Staff | My shift deleted |
| Staff | Schedule published for upcoming week |
| Staff | Swap I initiated: accepted by target, approved by manager, rejected, auto-cancelled |
| Staff | Swap requested with me as target |
| Staff | Drop I claimed: approved, rejected |
| Staff | New drop available at a location I'm certified for and qualified for |
| Staff | My drop request expired without being claimed |
| Manager | New swap or drop awaiting my approval |
| Manager | Staff availability change for staff at my location |
| Manager | Overtime warning triggered (35h, 40h, 6th day, 7th day) for staff at my location |
| Manager | Constraint override exercised by me or another manager |

### Notification preferences
- Per-user: `inApp` (always on, cannot disable), `emailSimulation` (toggle, default on)
- Email simulation: insert into `simulated_emails` table + log to console
- Expose `/admin/simulated-emails` for the evaluator to verify emails were "sent"

---

## Audit Trail — Required Logged Events

Every audit log entry contains: `entityType`, `entityId`, `action`, `beforeState` (jsonb), `afterState` (jsonb), `performedBy`, `performedAt`, `reason` (nullable, for overrides).

Required logged events:
- Shift: create, edit, delete, publish, unpublish
- Assignment: create, remove, swap-approve, swap-reject
- Swap/drop: create, accept, claim, approve, reject, cancel, expire, auto-cancel-on-edit
- Constraint override: weekly hours, 7th consecutive day
- Certification: grant, revoke
- Availability: create, edit, delete (recurring + exceptions)
- User: create, role change, deactivate
- System settings: change to `edit_cutoff_hours` or other settings

Manager can view shift history (timeline of all changes to a shift). Admin can export filtered audit logs as CSV (date range + location + action type filters).

---

## Fairness Analytics Rules

- "Premium" shift = any shift where `startUtc` (when converted to location's timezone) falls on Friday OR Saturday between 5pm and 11:59pm
- Tagged at shift creation, recomputed if shift time is edited
- Distribution chart: hours per staff over selected period, grouped by location filter
- Premium shift count per staff over period
- Fairness score formula: `1 - (stddev(premium_counts) / mean(premium_counts))`, clamped to [0, 1]. Higher = more equitable. Show with a brief explanation in UI.
- Under/over-scheduled view: each staff's actual assigned hours vs their `desired_hours.hoursPerWeek` × number-of-weeks-in-period

---

## Seed Data Requirements

`/prisma/seed.ts` must create:

**Locations:**
- The Pier (San Francisco, `America/Los_Angeles`)
- Sunset Grill (Los Angeles, `America/Los_Angeles`)
- Harbor View (New York, `America/New_York`)
- The Wharf (Boston, `America/New_York`)

**Skills:** bartender, line cook, server, host, supervisor

**Staff (10 people, varied skills and certifications):**
- At least 2 staff certified at locations in BOTH timezones
- At least 1 staff at 36+ weekly hours already (for overtime warning demo)
- At least 1 staff at 39+ weekly hours (for overtime block demo)
- At least 1 staff with a pending swap request
- At least 1 staff with a pending drop request
- At least 1 staff with no Saturday evening shifts in the last 4 weeks (for fairness scenario)
- At least 1 staff working 5 consecutive days (close to consecutive-day warning)
- Skills distributed across all 5 skill categories
- Each staff has recurring availability + at least 2 staff have one-off exceptions
- Each staff has `desired_hours.hoursPerWeek` set

**Shifts:**
- Full week of shifts (next 7 days) across all 4 locations
- Plus historical 4 weeks of completed shifts (for fairness analytics demo)
- At least 1 overnight shift (11pm–3am)
- At least 1 constraint violation baked into existing data (flagged in UI, allowed for demo)
- Friday and Saturday evening shifts marked as premium

**System settings:**
- `edit_cutoff_hours` = 48
- `premium_start_hour` = 17 (5pm)
- `premium_end_hour` = 24 (midnight)

**Users:**
- 1 admin: `admin@coastaleats.com` / `Admin1234!`
- 3 managers: `manager.sf@coastaleats.com` (manages The Pier + Sunset Grill), `manager.ny@coastaleats.com` (Harbor View + The Wharf), `manager.cross@coastaleats.com` (manages all 4) — all with password `Manager1234!`
- 10 staff: `[firstname].[lastname]@coastaleats.com` / `Staff1234!`

---

## Documentation — Keep DOCS.md Updated

After completing each feature, append an entry to `/docs/DOCS.md` with:
- What was built (one paragraph)
- Any assumption made during implementation
- Any known limitation or edge case not handled
- Which evaluation scenario(s) this enables

---

## Commit Pattern

Commit after each completed feature using this format:
```
feat: [feature name] — [one line description]
```
Examples:
```
feat: constraint engine — no double-booking, 10h rest, skill/cert/availability checks
feat: swap workflow — state machine with cancellation and expiry
feat: realtime — supabase subscriptions invalidate tanstack query cache
fix: timezone — handle DST fall-back ambiguity
chore: deps — add @tanstack/react-query and devtools via pnpm
```

## Common Commands (always pnpm)

```bash
pnpm install                        # install all deps
pnpm add [package]                  # add a runtime dep
pnpm add -D [package]               # add a dev dep
pnpm dlx shadcn-ui@latest add [x]   # add a shadcn component
pnpm prisma migrate dev             # run migration in dev
pnpm prisma db seed                 # run seed script
pnpm dev                            # start dev server
pnpm build                          # build for production
pnpm lint                           # run eslint
```

---

## After Each Session

Before ending any session:
1. Check off completed items in `TASKS.md`
2. Update `DOCS.md` with what was built and any decisions made
3. Commit all changes with a descriptive message
4. Add a row to the Session Log in TASKS.md noting where to pick up next

---

## The 6 Evaluation Scenarios — Test These Before Day 3

1. **Sunday Night Chaos** — Staff calls out 1h before shift. Manager opens coverage dashboard, sees qualified available staff filtered by all constraints, sends a drop or direct-assign, qualified staff get realtime notification, replacement staff picks up.
2. **Overtime Trap** — Manager builds schedule, system shows running weekly total. Warning at 35h, hard block at 40h with override option requiring reason. Visual highlights which assignments are pushing hours up. What-if preview shown before confirming.
3. **Timezone Tangle** — Staff certified at SF (PT) and NY (ET) sets availability "9am–5pm" in their home timezone. System correctly converts to each location's local time when checking. UI shows the conversion when manager assigns across zones.
4. **Simultaneous Assignment** — Two managers assign same bartender to different shifts at same time. Second gets immediate conflict error via row-level lock + transaction-scoped re-check. Both managers see updated state via realtime within 1 second.
5. **Fairness Complaint** — Manager pulls fairness report, filters to Saturday evenings, last 4 weeks. Sees premium shift distribution per staff member; the complaining employee's count is visible alongside peers.
6. **Regret Swap** — Staff A initiates swap, Staff B accepts, BUT Staff A cancels before manager approves. Original assignment restored. Staff B and manager both notified. Audit log records the cancellation.