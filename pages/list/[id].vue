<template>
  <main class="list-page">
    <div class="container">
      <a class="back" href="/">← Accueil</a>

      <header class="list-head">
        <div class="list-title">
          <h1>{{ list?.title || 'Liste' }}</h1>
          <div
            v-if="list && totalCount"
            class="progress"
            role="img"
            :aria-label="doneCount + ' pris sur ' + totalCount"
          >
            <span class="bar"><i :style="{ width: percent + '%' }"></i></span>
            <span>{{ doneCount }} pris sur {{ totalCount }}</span>
          </div>
        </div>

        <div class="list-actions">
          <button class="chip-btn" type="button" @click="copyLink">Copier le lien</button>
          <button class="chip-btn" type="button" @click="exportMd">Exporter</button>
        </div>

        <details class="pseudo">
          <summary>Mon pseudo : <b>{{ pseudo || 'non défini' }}</b></summary>
          <form @submit.prevent="setPseudo">
            <input
              v-model="pseudoInput"
              class="input"
              type="text"
              placeholder="Ton pseudo"
              required
            />
            <button class="btn" type="submit">OK</button>
          </form>
        </details>
      </header>

      <p v-if="error" class="error">{{ error }}</p>
      <p v-if="!list && !error" class="loading">Chargement…</p>

      <template v-if="list">
        <div class="sections">
          <article v-for="(section, si) in list.sections" :key="si" class="etal">
            <div class="band" :style="{ backgroundColor: tones[si % tones.length] }">
              {{ section.name || 'Sans rayon' }}
            </div>

            <div
              v-for="(item, ii) in section.items"
              :key="ii"
              class="item"
              :class="{ done: item.checked }"
            >
              <input
                class="check"
                type="checkbox"
                :checked="item.checked"
                @change="toggleItem(si, ii)"
                :aria-label="'Cocher ' + item.text"
              />
              <span class="item-text">{{ item.text }}</span>
              <span class="meta">
                <input
                  class="input qty"
                  type="text"
                  :value="item.qty"
                  @change="updateQty(si, ii, $event.target.value)"
                  placeholder="Qté"
                  aria-label="Quantité"
                />
                <button
                  v-if="item.assign"
                  class="stamp"
                  type="button"
                  @click="toggleAssign(si, ii)"
                  title="Se désassigner"
                >
                  Pris par {{ item.assign }}
                </button>
                <button v-else class="claim" type="button" @click="toggleAssign(si, ii)">
                  Je prends
                </button>
                <button class="trash" type="button" @click="deleteItem(si, ii)" title="Supprimer">
                  ✕
                </button>
              </span>
            </div>
          </article>
        </div>

        <p v-if="!totalCount" class="empty">Rien dans la liste. Ajoute le premier article.</p>

        <!-- Add item form (bloc inline, en bas de page) -->
        <article ref="addFormInline" class="etal">
          <div class="etal-head">
            <span>Ajouter un article</span>
            <span class="tone tone-persil" aria-hidden="true"></span>
          </div>
          <form class="etal-body" @submit.prevent="addItem">
            <div class="field">
              <label for="add-section">Rayon</label>
              <select id="add-section" v-model="newItemSection">
                <option value="">— Rayon par défaut —</option>
                <option v-for="name in namedSections" :key="name" :value="name">{{ name }}</option>
              </select>
            </div>
            <div class="add-grid">
              <input v-model="newItemText" class="input" type="text" placeholder="Article" required />
              <input v-model="newItemQty" class="input" type="text" placeholder="Qté" />
            </div>
            <button class="btn" type="submit">Ajouter</button>
          </form>
        </article>
      </template>
    </div>

    <!-- Modal pseudo (première visite) -->
    <dialog ref="pseudoDialog" class="pseudo-dialog">
      <form class="etal-body" @submit.prevent="confirmPseudo">
        <h2>Bienvenue sur Listify</h2>
        <p>Choisis un pseudo pour que les copains sachent qui prend quoi.</p>
        <div class="field">
          <label for="pseudo-first">Ton pseudo</label>
          <input
            id="pseudo-first"
            v-model="pseudoInput"
            class="input"
            type="text"
            placeholder="Ex : Alex"
            required
            autofocus
          />
        </div>
        <footer style="display:flex; justify-content:flex-end">
          <button class="btn" type="submit">C'est parti !</button>
        </footer>
      </form>
    </dialog>

    <!-- Bouton flottant « + » : visible quand le bloc d'ajout est hors du viewport -->
    <button
      v-show="fabVisible"
      ref="addFab"
      class="fab-add"
      type="button"
      aria-haspopup="dialog"
      aria-controls="add-dialog"
      aria-label="Ajouter un article"
      @click="openAddDialog"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="3"
        stroke-linecap="round"
        aria-hidden="true"
      >
        <path d="M12 5v14M5 12h14" />
      </svg>
    </button>

    <!-- Popup d'ajout d'article (ouverte depuis le bouton flottant), mêmes refs que le bloc inline -->
    <dialog
      ref="addDialog"
      id="add-dialog"
      class="add-dialog"
      aria-labelledby="add-title-dialog"
      @close="addOpen = false"
    >
      <header class="add-dialog-head">
        <span id="add-title-dialog">Ajouter un article</span>
        <button class="trash" type="button" aria-label="Fermer" @click="closeAddDialog">✕</button>
      </header>
      <form class="etal-body add-dialog-body" @submit.prevent="submitAddDialog">
        <div class="field">
          <label for="add-section-popup">Rayon</label>
          <select id="add-section-popup" v-model="newItemSection">
            <option value="">— Rayon par défaut —</option>
            <option v-for="name in namedSections" :key="name" :value="name">{{ name }}</option>
          </select>
        </div>
        <div class="add-grid">
          <input
            v-model="newItemText"
            class="input"
            type="text"
            placeholder="Article"
            aria-label="Article"
            required
          />
          <input
            v-model="newItemQty"
            class="input"
            type="text"
            placeholder="Qté"
            aria-label="Quantité"
          />
        </div>
        <p v-if="addDialogError" class="error" role="alert">{{ addDialogError }}</p>
        <button class="btn" type="submit">Ajouter</button>
      </form>
    </dialog>
  </main>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick, watch } from 'vue'

