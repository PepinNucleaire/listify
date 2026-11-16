# pages/list/

## Responsibility

Dynamic list-detail route: `pages/list/[id].vue` serves `/list/:id`, the app's core working surface. It renders one markdown-backed shopping list (sections → items), lets the user check items, edit quantities, claim/assign items to a pseudo, delete items, add items, copy the share link, and export the list as markdown. It owns no persistence: every mutation is a server round-trip that returns the whole updated list.

## Design

- Single-file component, `<script setup>`, Vue 3 Composition API. **Intentional mixed import style**: `import { ref, onMounted, onUnmounted, nextTick, watch } from 'vue'`, while `computed` and `useRoute` remain auto-imported. This is the documented state — do not add `computed` to the import or otherwise "clean it up".
- Route param is a derived ref: `const id = computed(() => route.params.id)`. `watch(() => route.params.id, fetchList)` makes in-place id changes re-fetch.
- Server-authoritative state: `patchList(body)` awaits `$fetch` PATCH and assigns the response to `list.value`; no optimistic updates, no local mutation of items. Errors set a French `error` string.
- Pseudo identity is client-only: `localStorage['listify-pseudo']`, edited via an inline `<details>` and a first-visit `<dialog>`. `toggleAssign` gates on pseudo presence and opens the dialog if missing.
- Dual add-item UI sharing one set of refs (`newItemSection`, `newItemText`, `newItemQty`): an inline `.etal` form at page bottom and a `<dialog>` "bottom sheet". An `IntersectionObserver` on the inline form's template ref drives `fabVisible`, showing a floating `+` button when that form leaves the viewport; `addOpen` suppresses it while the dialog is open. Observer is created in `watch(addFormInline, …)` (covers `v-if="list"` remounts) and disconnected in `onUnmounted`.
- Derived UI state via `computed`: `doneCount`, `totalCount`, `percent`, `namedSections` (unique non-empty section names for the select). Section band colors are a fixed 5-entry `tones` array cycled by index.
- Styling: consumes "Marché" globals from `app.vue` (`.etal`, `.band`, `.item`, `.check`, `.qty`, `.stamp`, `.claim`, `.trash`, `.chip-btn`, `.btn`, `.input`, `.field`, `.error`, `--encre`, `--papier`, `--papier-2`, `--tomate`, `--persil`, `--display`, `--radius`). `<style scoped>` only adds the FAB, the add-dialog sheet, and mobile gutter tweaks; `prefers-reduced-motion` is handled globally.
- All copy is French (`Cocher`, `Pris par`, `Je prends`, `Rayon`, `Exporter`, `Copier le lien`, …).

## Flow

In: URL `/list/:id` → `id` computed → `onMounted` → `GET /api/lists/:id` → `list = { title, sections: [{ name, items: [{ text, qty, checked, assign }] }] }`. 404 sets "Cette liste n'existe pas" (no error boundary).

Mutations — one helper, six actions:

- `toggleItem(si, ii)` → `PATCH { action:'toggle', sectionIndex, itemIndex }`
- `updateQty(si, ii, value)` → `PATCH { action:'qty', sectionIndex, itemIndex, value }`
- `toggleAssign(si, ii)` → `PATCH { action:'assign', sectionIndex, itemIndex, value: pseudo }` (same action unassigns server-side)
- `deleteItem(si, ii)` → `confirm()` then `PATCH { action:'delete', sectionIndex, itemIndex }`
- `addItem()` → `PATCH { action:'add', sectionName, text, qty }`; `sectionName: ''` means default section. The Rayon field is a free-text input with a `<datalist>` of existing sections — typing a new name creates the section server-side on first item. `submitAddDialog()` reuses it, closing the dialog and refocusing the FAB only when `error` stayed empty.
- `text` is a valid API action but not used here.
- `renameItem` — the title pencil (`.rename-btn`) opens an inline edit form: Enter/« Enregistrer » → `PATCH { action:'rename', value }` (server trims, no-ops on empty, clamps to 200); Échap/« Annuler » or unchanged title → no request; blur saves only if changed.

Each response replaces `list`, re-rendering the whole list. `copyLink()` uses `navigator.clipboard` + `window.location.href`.

Out: `exportMd()` builds markdown client-side — `# {title}`, `UUID: {id}`, `## {section}` per named section, `- [x] text × qty ← assign` per item — then creates a `Blob` + object URL and triggers an `<a download="{title}.md">`. This serializer duplicates `generateMarkdown` in `server/utils/markdown.js`; the two must be changed together or exports will no longer re-import cleanly. Keep `parseMarkdown`, `generateMarkdown`, and `exportMd()` in sync.

## Integration

- Depends on: auto-imports (`computed`, `useRoute`, `$fetch`), explicit `vue` imports (`ref`, `onMounted`, `onUnmounted`, `nextTick`, `watch`), `app.vue` global classes/tokens, browser APIs (`localStorage`, `navigator.clipboard`, `FileReader`-less here, `IntersectionObserver`, `<dialog>.showModal`, `URL.createObjectURL`).
- Calls `server/api/lists/[id].get.js` (`GET`) and `server/api/lists/[id].patch.js` (`PATCH`), which delegate to `server/utils/markdown.js` for validation/parse/generate and to `getDataDir()` for file I/O.
- No uuid import; the id originates from the server-rendered list URL produced by `POST /api/lists`.
- Consumers: none — leaf route under `app.vue`'s `<NuxtPage />`. Reached only via `router.push('/list/:id')` from the home page or a shared URL.
