# server/
## Responsibility
Backend tier of Listify: Nitro/h3 HTTP route handlers plus the server-side domain layer that turns HTTP requests into SQLite reads/writes and manages optional user accounts. Storage is **SQLite** (`node:sqlite`, file `<dataDir>/listify.db`) — no ORM, no external database server.
## Design
Two layers, strictly separated: `api/` holds thin, declarative route handlers (`defineEventHandler`) that parse params/body, resolve the session, and map results to HTTP responses or `createError`; `utils/` holds the domain layer — `db.js` (SQLite singleton, schema, PRAGMAs, v1 markdown migration), `lists.js` (list repository, transactional mutations), `auth.js` (scrypt accounts + cookie sessions), and `markdown.js` (pure parse/serialize of the markdown **exchange format**). Transport concerns never leak into `utils/`.
## Flow
HTTP request → Nitro file-based route (`server/api/lists/*`, `server/api/auth/*`) → `readBody`/`getRouterParam` → `getSessionUser(event)` (cookie, or anonymous) → `server/utils/lists.js` / `server/utils/auth.js` → JSON response, or thrown `createError` (404 `Liste introuvable`, 401 `Non connecté` / `Identifiants invalides`, 400 `Contenu markdown requis`, 409 `Email déjà utilisé`, 429 rate-limit).
## Integration
- `server/api/` — route surface consumed by the Vue pages via `$fetch` and by `composables/useAuth.js`.
- `server/utils/` — domain layer; `db.js` owns the single `DatabaseSync` connection and the data dir (`runtimeConfig.listify.dataDir`, env `NUXT_LISTIFY_DATA_DIR`, default `/app/data`).
- External: `node:sqlite` (Node ≥ 23.4 unflagged; Docker runs `node:24-alpine`), `node:crypto`, `node:fs`, `node:path`, and the `uuid` package (`v4` for new list IDs, used in `api/` only).
- Sessions: cookie `listify_session` httpOnly SameSite=Lax, 30 days, no `Secure` flag (LAN HTTP by design). One Nitro instance → no multi-writer concern (SQLite is mono-writer).
