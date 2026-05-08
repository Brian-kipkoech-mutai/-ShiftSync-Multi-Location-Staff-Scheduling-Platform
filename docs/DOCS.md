# ShiftSync — Living Documentation

> Updated after each feature. Latest at top.

---

## Shift Edit — Constraint Preview & Confirmed Unassignment

### What was built
When a manager edits a shift's time or required skill, the system checks whether any currently-assigned staff would violate constraints under the new values **before** committing the change. If violations exist, a confirmation dialog is shown listing each affected staff member and the specific constraint they fail. The manager can cancel (no change applied) or confirm ("Save & unassign"), after which the shift is updated and the disqualified staff are removed and notified.

### Constraint check flow
```
Manager submits edit form
  → PATCH /api/shifts/:id?preview=true
      — skill changed? → find assignees who lack new skill
      — time changed?  → run double-booking, rest period,
                         availability, daily 12h cap checks
                         against the new start/end times
      → returns { wouldUnassign: [{ id, name, reason }] }
  → If wouldUnassign is non-empty → show confirmation dialog
  → Manager cancels: form stays open, nothing saved
  → Manager confirms → PATCH /api/shifts/:id (no ?preview)
      — shift updated in DB
      — staff re-checked, violators set to status="removed"
      — in-app notifications sent to manager + unassigned staff
      — audit log entry written (action: "skill-change-unassign" or "time-change-unassign")
      → response includes { unassignedStaff, unassignedReason }
  → Client shows sonner toast with correct reason label
```

### Constraint types checked during preview
For **skill changes**: any assignee who does not hold the new required skill is flagged.

For **time changes**, all four time-sensitive hard constraints are checked against the incoming `startUtc`/`endUtc`:

| Constraint | Rule ID |
|---|---|
| Double-booking with another active shift | `no_double_booking` |
| Less than 10h rest from adjacent shift | `rest_period` |
| Outside staff's declared availability window | `availability` |
| Would push total daily hours past 12h | `daily_12h_cap` |

Only `severity: "block"` violations trigger unassignment. Warnings (e.g. over 8h/day) do not.

### `unassignedReason` response field
The API returns `unassignedReason: "skill_change" | "time_change" | "mixed" | null` so the client can show accurate feedback. The sonner toast reads this field — it will never say "skill change" when the cause was a time change.

### Why preview uses direct constraint functions rather than `runAllConstraints`
`runAllConstraints` reads the shift row from the database to get its times. In preview mode the shift has not been updated yet, so it would check constraints against the old times — defeating the purpose. The preview instead computes the new `startUtc`/`endUtc` from the submitted form values and passes them directly to `checkDoubleBooking`, `checkRestPeriod`, `checkAvailability`, and `checkDailyHours`. The real (non-preview) PATCH updates the shift first, then calls `runAllConstraints` against the now-updated DB row.

### Known limitation
There is a narrow race window between preview and confirmed save: if another manager makes a change in that interval that creates a new violation for the same staff member, the real API will still unassign them — this time without a dialog, since the confirmation was already given for a different reason. This is acceptable for v1 given the low probability and the fact that the affected staff receive an in-app notification regardless.

---

## Shift History — Per-Shift Audit Timeline

### What was built
Managers can open any shift's detail sheet and expand a **Shift History** panel that shows a chronological timeline of every action taken on that shift. The panel is lazy-loaded — no request is made until the manager clicks the toggle.

### What's included
Three classes of audit entries are surfaced:

| Entry | Example label |
|---|---|
| Shift created / edited / published / unpublished / deleted | "Start time changed", "Required skill changed" |
| Staff assigned / removed / swap approved / rejected | "Alex Chen assigned", "Maria Santos removed" |
| Overtime override exercised | "Overtime override" |

### Edit entries — specific labels and color coding
For `shift/edit` entries the system compares `beforeState` and `afterState` to determine exactly what changed. Only the four manager-editable fields are compared: `startUtc`, `endUtc`, `requiredSkillId`, `headcount`. This avoids noise from fields like `updatedAt` or nested relations that Prisma includes in the logged snapshot.

