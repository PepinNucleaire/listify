# server/
## Responsibility
Backend tier of Listify: Nitro/h3 HTTP route handlers plus the shared server-side library that turns HTTP requests into reads/writes of Markdown files. No database, no ORM, no auth layer.
## Design
Two layers, strictly separated: `api/` holds thin, declarative route handlers (`defineEventHandler`) that parse params/body and map results to HTTP responses or `createError`; `utils/` holds pure domain logic (parse/serialize/validate) and a synchronous filesystem repository. Transport concerns never leak into `utils/`, and persistence never leaks into `api/`.
## Flow
HTTP request → Nitro file-based route (`server/api/lists/*`) → `readBody`/`getRouterParam` → `server/utils/markdown.js` (`getDataDir` → `readListFromDisk` → mutate → `writeListToDisk`) → JSON response, or thrown `createError` (404 `Liste introuvable`, 400 `Contenu markdown requis`).
## Integration
- `server/api/` — route surface consumed by the Vue pages via `$fetch`.
- `server/utils/` — shared logic; `markdown.js` is the canonical parser/serializer and filesystem gateway.
- External: `node:fs`, `node:path`, and the `uuid` package (`v4` for new list IDs, used in `api/` only).
- Runtime constraint: `getDataDir()` hardcodes `/app/data/lists`; `runtimeConfig.listify.dataDir` in `nuxt.config.js` is dead config.
