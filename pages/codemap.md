# pages/

## Responsibility

Nuxt file-based routing layer for Listify. `pages/index.vue` is the home route `/`; it creates a new list or imports an existing markdown list, then redirects to the created list. Directory-level concerns here are route registration, client entry state, and consumption of the shared "Marché" design system. All persistence is delegated to `server/api/lists/*`; pages hold no data of their own beyond the current request/list payload.

## Design

- Nuxt 4 file-based routing: file path = URL. No `definePageMeta`, no route middleware, no layouts under this directory (`app.vue` supplies `NuxtLayout`/`NuxtPage`, but no `layouts/` file exists).
- `<script setup>` + Vue 3 Composition API only; no Options API anywhere in the directory.
- Auto-import strategy is intentionally mixed and must be preserved:
  - `pages/index.vue` imports nothing — `ref`, `useRouter`, `$fetch` all come from Nuxt/unimport.
  - `pages/list/[id].vue` explicitly imports `{ ref, onMounted, onUnmounted, nextTick, watch }` while using auto-imported `computed` and `useRoute`. This asymmetry is deliberate; do not "normalize" it by adding or removing imports.
- State is local `ref`/`computed`; no Pinia, no `useState`, no composables directory. Shared UI state that must survive reloads (the user pseudo) lives in `localStorage` under `listify-pseudo`.
- Styling consumes `app.vue`: global tokens (`--encre`, `--papier`, `--papier-2`, `--tomate`, `--moutarde`, `--persil`, `--ink-soft`, `--radius`, `--display`, `--body`) and global component classes (`.etal`, `.etal-head`, `.etal-body`, `.tone-*`, `.field`, `.input`, `.btn`, `.btn.ghost`, `.chip-btn`, `.awning`, `.error`, `.loading`). Page components add only `<style scoped>` deltas.
- Typography: self-hosted woff2 in `public/fonts/` (Bricolage Grotesque display, Atkinson Hyperlegible body) declared via `@font-face` in `app.vue`. No Tailwind/PostCSS build step, Pico CSS removed.
- All user-facing copy, error strings, `aria-label`s and placeholders are French.

## Flow

Inbound: browser navigation hits `/` → `pages/index.vue`. Route param `id` (from `/list/:id`) is read via `useRoute()` in the list page.

Outbound calls (`$fetch` to Nitro server routes):

- `pages/index.vue` → `POST /api/lists` with `{ title }`; response `{ url }` is passed to `router.push(res.url)`.
- `pages/index.vue` → `POST /api/lists/import` with `{ content }` (markdown text from textarea or `FileReader`); response `{ url }` → `router.push`.
- `pages/list/[id].vue` → `GET /api/lists/:id` on `onMounted` and on `watch(() => route.params.id)` (so client-side id changes re-fetch); 404 mapped to a French "list does not exist" message.
- `pages/list/[id].vue` → `PATCH /api/lists/:id` for every mutation via the single `patchList(body)` helper; the returned full list replaces `list.value` (server is the source of truth, no optimistic UI).

PATCH action semantics (all sent with `sectionIndex`/`itemIndex` except `add`):

| action | payload | trigger |
| --- | --- | --- |
| `toggle` | `sectionIndex`, `itemIndex` | checkbox `@change` |
| `assign` | `sectionIndex`, `itemIndex`, `value` (pseudo) | "Je prends" / "Pris par X" |
| `qty` | `sectionIndex`, `itemIndex`, `value` | qty input `@change` |
| `text` | `sectionIndex`, `itemIndex`, `value` | supported by API, unused in this page |
| `add` | `sectionName`, `text`, `qty` | add form (inline or dialog) |
| `delete` | `sectionIndex`, `itemIndex` | trash button after `confirm()` |

Outbound data: `router.push` navigation, and `exportMd()` in `pages/list/[id].vue` which fabricates a client-side `.md` blob (format: `# Title\nUUID: <id>`, `## Section`, `- [x] Text × Qty ← Pseudo`) and downloads it. No uuid dependency is used anywhere in `pages/`; list IDs come from the server.

## Integration

- Depends on Nuxt auto-imports (`ref`, `computed`, `watch`, `onMounted`, `onUnmounted`, `nextTick`, `useRoute`, `useRouter`, `$fetch`) plus `app.vue` global CSS and `public/fonts/`.
- Depends on Nitro endpoints: `server/api/lists/index.post.js`, `server/api/lists/import.post.js`, `server/api/lists/[id].get.js`, `server/api/lists/[id].patch.js`.
- `exportMd()` duplicates the markdown serializer in `server/utils/markdown.js` (`generateMarkdown`). Both define the on-disk/wire format; any format change must be applied to **both** or exported files will stop round-tripping through import. This is the directory's main coupling risk.
- Consumers: none — these are leaf routes rendered by `app.vue`'s `<NuxtPage />`; nothing imports them.
