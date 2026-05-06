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

---

## Known Limitations

- **Mobile responsiveness**: Desktop-first. Mobile layout not polished.
- **Clock-in/clock-out**: Not implemented. Shift assignment is the source of truth for on-duty status.
- **Email simulation**: Inserts to `simulated_emails` table + console log. No real SMTP.
- **DST edge cases**: Handled via `date-fns-tz`. Spring-forward gaps treated as +1 hour; fall-back ambiguous times treated as post-DST. Manual testing only.
- **Location spanning timezone boundary**: Single canonical timezone per location.
- **Cost projection**: Uses fixed $20/h base + 1.5x overtime. Per-staff rates would be a production enhancement.
- **Password reset**: Not implemented. Supabase handles via magic link if needed.
- **SSO**: Not implemented.

---

## Login Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@coastaleats.com | Admin1234! |
| Manager (SF+LA) | manager.sf@coastaleats.com | Manager1234! |
| Manager (NY+Boston) | manager.ny@coastaleats.com | Manager1234! |
| Manager (All 4) | manager.cross@coastaleats.com | Manager1234! |
| Staff (example) | [firstname].[lastname]@coastaleats.com | Staff1234! |

> Full staff list available in `/prisma/seed.ts` after seed is run.
