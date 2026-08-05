# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start dev server (Next.js, http://localhost:3000)
npm run build    # Production build
npm run start    # Run a production build
npm run lint     # ESLint (flat config, next/core-web-vitals + next/typescript)
```

There is no test runner configured in this project (no `test` script, no Jest/Vitest/Playwright dependency). Verify changes via `npm run lint`, `npm run build`, and manual exercise of the affected page/API route.

One-off DB/data scripts live in `scripts/*.js` (migrations, cleanup, user creation/password reset, hosting CSV import, diagnostics). They are plain Node scripts run directly, e.g. `node scripts/create_admin_production.js`; they are excluded from ESLint and are not part of the app build.

## Architecture

Next.js 15 App Router app with a **single-page-app shell**: `src/app/page.tsx` renders `AppContent`, which shows `LoginForm` or `TaskApp` based on `AuthContext`. `TaskApp` (`src/components/TaskApp.tsx`) is the main shell — it owns an `activeTab` state (`tasks | clients | hosting | expenses | users`) and gates each tab behind `user.permissions` / `user.role`, rendering the relevant top-level component itself rather than using nested routes. Most feature routes under `src/app/api/**` exist to serve this shell; there's essentially one client route (`/`).

### Data flow pattern

Each domain has a matching **model → API route(s) → hook → context** stack:
- `src/models/*.ts` — Mongoose schemas/models (see Models below).
- `src/app/api/**/route.ts` — REST-ish handlers per resource, returning `{ success, data?, error? }`. Route handlers call `dbConnect()` (`src/lib/mongodb.ts`) then the Mongoose model directly — there is no separate service/repository layer.
- `src/hooks/use*.ts` (`useTasks`, `useClients`, `useAssignees`, `useHosting`) — client-side data fetching/mutation against the API routes, exposing loading/error state and CRUD functions.
- `src/contexts/*.tsx` — wrap the hooks in React Context (`AuthContext`, `AssigneeContext`, `GroupContext`, `ClientContext`, `ProjectTypeContext`) so components consume data via `useAuth()`, `useClients()`, etc. All providers are mounted globally in `src/app/layout.tsx`.

When adding a feature, follow this same chain rather than fetching directly from components.

### Auth

JWT-based, via `jose`, stored in an `auth-token` httpOnly cookie (not localStorage).
- `src/lib/auth.ts` verifies the cookie and re-checks the user's `role`/`permissions` **against the database on every request** rather than trusting the JWT payload — sessions can last up to 30 days ("remember me"), so a permission change by an admin must take effect immediately. If the DB is unreachable, it falls back to the token's snapshot rather than locking everyone out.
- `verifyAuth(request)` returns an `AuthenticatedUser | null`; `requireAuth()`, `requirePermission(perm)`, and `requireRole(role)` are helper wrappers for route handlers. `role: 'admin'` implicitly passes any `requireRole` check.
- Permissions are a fixed set of booleans (`canViewTasks`, `canEditTasks`, `canViewClients`, `canEditClients`, `canManageUsers`) stored per-user in Mongo and mirrored in the JWT payload as a fallback only.

### Models and terminology

- `Task` (top-level collection `tasks`) — the main work-item entity used by the "Tasks" tab: client name/group, priority, status, CMS, pricing, due date, `assignees: string[]` (user IDs).
- `ClientV2` (`src/models/Client.ts`, stored in Mongo collection `clientsv2`, model name `ClientV2` despite the filename) — a client/agency record with three embedded subdocument arrays: `tasks` (per-client to-dos, **not** the same as the `Task` model), `loginDetails`, and `projects`. These are edited via nested API routes like `/api/clients/[id]/tasks/[taskId]`.
- `User` — single source of truth for both login accounts and "assignable people"; there is no separate team-member/assignee entity. `useAssignees`/`AssigneeContext` and the assignee picker read from `/api/users`.
- `Hosting`, `Expense`, `Income`, `Group`, `ProjectType` — supporting domain models for the Hosting and Expenses tabs.

Two naming migrations already happened and are documented (for historical context only — the code has been fully updated, don't reintroduce the old names) in `NOTES_TO_TASKS_MIGRATION.md` ("notes" → "tasks" on the Client model) and `TEAM_TO_USERS_MIGRATION_COMPLETE.md` (a separate "assignees"/"team members" collection was collapsed into `User`). If you see references to "notes" or a standalone "assignee"/"team member" concept in older docs, treat `ClientTask`/`User` as current.

### MongoDB connection

`src/lib/mongodb.ts` caches the Mongoose connection on the `global` object (standard Next.js dev-mode hot-reload pattern) and only throws if `MONGODB_URI` is missing *at connection time*, not at import time, so builds don't fail without env vars configured. Always call `dbConnect()` before touching a model in a new route handler.

### Environment variables

Required: `MONGODB_URI`, `JWT_SECRET`. Optional (client-side, for hosting-expiry email notifications via EmailJS): `NEXT_PUBLIC_EMAILJS_PUBLIC_KEY`, `NEXT_PUBLIC_EMAILJS_SERVICE_ID`, `NEXT_PUBLIC_EMAILJS_TEMPLATE_ID` (see `src/utils/emailService.ts`; this only works client-side — `typeof window === 'undefined'` short-circuits it).

### Deployment

Deployed on Vercel (`vercel.json`); API routes are configured with `maxDuration: 30`. `next.config.ts` is intentionally minimal.