const route = useRoute()
const id = computed(() => route.params.id)

const list = ref(null)
const error = ref('')
const pseudoDialog = ref(null)

const tones = ['#C0321F', '#5B3A6E', '#2F7D4F', '#2A6F97', '#8A560B']

const doneCount = computed(() =>
  list.value
    ? list.value.sections.reduce((n, s) => n + s.items.filter(i => i.checked).length, 0)
    : 0
)
const totalCount = computed(() =>
  list.value ? list.value.sections.reduce((n, s) => n + s.items.length, 0) : 0
)
const percent = computed(() =>
  totalCount.value ? Math.round((doneCount.value / totalCount.value) * 100) : 0
)
const namedSections = computed(() =>
  list.value ? [...new Set(list.value.sections.map(s => s.name).filter(Boolean))] : []
)

// Pseudo
const pseudo = ref('')
const pseudoInput = ref('')

// New item form
const newItemSection = ref('')
const newItemText = ref('')
const newItemQty = ref('')

// Ajout d'article : popup quand le bloc inline est hors du viewport
const addFormInline = ref(null) // <article> inline, cible de l'observation
const addFab = ref(null)
const addDialog = ref(null)
const addDialogError = ref('')
const addOpen = ref(false) // popup ouverte → masque le bouton flottant
// Départ à true : pas de flash du bouton sur une page courte ; l'observer recadre dès la 1re frame
const inlineFormVisible = ref(true)
let addSectionObserver = null

const fabVisible = computed(
  () => Boolean(list.value && addFormInline.value && !inlineFormVisible.value && !addOpen.value)
)

// Un seul IntersectionObserver sur le bloc inline : pas de recalcul au scroll (pas de listener scroll).
// watching le template ref couvre le montage/démontage quand la liste (re)charge via v-if="list".
watch(addFormInline, (el) => {
  addSectionObserver?.disconnect()
  addSectionObserver = null
  if (!el) return
  addSectionObserver = new IntersectionObserver(
    (entries) => {
      inlineFormVisible.value = entries[entries.length - 1].isIntersecting
    },
    { threshold: 0 }
  )
  addSectionObserver.observe(el)
})

