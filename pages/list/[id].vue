<template>
  <main class="list-page">
    <div class="container">
      <a class="back" href="/">← Accueil</a>

      <header class="list-head">
        <div class="list-title">
          <h1>{{ list?.title || 'Liste' }}</h1>
          <button
            v-if="list && !editingTitle"
            class="chip-btn rename-btn"
            type="button"
            aria-label="Renommer la liste"
            title="Renommer"
            @click="startRename"
          >
            ✎
          </button>
          <div
            v-if="list && totalCount"
            class="progress"
            role="img"
            :aria-label="doneCount + ' pris sur ' + totalCount"
          >
            <span class="bar"><i :style="{ width: percent + '%' }"></i></span>
            <span>{{ doneCount }} pris sur {{ totalCount }}</span>
          </div>

          <!-- Édition inline du titre (renommage) : remplace le <h1> pendant l'édition -->
          <form v-if="editingTitle" class="title-edit" @submit.prevent="submitRename">
            <label class="sr-only" for="rename-title">Nouveau titre de la liste</label>
            <input
              id="rename-title"
              ref="titleEditInput"
              v-model="titleInput"
              class="input title-input"
              type="text"
              maxlength="200"
              :disabled="renaming"
              @blur="onTitleBlur"
              @keydown.esc.prevent="cancelRename"
            />
            <button class="btn" type="submit" :disabled="renaming" @mousedown.prevent>
              {{ renaming ? 'Enregistrement…' : 'Enregistrer' }}
            </button>
            <button
              class="chip-btn"
              type="button"
              :disabled="renaming"
              @mousedown.prevent
              @click="cancelRename"
            >
              Annuler
            </button>
          </form>
        </div>

        <div class="list-actions">
          <button class="chip-btn" type="button" @click="copyLink">Copier le lien</button>
          <button class="chip-btn" type="button" @click="exportMd">Exporter</button>
          <!-- Suppression : réservée aux sessions connectées (401 sinon côté serveur).
               Pour une liste sans propriétaire, tout utilisateur connecté peut la
               supprimer — assumé côté serveur : l'URL reste la capacité d'accès,
               la connexion sert uniquement à tracer la suppression. -->
          <button
            v-if="user && list"
            class="chip-btn delete-list-btn"
            type="button"
            @click="deleteList"
          >
            Supprimer
          </button>
        </div>

        <details class="pseudo">
          <summary>Mon pseudo : <b>{{ pseudo || 'non défini' }}</b></summary>
          <form @submit.prevent="setPseudo">
            <input
              v-model="pseudoInput"
              class="input"
              type="text"
              placeholder="Ton pseudo"
              maxlength="40"
              required
            />
            <button class="btn" type="submit" :disabled="savingPseudo">OK</button>
          </form>
        </details>
      </header>

      <p v-if="error" class="error">{{ error }}</p>
      <p v-if="!list && !error" class="loading">Chargement…</p>

      <template v-if="list">
        <div class="sections">
          <article v-for="(section, si) in list.sections" :key="si" class="etal">
            <div class="band" :style="{ backgroundColor: tones[si % tones.length] }">
              <!-- Renommage du rayon : même pattern que le titre (crayon + édition
                   inline). Masqué sur le rayon par défaut (name === ''), le serveur
                   n'y retouchant pas via renameSection. -->
              <span v-if="editingSectionIndex !== si">{{ section.name || 'Sans rayon' }}</span>
              <button
                v-if="editingSectionIndex !== si && section.name !== ''"
                class="band-rename-btn"
                type="button"
                aria-label="Renommer le rayon"
                title="Renommer"
                @click="startRenameSection(si)"
              >
                ✎
              </button>
              <form v-if="editingSectionIndex === si" class="section-edit" @submit.prevent="submitRenameSection">
                <label class="sr-only" :for="'rename-section-' + si">Nouveau nom du rayon</label>
                <input
                  :id="'rename-section-' + si"
                  :ref="setSectionEditInput"
                  v-model="sectionInput"
                  class="input section-input"
                  type="text"
                  maxlength="100"
                  :disabled="renamingSection"
                  @blur="onSectionBlur"
                  @keydown.esc.prevent="cancelRenameSection"
                />
                <button class="btn" type="submit" :disabled="renamingSection" @mousedown.prevent>
                  {{ renamingSection ? 'Enregistrement…' : 'Enregistrer' }}
                </button>
                <button
                  class="chip-btn"
                  type="button"
                  :disabled="renamingSection"
                  @mousedown.prevent
                  @click="cancelRenameSection"
                >
                  Annuler
                </button>
              </form>
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
                <option value="__nouvelle__">Nouvelle catégorie…</option>
              </select>
              <input
                v-if="newItemSection === NEW_SECTION"
                ref="newSectionNameInline"
                v-model="newSectionName"
                class="input new-section-name"
                type="text"
                placeholder="Nom du nouveau rayon"
                required
                aria-label="Nom du nouveau rayon"
              />
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
            maxlength="40"
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
            <option value="__nouvelle__">Nouvelle catégorie…</option>
          </select>
          <input
            v-if="newItemSection === NEW_SECTION"
            ref="newSectionNamePopup"
            v-model="newSectionName"
            class="input new-section-name"
            type="text"
            placeholder="Nom du nouveau rayon"
            required
            aria-label="Nom du nouveau rayon"
          />
        </div>
        <div class="add-grid">
          <input
            v-model="newItemText"
            class="input"
            type="text"
            id="add-item-popup"
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
const router = useRouter()