- Single field changed → `"Start time changed"`, `"Headcount changed"`, etc.
- Multiple fields → `"Start time & End time changed"`, `"Time & Required skill changed"`, etc.
- Color: **amber** if the required skill changed (may have triggered auto-unassigns), **blue** for all other edits.

When expanded, the diff shows only the changed fields in a three-column row: field label → old value (red) → new value (teal). Timestamps are formatted as readable dates, not raw ISO strings.

### Assignment entries — no diff panel
Assignment `create` entries (`"Alex Chen assigned"`) have no expandable diff. The API logs the full assignment row as `afterState` with no `beforeState` — there is no "before" for a new assignment. The label itself is the complete information. This is intentional; showing a raw JSON blob of the assignment row would add noise without value.

### Realtime updates
The history panel updates in realtime without polling. The existing `useRealtimeSync` subscriptions for `shifts` and `shift_assignments` already receive the full changed row from Supabase. On each event, the handler extracts the `shiftId` (note: Supabase uses the real DB column name `shift_id`, not the Prisma camelCase `shiftId`) and calls `queryClient.invalidateQueries(["shift-history", shiftId])`. Both managers see the timeline refresh immediately when any action lands — no extra subscription needed.

### Why no realtime subscription on `audit_logs`
The history panel never subscribes to the `audit_logs` table directly. Every action that produces an audit entry also produces a change in `shifts` or `shift_assignments`, which the existing subscriptions already catch. Piggybacking on the source tables is sufficient and avoids an extra subscription channel.

---

## DST Handling for Recurring Availability Windows

Recurring availability is stored as raw wall-clock strings — e.g. `(dayOfWeek=1, startTime="09:00", endTime="17:00")`. When the system checks whether a shift falls inside a staff member's availability, `getAvailabilityInUtc()` in `lib/timezone.ts` converts those strings to UTC for comparison.

DST creates two edge cases on transition days:

- **Spring forward** (e.g. 2:00am → 3:00am): The gap hour does not exist. `date-fns-tz` advances non-existent times by the gap length (+1 hour).
- **Fall back** (e.g. 2:00am → 1:00am): The 1:00am–2:00am hour occurs twice. `date-fns-tz` resolves the ambiguity to the second occurrence (post-DST, standard time).

Both cases are handled by passing the ISO wall-clock string directly to `fromZonedTime(string, timezone)`. This lets `date-fns-tz` own the full conversion, including DST edge cases, without the server's local timezone ever being involved.

