# Galaxy Workflow Builder — Frontend

Next.js App Router editor for AI workflows. React Flow canvas, schema-driven node UI, Clerk authentication, and a same-origin proxy to the backend API.

---

## Live URLs

| Resource | URL |
| --- | --- |
| App | `https://galaxy-frontend-five.vercel.app` |
| API docs | `https://abcd-311b96b4.mintlify.app` |
| Backend API | `https://galaxy-backend-kappa.vercel.app/api/v1` |

---

## Setup Instructions

### Prerequisites

Node.js 22+, pnpm 9+, running backend + Trigger worker, Clerk account

### Commands

```bash
pnpm install
cp .env.example .env.local
# fill in .env.local (see below)

# Terminal 1 — backend API
cd ../madasu-trial-backend-main && pnpm dev

# Terminal 2 — Trigger worker
cd ../madasu-trial-backend-main && pnpm trigger:dev

# Terminal 3 — frontend
pnpm dev
```

Open [http://localhost:3000/workflows](http://localhost:3000/workflows)

**Also:**

```bash
pnpm test
pnpm lint
pnpm build
```

**Regenerate node registry (after backend catalog changes):**

```bash
pnpm generate:nodes
git add src/generated/nodeRegistry.ts
```

**Deploy:**

```bash
pnpm build
```

### Environment Variables

| Variable | Example / Value |
| --- | --- |
| `NEXT_PUBLIC_BACKEND_URL` | `http://localhost:4010` |
| `BACKEND_URL` | `http://localhost:4010` (server-only override) |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | from Clerk dashboard |
| `CLERK_SECRET_KEY` | from Clerk dashboard |
| `FRONTEND_URL` | `http://localhost:3000` |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | `/sign-in` |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | `/sign-up` |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL` | `/workflows` |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL` | `/workflows` |

`FRONTEND_URL` must match on both frontend and backend. On Vercel, set `NEXT_PUBLIC_BACKEND_URL` to your deployed backend URL.

---

## Architecture Overview

```
Browser
   │
   ▼
Next.js (:3000) ── Clerk middleware (UI routes only; /api/v1 excluded)
   │
   ├── /workflows              workflow list + hub
   ├── /workflows/[id]/canvas  React Flow editor + run history
   ├── /workflows/settings     API keys
   │
   └── /api/v1/*  ──►  route handler proxy  ──►  Backend (:4010)
```

```
Backend catalog (Zod + NodeUiConfig)
        │
        ▼  pnpm generate:nodes (from backend)
src/generated/nodeRegistry.ts
        │
        ▼
SchemaDrivenNode  ◄──►  WorkflowCanvas (React Flow)
        │                      │
@galaxy/schemas          /api/v1 proxy
(vendored)                     │
                               ▼
                    Backend REST + Trigger.dev Realtime
                               │
                               ▼
              RunHistory + live node status on canvas
```

### Layers

| Layer | Location | Role |
| --- | --- | --- |
| **Routes** | `src/app/` | App Router pages — workflows, canvas, auth, settings |
| **Canvas** | `src/components/workflows/editor/WorkflowCanvas.tsx` | Graph editing, connections, save, run triggers, live status |
| **Workspace** | `src/components/workflows/editor/WorkflowWorkspace.tsx` | Editor shell — canvas + history panel + execution state |
| **Node renderer** | `src/components/workflows/editor/nodes/SchemaDrivenNode.tsx` | Generic node UI from `NodeUiConfig` |
| **Node registry** | `src/generated/nodeRegistry.ts` | Build-time config codegen'd from backend catalog |
| **Shared schemas** | `packages/galaxy-src/` (`@galaxy/schemas`) | Zod types, graph validation, input resolution |
| **API client** | `src/lib/backend.ts` + `useClientApi` | Typed fetch with Clerk token injection |
| **API proxy** | `src/app/api/v1/[...path]/route.ts` | Same-origin proxy to backend (no CORS) |
| **Execution state** | `src/lib/runHistory/executionState.ts` | Reducer for history, node statuses, current run |
| **Realtime** | `src/lib/useWorkflowRunRealtime.ts` | Trigger.dev Realtime + DB poll merge |

### User Flow

1. User signs in via Clerk → lands on `/workflows`
2. Opens a workflow canvas → graph loads from `GET /api/v1/workflows/:id`
3. Edits nodes on React Flow canvas → debounced auto-save to backend
4. Clicks run → frontend validates inputs (`validateNodeInputs`) → `POST /api/v1/workflows/:id/runs`
5. `useWorkflowRunRealtime` subscribes to Trigger.dev metadata for live status
6. Parallel poll fetches `GET /api/v1/runs/:id` for full node inputs/outputs/credits
7. Canvas nodes update (idle → running → completed/failed)
8. Run history panel shows per-node detail, errors, and downloadable assets

### Schema-Driven Node Pipeline

1. Backend defines node schemas + `NodeUiConfig` in catalog
2. `pnpm generate:nodes` emits `nodeRegistry.ts`
3. `nodeTypes.ts` maps every type → `SchemaDrivenNode`
4. Handles, fields, defaults, and advanced settings render from config — no per-node React components
5. Adding a node type = backend catalog entry + codegen (zero frontend code)

### Key Design Points

- **Thin client** — no workflow execution logic; persists graphs and enqueues runs via backend API
- **Same-origin proxy** — browser calls `/api/v1/*` on the frontend origin; route handler forwards to backend
- **Build-time node config** — node definitions are not fetched over HTTP at runtime
- **Shared validation** — `@galaxy/schemas` + `resolveNodeInputs` used on FE and BE for consistent input resolution
- **Realtime + poll hybrid** — Trigger Realtime for fast status; REST poll for full run detail (inputs, outputs, credits)
- **Scoped state** — execution state via `useReducer`; no global store

---

## Design Decisions & Trade-offs

### Schema-Driven Node UI

All node types render through a single `SchemaDrivenNode` component driven by build-time `NodeUiConfig` from the backend catalog. Adding a node requires no frontend code — only codegen. The trade-off is a committed `nodeRegistry.ts` that must be regenerated when the backend catalog changes.

### API Route Handler Proxy

The frontend communicates with the backend through a same-origin Next.js API proxy instead of direct cross-origin requests. This simplifies authentication, avoids CORS issues, and keeps the frontend independent of backend deployment details. The trade-off is an additional network hop and environment-specific backend configuration.

### Thin Client Architecture

The frontend persists workflow graphs, enqueues runs, and displays live execution state. All orchestration, provider calls, and credit logic live on the backend. The trade-off is full dependence on the backend and Trigger worker being available — the UI cannot execute workflows in isolation.

### Realtime + Poll Hybrid

Live node status streams via Trigger.dev Realtime; full run detail (inputs, outputs, credits, provider) is backfilled through periodic REST polling. This delivers complete history UI without waiting on richer realtime payloads. The trade-off is extra API load and brief windows where stream and database state can diverge.

### API & Playground Hub

The API and Playground UI was implemented to mirror the Galaxy product while prioritizing the core workflow engine, execution pipeline, and history system. The current implementation provides API documentation, code samples, and playground execution, but some examples are static and playground runs execute as authenticated UI runs rather than API-key requests. The trade-off was prioritizing the core platform over advanced developer tooling, which can be extended to generate live request payloads and API responses from the workflow graph.

---

## What I'd Improve With More Time

- **Native API Run Experience:** The Playground currently executes authenticated UI runs, while API-key-based runs must be triggered externally. I'd add a dedicated API execution mode that runs workflows using a selected API key, displays the exact HTTP request and response, and automatically populates the API Runs history.
- **Complete Playground Input Support:** The Playground currently focuses on text-based request inputs. I'd extend it to support all request field types (images, files, selects, etc.) and execute workflows using inline request values, matching the capabilities of the public API.
- **Pure Realtime Stream:** Remove the REST poll loop and rely on a single Trigger.dev Realtime or backend SSE stream for both status and full node detail.
- **UI Copy & Microcopy:** A final polish pass on all user-facing text — button labels, tooltips, empty states, error messages, headings, and status labels — for consistency with the Galaxy reference and a production-quality feel.
