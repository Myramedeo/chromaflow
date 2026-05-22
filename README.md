# Chromaflow

A full-stack collaborative project management SaaS built with Next.js, Postgres, and Stripe.

**Live demo:** [usechromaflow.com](https://usechromaflow.com) &nbsp;·&nbsp; **Status:** Production

---

## Features

- **Kanban boards:** drag-and-drop task management (@dnd-kit)
- **Real-time collaboration:** task moves sync instantly across all open sessions (Supabase Realtime)
- **Live presence:** see who's viewing the same board via WebSocket presence tracking
- **Activity feed:** live timeline of every action taken on a project
- **Subscription billing:** free and Pro tiers with Stripe Checkout and Customer Portal
- **Plan enforcement:** free plan gated at 3 projects; upgrades unlock unlimited usage
- **Multi-tenant workspaces:** invite-based membership with Owner / Admin / Member roles
- **Auth:** email and Google sign-in via Clerk

## Tech stack

| Layer | Technology |
| --- | --- |
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn |
| Backend | Next.js API Route Handlers, Prisma ORM |
| Database | PostgreSQL via Supabase |
| Auth | Clerk |
| Real-time | Supabase Realtime (WebSocket + Presence) |
| Payments | Stripe (Checkout, Webhooks, Customer Portal) |
| Deployment | Vercel (frontend) + Supabase (database) |
| CI | GitHub Actions (type-check + lint on PRs) |

## Architecture

```text
Browser
  ├── Next.js App Router (pages + layouts)
  ├── SWR (data fetching + cache)
  ├── Supabase JS client (WebSocket subscription)
  └── Clerk (session management)

Next.js API Routes
  ├── /api/user              - sync Clerk user → Postgres
  ├── /api/workspaces/**     - workspace + membership CRUD
  │   └── /projects/**       - project CRUD + plan gates
  │       └── /tasks/**      - task CRUD + activity logging
  ├── /api/billing/**        - Stripe checkout, portal, webhook
  └── withAuth()             - Clerk session guard on every route

Postgres (Supabase)
  ├── User, Workspace, WorkspaceMember
  ├── Project, Task, ActivityLog
  └── Subscription (Stripe state mirror)

Supabase Realtime
  └── WAL events on Task + ActivityLog → broadcast to channel subscribers
```

## Local setup

```bash
# 1. Clone and install
git clone https://github.com/YOUR_USERNAME/projectflow.git
cd projectflow
npm install

# 2. Copy env template and fill in your keys
cp .env.example .env.local

# 3. Push the database schema
npx prisma migrate dev

# 4. Start the dev server
npm run dev
```

Open [localhost:3000](http://localhost:3000).

### Required services

- [Clerk](https://clerk.com) for authentication
- [Supabase](https://supabase.com) for PostgreSQL database + Realtime
- [Stripe](https://stripe.com) for billing (test mode for local dev)

### Environment variables

See `.env.example` for all required variables and where to find them.

## CI

Every push and pull request runs two parallel GitHub Actions jobs.

- `type-check` runs `tsc --noEmit` across the full codebase
- `lint` runs `next lint` (ESLint + Next.js rules)

## Roadmap

- [ ] Public marketing landing page
