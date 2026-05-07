 # TASKS.md — ShiftSync Build Checklist

> Check off tasks as you complete them. At the start of each session, read this file first to know where you left off. Update the "Current session goal" line before starting work.

**Current session goal:** Day 2 + Day 3 complete → seed, deploy
**Last completed:** Day 2 + 3 — All workflows, fairness analytics, admin pages, build clean at 42 routes

---

## Day 0 — Pre-Build Setup (do this BEFORE opening Claude Code)

### Supabase project
- [x] Create Supabase project at supabase.com (region near you, free tier)
- [ ] Copy: Project URL, anon key, service_role key (Settings → API)
- [ ] Copy: pooled connection string (Settings → Database → Connection string → Transaction mode, port 6543) — append `?pgbouncer=true&connection_limit=1`
- [ ] Copy: direct connection string (Settings → Database → Connection string → Session mode, port 5432)
- [ ] Save all 5 values somewhere safe — needed for `.env.local`

### Vercel project
- [ ] Create empty GitHub repo (public)
- [ ] Create Vercel project, link to the repo (do not deploy yet — repo is empty)

### Local machine
- [ ] Install Node.js 20+
- [ ] Install pnpm globally: `npm install -g pnpm`
- [ ] Install Claude Code (terminal or VS Code extension)
- [ ] Place `CLAUDE.md`, `TASKS.md`, and `README.md` in repo root before first session

### shadcn MCP setup (do this AFTER `pnpm dlx shadcn@latest init` runs in Day 1)
- [ ] Run `pnpm dlx shadcn@latest mcp init --client claude` in project root
- [ ] Open the generated `.mcp.json` and verify it includes `"type": "stdio"` — if missing, add it manually:
  ```json
  {
    "mcpServers": {
      "shadcn": {
        "type": "stdio",
        "command": "npx",
        "args": ["shadcn@latest", "mcp"]
      }
    }
  }
  ```
- [ ] (Recommended) Create a GitHub personal access token (read-only, public repo scope) at github.com/settings/tokens — increases MCP rate limit from 60/hr to 5000/hr
- [ ] Export the token in your shell: `export GITHUB_PERSONAL_ACCESS_TOKEN=<your_token_here>`
- [ ] Restart Claude Code completely
- [ ] Inside Claude Code, run `/mcp` — confirm `shadcn ● connected` with tools listed
- [ ] If pending or disconnected: re-check `.mcp.json` has `type: stdio`, restart again

---

## Day 1 — Foundation

### Project Setup
- [x] Initialize Next.js 14 project: `pnpm create next-app@latest . --typescript --tailwind --app --src-dir=false --import-alias="@/*"`
- [x] Add `"packageManager": "pnpm@9.x.x"` to `package.json`
- [x] Install core deps: `pnpm add @supabase/supabase-js @supabase/ssr @tanstack/react-query @tanstack/react-query-devtools @prisma/client date-fns date-fns-tz zod`
- [x] Install dev deps: `pnpm add -D prisma tsx @types/node`
- [x] Initialize shadcn/ui: `pnpm dlx shadcn@latest init`
- [x] Add shadcn components: button card dialog dropdown-menu form input label select table toast tabs badge avatar calendar popover sheet alert checkbox switch separator
- [x] Initialize Prisma: `pnpm prisma init`
- [x] Configure `schema.prisma` with `directUrl` field for migrations
- [x] Verify `.env.local` exists with all 5 variables filled in
- [x] verify `.env.example` exist with all 5 keys but empty values
- [x] Verify `.gitignore` excludes `.env.local`, `.env.*.local`, `.env`
- [x] Set up TanStack Query: create `/lib/query-client.ts` (staleTime 30s, gcTime 5min defaults)
- [x] Create `/app/providers.tsx` — QueryClientProvider + ReactQueryDevtools wrapper
- [x] Wrap `<Providers>` around children in `/app/layout.tsx`
- [x] Create base folder structure per CLAUDE.md
- [x] Initialize git repo, make first commit with the scaffold
- [ ] Push to GitHub
- [x] Create empty `DOCS.md` in `/docs` folder
- [x] Create initial `README.md` with project name, stack, and "WIP" status

### Database Schema
- [x] `users` table
- [x] `locations` table
- [x] `skills` table
- [x] `user_skills` table
- [x] `location_certifications` table
- [x] `manager_location_assignments` table
- [x] `availability_windows` table
- [x] `availability_exceptions` table
- [x] `desired_hours` table
- [x] `shifts` table
- [x] `shift_assignments` table
- [x] `swap_requests` table
- [x] `notifications` table
- [x] `notification_preferences` table
- [x] `simulated_emails` table
- [x] `audit_logs` table
- [x] `overtime_overrides` table
- [x] `system_settings` table
- [x] Run initial Prisma migration
- [ ] Verify schema in Supabase dashboard
- [x] Insert initial system settings: `edit_cutoff_hours=48`, `premium_start_hour=17`, `premium_end_hour=24`