// Session (comptes optionnels) : `user.pseudo` est la source de vérité quand
// on est connecté, localStorage sinon (comportement v1 pour l'anonyme).
const { user } = useAuth()

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
const savingPseudo = ref(false)

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
  addDialog.value?.querySelector('#add-item-popup')?.focus()
}

function closeAddDialog() {
  addDialog.value?.close()
}

onMounted(() => {
  // Pseudo : priorité au compte connecté, repli localStorage pour l'anonyme (v1)
  pseudo.value = user.value ? user.value.pseudo || '' : localStorage.getItem('listify-pseudo') || ''
  pseudoInput.value = pseudo.value
  fetchList()
})

onUnmounted(() => {
  addSectionObserver?.disconnect()
})

// Show pseudo modal if not set yet, after list is loaded.
// Choix retenu (le moins intrusif) : le dialog de première visite ne s'ouvre
// QUE pour un visiteur anonyme. Un utilisateur connecté sans pseudo le
// définira via le details « Mon pseudo », qui enregistre côté compte — on
// n'interrompt pas sa navigation avec une modale pour un champ déjà éditable
// dans la page.
watch(list, (val) => {
  if (val && !pseudo.value && !user.value) {
    pseudoDialog.value?.showModal()
  }
})

// Login / logout : recalcul du pseudo.
// Connecté → pseudo du compte ; déconnecté → repli localStorage (jamais
// écrit pendant la session connectée, donc pas de résurrection d'un pseudo
// de compte dans l'anonyme).
watch(user, (u) => {
  pseudo.value = u ? u.pseudo || '' : localStorage.getItem('listify-pseudo') || ''
  pseudoInput.value = pseudo.value
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

// Renommage du titre : édition inline. Entrée/« Enregistrer » → PATCH `rename` ;
// Échap/« Annuler » → abandon ; blur → enregistre seulement si le titre a changé.
// Vide ou inchangé après trim → pas de requête. Le titre affiché vient de
// patchList (server-authoritative) : aucune mutation locale de list.value.
const editingTitle = ref(false)
const renaming = ref(false)
const titleInput = ref('')
const titleEditInput = ref(null)

function startRename() {
  titleInput.value = list.value?.title || ''
  editingTitle.value = true
  nextTick(() => titleEditInput.value?.focus())
}

function cancelRename() {
  if (renaming.value) return
  editingTitle.value = false
  titleInput.value = ''
}

function onTitleBlur() {
  if (!editingTitle.value || renaming.value) return
  submitRename()
}

async function submitRename() {
  if (!editingTitle.value || renaming.value) return
  const next = titleInput.value.trim()
  const current = (list.value?.title || '').trim()
  if (!next || next === current) {
    editingTitle.value = false
    titleInput.value = ''
    return
  }
  renaming.value = true
  error.value = ''
  await patchList({ action: 'rename', value: next })
  // patchList n'écrit dans `error` que si le PATCH a échoué → on précise le contexte
  if (error.value) error.value = 'Erreur lors du renommage'
  renaming.value = false
  editingTitle.value = false
  titleInput.value = ''
}

// Renommage de rayon : même pattern que le titre (crayon + édition inline).
// Les rayons sont adressés par `sectionIndex` : le serveur ne change que
// `section.name`, l'ordre et les index restent stables après un renommage.
// Vide ou inchangé après trim → pas de requête ; blur n'enregistre que si changé.
const editingSectionIndex = ref(-1)
const renamingSection = ref(false)
const sectionInput = ref('')
const sectionEditInput = ref(null)

// Ref fonction : un string ref dans un v-for serait collecté en tableau —
// une seule édition ouverte à la fois, on garde un simple ref unique.
function setSectionEditInput(el) {
  sectionEditInput.value = el
}

function startRenameSection(si) {
  sectionInput.value = list.value?.sections[si]?.name || ''
  editingSectionIndex.value = si
  nextTick(() => sectionEditInput.value?.focus())
}

function cancelRenameSection() {
  if (renamingSection.value) return
  editingSectionIndex.value = -1
  sectionInput.value = ''
}

function onSectionBlur() {
  if (editingSectionIndex.value < 0 || renamingSection.value) return
  submitRenameSection()
}

async function submitRenameSection() {
  const si = editingSectionIndex.value
  if (si < 0 || renamingSection.value) return
  const next = sectionInput.value.trim()
  const current = (list.value?.sections[si]?.name || '').trim()
  if (!next || next === current) {
    editingSectionIndex.value = -1
    sectionInput.value = ''
    return
  }
  renamingSection.value = true
  error.value = ''
  await patchList({ action: 'renameSection', sectionIndex: si, value: next })
  // patchList n'écrit dans `error` que si le PATCH a échoué → on précise le contexte
  if (error.value) error.value = 'Erreur lors du renommage du rayon'
  renamingSection.value = false
  editingSectionIndex.value = -1
  sectionInput.value = ''
}

// Rayon « Nouvelle catégorie… » : sentinelle du select → saisie libre du nom.
// Les deux formulaires (inline + popup) partagent newItemSection (le select) et
// newSectionName (le champ texte) : l'état « nouvelle catégorie » est commun.
const NEW_SECTION = '__nouvelle__'
const newSectionName = ref('')
const newSectionNameInline = ref(null)
const newSectionNamePopup = ref(null)

// Apparition du champ nom → focus auto (celui du formulaire visible : popup si ouverte)
watch(newItemSection, (v) => {
  if (v !== NEW_SECTION) return
  nextTick(() => {
    const el = addOpen.value ? newSectionNamePopup.value : newSectionNameInline.value
    el?.focus()
  })
})

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

async function confirmPseudo() {
  const p = pseudoInput.value.trim()
  if (!p || savingPseudo.value) return
  // Le dialog suit la session : connecté → côté compte, anonyme → localStorage
  const ok = await savePseudo(p)
  pseudoInput.value = pseudo.value
  if (ok) pseudoDialog.value?.close()
}

async function deleteItem(si, ii) {
  if (!confirm('Supprimer cet article ?')) return
  await patchList({ action: 'delete', sectionIndex: si, itemIndex: ii })
}

async function addItem() {
  if (!newItemText.value.trim()) return
  const sectionName =
    newItemSection.value === NEW_SECTION ? newSectionName.value.trim() : newItemSection.value
  await patchList({
    action: 'add',
    sectionName,
    text: newItemText.value.trim(),
    qty: newItemQty.value.trim()
  })
  newItemText.value = ''
  newItemQty.value = ''
  // Sentinelle « Nouvelle catégorie… » : reset du select et du nom saisi, sinon
  // l'état « nouvelle catégorie » resterait collé à l'ajout suivant
  if (newItemSection.value === NEW_SECTION) {
    newItemSection.value = ''
    newSectionName.value = ''
  }
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

// Enregistrement du pseudo, partagé par le details « Mon pseudo » (setPseudo)
// et le dialog de première visite (confirmPseudo).
// Connecté → POST /api/auth/pseudo (route réelle : server/api/auth/pseudo.post.js,
// method POST ; le pseudo est alors partagé entre appareils via user.value.pseudo,
// et localStorage n'est PAS touché — à la déconnexion on retombe sur l'anonyme).
// Anonyme → localStorage, comportement v1 inchangé.
async function savePseudo(p) {
  if (user.value) {
    savingPseudo.value = true
    try {
      const res = await $fetch('/api/auth/pseudo', { method: 'POST', body: { pseudo: p } })
      user.value = res.user
      // Le serveur trim/slice(40) : on reprend sa valeur, source de vérité
      pseudo.value = user.value.pseudo || ''
      error.value = ''
      return true
    } catch {
      error.value = 'Impossible d’enregistrer le pseudo'
      return false
    } finally {
      savingPseudo.value = false
    }
  }
  pseudo.value = p
  localStorage.setItem('listify-pseudo', p)
  return true
}

async function setPseudo() {
  const p = pseudoInput.value.trim()
  if (!p || savingPseudo.value) return
  await savePseudo(p)
  pseudoInput.value = pseudo.value
}

function copyLink() {
  navigator.clipboard.writeText(window.location.href)
    .then(() => alert('Lien copié !'))
    .catch(() => alert('Impossible de copier'))
}

// Suppression de liste : visible seulement connecté (bouton v-if="user && list").
// DELETE /api/lists/:id → 401 si anonyme, 403 si la liste appartient à un autre
// compte ; une liste anonyme (sans propriétaire) est supprimable par tout
// utilisateur connecté — assumé côté serveur : l'URL reste la capacité d'accès,
// la connexion sert à tracer qui supprime.
async function deleteList() {
  if (!confirm('Supprimer définitivement cette liste ?')) return
  try {
    await $fetch(`/api/lists/${id.value}`, { method: 'DELETE' })
    await router.push('/')
  } catch (e) {
    if (e.response?.status === 403) {
      error.value = 'Cette liste ne t’appartient pas.'
    } else if (e.response?.status === 401) {
      error.value = 'Connecte-toi pour supprimer cette liste.'
    } else {
      error.value = 'Erreur lors de la suppression'
    }
  }
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

/* ==========================================================================
   Renommage du titre — crayon + édition inline
   ========================================================================== */
.rename-btn {
  /* Le crayon reste collé au <h1> : l'espace libre du flex est absorbé ici
     (au lieu du `space-between`), la barre de progression reste à droite */
  margin-left: 0.35rem;
  margin-right: auto;
  align-self: center;
  padding: 0.4rem 0.7rem;
  min-width: 2.5rem;
  min-height: 2.5rem; /* zone de tactile ≥ 40px */
  line-height: 1;
  font-size: 1rem;
}
.rename-btn:focus-visible {
  outline: 3px solid var(--encre);
  outline-offset: 2px;
}

/* Édition : input harmonisé avec le <h1> (police display, encre, gabarit proche) */
.title-edit {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}
.title-input {
  flex: 1 1 10rem;
  min-width: 0;
  width: auto;
  font-family: var(--display);
  font-weight: 800;
  font-size: clamp(1.15rem, 5vw, 1.6rem);
  letter-spacing: -0.02em;
  color: var(--encre);
  padding: 0.25rem 0.55rem;
}
.title-edit .btn,
.title-edit .chip-btn {
  flex: none;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* Saisie du nom d'un nouveau rayon : léger retrait sous le select « Rayon »,
   aligné sur le champ (tokens/classes Marché, rien de plus) */
.new-section-name {
  margin-top: 0.4rem;
  margin-left: 0.85rem;
  width: calc(100% - 0.85rem);
}

/* ==========================================================================
   Renommage de rayon — crayon discret sur le band + édition inline
   ========================================================================== */
.band-rename-btn {
  margin-left: auto; /* collé à droite du band, après le nom */
  flex: none;
  padding: 0.3rem 0.55rem;
  min-width: 2.2rem;
  min-height: 2.2rem; /* zone de tactile ≥ 35px */
  line-height: 1;
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--papier);
  background: transparent;
  border: 2px solid currentColor;
  border-radius: 999px;
  cursor: pointer;
  opacity: 0.65;
  transition: opacity 0.12s ease, background-color 0.12s ease;
}
.band-rename-btn:hover {
  opacity: 1;
  background: rgba(255, 255, 255, 0.14);
}
.band-rename-btn:focus-visible {
  outline: 3px solid var(--papier);
  outline-offset: 2px;
}

/* Édition inline du nom : même gabarit que l'édition du titre, adapté au band
   (input blanc sur le ton du rayon, police display, capitales) */
.section-edit {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex-wrap: wrap;
}
.section-input {
  flex: 1 1 8rem;
  min-width: 0;
  width: auto;
  padding: 0.25rem 0.5rem;
  font-family: var(--display);
  font-weight: 700;
  font-size: 0.85rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--encre);
}
.section-edit .btn,
.section-edit .chip-btn {
  flex: none;
}

/* ==========================================================================
   Suppression de liste — chip destructif (ton tomate, hover plein)
   ========================================================================== */
.delete-list-btn {
  color: var(--tomate);
  border-color: var(--tomate);
}
.delete-list-btn:hover {
  background: var(--tomate);
  color: var(--papier);
}
</style>
