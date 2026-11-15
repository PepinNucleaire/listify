# Listify — Repository Atlas

Listify is a full-stack **Nuxt 4 (Vue 3)** shopping-list app. Nitro server routes expose a small JSON API; persistence is **SQLite** (`node:sqlite`, file `<dataDir>/listify.db`) with **optional** user accounts (email + password). Anonymous users keep the v1 capability behavior: the list URL is the only credential. Markdown survives as the **import/export exchange format** (and the one-shot v1 migration source), not as storage. UI copy is French; styling is a custom "Marché" design system living in `app.vue`. Branch `v2`; `main` remains deployable as v1.

## Root Assets

| File | Role |
| --- | --- |
| `app.vue` | App shell (`NuxtLayout`/`NuxtPage`) + global account bar (login/register or email + logout) + native auth dialog, and the global "Marché" design system: CSS tokens (`--encre`, `--papier`, `--tomate`, `--display`, `--body`, …), reusable classes (`.etal`, `.band`, `.item`, `.check`, `.qty`, `.stamp`, `.btn`, v2 account classes), `@font-face` for self-hosted woff2 in `public/fonts/`. No Tailwind/PostCSS. |
| `composables/useAuth.js` | First composable of the repo: shared session state (`useState`), `fetchMe`/`login`/`register`/`logout`. `user` is `null` for anonymous visitors. |
| `nuxt.config.js` | Minimal config: app head title, `nitro.output.dir: 'output'` (build goes to `output/`, not `.output/`). `runtimeConfig.listify.dataDir` (env `NUXT_LISTIFY_DATA_DIR`, default `/app/data`) is **live config** since v2 — read by `getDataDir()` in `server/utils/db.js`. |
| `package.json` | Deps: `nuxt ^4.4.7`, `uuid ^11.1.0`. Scripts: `dev`, `build`, `start` only — no test/lint/typecheck. Runtime needs Node ≥ 23.4 (`node:sqlite`). |
| `Dockerfile` | Two-stage `node:24-alpine` build; copies `output/`, `npm ci --omit=dev`, creates `/app/data`, runs `node output/server/index.mjs` on port 3000. |
| `docker-compose.yml` | Mounts volume `listify_data` at `/app/data` (SQLite DB + legacy `*.md` read by the migration; in v1 the volume was mounted one level deeper, so prod `.md` files sit at the volume root); sets `NUXT_LISTIFY_DATA_DIR=/app/data`; joins external network `arr-network` (must pre-exist). |

## Architecture & Data Flow

```
Browser (pages/, composables/useAuth.js)
  pages/index.vue        pages/list/[id].vue          app.vue (account bar + dialog)
      │  $fetch               │  $fetch (GET + PATCH)      │  $fetch /api/auth/*
      ▼                       ▼                            ▼
Nitro HTTP layer (server/api/lists/*, server/api/auth/*)  ← thin handlers: session → util → JSON | createError
      │
      ▼
Domain + repository (server/utils/)
  lists.js (repository, BEGIN IMMEDIATE…COMMIT)   auth.js (scrypt, sessions)   markdown.js (exchange format, pure)
      │
      ▼
SQLite  <dataDir>/listify.db   (WAL, foreign_keys ON; tables users / sessions / lists / list_visits)
       + one-shot migration: dataDir/*.md → lists (idempotent, .md never deleted)
```

- **Canonical list model**: `{ title, uuid, sections: [{ name, items: [{ text, checked, qty, assign }] }] }` — `qty`/`assign` are strings, empty string = absent. Stored as a JSON `content` column (title duplicated in a column for sorting), deliberately not normalized.
- **Markdown wire format** (import/export only): `# Title`, `UUID: <id>`, `## Section`, item line `- [ ] Text × Qty ← Pseudo` (checked = `[x]`).
- **PATCH protocol**: action-based, `action` ∈ `toggle | assign | qty | text | add | delete`, addressing via `sectionIndex`/`itemIndex` (no item IDs); `add` uses `sectionName`/`text`/`qty`. Unchanged from v1, including the stale-index silent no-op (kept on purpose).
- **IDs**: validated against `/^[a-zA-Z0-9_-]+$/`; invalid ID → read returns `null` → 404. The UUID in the URL is the capability token — no access control beyond knowing the link; accounts add ownership + visit history only.
- **Sessions**: cookie `listify_session` (httpOnly, SameSite=Lax, 30 days, no `Secure` by design for LAN HTTP); scrypt password hashing, in-memory per-IP rate limit on register/login.

## Directory Map

| Directory | Responsibility | Link |
| --- | --- | --- |
| `pages/` | Nuxt file-based routing layer: home route (`/`) for create/import + « Mes listes » (connected users), consumption of the shared design system; all persistence delegated to the API. | [View Map](pages/codemap.md) |
| `pages/list/` | Dynamic list-detail route `/list/:id` — the core working surface: check/qty/assign/add/delete items, share link, client-side markdown export. Untouched by v2. | [View Map](pages/list/codemap.md) |
| `composables/` | `useAuth.js` — shared session state consumed by `app.vue` (account bar) and `pages/index.vue` (« Mes listes »). | — |
| `server/` | Backend tier: Nitro/h3 route handlers plus the domain layer (SQLite, auth, markdown exchange format); strict transport/domain separation. | [View Map](server/codemap.md) |
| `server/api/` | HTTP surface: file-based JSON endpoints consumed by the pages via `$fetch`. | [View Map](server/api/codemap.md) |
| `server/api/lists/` | Lists namespace: create, « mes listes », read (capability), action-based mutate, import. | [View Map](server/api/lists/codemap.md) |
| `server/api/auth/` | Accounts namespace: register, login, logout, me. | — |
| `server/utils/` | Domain layer: `db.js` (SQLite singleton, schema, migration), `lists.js` (repository), `auth.js` (accounts/sessions), `markdown.js` (pure exchange-format pair). | [View Map](server/utils/codemap.md) |

## Cross-Cutting Invariants

1. **Serializer duplication risk**: the markdown format is implemented in `server/utils/markdown.js` (`parseMarkdown` + `generateMarkdown`) **and** duplicated client-side in `exportMd()` in `pages/list/[id].vue`. Any format change must touch both or exports stop re-importing.
2. **Data dir is live config**: `NUXT_LISTIFY_DATA_DIR` (default `/app/data`) read in `server/utils/db.js`. Local dev must point it at a writable folder (`./data-local`); the Docker volume mounts at `/app/data`.
3. **Auto-import policy**: Nuxt/Nitro auto-imports are relied on everywhere (`defineEventHandler`, `readBody`, `getRouterParam`, `createError`, `$fetch`, `ref`, `computed`, `useRoute`, `watch`, `useAuth`). `pages/list/[id].vue` deliberately mixes explicit `import { ref, onMounted, watch }` with auto-imported `computed` — do not "fix" it.
4. **French copy**: all user-facing strings and error messages are French (`Liste introuvable`, `Identifiants invalides`, `Email déjà utilisé`, …).
5. **SQLite, single writer**: one `DatabaseSync` per Nitro process, one Nitro instance — list mutations run in `BEGIN IMMEDIATE…COMMIT` transactions. If multi-instance ever happens, SQLite must be replaced by a real DB server.
6. **Capability links**: list URLs keep working across accounts and migration; no list-level ACL in v2.