**Why this matters:** constructing `new Date("2023-11-05T01:30:00")` without a timezone suffix is parsed as server local time. On a UTC server the hour value is correct by accident. On any non-UTC server (or a developer's local machine) the hour is off by the server's UTC offset before `fromZonedTime` even runs. Passing the string directly bypasses this entirely — the conversion is deterministic regardless of where the server runs.

---

## On-Duty Dashboard — Realtime + Polling Hybrid

The on-duty dashboard shows who is currently working at each location. It uses two update mechanisms in combination.

**Supabase Realtime** handles assignment changes — when a manager assigns or removes a staff member, a row is written to `shift_assignments`, the Realtime subscription fires, and `useRealtimeSync` calls `queryClient.invalidateQueries(["on-duty"])` to trigger a refetch. This keeps the dashboard up-to-date for all assignment-driven changes.

**60-second polling** closes the gap that Realtime cannot. Realtime fires only when a database row is written or changed. No row changes when the clock passes a shift's `startUtc` or `endUtc` — those timestamps are static. This means a shift that starts at 6pm will not appear in the on-duty view until either: (a) a row change happens to trigger an incidental refetch, or (b) a polling interval fires. Without polling, a shift could remain invisible (or fail to disappear) for an arbitrary amount of time after it starts or ends.

The 60-second interval (`refetchInterval: 60_000`) means the maximum lag before a time-based transition is reflected in the dashboard is one poll cycle — acceptable for an operational view, and significantly cheaper than sub-second polling. The `staleTime: 0` setting ensures each poll triggers a real network request rather than being served from cache.

**Why not Realtime only?** Realtime is a CDC (change-data-capture) system — it reacts to row mutations. Time passing is not a mutation. There is no Supabase feature for "notify me when `NOW()` crosses a column value." Polling is the correct tool for time-boundary detection.

**Known limitation:** Up to 60 seconds of lag on shift start/end transitions. For v1 with no clock-in/clock-out, this is the designed behavior — assignment is the source of truth, and 60s lag is acceptable.

---

## What-If Impact Preview (Assign Staff Modal)

The requirement asks for the ability to see "what-if" impact before confirming an assignment. This is implemented as an **inline projected-hours row** on every staff card inside the Assign Staff modal — no separate confirmation step required.

Each card shows:
```
32.5h → 40.5h/wk    3.0h → 11.0h today
```
The arrow shows current hours → projected hours after this shift is added. Color coding: **green** (safe), **amber** (entering warning zone: 35–40h/wk or 8–12h/day), **red** (over hard limit: >40h/wk or >12h/day).

This gives the manager the full overtime picture before clicking Assign — without an extra click or modal. Staff who would breach a limit are already showing amber/red and have a violation message below their name; the what-if row makes the same information visible even for staff who are safely assignable, so the manager can compare the cost of each option side by side.

**To see this in the Overtime Trap scenario:** open any shift's Assign Staff modal when staff have existing hours that week. The projected totals update per-staff instantly — no action needed to trigger the preview.

---

## Session 1 — Foundation (Day 1)

### What was built
Project scaffold: Next.js 16 App Router, Prisma v5 schema (18 tables), Supabase Auth + SSR, TanStack Query v5 with provider, shadcn/ui components, sidebar nav per role, notification bell, login/logout flow, auth middleware, scope/constraint/timezone/audit/notification utilities, initial DB migration applied.

### Assumptions made
- Next.js 16 (latest) used instead of pinned 14 — App Router API is identical for our use cases.
- Prisma v5 used (v7 deprecated `url`/`directUrl` in schema.prisma, incompatible with the specified config pattern).
- `"packageManager": "pnpm@9.15.0"` used (9.x.x is not a valid semver).
- Sonner used for toasts (shadcn's recommended replacement for the deprecated `toast` component).

### Known limitations / deferred
- Schedule grid UI not yet built (stub pages only).
- Seed data not yet inserted.
- Real-time subscriptions not yet wired.

---

## Ambiguity Decisions

### 1. De-certification from a location
Historical shift data is preserved. Revocation sets `revokedAt` on the cert row — never deletes. Past shifts in audit trail unchanged. Future published shifts at that location are flagged. No new assignments possible after revocation.

### 2. "Desired hours" vs availability windows
Separate concepts. Availability windows are hard constraints. Desired hours are a soft preference used only in fairness analytics. Desired hours never prevent an assignment.

### 3. Consecutive day calculation
Any shift of any length counts as a worked day. A 1-hour shift counts the same as 11 hours. Calendar days in the staff member's home timezone.

### 4. Shift edited after swap approval
If swap was approved and manager edits the shift, Staff B keeps the shift but is notified of the change. If Staff B no longer meets constraints, manager is flagged. Pending swaps auto-cancel on edit.

### 5. Location spanning a timezone boundary
Each location has exactly one canonical timezone. No attempt to split across timezone boundaries. Documented as known limitation.

### 6. "Suggest alternatives" — list-based assignment instead of try-and-fail
The spec states the system should "suggest alternatives when possible (e.g., Sarah is unavailable, but John and Maria have the required skill and availability)." This language assumes a try-and-fail UX: the manager picks someone, the assignment fails, and the system then surfaces alternatives.

**Decision:** We implemented a pre-evaluated list model instead. When a manager opens the Assign Staff modal, the system runs all nine constraint checks against every certified staff member in one batched query and returns the full list sorted by assignability: available staff first (green Assign button), override-required staff second (amber Override button), fully blocked staff last (red Blocked badge with the specific violation reason inline — e.g., "Only 6h rest between shifts — minimum is 10h").

**Why this is better UX:**
- The manager sees who is available *before* making a choice, not after a failed attempt. There is no wasted click.
- The violation reason is shown inline for every blocked person, so the manager understands the constraint without triggering it.
- The available staff at the top of the list *are* the alternatives — they are pre-filtered by skill match, location certification, availability, rest period, double-booking, daily cap, and weekly hours in a single screen.
- For the "Sunday Night Chaos" scenario (staff calls out 1h before a shift), the manager opens the modal and immediately sees 1–3 green Assign buttons at the top — the fastest possible path to coverage.

The `suggestAlternatives()` function in `lib/constraints.ts` is fully implemented and wired into `runAllConstraints()` for programmatic use (e.g., auto-unassign flows that need to recommend replacements). In the interactive assign flow the list modal makes it redundant.

---

## Known Limitations

- **Mobile responsiveness**: Schedule grid horizontally scrollable on mobile. Complex data-dense pages (analytics, audit log) are desktop-first.
- **Clock-in/clock-out**: Not implemented. Shift assignment is the source of truth for on-duty status.
- **Email simulation**: Inserts to `simulated_emails` table + console log. No real SMTP.
- **DST edge cases**: Handled via `date-fns-tz`. Spring-forward gaps treated as +1 hour; fall-back ambiguous times treated as post-DST. Manual testing only.
- **Location spanning timezone boundary**: Single canonical timezone per location.
- **Cost projection**: Uses fixed $20/h base + 1.5x overtime. Per-staff rates would be a production enhancement.
- **Password reset**: Not implemented. Supabase handles via magic link if needed.
- **SSO**: Not implemented.

---

## Login Credentials

### Admins & Managers

| Role | Name | Email | Password |
|------|------|-------|----------|
| Admin | Admin User | admin@coastaleats.com | Admin1234! |
| Manager (The Pier + Sunset Grill) | Jordan Lee | manager.sf@coastaleats.com | Manager1234! |
| Manager (Harbor View + The Wharf) | Taylor Nguyen | manager.ny@coastaleats.com | Manager1234! |
| Manager (All 4 locations) | Morgan Walsh | manager.cross@coastaleats.com | Manager1234! |

### Staff

| Name | Email | Password | Notes |
|------|-------|----------|-------|
| Alex Chen | alex.chen@coastaleats.com | Staff1234! | Bartender + Server — SF/LA certified |
| Maria Santos | maria.santos@coastaleats.com | Staff1234! | Host + Server — SF certified |
| James Wilson | james.wilson@coastaleats.com | Staff1234! | Line Cook — SF/NY certified (cross-timezone) |
| Sarah Johnson | sarah.johnson@coastaleats.com | Staff1234! | Server + Supervisor — SF certified |
| Mike Brown | mike.brown@coastaleats.com | Staff1234! | Bartender — NY/Boston certified; **~39h this week** (overtime block demo) |
| Emma Davis | emma.davis@coastaleats.com | Staff1234! | Server — NY certified; **~36h this week** (overtime warning demo) |
| Carlos Rivera | carlos.rivera@coastaleats.com | Staff1234! | Line Cook — NY/Boston certified; has pending swap request |
| Priya Patel | priya.patel@coastaleats.com | Staff1234! | Host — SF/LA certified; no Saturday evenings last 4 weeks (fairness demo) |
| David Kim | david.kim@coastaleats.com | Staff1234! | Bartender + Supervisor — SF certified; 5 consecutive days worked |
| Lisa Thompson | lisa.thompson@coastaleats.com | Staff1234! | Server — NY certified; has pending drop request |

---

## Architecture Overview

ShiftSync is a Next.js 14 App Router application deployed on Vercel, backed by a PostgreSQL database hosted on Supabase with Prisma as the ORM. Authentication is handled entirely by Supabase Auth (email/password, session cookie via `@supabase/ssr`). The frontend uses Server Components for initial data loads (no loading spinner on first render) and TanStack Query for all mutations and optimistic updates. Real-time push uses Supabase Realtime CDC subscriptions bridged into TanStack Query cache invalidation via `useRealtimeSync`. A 60-second polling fallback covers time-boundary transitions (shift start/end) that do not produce a DB write and therefore cannot be caught by Realtime alone.

```
Browser
  ├── Server Components (initial page data — no client fetch needed)
  ├── Client Components
  │     ├── TanStack Query — mutations + cache (optimistic updates, invalidation)
  │     └── useRealtimeSync — Supabase Realtime → invalidateQueries
  └── Next.js API Routes (/app/api/**)
        ├── /lib/auth.ts         — getSessionUser() via Supabase SSR
        ├── /lib/scope.ts        — location-based access enforcement
        ├── /lib/constraints.ts  — all 9 constraint checks + suggestAlternatives
        ├── /lib/timezone.ts     — UTC ↔ zoned conversions (date-fns-tz)
        ├── /lib/audit.ts        — logAudit() — before/after JSON logging
        └── /lib/notifications.ts— notify() — in-app + simulated email

Database (Supabase / PostgreSQL)
  18 tables: users · locations · skills · user_skills
             location_certifications · manager_location_assignments
             availability_windows · availability_exceptions · desired_hours
             shifts · shift_assignments · swap_requests
             notifications · notification_preferences · simulated_emails
             audit_logs · overtime_overrides · system_settings
```

---

## Role Navigation Guide

### Admin (`admin@coastaleats.com`)

After login, redirected to `/admin`. The sidebar shows:

| Page | What to do there |
|---|---|
| **Overview** | See all locations, total shifts this week, unresolved swap/drop count |
| **Schedule** | View the full week grid across all 4 locations. Use location filter to narrow. Click any shift to see detail, history, and assignments. |
| **On Duty** | Live board — who is working right now at each location. Auto-refreshes every 60s. |
| **Staff** | Search all 10 staff members. Click any card to see their skills and location certifications. Grant or revoke certifications. Deactivate/reactivate accounts. |
| **Locations** | Read-only overview of the 4 locations — managers assigned, staff counts, timezone. |
| **Analytics** | Fairness report. Change the date range (2w / 4w / 8w) and location filter. Premium shift distribution table and fairness score visible at bottom. |
| **Audit Log** | Full event log with filters by action type. Click any row to expand before/after JSON. Use "Export CSV" for a filtered download. |
| **Simulated Emails** | Proof that email notifications were triggered. Each entry shows recipient, subject, and body. |
| **Settings** | Change `edit_cutoff_hours` (default 48) and premium shift window (`premium_start_hour`, `premium_end_hour`). |

---

### Manager (`manager.sf@coastaleats.com` — The Pier + Sunset Grill)

After login, redirected to `/manager` (the schedule view). The sidebar shows:

| Page | What to do there |
|---|---|
| **Schedule** | Week grid scoped to your locations. Click a day column to create a shift. Click a shift card to open its detail sheet — edit, delete, assign staff, view history, or start a drop. **Publish / Unpublish** week buttons at the top right. |
| **On Duty** | Live board for your locations. |
| **Swap Requests** | Approval queue. Approve or reject swap/drop requests pending for shifts at your locations. |
| **Analytics** | Fairness report for your locations. |
| **Overtime** | Horizontal bar chart of weekly hours per staff. Color-coded: teal (safe), amber (35–39h warning), red (40h+ block). |
| **Staff** | Directory of staff certified at your locations. |
| **Settings** | Notification preferences. |

**Key flow — assigning staff:**
1. Click a shift card → Detail sheet opens.
2. Click **Assign Staff** (shown when `assigned < headcount`).
3. The modal lists every certified staff member, sorted: available (green) → override-required (amber) → blocked (red).
4. Green rows show a projected "what-if" hours estimate. Click **Assign**.
5. If the person is at 35–40h, an amber Override button appears — requires a documented reason.

---

### Staff (`alex.chen@coastaleats.com` — example)

After login, redirected to `/staff` (my schedule). The sidebar shows:

| Page | What to do there |
|---|---|
| **My Schedule** | Upcoming assigned shifts. Click any shift to request a **Swap** (pick a specific colleague) or **Drop** (put it in the available pool). |
| **Available Shifts** | Drop shifts you're qualified to claim. Click **Claim** to submit (manager still approves). |
| **My Swaps** | Incoming swap requests from colleagues (Accept / Decline). Your own pending swap/drop requests (Cancel). |
| **Availability** | Set recurring weekly windows (e.g., "Monday 9am–5pm"). Add one-off exceptions (available or unavailable on a specific date). |
| **Settings** | Set desired hours per week (used in fairness analytics). Toggle email simulation preference. |

---

## The 6 Evaluation Scenarios — Reproduction Steps

### Scenario 1 — The Sunday Night Chaos
*A staff member calls out 1h before a 7pm shift. Fastest path to coverage.*

1. Log in as **manager.sf@coastaleats.com** (The Pier + Sunset Grill).
2. Go to **Schedule** → navigate to today's date.
3. Find any published shift starting around 7pm at The Pier.
4. Click the shift card → Detail sheet opens.
5. Click **Assign Staff** (or if headcount is already full, first remove an existing assignment to simulate the call-out — click the ✕ next to a staff name).
6. The Assign Staff modal immediately shows all certified staff sorted by availability. Staff who are free and qualified have a green **Assign** button. Staff with conflicts show the specific reason (e.g., "Double-booked with Harbor View 6–10pm").
7. Click **Assign** on any green row — assignment confirmed, staff receives an in-app notification instantly.

*Alternatively, use the Drop flow:* click **Request Drop** on the shift detail sheet → drop appears in the "Available Shifts" pool → any qualifying staff can claim it.

---

### Scenario 2 — The Overtime Trap
*Manager tries to schedule an employee who would hit 52h.*

1. Log in as **manager.ny@coastaleats.com** (Harbor View + The Wharf).
2. Go to **Overtime** in the sidebar. Observe **Mike Brown** already at ~39h (red bar, "40h+ block" badge).
3. Go to **Schedule** → open any upcoming shift.
4. Click **Assign Staff** and scroll to Mike Brown in the list. His row shows a red **Blocked** badge with the message "Would bring Mike to X.Xh this week — maximum is 40h."
5. The **what-if** projected hours (current → projected) are visible on his card.
6. To demonstrate the override path: find a staff member between 35–40h — their row shows an amber **Override** button. Click it, enter a reason, and confirm. The override is saved to `overtime_overrides` and logged in the audit trail.

---

### Scenario 3 — The Timezone Tangle
*Staff certified at SF (PT) and NY (ET) sets "9am–5pm" availability. What happens?*

1. **James Wilson** (`james.wilson@coastaleats.com`) is certified at The Pier (PT) and Harbor View (ET). His availability is 9am–5pm in his home timezone (PT = `America/Los_Angeles`).
2. Log in as **manager.cross@coastaleats.com** (manages all 4 locations).
3. Go to **Schedule** → find a shift at **Harbor View** (ET) that starts at 2pm ET and ends at 10pm ET.
4. Click **Assign Staff** and find James Wilson. His row will show an availability block: *"Shift time falls outside staff's available hours for this day."* — because 2pm–10pm ET = 11am–7pm PT, which extends beyond his 5pm PT availability cutoff.
5. Now find a shift at Harbor View that ends at 8pm ET (= 5pm PT). James will be assignable — his availability window exactly covers it.
6. The constraint message includes the UTC-converted window, so the manager can see exactly why the block occurs.

---

### Scenario 4 — The Simultaneous Assignment
*Two managers try to assign the same bartender to different shifts at the same time.*

1. Open **two browser tabs** (or two different browsers).
2. Tab A: log in as **manager.sf@coastaleats.com**. Tab B: log in as **manager.ny@coastaleats.com** — or use **manager.cross@coastaleats.com** in both tabs (it can manage all locations).
3. In both tabs, navigate to **Schedule** → open two different shifts at the same time that the same staff member qualifies for.
4. In both tabs, open **Assign Staff** and find the same staff member (e.g., James Wilson, who is cross-certified).
5. Click **Assign** in Tab A — succeeds.
6. Immediately click **Assign** in Tab B — the API wraps the assignment in a `SELECT ... FOR UPDATE` transaction and re-checks double-booking inside the lock. Tab B receives: *"This staff member was just assigned to [Shift] — please refresh."*
7. Both tabs will reflect the correct single-assignment state via the Supabase Realtime subscription within ~1 second.

---

### Scenario 5 — The Fairness Complaint
*An employee claims they never get Saturday night shifts. Verify or refute.*

1. Log in as **manager.sf@coastaleats.com** or **manager.cross@coastaleats.com**.
2. Go to **Analytics** in the sidebar.
3. Set the date range to **4 weeks** and filter by location (or leave at "All").
4. The **Premium Shift Distribution** table shows each staff member's premium shift count and hours over the period.
5. **Priya Patel** is seeded with zero premium shifts in the last 4 weeks — she will appear at the bottom with 0 premium shifts while others have 2–5.
6. The **Fairness Score** (shown as a number between 0 and 1) reflects the inequality. A lower score means worse distribution.
7. The bar chart at the top shows total hours per staff — cross-reference with premium count to see if Priya is also under-scheduled relative to her stated desired hours.

---

### Scenario 6 — The Regret Swap
*Staff A and B agree to swap. Staff A cancels before manager approves.*

1. Log in as **carlos.rivera@coastaleats.com**. He has a pending swap request already seeded.
2. Go to **My Swaps**. The pending swap shows the target staff member, the shift, and its status.
3. Click **Cancel** on the pending request. A confirmation prompt appears.
4. Confirm cancellation — the swap is set to `cancelled`. Carlos sees it disappear from his pending list.
5. The target staff member (seeded as the swap target) receives an in-app notification: *"Swap request cancelled."*
6. The manager who was awaiting approval also receives a notification.
7. Carlos's original assignment is unchanged — he still holds the shift.
8. Open **Audit Log** as admin to see the `cancel` action logged with `performedBy`, `beforeState: pending`, `afterState: cancelled`.

*To run this from scratch (not using seeded data):* log in as any staff member with an upcoming shift → request a swap → have the target staff member accept it → then cancel from the requester's My Swaps page before the manager approves.

---

## Shift Edit — Time-Change Auto-Unassign

### What was built
When a manager edits a shift's date or time, the system now re-evaluates every currently assigned staff member against time-sensitive hard constraints. Staff who would violate a constraint under the new times are automatically unassigned and notified. This closes a gap where editing a shift's start time could silently create an invalid state (e.g., staff member with 9am availability being left on a shift now starting at 8am).

### Which constraints are checked
Only time-sensitive hard-block rules are re-checked (skill match is handled separately via the skill-change path):
- `no_double_booking` — shift now overlaps another of the staff member's shifts
- `rest_period` — the 10-hour rest rule is violated with adjacent shifts
- `availability` — staff's declared availability window does not cover the new shift time
- `daily_12h_cap` — the staff member would exceed 12 hours in the calendar day after the time change

### Behavior
1. After the skill-mismatch unassign block, any staff not already removed are checked via `runAllConstraints(..., { skipAlternatives: true })`.
2. If a block-severity violation is found on a time rule, the assignment is set to `status: "removed"`.
3. All location managers receive a `skill_mismatch_warning` notification listing affected staff and the reason.
4. Each unassigned staff member receives a `shift_unassigned` notification with the specific constraint reason.
5. A `time-change-unassign` audit log entry records who was removed and why.
6. The API response includes all unassigned staff (both skill-mismatch and time-change paths) in `unassignedStaff`.

### Assumption made
The check uses `runAllConstraints` with the new shift times already persisted in the database (the `prisma.shift.update` happens before the constraint re-check). This means the function sees the updated times when evaluating — no special "what-if" mode needed.

### Known limitation
If a shift has many assignees, the re-check runs constraint queries sequentially per staff member. For typical shift headcounts (1–6 staff) this is negligible; it would not scale to bulk-assigned large events without batching.

### Evaluation scenarios enabled
- Scenario 2 (Overtime Trap): time edits that push a staff member into daily cap violation are now caught automatically.
- Scenario 1 (Sunday Night Chaos): if an emergency edit moves a shift, staff with conflicting schedules or availability are removed rather than silently left in an invalid state.
