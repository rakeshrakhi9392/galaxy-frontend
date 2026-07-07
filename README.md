# Galaxy Workflow Builder — Frontend

Next.js App Router editor for AI workflows. React Flow canvas, schema-driven node UI, Clerk authentication, and a same-origin proxy to the backend API.

---

## Live URLs

| Resource | URL |
| --- | --- |
| App | `https://YOUR-APP.vercel.app` (replace after deploy) |
| API docs | `https://YOUR-SUBDOMAIN.mintlify.app` |
| Backend API | `https://YOUR-API.vercel.app/api/v1` |

---

## Architecture

```
Browser
   │
   ▼
Next.js (:3000) ── Clerk middleware (UI routes only)
   │
   ├── /workflows/*     React Flow editor, run history, settings
   │
   └── /api/v1/*        Rewritten → NEXT_PUBLIC_BACKEND_URL
```

| Module | Path | Role |
| --- | --- | --- |
| Canvas | `src/components/workflows/editor/WorkflowCanvas.tsx` | Graph editing, save, run triggers |
| Run history | `src/components/workflows/editor/RunHistory.tsx` | Realtime + polled execution state |
| Node renderer | `src/components/workflows/nodes/SchemaDrivenNode.tsx` | Generic UI from `NodeUiConfig` |
| Node registry | `src/generated/nodeRegistry.ts` | Codegen'd from backend catalog |
| Shared schemas | `packages/schemas` (standalone) or `../backend/src/schemas` (monorepo) | Zod types + UI field config |
| API client | `src/lib/api/` | Typed fetch wrappers |

The frontend has **no business logic** for workflow execution — it persists graphs and enqueues runs via the backend REST API.

---

## Design decisions

### Same-origin API proxy

`next.config.ts` rewrites `/api/v1/*` to the backend. This avoids CORS and keeps cookies simple. Clerk middleware **excludes** `/api/v1` so proxied POST bodies are not consumed by auth middleware.

### Schema-driven nodes

Nodes are not hand-built React components. `SchemaDrivenNode` reads `NodeUiConfig` from the generated registry. Adding a node type requires zero frontend code — only a backend catalog entry + `pnpm generate:nodes`.

### Local state over global store

Editor UI (`useEditorUI`) and execution state (`executionState.ts`) use hooks and reducers scoped to the editor. Zustand was deferred to keep ownership clear during iteration.

### Standalone repo layout

For submission, `@galaxy/schemas` is vendored under `packages/schemas/` so Vercel can build without a sibling backend checkout. The generated `nodeRegistry.ts` is committed; rebuild it from the backend when the catalog changes.

---

## Trade-offs

| Choice | Benefit | Cost |
| --- | --- | --- |
| Vendored schemas | Standalone Vercel deploy | Must re-sync after backend schema changes |
| Committed node registry | Fast CI builds | Risk of FE/BE drift if codegen skipped |
| API proxy | No CORS | Extra hop; backend URL must be set per environment |
| Custom Tailwind UI | Pixel-accurate Galaxy clone | No shadcn component library |

---

## Prerequisites

- Node.js 22+
- pnpm 9+
- Running backend (local or deployed)
- Clerk application

---

## Setup

### 1. Install

```bash
pnpm install
cp .env.example .env.local
```

### 2. Environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `NEXT_PUBLIC_BACKEND_URL` | Yes | Backend base URL, e.g. `http://localhost:4010` |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Yes | Clerk publishable key |
| `CLERK_SECRET_KEY` | Yes | Clerk secret (server components) |
| `FRONTEND_URL` | Yes | Must match backend `FRONTEND_URL` for JWT audience |

### 3. Schemas dependency

**Monorepo** (sibling `backend/` folder):

```json
"@galaxy/schemas": "file:../backend/src/schemas"
```

**Standalone repo** (after `prepare-submission.ps1`):

```json
"@galaxy/schemas": "file:./packages/schemas"
```

### 4. Run

```bash
# Terminal 1 — backend on :4010
cd ../backend && pnpm dev

# Terminal 2 — Trigger worker
cd ../backend && pnpm trigger:dev

# Terminal 3 — frontend
pnpm dev
```

Open [http://localhost:3000/workflows](http://localhost:3000/workflows).

### 5. Regenerate node registry

When the backend catalog changes:

```bash
pnpm generate:nodes   # requires sibling backend in monorepo
git add src/generated/nodeRegistry.ts
```

---

## Deploy (Vercel)

1. Import this repo in Vercel.
2. Framework: **Next.js**; Node.js **22.x**.
3. Set environment variables (see above). `NEXT_PUBLIC_BACKEND_URL` must point to the deployed backend.
4. Deploy.

Ensure backend `FRONTEND_URL` matches this deployment URL.

---

## Testing

```bash
pnpm test    # Vitest + React Testing Library
pnpm lint
pnpm build   # includes generate:nodes in monorepo layout
```

---

## If there were more time

- **Zustand stores** with selectors to shrink `WorkflowCanvas.tsx` and `RunHistory.tsx`
- **Playwright e2e** — create → save → run → verify history
- **MSW** for API mocking in component tests
- **Published `@galaxy/schemas`** npm package instead of vendored copy
- **Optimistic save** with conflict resolution on concurrent edits

---

## Related

- Backend repo: API, orchestration, providers, database
- API docs: Mintlify site in backend repo `docs/`
- Monorepo overview: see root `README.md` when developing locally
