# ShiftSync — Multi-Location Staff Scheduling Platform

> Built for Coastal Eats restaurant group — 4 locations across 2 time zones.
> Status: **Work in Progress**

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

## Local Development

```bash
pnpm install
cp .env.example .env.local  # fill in your values
pnpm prisma migrate dev
pnpm prisma db seed
pnpm dev
```

## Deployment

See `/docs/DOCS.md` for login credentials and evaluation scenario walkthrough.
