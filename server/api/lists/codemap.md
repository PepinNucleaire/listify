# server/api/lists/
## Responsibility
The only API namespace in the app: create, read, mutate and import shopping lists. One handler per Nitro file route:

| File | Endpoint | Purpose |
| --- | --- | --- |
| `index.post.js` | `POST /api/lists` | Create an empty/Pre-filled list, returns `{ id, url }` |
| `[id].get.js` | `GET /api/lists/:id` | Read one list, returns the full list object |
| `[id].patch.js` | `PATCH /api/lists/:id` | Apply one action-based mutation, returns the updated list |
| `import.post.js` | `POST /api/lists/import` | Parse raw markdown into a new list, returns `{ id, url }` |

Persistence is one `*.md` file per list inside the hardcoded directory `/app/data/lists` (see `getDataDir()` in `server/utils/markdown.js`), with filename = list UUID (`<uuid>.md`). There is no database and no index file — the list of lists is whatever files exist on disk.

## Design
- **Thin handlers, fat util.** Every route follows the same shape: read input (`readBody` / `getRouterParam(event, 'id')`), resolve `getDataDir()`, call `readListFromDisk` / `writeListToDisk` / `parseMarkdown`, return JSON or throw. No business logic beyond the PATCH action switch lives in the route files.
- **Auto-import reliance.** `defineEventHandler`, `readBody`, `getRouterParam` and `createError` are Nuxt/Nitro auto-imports and are *not* imported. Only `../../utils/markdown` helpers and `uuid` are explicit `import` statements.
- **ID as capability and filesystem key.** The UUID both names the file and appears in the markdown (`UUID: ...`), so a list is self-describing and re-importable.
- **Validation via `validateId`, not route middleware.** `validateId(id)` tests `/^[a-zA-Z0-9_-]+$/`, blocking path traversal (`../`, `/`, `.`). `readListFromDisk` returns `null` for an invalid ID or a missing file → read route converts that to HTTP 404. `writeListToDisk` throws `Invalid UUID: <id>` for an invalid ID → an unhandled 500 at the Nitro layer. Routes therefore never write an unsafe filename.
- **Action-based PATCH, not resource replacement.** A single endpoint with a discriminated `action` field avoids a route per field and keeps the client optimistic-update friendly.
- **Read-modify-write, no locking.** PATCH loads the whole list, mutates the in-memory object, then rewrites the entire file. Concurrent patches to the same list last-write-wins.
- **French copy.** All `createError` messages and defaults are French (`'Liste introuvable'`, `'Contenu markdown requis'`, `'Liste de courses'`, `'Liste importée'`).

### PATCH action protocol
Body: `{ action, sectionIndex, itemIndex, value }` for item actions; `{ action: 'add', sectionName, text, qty }` for additions. Items are addressed positionally as `list.sections[sectionIndex].items[itemIndex]` — there are no item IDs. All lookups use optional chaining, so a stale index silently no-ops instead of erroring (the list is still rewritten and returned unchanged).

| `action` | Effect in `[id].patch.js` |
| --- | --- |
| `toggle` | `item.checked = !item.checked` |
| `assign` | Sets `item.assign = value`; if `item.assign === value` it clears to `''`, i.e. the action is a toggle for the assignee/pseudo |
| `qty` | `item.qty = value` (stored as a string; empty string means no quantity) |
| `text` | `item.text = value` |
| `add` | Finds section by `sectionName`, appending `{ name: sectionName, items: [] }` if absent; pushes `{ text, checked: false, qty: qty || '', assign: '' }` |
| `delete` | `splice(itemIndex, 1)` in the addressed section, then drops every section whose `items` became empty |

An unrecognized or missing `action` falls through the if/else chain: nothing mutates, but `writeListToDisk` still runs and the unchanged list is returned (no 400).

## Flow
- **Create** — `POST /api/lists` with `{ title?, items? }` → `readBody` → `getDataDir()` → `uuidv4()` new ID → build `{ title: body?.title || 'Liste de courses', uuid, sections }` where `items` becomes `[{ name: '', items }]` and its absence yields `sections: []` → `writeListToDisk(dataDir, list)` (mkdir + `generateMarkdown` + `writeFileSync`) → `{ id, url: '/list/<id>' }`.
- **Read** — `GET /api/lists/:id` → `getRouterParam(event, 'id')` → `readListFromDisk` → `validateId`, `existsSync`, `readFileSync`, `parseMarkdown` → if `!list || !list.uuid`, `createError({ statusCode: 404, message: 'Liste introuvable' })`; otherwise the parsed `{ title, uuid, sections }` object.
- **Mutate** — `PATCH /api/lists/:id` → load via `readListFromDisk` (404 if null, same message) → switch on `action` (table above) → `writeListToDisk` → return the full updated list so the client can reconcile state.
- **Import** — `POST /api/lists/import` with `{ content }` → missing content throws `createError({ statusCode: 400, message: 'Contenu markdown requis' })` → `parseMarkdown(content)` → reuse `parsed.uuid` only when `validateId(parsed.uuid)` passes, else mint `uuidv4()` and assign it back → default `parsed.title` to `'Liste importée'` when the markdown had no `# Title` → `writeListToDisk` → `{ id, url: '/list/<id>' }`.

Markdown wire format handled by the util (do not diverge): `# Title`, `UUID: <id>`, `## Section`, `- [ ] Text × Qty ← Pseudo` (checked = `[x]`); `generateMarkdown` emits `×`/`←` only when set. `pages/list/[id].vue` duplicates this serializer in `exportMd()` — format changes must touch both.

## Integration
- **Consumers:** `pages/index.vue` calls `$fetch('/api/lists', { method: 'POST', ... })` and `$fetch('/api/lists/import', { method: 'POST', ... })`; `pages/list/[id].vue` calls `$fetch(\`/api/lists/${id}\`)` for reads and `$fetch(\`/api/lists/${id}\`, { method: 'PATCH', body: { action, sectionIndex, itemIndex, value } })` for every toggle/assign/qty/text/add/delete. Responses drive optimistic UI updates.
- **Dependencies:** `server/utils/markdown.js` — `parseMarkdown`, `generateMarkdown`, `validateId`, `readListFromDisk`, `writeListToDisk`, `getDataDir`; `uuid` (`v4 as uuidv4`); `node:fs` / `node:path` indirectly through the util.
- **Deployment coupling:** `getDataDir()` hardcodes `/app/data/lists`, so the app requires a writable `/app/data/lists` path (in Docker, the `listify_data` volume). `runtimeConfig.listify.dataDir` and `NUXT_LISTIFY_DATA_DIR` are dead config and are not read by these routes.
