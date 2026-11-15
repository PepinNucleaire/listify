# server/utils/
## Responsibility
Single source of truth for the Listify list domain: Markdown wire-format parsing and generation, list/ID validation, and the filesystem repository that stores one `*.md` file per list. Contains no HTTP or framework code.
## Design
- **Parser/serializer pair**: `parseMarkdown(content)` and `generateMarkdown(list)` are exact inverses over one documented wire format; any format change must be applied to both (and to the duplicated `exportMd()` in `pages/list/[id].vue`).
- **Canonical data model**: `{ title, uuid, sections: [{ name, items: [{ text, checked, qty, assign }] }] }`. `checked` is boolean; `qty` and `assign` are plain strings (empty string = absent), not numbers or arrays.
- **Pure core, impure edges**: `parseMarkdown`, `generateMarkdown`, `validateId` are pure; only `readListFromDisk`, `writeListToDisk`, `getDataDir` touch `node:fs`/`node:path`.
- **Filesystem-as-repository**: one file per aggregate, synchronous (`readFileSync`/`writeFileSync`), no index, no locking, no cache.
- **Fail-soft reads, fail-loud writes**: invalid input or a missing file returns `null`; an invalid UUID on write throws.

### Exports (exact signatures)
| Function | Signature | Role |
| --- | --- | --- |
| `parseMarkdown` | `parseMarkdown(content: string) → { title, uuid, sections }` | Line-oriented parse of stored Markdown into the canonical model. |
| `generateMarkdown` | `generateMarkdown(list) → string` | Serialize the canonical model back to Markdown; returns text ending in exactly one `\n`. |
| `validateId` | `validateId(id) → boolean` | Path-traversal guard: `true` only for `string` matching `/^[a-zA-Z0-9_-]+$/`; `false` for empty/non-string. |
| `readListFromDisk` | `readListFromDisk(dataDir, id) → list \| null` | Validate ID, resolve `dataDir/<id>.md`, read UTF-8, return parsed list; `null` if ID invalid or file absent. |
| `writeListToDisk` | `writeListToDisk(dataDir, list) → void` | `mkdirSync(dataDir, { recursive: true })` if needed, then overwrite `dataDir/<list.uuid>.md` with `generateMarkdown(list)`. |
| `getDataDir` | `getDataDir() → string` | Returns the hardcoded storage path `/app/data/lists`. |

### Markdown wire format (as implemented)
```
# Title
UUID: <list-uuid>

## Section Name
- [ ] Text × Qty ← Pseudo
- [x] Checked item ← Pseudo1 & Pseudo2
```
- **Title**: `/^#\s+(.+)/`, first-level heading; trailing-whitespace trimmed. Multiple matches overwrite, so the last `# ` line wins. `## ` does not match (requires whitespace after the single `#`).
- **UUID**: `/^UUID:\s*(\S+)/`, first token after the colon; case-sensitive literal `UUID:`.
- **Section heading**: `/^##\s+(.+)/`. Only `name` and `items` are supported — no per-section metadata.
- **Item line**: `/^-\s+(\[.\])\s+(.+)/`. The state character is matched loosely (`[.]`), but `checked` is `true` only for the literal `[x]` — so `[X]` or `[-]` parse as unchecked and are normalized to `[ ]` on write.
- **Suffix order is significant**: `← assignee` is stripped first (`/\s*←\s*(.+)/`, split at the first `←`), then `× qty` (`/\s*×\s*(.+)/`, split at the first `×`). Remaining trimmed text becomes `text`. There is no escaping; a literal `←` or `×` inside item text is consumed as a delimiter.
- **Anonymous sections**: items appearing before any `##` heading go into a section with `name: ''`; a single such default section is reused (appended), so ordering relative to named sections is not preserved on round-trip.
- **Generation**: `# title` and `UUID: uuid` emitted only when truthy, followed by a blank line; `## name` emitted only for non-empty names; each item emits `- [x]/[ ] text` then `` × qty `` / `` ← assign `` only when truthy. Sections are separated by blank lines, trailing blanks are collapsed, and the output ends with a single newline. Unrecognized Markdown (free prose, other headings that are not `# `/`## `) is silently dropped on round-trip.

### Persistence model
- Directory: `/app/data/lists` — **hardcoded in `getDataDir()`**; `dataDir` is threaded into every read/write as a parameter.
- Filename: `${uuid}.md`; the list UUID *is* the filename, so ID validation doubles as filename validation and blocks `/`, `..`, and dots entirely.
- Writes are full-file overwrites of the regenerated Markdown (last-write-wins, no partial updates, no backups).
- Known constraint: `runtimeConfig.listify.dataDir` (`nuxt.config.js`) and `NUXT_LISTIFY_DATA_DIR` (`docker-compose.yml`) are dead config — nothing reads them. Local dev without a writable `/app/data/lists` fails at `mkdirSync` (permission denied). `docker-compose.yml` mounts the `listify_data` volume at that exact path.

### Validation & error behavior
- `validateId`: returns `false` (never throws) for non-strings, empty strings, or anything outside `A-Za-z0-9_-`. Note the code comment mentions dots, but the regex rejects them.
- `readListFromDisk`: never throws on bad input — invalid ID → `null`, missing file → `null`. Callers treat `null` (or a parsed list without `uuid`) as 404.
- `writeListToDisk`: throws `Error('Invalid UUID: ' + list.uuid)` when `list.uuid` fails validation; filesystem errors (`EROFS`, `EACCES`) propagate to the handler.
- `parseMarkdown` / `generateMarkdown`: total functions on their inputs; no validation of item text, quantity, or title.
## Flow
Disk `*.md` → `readListFromDisk(dataDir, id)` → `validateId` → `readFileSync` → `parseMarkdown` → canonical list object → (caller mutates) → `writeListToDisk(dataDir, list)` → `validateId(list.uuid)` → `generateMarkdown` → `writeFileSync`.
New list: caller builds `{ title, uuid, sections }` → `writeListToDisk` creates `dataDir` if missing and writes `dataDir/<uuid>.md`.
## Integration
- **Consumers**: `server/api/lists/[id].get.js` (`getDataDir` + `readListFromDisk`), `[id].patch.js` (`readListFromDisk` → action dispatch on `toggle | assign | qty | text | add | delete` → `writeListToDisk`), `index.post.js` (`writeListToDisk` with a `uuid` package `v4()` ID), `import.post.js` (`parseMarkdown` + `validateId` to keep or regenerate the UUID, then `writeListToDisk`).
- **Dependencies**: `node:fs` (`mkdirSync`, `existsSync`, `writeFileSync`, `readFileSync`), `node:path` (`join`). No `uuid` here — IDs are injected by the routes.
- **Mirrored elsewhere**: `pages/list/[id].vue`'s `exportMd()` re-implements `generateMarkdown`; keep both in sync.
