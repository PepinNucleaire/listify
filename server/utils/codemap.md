# server/utils/
## Responsibility
Server-side domain layer, no HTTP code. Four modules:

| Module | Role |
| --- | --- |
| `markdown.js` | Pure wire-format pair `parseMarkdown`/`generateMarkdown` + `validateId`. Markdown is the **import/export exchange format** (and the v1 migration source) — it is no longer the storage format. |
| `db.js` | SQLite singleton (`node:sqlite` `DatabaseSync`): schema, PRAGMAs, markdown migration at first access, expired-session purge. |
| `auth.js` | Accounts + sessions: scrypt password hashing, session create/read/destroy over the `listify_session` cookie, in-memory rate limit. |
| `lists.js` | List repository over SQLite: create (upsert), read, transactional update, visit tracking, "my lists" query. |

## Design
- **Storage is SQLite** (`<dataDir>/listify.db`), one `DatabaseSync` instance per Nitro process, opened lazily on first access. The canonical list model is unchanged: `{ title, uuid, sections: [{ name, items: [{ text, checked, qty, assign }] }] }`; list content is stored as a JSON `content` column (title duplicated in a column for sorting), not normalized.
- **Data dir is live config**: `getDataDir()` in `db.js` reads `runtimeConfig.listify.dataDir` (env `NUXT_LISTIFY_DATA_DIR`), default `/app/data`. This used to be dead config in v1 — it is now the only place the path is resolved.
- **Pure core, impure edges**: `markdown.js` is pure (no `node:fs`); all I/O lives in `db.js`/`lists.js`/`auth.js`.
- **markdown.js is an exchange format**: `parseMarkdown`/`generateMarkdown` serve import/export and the one-shot v1→v2 migration; `exportMd()` in `pages/list/[id].vue` duplicates `generateMarkdown` client-side — any format change must touch both.
- **Sessions**: cookie `listify_session` (32 random bytes hex), httpOnly, SameSite=Lax, 30-day expiry, **no `Secure` flag by design** (LAN HTTP access must keep login working). CSRF stance: SameSite=Lax + mutations only via POST/PATCH. Rate limiting is best-effort, in-memory, per IP+scope (resets on restart).
- **Transactions**: mutations that read-then-write a list run inside `BEGIN IMMEDIATE…COMMIT` (rollback on error), which also serializes concurrent PATCHes (no lost updates within a transaction).

### Exports (exact signatures)

`markdown.js` (pure):
| Function | Signature | Role |
| --- | --- | --- |
| `parseMarkdown` | `parseMarkdown(content: string) → { title, uuid, sections }` | Parse stored/imported Markdown into the canonical model. |
| `generateMarkdown` | `generateMarkdown(list) → string` | Serialize the canonical model back to Markdown (single trailing `\n`). |
| `validateId` | `validateId(id) → boolean` | `true` only for `string` matching `/^[a-zA-Z0-9_-]+$/` — IDs are capability tokens, URL segments and (during migration) filenames. |

`db.js`:
| Function | Signature | Role |
| --- | --- | --- |
| `getDataDir` | `getDataDir() → string` | `runtimeConfig.listify.dataDir` (env `NUXT_LISTIFY_DATA_DIR`), default `/app/data`. |
| `getDb` | `getDb() → DatabaseSync` | Lazy singleton: mkdir dataDir, open `<dataDir>/listify.db`, schema + PRAGMAs, markdown migration, purge expired sessions. |
| `getDatabasePath` | `getDatabasePath() → string \| null` | Path of the opened database (diagnostics). |
| `closeDb` | `closeDb() → void` | Close and reset the singleton. |

Schema: `users (id, email UNIQUE, password_hash, created_at)`, `sessions (token PK, user_id → users ON DELETE CASCADE, expires_at, created_at)`, `lists (id PK, owner_user_id → users ON DELETE SET NULL, title, content JSON, created_at, updated_at)`, `list_visits (user_id, list_id, last_visited, PK (user_id, list_id))` + indexes on `lists(owner_user_id)`, `sessions(user_id)`, `sessions(expires_at)`. PRAGMAs: `journal_mode=WAL`, `foreign_keys=ON`, `busy_timeout=5000`.

`auth.js`:
| Function | Signature | Role |
| --- | --- | --- |
| `hashPassword` / `verifyPassword` | `(password) → "scrypt:<salt-hex>:<hash-hex>"` / `(password, stored) → boolean` | scrypt (salt 16 B, hash 64 B) + `timingSafeEqual`. Zero npm deps. |
| `normalizeEmail` / `isValidEmail` | `(email) → string` / `(email) → boolean` | Trim + lowercase; loose shape check `x@y.z`. |
| `findUserByEmail` | `(email) → row \| undefined` | Lookup by normalized email. |
| `createSession` / `getSessionUser` / `destroySession` | `(userId) → { token, expiresAt }` / `(event) → { id, email } \| null` / `(event) → void` | Session lifecycle; an expired session is deleted on sight. |
| `setSessionCookie` / `clearSessionCookie` | `(event, ...) → void` | `listify_session` cookie handling. |
| `rateLimit` | `(event, scope) → void` | In-memory per-IP window (20 / 15 min); throws 429 « Trop de tentatives… ». |

`lists.js`:
| Function | Signature | Role |
| --- | --- | --- |
| `createList` | `(list, ownerUserId?) → list` | **Upsert**: in v1, importing a markdown whose UUID already existed overwrote the list — preserved (owner kept on conflict). |
| `getList` | `(id) → list \| null` | `validateId` → `SELECT` → canonical model; `null` if invalid/absent (→ 404). |
| `updateList` | `(id, mutate, visitorUserId?) → list \| null` | Read-mutate-write inside `BEGIN IMMEDIATE…COMMIT`; records the visit in the same transaction; `null` → 404. |
| `touchVisit` | `(listId, userId) → void` | Upsert into `list_visits`. |
| `listListsForUser` | `(userId) → [{ id, title, origin: 'created'\|'visited', lastVisited, updatedAt }]` | Lists owned + lists visited, ordered by last activity desc. |

## Flow
- **Boot (first request)**: `getDb()` → mkdir dataDir → open SQLite → schema + PRAGMAs → **migration**: scan `*.md` in dataDir, `parseMarkdown`, `INSERT OR IGNORE` (idempotent; .md files never deleted, they remain the v1 backup; per-file try/catch, invalid id or unreadable file skipped with a log) → purge expired sessions.
- **Read**: handler → `getList(id)` → canonical model. **Mutate**: handler → `updateList(id, mutate, userId?)` → transactional rewrite of `title`/`content`/`updated_at`.
- **Login**: `verifyPassword` → `createSession` → `setSessionCookie`. **Request auth**: `getSessionUser(event)` joins sessions+users on the cookie token.

## Integration
- **Consumers**: all `server/api/**` handlers import these modules explicitly (`../../utils/db`, `../../utils/auth`, `../../utils/lists`, `../../utils/markdown`).
- **Dependencies**: `node:sqlite` (Node ≥ 23.4 unflagged; Docker image runs `node:24-alpine`), `node:crypto`, `node:fs`, `node:path`.
- **Mirrored elsewhere**: `exportMd()` in `pages/list/[id].vue` re-implements `generateMarkdown` — keep both in sync.