function openAddDialog() {
  addDialogError.value = ''
  addOpen.value = true
  addDialog.value?.showModal()
  addDialog.value?.querySelector('input')?.focus()
}

function closeAddDialog() {
  addDialog.value?.close()
}

onMounted(() => {
  pseudo.value = localStorage.getItem('listify-pseudo') || ''
  pseudoInput.value = pseudo.value
  fetchList()
})

onUnmounted(() => {
  addSectionObserver?.disconnect()
})

// Show pseudo modal if not set yet, after list is loaded
watch(list, (val) => {
  if (val && !pseudo.value) {
    pseudoDialog.value?.showModal()
  }
})

watch(() => route.params.id, fetchList)

async function fetchList() {
  error.value = ''
  list.value = null
  try {
    list.value = await $fetch(`/api/lists/${id.value}`)
  } catch (e) {
    if (e.response?.status === 404) {
      error.value = 'Cette liste n\'existe pas. Vérifie le lien.'
    } else {
      error.value = 'Erreur de chargement'
    }
  }
}

async function patchList(body) {
  try {
    list.value = await $fetch(`/api/lists/${id.value}`, {
      method: 'PATCH',
      body
    })
  } catch (e) {
    error.value = 'Erreur de mise à jour'
  }
}

async function toggleItem(si, ii) {
  await patchList({ action: 'toggle', sectionIndex: si, itemIndex: ii })
}

async function updateQty(si, ii, qty) {
  await patchList({ action: 'qty', sectionIndex: si, itemIndex: ii, value: qty })
}

async function toggleAssign(si, ii) {
  if (!pseudo.value) {
    pseudoDialog.value?.showModal()
    return
  }
  await patchList({ action: 'assign', sectionIndex: si, itemIndex: ii, value: pseudo.value })
}

function confirmPseudo() {
  const p = pseudoInput.value.trim()
  if (!p) return
  pseudo.value = p
  localStorage.setItem('listify-pseudo', p)
  pseudoDialog.value?.close()
}

async function deleteItem(si, ii) {
  if (!confirm('Supprimer cet article ?')) return
  await patchList({ action: 'delete', sectionIndex: si, itemIndex: ii })
}

async function addItem() {
  if (!newItemText.value.trim()) return
  await patchList({
    action: 'add',
    sectionName: newItemSection.value,
    text: newItemText.value.trim(),
    qty: newItemQty.value.trim()
  })
  newItemText.value = ''
  newItemQty.value = ''
}

// Soumission depuis la popup : mêmes refs, fermeture + focus retour au « + » si l'ajout passe
async function submitAddDialog() {
  addDialogError.value = ''
  error.value = ''
  await addItem()
  if (error.value) {
    addDialogError.value = 'Impossible d’ajouter. Réessaie.'
    return
  }
  addDialog.value?.close()
  addOpen.value = false
  nextTick(() => addFab.value?.focus())
}

function setPseudo() {
  pseudo.value = pseudoInput.value.trim()
  localStorage.setItem('listify-pseudo', pseudo.value)
}

function copyLink() {
  navigator.clipboard.writeText(window.location.href)
    .then(() => alert('Lien copié !'))
    .catch(() => alert('Impossible de copier'))
}

