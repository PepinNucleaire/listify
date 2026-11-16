# pages/

## Responsibility

Nuxt file-based routing layer for Listify. `pages/index.vue` is the home route `/`; it shows « Mes listes » for logged-in users (v2), creates a new list or imports an existing markdown list, then redirects to the created list. Directory-level concerns here are route registration, client entry state, and consumption of the shared "Marché" design system. All persistence is delegated to `server/api/lists/*` and `server/api/auth/*`; pages hold no data of their own beyond the current request/list payload.

## Design

- Nuxt 4 file-based routing: file path = URL. No `definePageMeta`, no route middleware, no layouts under this directory (`app.vue` supplies `NuxtLayout`/`NuxtPage`, but no `layouts/` file exists).
- `<script setup>` + Vue 3 Composition API only; no Options API anywhere in the directory.
- Auto-import strategy is intentionally mixed and must be preserved:
  - `pages/index.vue` imports nothing — `ref`, `watch`, `useRouter`, `useAuth`, `$fetch` all come from Nuxt/unimport.
  - `pages/list/[id].vue` explicitly imports `{ ref, onMounted, onUnmounted, nextTick, watch }` while using auto-imported `computed` and `useRoute`. This asymmetry is deliberate; do not "normalize" it by adding or removing imports.
- State is local `ref`/`computed` plus the shared session state from `composables/useAuth.js` (`useState('listify-user')`) — the repo's only composable, consumed by `pages/index.vue` (`user`) and `app.vue` (account bar + auth dialog). No Pinia.
- Styling consumes `app.vue`: global tokens (`--encre`, `--papier`, `--papier-2`, `--tomate`, `--moutarde`, `--persil`, `--bleu`, `--ink-soft`, `--radius`, `--display`, `--body`) and global component classes (`.etal`, `.etal-head`, `.etal-body`, `.tone-*`, `.field`, `.input`, `.btn`, `.btn.ghost`, `.chip-btn`, `.awning`, `.error`, `.loading`, `.stamp`, v2 account classes `.account-bar`/`.auth-dialog`). Page components add only `<style scoped>` deltas (`pages/index.vue`: `.listes`, `.liste-row`, `.stamp-created`/`.stamp-visited`, `.liste-date`).
- Typography: self-hosted woff2 in `public/fonts/` (Bricolage Grotesque display, Atkinson Hyperlegible body) declared via `@font-face` in `app.vue`. No Tailwind/PostCSS build step, Pico CSS removed.
- All user-facing copy, error strings, `aria-label`s and placeholders are French.

## Flow

Inbound: browser navigation hits `/` → `pages/index.vue`. Route param `id` (from `/list/:id`) is read via `useRoute()` in the list page. On app mount, `app.vue` calls `fetchMe()` (`GET /api/auth/me`) which fills the shared `user` state.

Outbound calls (`$fetch` to Nitro server routes):

- `pages/index.vue` → `GET /api/lists` when `user` becomes non-null (`watch(user, …, { immediate: true })`); 401/erreur ignored silently, list cleared on logout. Response `{ lists: [{ id, title, origin: 'created'|'visited', lastVisited, updatedAt }] }` rendered as « Mes listes » (badge « créée »/« visitée », relative date via `Intl.RelativeTimeFormat('fr')`). Anonymous users see nothing (no localStorage fallback — decided).
- `pages/index.vue` → `POST /api/lists` with `{ title }`; response `{ url }` is passed to `router.push(res.url)`.
- `pages/index.vue` → `POST /api/lists/import` with `{ content }` (markdown text from textarea or `FileReader`); response `{ url }` → `router.push`.
- `app.vue` (account bar/dialog) → `POST /api/auth/register|login|logout` via `useAuth()`; server error `message` (French) is displayed as-is in the dialog.
- `pages/list/[id].vue` → `GET /api/lists/:id` on `onMounted` and on `watch(() => route.params.id)` (so client-side id changes re-fetch); 404 mapped to a French "list does not exist" message. The server records the visit for logged-in users — the page itself is untouched by v2.
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

- Depends on Nuxt auto-imports (`ref`, `computed`, `watch`, `onMounted`, `onUnmounted`, `nextTick`, `useRoute`, `useRouter`, `$fetch`, `useAuth`) plus `app.vue` global CSS and `public/fonts/`.
- Depends on Nitro endpoints: `server/api/lists/index.get.js` (« Mes listes »), `index.post.js`, `import.post.js`, `[id].get.js`, `[id].patch.js`, and `server/api/auth/*` through `composables/useAuth.js`.
- `exportMd()` duplicates the markdown serializer in `server/utils/markdown.js` (`generateMarkdown`). Both define the wire format; any format change must be applied to **both** or exported files will stop round-tripping through import. This is the directory's main coupling risk.
- Consumers: none — these are leaf routes rendered by `app.vue`'s `<NuxtPage />`; nothing imports them.
