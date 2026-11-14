# AGENTS.md

Listify: Nuxt 4 (Vue 3) shopping-list app. Server routes and file-based Markdown persistence, no database.

## Commands

- Dev: `npm run dev` (Nuxt dev server, port 3000)
- Build: `npm run build` → writes to `output/` (not the Nuxt default `.output/`)
- Start built app: `npm start` (runs `nuxt start`) or `node output/server/index.mjs`
- There is **no** test, lint, typecheck, or formatter script. Do not invent `npm test` / `npm run lint`.

## Architecture

- Full-stack Nuxt 4: pages live at repo root (`app.vue`, `pages/`), **not** under `app/`; server routes under `server/api/lists/` (Nitro/h3).
- `server/utils/markdown.js` is the single source of truth for parsing, generating, and validating lists. Storage = one `*.md` file per list, filename = list UUID.
- Markdown item wire format: `- [ ] Text × Qty ← Pseudo` (checked = `[x]`). If you change it, update `parseMarkdown` + `generateMarkdown` **and** the duplicated serializer `exportMd()` in `pages/list/[id].vue`.
- PATCH/list mutation is action-based: `action` ∈ `toggle | assign | qty | text | add | delete`, using `sectionIndex`/`itemIndex`.
- Rely on Nuxt auto-imports (`defineEventHandler`, `readBody`, `getRouterParam`, `createError`, `$fetch`, `ref`, `computed`, `useRoute`). `pages/list/[id].vue` deliberately mixes an explicit `import { ref, onMounted, watch }` with unimported `computed` — do not "fix" by adding imports.

## Gotchas (verified, easy to get wrong)

- `getDataDir()` hardcodes `/app/data/lists`. The `runtimeConfig.listify.dataDir` in `nuxt.config.js` and `NUXT_LISTIFY_DATA_DIR` in `docker-compose.yml` are **dead config** — nothing reads them. In local dev there is no `/app`, so every create/import/patch fails on `mkdirSync` (permission denied). Create a writable `/app/data/lists` or change `getDataDir()` to test locally.
- `docker-compose.yml` mounts volume `listify_data` at `/app/data/lists` (the app's hardcoded write path), so lists persist across container recreation. It also joins external network `arr-network`, which must already exist or `docker compose up` fails.
- List IDs are validated against `/^[a-zA-Z0-9_-]+$/`; invalid IDs make reads return `null` (→ 404) and writes throw.
- `data/lists/*.md` and `data/camping-liste.md` are sample lists; `.dockerignore` excludes `data`, so they are not baked into the image.
- `.nuxt/` is a stale artifact referencing a different build path (`/home/opencode/workspace/listify`) and regenerates on dev/build. `output/` is generated and currently empty.
- UI copy and error messages are in **French** — keep new user-facing strings French. Styling is a custom "Marché" design system: global tokens (`--encre`, `--papier`, `--tomate`, `--display`, `--body`, …) and reusable components (`.etal`, `.band`, `.item`, `.check`, `.qty`, `.stamp`, `.btn`) live in `app.vue`; pages use those classes plus scoped tweaks. Pico CSS was removed. Fonts (Bricolage Grotesque, Atkinson Hyperlegible) are self-hosted as woff2 in `public/fonts/`. No Tailwind/PostCSS build step.