### Auth & Role System
- [x] Configure Supabase Auth (email/password)
- [x] Login page (`/login`) — email + password, error messaging
- [x] Logout action
- [x] Auth middleware (proxy.ts) — protect all `/dashboard/*`, `/admin/*`, `/manager/*`, `/staff/*` routes
- [x] Role + scope detection on session (loads user's role + assigned locations)
- [x] Redirect after login based on role (admin → `/admin`, manager → `/manager`, staff → `/staff`)
- [x] Layout shells per role (sidebar navigation)
- [x] `/lib/scope.ts` — helpers: `getUserScope(userId)`, `assertCanAccessLocation(userId, locationId)`, `buildLocationFilter(scope)`

### Constraint Engine (`/lib/constraints.ts`)
- [x] `checkDoubleBooking(userId, startUtc, endUtc, excludeShiftId?)`
- [x] `checkRestPeriod(userId, startUtc, endUtc, excludeShiftId?)` — 10h minimum gap check
- [x] `checkSkillMatch(userId, requiredSkillId)`
- [x] `checkLocationCertification(userId, locationId)`
- [x] `checkAvailability(userId, locationId, startUtc, endUtc)`
- [x] `checkDailyHours(userId, date, additionalHours, locationTimezone)` — warn >8h, block >12h
- [x] `checkWeeklyHours(userId, weekStart, additionalHours)` — warn >35h, block >40h (with override path)
- [x] `checkConsecutiveDays(userId, date)` — warn on 6th, block on 7th (with override path)
- [x] `checkHeadcountAvailable(shiftId)`
- [x] `runAllConstraints(userId, shiftId)`
- [x] `suggestAlternatives(shiftId, failedUserId)` — returns up to 3 qualified, available, in-scope staff
- [ ] Unit test each constraint with edge cases (deferred — no test framework; manual testing via seed data)

### Timezone Utilities (`/lib/timezone.ts`)
- [x] `toUtc(localDatetime, timezone)`
- [x] `toZoned(utcDatetime, timezone)`
- [x] `formatForLocation(utcDatetime, timezone)`
- [x] `formatRangeForLocation(startUtc, endUtc, timezone)` — includes (+1) overnight indicator
- [x] `isOvernightShift(startUtc, endUtc, locationTimezone)`
- [x] `getAvailabilityInUtc(window, userHomeTimezone, targetDate)`
- [x] `getWeekBounds(date, timezone)` — Mon–Sun
- [x] `getDayBounds(date, timezone)`

### Audit Helper (`/lib/audit.ts`)
- [x] `logAudit({ entityType, entityId, action, before, after, performedBy, reason? })`
- [ ] Wrap all mutation API routes with audit logging (done per-route as mutations are built)

### Basic Schedule UI
- [x] Weekly calendar grid component (7 columns)
- [x] Shift card component (time in location tz, location name, required skill, headcount X/Y, assigned staff names)
- [x] Location selector (multi-select, scoped to user's accessible locations)
- [x] Week navigation (prev/next/today)
- [x] Draft vs published visual distinction (dashed border = draft, teal = published, amber = premium, red = under-staffed)
- [x] Empty state (— placeholder in each empty day column)

---

## Day 2 — Workflows

### Shift Management (Manager)
- [x] Create shift modal — location, date, start time, end time, skill, headcount
- [x] Edit shift modal — same fields, blocks edit if past cutoff
- [x] Delete shift action — only allowed for `draft` status
- [x] Cutoff enforcement: read `edit_cutoff_hours` from settings, block edits within window
- [x] Validation: end time can be before start time only if overnight (mark `isOvernight` true)
- [x] Auto-recompute `isPremium` on create/edit
- [x] Trigger swap auto-cancellation on edit (if pending swap exists for this shift)

### Shift Assignment (Manager)
- [x] "Assign staff" button on each shift card (shown if assigned_count < headcount)
- [x] Staff search/picker filtered by: skill, certification, availability, scope
- [x] Run constraint checks before saving — show violations inline with severity
- [x] Show alternative suggestions when a constraint fails (block or override)
- [x] Override flow for weekly 40h and 7th-day blocks (reason input required, saved to overtime_overrides)
- [x] Optimistic locking: `BEGIN; SELECT ... FOR UPDATE; re-check constraints; INSERT; COMMIT`
- [x] Conflict error UI: "This staff member was just assigned to [Other Shift] by [Name]. Please refresh."
- [x] Remove assignment action (writes audit log)
- [ ] What-if preview — shows hour totals impact before confirming (deferred)

### Schedule Publish/Unpublish
- [x] Publish week action (changes all draft shifts in selected week → published)
- [x] On publish: send "schedule published" notifications to all assigned staff
- [x] Unpublish week action (only allowed if cutoff has not passed)
- [x] On unpublish: send notifications to affected staff
- [x] Audit log entries for both actions

### Swap & Drop Request Workflow
- [x] Staff "my shifts" page — see upcoming shifts, request swap or drop button on each
- [x] Initiate swap modal: select target staff (filtered to qualified)
- [x] Initiate drop modal: confirm and submit
- [x] Validation: max 3 pending swap/drop per staff member
- [x] Validation: target staff must pass all constraints + not be at 3 pending themselves
- [x] Notification to Staff B on swap request (with deep link)
- [x] Notification to qualified staff at location on drop request
- [x] Staff B accept/decline UI on incoming swap requests
- [x] Staff "available drops" page — see drop shifts they're qualified for + claim button
- [x] Notification to manager on swap accept or drop claim
- [x] Manager swap/drop approval queue page
- [x] Manager approve action: updates assignment, notifies all parties, audit log
- [x] Manager reject action: restores original, notifies all parties, audit log
- [x] Staff A cancel action: allowed at any time before manager approves
- [x] Auto-cancel on shift edit + notification to all parties
- [x] Drop request expiry: filtered at query time (24h before shift start cutoff in API)
- [ ] Auto-expire cron job (deferred — handled at query time)

### Overtime & Labor Compliance
- [x] Weekly hours tracker (computed per staff per week)
- [x] Warning UI on assignment when staff hits 35h/40h weekly (AssignStaffModal shows violations)
- [x] Override flow at 40h weekly (reason required, saved)
- [x] Override flow at 7th consecutive day (reason required, saved)
- [x] Overtime dashboard — weekly view with hours per staff, color-coded warnings/blocks
- [ ] Projected cost display (deferred — no hourly rate in schema)

### Notifications System
- [x] `/lib/notifications.ts` — `notify(userId, type, title, body, metadata?)` inserts to DB + simulated emails
- [x] Wire all notification triggers from CLAUDE.md list
- [x] Notification center UI — bell icon in header, dropdown panel
- [x] Unread count badge on bell
- [x] Mark as read (click individual + "mark all read" button)
- [x] Admin "simulated emails" viewer at `/admin/simulated-emails`
- [ ] Notification preferences page (deferred — preferences in DB but no UI toggle)

### Real-Time (Supabase Realtime ↔ TanStack Query)
- [ ] Enable replication on `shifts`, `shift_assignments`, `swap_requests`, `notifications` tables (manual Supabase dashboard step)
- [x] `/hooks/useRealtimeSync.ts` — subscribes to all 4 tables, calls `queryClient.invalidateQueries([key])` on changes
- [x] Mount realtime sync hook in dashboard layout (runs once per session)
- [x] On-duty dashboard with 60-second polling fallback

### TanStack Query Hooks
- [x] All shift mutations (create, edit, delete, publish, unpublish)
- [x] All assignment mutations (assign, unassign)
- [x] All swap mutations (create, accept, claim, approve, reject, cancel)
- [x] Notification queries and mutations
- [x] All mutations show toast on success and error

### Staff Availability Management
- [x] Staff availability page — see current recurring windows + exceptions
- [x] Add/delete recurring weekly window (day-of-week + time range)
- [x] Add/delete one-off exception (date + window or full-day unavailable)

### Staff Schedule View
- [x] Staff "my schedule" page — upcoming assigned shifts
- [x] Click shift → swap/drop initiation buttons

### Staff Desired Hours
- [x] Staff settings page — set `desired_hours.hoursPerWeek`
- [x] Visible in fairness analytics for managers (Day 3)

---

## Day 3 — Analytics, Audit, Admin, Seed, Deploy

### Fairness Analytics
- [x] Premium shift auto-tagging at create/edit time (Fri/Sat 5pm–midnight in location tz)
- [x] Hours distribution — visual bars for all staff in scope
- [x] Premium shift distribution table — staff name, premium count, total premium hours
- [x] Fairness score display: `1 - (stddev / mean)` clamped to [0,1] with explainer
- [x] Date range selector (2w / 4w / 8w)
- [x] Filter by location (within manager's scope, or all for admin)
- [ ] Under/over-scheduled view (deferred)

### Audit Trail
- [x] Admin: filterable audit log page (search by type/action/user)
- [x] CSV export for admin
- [x] Display before/after state JSON on click

### Admin Pages
- [x] Staff management — deactivate/reactivate, grant/revoke certifications
- [x] Location management — read-only overview with manager assignments and counts
- [x] Certification management — grant/revoke from staff management page
- [x] System settings page — edit `edit_cutoff_hours`, premium hours
- [x] Simulated emails viewer
- [x] Audit log page with CSV export

### Seed Data (`/prisma/seed.ts`)
- [x] System settings (edit_cutoff_hours=48, premium hours)
- [x] 4 locations with correct timezones
- [x] 5 skills
- [x] 1 admin user
- [x] 3 managers (SF scope, NY scope, all-4 scope)
- [x] 10 staff members with varied skills + certifications + home timezones
- [x] At least 2 staff certified in BOTH timezones
- [x] 1 staff at 36+ weekly hours (overtime warning demo — Mike Brown)
- [x] 1 staff at 39+ weekly hours (overtime block demo — Emma Davis)
- [x] 1 staff with pending swap request (Carlos Rivera)
- [x] 1 staff with pending drop request (Priya Patel)
- [x] 1 staff with no Saturday evening shifts in past 4 weeks (David Kim — fairness demo)
- [x] 1 staff working 5 consecutive days (Lisa Thompson)
- [x] Recurring availability for all staff
- [x] One-off exceptions for at least 2 staff
- [x] `desired_hours` set for all staff
- [x] Full week of upcoming shifts across all 4 locations
- [x] Historical 4 weeks of completed shifts (for fairness analytics)
- [x] At least 1 overnight shift (11pm–3am)
- [x] At least 1 baked-in constraint violation (flagged but allowed)
- [x] Premium tagging applied correctly to Fri/Sat evening shifts
- [ ] Run seed and verify in Supabase dashboard (requires DB connection)

### Documentation (`/docs/DOCS.md`)
- [ ] Login credentials for all roles (table format)
- [ ] How to navigate as each role (admin, manager, staff)
- [ ] All 5 ambiguity decisions documented with rationale
- [ ] Known limitations section (timezone-boundary locations, no clock-in, DST handling specifics, mobile responsiveness, etc.)
- [ ] How each of the 6 evaluation scenarios can be reproduced (step-by-step)
- [ ] Architecture overview (one paragraph + simple diagram)
- [ ] Any additional assumptions made during implementation

### Deployment
- [ ] Push to public GitHub repository
- [ ] Verify commit history is clean and descriptive
- [ ] Add README.md with project description, stack, local dev instructions, link to deployed URL
- [ ] Deploy to Vercel — connect to GitHub repo
- [ ] Set all environment variables in Vercel dashboard
- [ ] Run seed against production Supabase instance
- [ ] Smoke test all 6 evaluation scenarios on production URL
- [ ] Verify real-time works on production (not just localhost)
- [ ] Verify cross-tab updates work in <1 second on production
- [ ] Get public URL

### Final Submission
- [ ] All 6 evaluation scenarios pass end-to-end on production
- [ ] Constraint engine blocks and explains all 9 hard rules + 3 warnings
- [ ] Swap workflow complete (initiate → accept/claim → approve → notify → audit)
- [ ] Real-time updates visible in two browser tabs simultaneously
- [ ] Audit trail has entries for all major actions
- [ ] Fairness report shows premium shift distribution
- [ ] Seed data demonstrates all edge cases
- [ ] DOCS.md complete and accurate
- [ ] Public GitHub URL confirmed
- [ ] Public deployment URL confirmed
- [ ] Email submitted to hiring manager before deadline (include: deployment URL, GitHub URL, login credentials, brief note pointing to DOCS.md)

---

## Known Deferred Items (Document in DOCS.md)

- [ ] Full DST edge case test suite (manual testing only)
- [ ] Mobile responsive polish (desktop-first)
- [ ] Timezone-boundary location handling (single canonical tz per location)
- [ ] Email simulation only stores to DB and logs (no real SMTP)
- [ ] No clock-in/clock-out — assignment IS the source of truth for on-duty
- [ ] Cost projection uses fixed $20/h base + 1.5x overtime (placeholder, would be per-staff in production)
- [ ] No SSO / no password reset flow (Supabase handles via magic link if needed)

---

## Session Log

| Session | Date | Completed | Next pickup |
|---|---|---|---|
| 1 | 2026-05-07 | Day 1 — full foundation: scaffold, DB schema, auth, constraint engine, timezone utils, schedule UI | Day 2: Shift create/edit/delete, assign staff modal, constraint UI, publish/unpublish |
| 2 | | | |
| 3 | | | |
| 4 | | | |
| 5 | | | |
| 6 | | | |
| 7 | | | |
| 8 | | | |
| 9 | | | |