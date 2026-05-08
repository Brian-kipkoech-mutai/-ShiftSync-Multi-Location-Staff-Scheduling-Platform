# ShiftSync — Multi-Location Staff Scheduling Platform

> Built for Coastal Eats restaurant group — 4 locations across 2 time zones.

**Live URL:** [https://priority-soft-sigma.vercel.app](https://priority-soft-sigma.vercel.app)

**Login credentials & evaluation guide:** [docs/DOCS.md → Login Credentials](https://github.com/Brian-kipkoech-mutai/-ShiftSync-Multi-Location-Staff-Scheduling-Platform/blob/main/docs/DOCS.md#login-credentials)

---

## Quick start (evaluator)

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@coastaleats.com | Admin1234! |
| Manager (SF) | manager.sf@coastaleats.com | Manager1234! |
| Manager (NY) | manager.ny@coastaleats.com | Manager1234! |
| Manager (All) | manager.cross@coastaleats.com | Manager1234! |
| Staff (example) | alex.chen@coastaleats.com | Staff1234! |

Full staff roster and evaluation scenario walkthroughs → [DOCS.md](https://github.com/Brian-kipkoech-mutai/-ShiftSync-Multi-Location-Staff-Scheduling-Platform/blob/main/docs/DOCS.md)

---

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 App Router |
| Language | TypeScript (strict) |
| Database | PostgreSQL via Supabase |
| Auth | Supabase Auth |
| ORM | Prisma v5 |
| Real-time | Supabase Realtime |
| Data fetching | TanStack Query v5 |
| UI | shadcn/ui + Tailwind CSS |
| Timezone | date-fns-tz |
| Deployment | Vercel + Supabase |

---

## Local Development

```bash
pnpm install
cp .env.example .env.local  # fill in your Supabase values
pnpm prisma migrate dev
pnpm prisma db seed
pnpm dev
```

Requires: Node.js 20+, pnpm, a Supabase project with the 5 env vars from `.env.example`.
