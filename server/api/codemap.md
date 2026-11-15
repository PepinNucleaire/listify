# server/api/
## Responsibility
Nitro/h3 HTTP surface of the app. Exposes the JSON API consumed by the Vue pages; every mutation and read of a shopping list goes through here. No database — handlers delegate file I/O to `server/utils/markdown.js`.

## Design
File-based routing: the directory path plus filename suffix define the endpoint (`server/api/lists/index.post.js` → `POST /api/lists`). Each file default-exports a single `defineEventHandler(async (event) => ...)`. Handlers are deliberately thin: parse request with `readBody`/`getRouterParam`, call a util, throw `createError` on failure, return a plain object. Nuxt auto-imports are relied on (`defineEventHandler`, `readBody`, `getRouterParam`, `createError`); only utils and `uuid` are imported explicitly. All user-facing error messages are French.

## Flow
`$fetch` request → Nitro matches file route → `readBody`/`getRouterParam` → `server/utils/markdown.js` (`parseMarkdown`, `generateMarkdown`, `readListFromDisk`, `writeListToDisk`, `validateId`) → plain JSON response or `createError` with status code.

## Integration
Consumers: `pages/index.vue` (create + import) and `pages/list/[id].vue` (read + action patch) via `$fetch`. Dependencies: `server/utils/markdown.js` (parsing, disk persistence, ID validation), `node:fs`/`node:path` indirectly, and `uuid` (`v4 as uuidv4`) for new list IDs. All routes in this tree are documented in `server/api/lists/codemap.md`.
