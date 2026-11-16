# server/api/lists/
## Responsibility
List API namespace: create, read, mutate, import shopping lists — plus « mes listes » for logged-in users. One handler per Nitro file route:

| File | Endpoint | Purpose |
| --- | --- | --- |
| `index.post.js` | `POST /api/lists` | Create an empty/pre-filled list, returns `{ id, url }`; `owner_user_id` set if session |
| `index.get.js` | `GET /api/lists` | « Mes listes » of the logged-in user → `{ lists: [{ id, title, origin, lastVisited, updatedAt }] }`; **401** if anonymous |
| `[id].get.js` | `GET /api/lists/:id` | Read one list (capability — no auth), returns the full list object; records the visit if session |
| `[id].patch.js` | `PATCH /api/lists/:id` | Apply one action-based mutation, returns the updated list; visit recorded in the same transaction if session |
| `import.post.js` | `POST /api/lists/import` | Parse raw markdown into a list, returns `{ id, url }`; owner if session |

Persistence is SQLite (`<dataDir>/listify.db`, table `lists` with JSON `content` column) via `server/utils/lists.js`. There is no per-list file anymore; `*.md` files in the data dir are only the v1 backup read once by the migration in `server/utils/db.js`.

## Design
- **Thin handlers, fat util.** Every route follows the same shape: read input (`readBody` / `getRouterParam(event, 'id')`), resolve the session (`getSessionUser(event)`), call `server/utils/lists.js` (`createList` / `getList` / `updateList` / `listListsForUser`) or `parseMarkdown` for import, return JSON or throw `createError`. No business logic beyond the PATCH action switch lives in the route files.
- **Auto-import reliance.** `defineEventHandler`, `readBody`, `getRouterParam` and `createError` are Nuxt/Nitro auto-imports and are *not* imported. Utils and `uuid` are explicit `import` statements.
- **ID as capability.** The UUID in the URL is the only credential needed to read/mutate a list (v1 behavior preserved — sharing between friends stays friction-free). A session adds owner/visit bookkeeping, never access control.
- **Validation via `validateId`, not route middleware.** `getList` returns `null` for an invalid ID or a missing row → read route converts that to HTTP 404 (« Liste introuvable »). `PATCH` on an unknown id → 404.
- **Action-based PATCH, not resource replacement.** A single endpoint with a discriminated `action` field avoids a route per field and keeps the client optimistic-update friendly.
- **Transactional mutations.** PATCH runs inside `updateList`'s `BEGIN IMMEDIATE…COMMIT`: read + mutate + write + visit are atomic, and concurrent PATCHes are serialized (no lost updates). The stale-index gotcha below is unchanged.
- **Import is an upsert.** Importing markdown whose UUID already exists overwrites that list's title/content (v1 behavior: full-file overwrite) and keeps the existing owner.
- **French copy.** All `createError` messages and defaults are French (`'Liste introuvable'`, `'Contenu markdown requis'`, `'Liste de courses'`, `'Liste importée'`, `'Non connecté'`).

### PATCH action protocol (unchanged from v1)
Body: `{ action, sectionIndex, itemIndex, value }` for item actions; `{ action: 'add', sectionName, text, qty }` for additions. Items are addressed positionally as `list.sections[sectionIndex].items[itemIndex]` — there are no item IDs. All lookups use optional chaining, so a stale index silently no-ops instead of erroring (the list is still rewritten and returned unchanged).

| `action` | Effect in `[id].patch.js` |
| --- | --- |
| `toggle` | `item.checked = !item.checked` |
| `assign` | Sets `item.assign = value`; if `item.assign === value` it clears to `''`, i.e. the action is a toggle for the assignee/pseudo |
| `qty` | `item.qty = value` (stored as a string; empty string means no quantity) |
| `text` | `item.text = value` |
| `add` | Finds section by `sectionName`, appending `{ name: sectionName, items: [] }` if absent; pushes `{ text, checked: false, qty: qty || '', assign: '' }` |
| `delete` | `splice(itemIndex, 1)` in the addressed section, then drops every section whose `items` became empty |
| `rename` | `list.title = String(value).trim().slice(0, 200)`; empty/whitespace value is a silent no-op (v2.1) |

An unrecognized or missing `action` falls through the if/else chain: nothing mutates, but the list is still rewritten and returned unchanged (no 400).

## Flow
- **Create** — `POST /api/lists` with `{ title?, items? }` → `uuidv4()` new ID → `{ uuid, title: body?.title || 'Liste de courses', sections }` (`items` becomes `[{ name: '', items }]`) → `createList(list, user?.id ?? null)` → `{ id, url: '/list/<id>' }`.
- **My lists** — `GET /api/lists` → `getSessionUser` → 401 if anonymous → `listListsForUser(user.id)` → lists owned (`origin: 'created'`) + visited (`origin: 'visited'`), ordered by last activity desc.
- **Read** — `GET /api/lists/:id` → `getList(id)` → 404 if null → `touchVisit` if session → canonical `{ uuid, title, sections }`.
- **Mutate** — `PATCH /api/lists/:id` → `updateList(id, mutate, user?.id ?? null)` → 404 if null → return the full updated list so the client can reconcile state.
- **Import** — `POST /api/lists/import` with `{ content }` → 400 « Contenu markdown requis » if missing → `parseMarkdown(content)` → reuse `parsed.uuid` only when `validateId(parsed.uuid)` passes, else mint `uuidv4()` → default title `'Liste importée'` → `createList` (upsert) → `{ id, url: '/list/<id>' }`.

Markdown wire format handled by the util (do not diverge): `# Title`, `UUID: <id>`, `## Section`, `- [ ] Text × Qty ← Pseudo` (checked = `[x]`). `pages/list/[id].vue` duplicates this serializer in `exportMd()` — format changes must touch both.

## Integration
- **Consumers:** `pages/index.vue` calls `$fetch('/api/lists', { method: 'POST', ... })`, `$fetch('/api/lists/import', { method: 'POST', ... })` and `$fetch('/api/lists')` for « Mes listes » (via the account UI); `pages/list/[id].vue` calls `$fetch(\`/api/lists/${id}\`)` for reads and `$fetch(\`/api/lists/${id}\`, { method: 'PATCH', body: { action, sectionIndex, itemIndex, value } })` for every toggle/assign/qty/text/add/delete.
- **Dependencies:** `server/utils/lists.js` (repository), `server/utils/auth.js` (`getSessionUser`), `server/utils/markdown.js` (`parseMarkdown`, `validateId`), `uuid` (`v4 as uuidv4`).
- **Deployment coupling:** the database lives in `runtimeConfig.listify.dataDir` (env `NUXT_LISTIFY_DATA_DIR`, default `/app/data`); docker-compose mounts the `listify_data` volume there.
