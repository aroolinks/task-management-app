# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Commands

- Install deps
```bash path=null start=null
npm install
```
- Dev server (Next.js App Router)
```bash path=null start=null
npm run dev
```
- Build and run production
```bash path=null start=null
npm run build
npm run start
```
- Lint (ESLint flat config)
```bash path=null start=null
npm run lint
npm run lint -- .
npm run lint -- src/components/TaskItem.tsx
```
- Verify MongoDB connectivity (uses MONGODB_URI)
```bash path=null start=null
node scripts/check_mongo.js
```
- API quick checks (local dev)
```bash path=null start=null
curl -s http://localhost:3000/api/health
curl -s http://localhost:3000/api/tasks
```
- Environment
  - Create .env.local with MONGODB_URI set to your MongoDB connection string.

## Architecture overview

- Framework and routing
  - Next.js 15 App Router in `src/app` with `layout.tsx` and client UI in `src/app/page.tsx`.
  - API routes under `src/app/api`: health check (`health/route.ts`) and task CRUD (`tasks/route.ts`, `tasks/[id]/route.ts`).

- Data layer
  - MongoDB via Mongoose.
  - Connection helper `src/lib/mongodb.ts` caches a singleton Mongoose connection on `globalThis` to avoid reconnects across hot reloads and serverless invocations.
  - Task model `src/models/Task.ts` defines the persisted schema (timestamps enabled).

- Domain model and types
  - Shared TypeScript types in `src/types/task.ts`; UI uses `Task` and `TaskInput`.
  - Keep union values aligned with the Mongoose schema (e.g., CMS/status/priority options) to avoid drift between server validation and client types.

- Client data flow
  - `src/hooks/useTasks.ts` owns task state and talks to API routes with fetch.
    - Transforms Mongo `_id` to `id` and normalizes date fields to `Date` instances.
    - One-time migration: if server returns zero tasks and `localStorage` has legacy tasks, it attempts to POST them to the server, then refetches.
  - Components: `TaskList` renders grouped/filtered tasks and downloads text invoices; `TaskItem` supports inline editing and updates via API; `AddTask` modal creates tasks.

- Utilities and styling
  - Invoices: `src/utils/invoiceGenerator.ts` generates a downloadable text invoice (completed tasks subtotal, deposits, balance due).
  - Styling: Tailwind CSS 4 with global styles in `src/app/globals.css`; fonts via `next/font` in `layout.tsx`.

- Linting/config
  - ESLint flat config in `eslint.config.mjs` extending Next + TypeScript, with common ignores.
  - TypeScript config in `tsconfig.json` (path alias `@/*` -> `src/*`).

- Deployment
  - Minimal `next.config.ts`; designed for Vercel (see `README.md` for deploy steps). Ensure `MONGODB_URI` is set in the hosting environment.

## Notes for agents

- Required environment: `MONGODB_URI` must be present for API routes; connection is only attempted at request time (builds don’t require it).
- Tests: no test framework or scripts are configured in `package.json`.
