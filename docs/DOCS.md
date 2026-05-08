# ShiftSync — Living Documentation

> Updated after each feature. Latest at top.

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
