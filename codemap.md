# Listify — Repository Atlas

Listify is a full-stack **Nuxt 4 (Vue 3)** shopping-list app. Nitro server routes expose a small JSON API; persistence is file-based Markdown (one `*.md` file per list, filename = list UUID) — **no database**. UI copy is French; styling is a custom "Marché" design system living in `app.vue`.

## Root Assets

| File | Role |
| --- | --- |
| `app.vue` | App shell (`NuxtLayout`/`NuxtPage`) and the global "Marché" design system: CSS tokens (`--encre`, `--papier`, `--tomate`, `--display`, `--body`, …), reusable classes (`.etal`, `.band`, `.item`, `.check`, `.qty`, `.stamp`, `.btn`), `@font-face` for self-hosted woff2 in `public/fonts/`. No Tailwind/PostCSS. |
| `nuxt.config.js` | Minimal config: app head title, `nitro.output.dir: 'output'` (build goes to `output/`, not `.output/`). `runtimeConfig.listify.dataDir` is **dead config** — nothing reads it. |
| `package.json` | Deps: `nuxt ^4.4.7`, `uuid ^11.1.0`. Scripts: `dev`, `build`, `start` only — no test/lint/typecheck. |
| `Dockerfile` | Two-stage `node:22-alpine` build; copies `output/`, `npm ci --omit=dev`, creates `/app/data/lists`, runs `node output/server/index.mjs` on port 3000. |
| `docker-compose.yml` | Mounts volume `listify_data` at `/app/data/lists` (the hardcoded write path); joins external network `arr-network` (must pre-exist). `NUXT_LISTIFY_DATA_DIR` is dead config. |

## Architecture & Data Flow

```
Browser (pages/)
  pages/index.vue        pages/list/[id].vue
      │  $fetch               │  $fetch (GET + PATCH)
      ▼                       ▼
Nitro HTTP layer (server/api/lists/*)   ← thin handlers: readBody/getRouterParam → util → JSON | createError
      │
      ▼
Domain + repository (server/utils/markdown.js)   ← parseMarkdown / generateMarkdown / validateId / read-write on disk
      │
      ▼
/app/data/lists/<uuid>.md   (one file per list, full-file overwrite, last-write-wins)
```

- **Canonical list model**: `{ title, uuid, sections: [{ name, items: [{ text, checked, qty, assign }] }] }` — `qty`/`assign` are strings, empty string = absent.
- **Markdown wire format**: `# Title`, `UUID: <id>`, `## Section`, item line `- [ ] Text × Qty ← Pseudo` (checked = `[x]`).
- **PATCH protocol**: action-based, `action` ∈ `toggle | assign | qty | text | add | delete`, addressing via `sectionIndex`/`itemIndex` (no item IDs); `add` uses `sectionName`/`text`/`qty`.
- **IDs**: validated against `/^[a-zA-Z0-9_-]+$/`; invalid ID → read returns `null` → 404, write throws → 500.

## Directory Map

| Directory | Responsibility | Link |
| --- | --- | --- |
| `pages/` | Nuxt file-based routing layer: home route (`/`) for create/import, consumption of the shared design system; all persistence delegated to the API. | [View Map](pages/codemap.md) |
| `pages/list/` | Dynamic list-detail route `/list/:id` — the core working surface: check/qty/assign/add/delete items, share link, client-side markdown export. | [View Map](pages/list/codemap.md) |
| `server/` | Backend tier: Nitro/h3 route handlers plus shared utils; strict transport/domain separation. | [View Map](server/codemap.md) |
| `server/api/` | HTTP surface: file-based JSON endpoints consumed by the pages via `$fetch`. | [View Map](server/api/codemap.md) |
| `server/api/lists/` | The only API namespace: create, read, action-based mutate, import — one handler per Nitro file route. | [View Map](server/api/lists/codemap.md) |
| `server/utils/` | Single source of truth for the list domain: wire-format parser/serializer pair, ID validation, synchronous filesystem repository. | [View Map](server/utils/codemap.md) |

## Cross-Cutting Invariants

1. **Serializer triplication risk**: the markdown format is implemented in `server/utils/markdown.js` (`parseMarkdown` + `generateMarkdown`) **and** duplicated client-side in `exportMd()` in `pages/list/[id].vue`. Any format change must touch both or exports stop re-importing.
2. **Hardcoded data dir**: `getDataDir()` returns `/app/data/lists`. In local dev there is no `/app`, so create/import/patch fail at `mkdirSync` — create a writable `/app/data/lists` to test. `runtimeConfig.listify.dataDir` and `NUXT_LISTIFY_DATA_DIR` are dead config.
3. **Auto-import policy**: Nuxt/Nitro auto-imports are relied on everywhere (`defineEventHandler`, `readBody`, `getRouterParam`, `createError`, `$fetch`, `ref`, `computed`, `useRoute`). `pages/list/[id].vue` deliberately mixes explicit `import { ref, onMounted, watch }` with auto-imported `computed` — do not "fix" it.
4. **French copy**: all user-facing strings and error messages are French (`Liste introuvable`, `Contenu markdown requis`, …).
5. **No database, no locking**: reads/writes are synchronous full-file operations; concurrent PATCHes to the same list are last-write-wins.
