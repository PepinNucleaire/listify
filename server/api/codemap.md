# server/api/
## Responsibility
Nitro/h3 HTTP surface of the app. Two namespaces:

| Namespace | Endpoints | Purpose |
| --- | --- | --- |
| `server/api/lists/` | `POST /api/lists`, `GET /api/lists`, `GET /api/lists/:id`, `PATCH /api/lists/:id`, `POST /api/lists/import` | Lists (see `server/api/lists/codemap.md`) |
| `server/api/auth/` | `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me` | Optional accounts: register/login/logout/me |

## Design
File-based routing: directory path + filename suffix define the endpoint (`server/api/lists/index.post.js` → `POST /api/lists`). Each file default-exports a single `defineEventHandler(async (event) => ...)`. Handlers are deliberately thin: parse request with `readBody`/`getRouterParam`, resolve the session with `getSessionUser(event)`, call a util (`server/utils/lists.js`, `server/utils/auth.js`, `server/utils/markdown.js`), throw `createError` on failure, return a plain object. Nuxt auto-imports are relied on (`defineEventHandler`, `readBody`, `getRouterParam`, `createError`, `setCookie`…); utils and `uuid` are imported explicitly. All user-facing error messages are French.

**Auth model (v2)**: accounts are optional. Anonymous users keep the v1 capability behavior — the list URL is the only credential needed to read/write a list. A logged-in session adds ownership (`owner_user_id`) and visit tracking; `GET /api/lists` (« mes listes ») is the only endpoint that requires a session (401 otherwise). Register/login are rate-limited per IP (429 « Trop de tentatives, réessayez plus tard »); login failures return a generic 401 « Identifiants invalides » (no account enumeration).

## Flow
`$fetch` request → Nitro matches file route → `readBody`/`getRouterParam` → `getSessionUser(event)` (cookie → user or null) → `server/utils/lists.js` / `server/utils/auth.js` → plain JSON response or `createError` with status code.

## Integration
Consumers: `pages/index.vue` (create + import + « Mes listes »), `pages/list/[id].vue` (read + action patch), `composables/useAuth.js` (register/login/logout/me). Dependencies: `server/utils/db.js` (SQLite singleton), `server/utils/auth.js`, `server/utils/lists.js`, `server/utils/markdown.js` (parse/serialize exchange format), `uuid` for new list IDs.
