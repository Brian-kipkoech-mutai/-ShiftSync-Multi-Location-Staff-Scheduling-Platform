# ShiftSync — Living Documentation

> Updated after each feature. Latest at top.

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