function exportMd() {
  if (!list.value) return
  let md = `# ${list.value.title}\nUUID: ${id.value}\n\n`
  for (const section of list.value.sections) {
    if (section.name) md += `## ${section.name}\n`
    for (const item of section.items) {
      const check = item.checked ? '[x]' : '[ ]'
      let line = `- ${check} ${item.text}`
      if (item.qty) line += ` × ${item.qty}`
      if (item.assign) line += ` ← ${item.assign}`
      md += line + '\n'
    }
    md += '\n'
  }
  const blob = new Blob([md], { type: 'text/markdown' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${list.value.title || 'liste'}.md`
  a.click()
  URL.revokeObjectURL(url)
}
</script>

<style scoped>
/* ==========================================================================
   Bouton flottant « + » — visible quand le bloc d'ajout est hors du viewport
   ========================================================================== */
.fab-add {
  position: fixed;
  right: clamp(0.9rem, 4vw, 2rem);
  bottom: calc(clamp(0.9rem, 4vw, 1.6rem) + env(safe-area-inset-bottom, 0px));
  z-index: 40;
  width: 3.5rem;
  height: 3.5rem;
  display: grid;
  place-items: center;
  padding: 0;
  border: 2px solid var(--encre);
  border-radius: 999px;
  background: var(--tomate);
  color: var(--papier);
  cursor: pointer;
  box-shadow: 4px 4px 0 var(--encre), 0 12px 24px rgba(22, 35, 61, 0.28);
  transition: transform 0.12s ease, box-shadow 0.12s ease;
}
.fab-add svg {
  width: 1.7rem;
  height: 1.7rem;
}
.fab-add:hover {
  transform: translate(-1px, -2px) rotate(-4deg);
  box-shadow: 6px 7px 0 var(--encre), 0 14px 26px rgba(22, 35, 61, 0.3);
}
.fab-add:active {
  transform: translate(2px, 2px) rotate(0deg);
  box-shadow: 1px 1px 0 var(--encre), 0 6px 14px rgba(22, 35, 61, 0.26);
}
.fab-add:focus-visible {
  outline: 3px solid var(--encre);
  outline-offset: 2px;
}

/* Réserve basse permanente : la dernière ligne ne peut jamais rester coincée
   sous le « + », quel que soit le scroll (inconditionnelle → zéro saut de layout) */
.list-page {
  padding-bottom: calc(3.5rem + clamp(0.9rem, 4vw, 1.6rem) + 0.6rem + env(safe-area-inset-bottom, 0px));
}

/* Mobile : gouttière permanente à droite sous le « + » : la boîte meta reste
   épinglée à droite (margin-left: auto) mais reculée de la zone du FAB → les
   contrôles (.stamp/.claim/.trash/.qty) glissent à gauche et ne passent jamais
   sous le bouton, à chaque position de scroll, sans padding conditionnel.
   (max-width sur .meta ne suffirait pas : la boîte resterait épinglée à droite
   et le .stamp se tronquerait plutôt que de se décaler.) */
@media (max-width: 640px) {
  .item .meta {
    margin-right: 3.25rem;
  }
  .fab-add {
    width: 3.1rem;
    height: 3.1rem;
  }
  .fab-add svg {
    width: 1.45rem;
    height: 1.45rem;
  }
}

/* ==========================================================================
   Popup « Ajouter un article » — centrée sur desktop, bottom sheet sur mobile
   ========================================================================== */
.add-dialog {
  max-width: min(92vw, 22rem);
}
.add-dialog .etal-body {
  gap: 0.85rem;
  padding-top: 0.9rem;
}
.add-dialog-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.55rem 0.85rem;
  border-bottom: 2px solid var(--encre);
  background: var(--papier-2);
  border-radius: var(--radius) var(--radius) 0 0;
  font-family: var(--display);
  font-weight: 700;
  font-size: 0.82rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}
.add-dialog .error {
  padding: 0;
}
.add-dialog[open] {
  animation: add-dialog-pop 0.18s ease-out;
}
@keyframes add-dialog-pop {
  from {
    opacity: 0;
    transform: translateY(12px) scale(0.97);
  }
}

/* Mobile : bottom sheet ancrée en bas, pleine largeur, coins arrondis en haut */
@media (max-width: 640px) {
  .add-dialog {
    margin: 0;
    inset: auto 0 0 0;
    width: 100%;
    max-width: none;
    max-height: 92dvh;
    overflow-y: auto;
    border-bottom: 0;
    border-radius: var(--radius) var(--radius) 0 0;
  }
  .add-dialog[open] {
    animation: add-sheet-up 0.24s cubic-bezier(0.2, 0.8, 0.3, 1);
  }
  .add-dialog .etal-body {
    padding-bottom: calc(1.05rem + env(safe-area-inset-bottom, 0px));
  }
}
@keyframes add-sheet-up {
  from {
    transform: translateY(100%);
  }
}
</style>
