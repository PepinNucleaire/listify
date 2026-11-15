# AGENTS.md

Listify: Nuxt 4 (Vue 3) shopping-list app. Server routes and SQLite persistence (`node:sqlite`, no external DB) with **optional** user accounts. Branch `v2`; `main` stays deployable as v1 (markdown files).

## Commands

- Dev: `npm run dev` (Nuxt dev server, port 3000). **Requires Node ≥ 23.4** (`node:sqlite` is unflagged there; the Docker image runs `node:24-alpine`). Set a local data dir: `NUXT_LISTIFY_DATA_DIR=./data-local npm run dev`.
- Build: `npm run build` → writes to `output/` (not the Nuxt default `.output/`)
- Start built app: `npm start` (runs `nuxt start`) or `node output/server/index.mjs`
- There is **no** test, lint, typecheck, or formatter script. Do not invent `npm test` / `npm run lint`.

## Architecture

- Full-stack Nuxt 4: pages live at repo root (`app.vue`, `pages/`), **not** under `app/`; server routes under `server/api/lists/` and `server/api/auth/` (Nitro/h3).
- `server/utils/db.js` owns storage: lazy `DatabaseSync` singleton (`node:sqlite`), schema `users`/`sessions`/`lists`/`list_visits`, PRAGMAs (`journal_mode=WAL`, `foreign_keys=ON`, `busy_timeout=5000`), one-shot idempotent migration of legacy `*.md` files at first access (`.md` files are never deleted — they are the v1 backup). Data dir = `runtimeConfig.listify.dataDir` (env `NUXT_LISTIFY_DATA_DIR`, default `/app/data`).
- `server/utils/lists.js` is the list repository: `createList` (upsert — re-importing an existing UUID overwrites the list, v1 behavior), `getList`, `updateList` (read-mutate-write inside `BEGIN IMMEDIATE…COMMIT`, visit recorded in the same transaction), `listListsForUser`. List content is a JSON `content` column; canonical model `{ title, uuid, sections }` is unchanged.
- `server/utils/auth.js`: accounts (email + scrypt password, no email verification) and sessions (cookie `listify_session`, httpOnly, SameSite=Lax, 30 days). Endpoints: `POST /api/auth/{register,login,logout}`, `GET /api/auth/me`. Accounts are **optional**: the list URL remains the capability — anyone with the link reads/writes; a session only adds ownership and visit history. `GET /api/lists` (« mes listes ») is the only session-gated endpoint (401 otherwise).
- `server/utils/markdown.js` is now a pure **exchange format** pair (`parseMarkdown`/`generateMarkdown` + `validateId`): markdown serves import/export and the v1 migration, not storage. No `node:fs` in it.
- Markdown item wire format: `- [ ] Text × Qty ← Pseudo` (checked = `[x]`). If you change it, update `parseMarkdown` + `generateMarkdown` **and** the duplicated serializer `exportMd()` in `pages/list/[id].vue`.
- PATCH/list mutation is action-based: `action` ∈ `toggle | assign | qty | text | add | delete`, using `sectionIndex`/`itemIndex`. Protocol unchanged from v1 (stale index → silent no-op, kept deliberately).
- Rely on Nuxt auto-imports (`defineEventHandler`, `readBody`, `getRouterParam`, `createError`, `$fetch`, `ref`, `computed`, `useRoute`, `watch`). `pages/list/[id].vue` deliberately mixes an explicit `import { ref, onMounted, watch }` with unimported `computed` — do not "fix" by adding imports. `composables/useAuth.js` is the repo's only composable (shared session state via `useState`).

## Gotchas (verified, easy to get wrong)

- **Node version**: `node:sqlite` does not exist on Node 20/21 and is flagged before 23.4 — with the system Node 20 the dev server crashes on `server/utils/db.js`. Use Node ≥ 23.4 locally (e.g. `PATH="<node24>/bin:$PATH" npm run dev`).
- The data dir is **live config** now: `NUXT_LISTIFY_DATA_DIR` (read by `getDataDir()` in `server/utils/db.js`, default `/app/data`). In local dev, always point it at a writable folder (`./data-local`, gitignored) — the default `/app/data` only makes sense in the container.
- `docker-compose.yml` mounts volume `listify_data` at `/app/data` (database + legacy `*.md` read by the migration). In v1 this volume was mounted at `/app/data/lists`, so production `.md` files sit at the root of the volume — that is exactly where the migration looks. It also joins external network `arr-network`, which must already exist or `docker compose up` fails.
- The session cookie has **no `Secure` flag by design** (LAN HTTP access must keep login working); do not "fix" it without providing TLS. CSRF stance: SameSite=Lax + mutations only via POST/PATCH.
- List IDs are validated against `/^[a-zA-Z0-9_-]+$/`; invalid IDs make reads return `null` (→ 404), never a 500.
- `data/lists/*.md`, `data/camping-liste.md` and `data/prod-backup/` are sample/backup lists; `.dockerignore` excludes `data`, so they are not baked into the image.
- `.nuxt/` is a stale artifact referencing a different build path (`/home/opencode/workspace/listify`) and regenerates on dev/build. `output/` is generated.
- UI copy and error messages are in **French** — keep new user-facing strings French. Styling is a custom "Marché" design system: global tokens (`--encre`, `--papier`, `--tomate`, `--display`, `--body`, …) and reusable components (`.etal`, `.band`, `.item`, `.check`, `.qty`, `.stamp`, `.btn`, and the v2 account classes) live in `app.vue`; pages use those classes plus scoped tweaks. Pico CSS was removed. Fonts (Bricolage Grotesque, Atkinson Hyperlegible) are self-hosted as woff2 in `public/fonts/`. No Tailwind/PostCSS build step.
- `pages/list/[id].vue` is untouched by v2 (the server records visits) — keep it that way unless the plan says otherwise.

## Repository Map

A full codemap is available at `codemap.md` in the project root.

Before working on any task, read `codemap.md` to understand:
- Project architecture and entry points
- Directory responsibilities and design patterns
- Data flow and integration points between modules

For deep work on a specific folder, also read that folder's `codemap.md`.
