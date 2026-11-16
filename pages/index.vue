<template>
  <main class="home">
    <div class="awning" aria-hidden="true"></div>

    <div class="container">
      <header class="hero">
        <span class="wordmark">Listify</span>
        <p class="tagline">La liste de courses pour le WE entre copains.</p>
      </header>

      <section class="stack">
        <!-- Mes listes (comptes optionnels, uniquement si connecté) -->
        <article v-if="user" class="etal">
          <div class="etal-head">
            <span>Mes listes</span>
            <span class="tone tone-bleu" aria-hidden="true"></span>
          </div>
          <div class="etal-body">
            <p v-if="listsLoading" class="hint">Chargement…</p>
            <template v-else>
              <p v-if="!lists.length" class="listes-vide">
                Aucune liste pour l'instant. Crée la première ci-dessous.
              </p>
              <ul v-else class="listes">
                <li v-for="l in lists" :key="l.id" class="liste-row">
                  <NuxtLink class="liste-titre" :to="`/list/${l.id}`">{{ l.title }}</NuxtLink>
                  <span
                    class="stamp stamp-static"
                    :class="l.origin === 'created' ? 'stamp-created' : 'stamp-visited'"
                  >
                    {{ l.origin === 'created' ? 'créée' : 'visitée' }}
                  </span>
                  <span class="liste-date">{{ relativeDate(l.lastVisited || l.updatedAt) }}</span>
                </li>
              </ul>
            </template>
          </div>
        </article>

        <!-- Create new list -->
        <article class="etal">
          <div class="etal-head">
            <span>Nouvelle liste</span>
            <span class="tone tone-tomate" aria-hidden="true"></span>
          </div>
          <form class="etal-body" @submit.prevent="createList">
            <div class="field">
              <label for="new-title">Titre de la liste</label>
              <input
                id="new-title"
                v-model="newTitle"
                class="input"
                type="text"
                placeholder="Ex : WE à la mer"
                required
              />
            </div>
            <button class="btn" type="submit" :disabled="loading">
              {{ loading ? 'Création…' : 'Créer' }}
            </button>
          </form>
        </article>

        <!-- Import list -->
        <article class="etal">
          <div class="etal-head">
            <span>Importer une liste</span>
            <span class="tone tone-aubergine" aria-hidden="true"></span>
          </div>
          <form class="etal-body" @submit.prevent="importList">
            <div class="field">
              <div class="field-head">
                <label for="import-md">Contenu markdown</label>
                <button
                  v-if="importContent"
                  class="clear-btn"
                  type="button"
                  title="Effacer"
                  aria-label="Effacer le contenu"
                  @click="clearImport"
                >
                  ✕
                </button>
              </div>
              <textarea
                id="import-md"
                v-model="importContent"
                class="input"
                rows="6"
                placeholder="Colle le contenu markdown de ta liste ici…"
                required
              ></textarea>
            </div>
            <div class="file-row">
              <input
                type="file"
                accept=".md,.markdown,.txt"
                @change="handleFile"
              />
              <span class="hint">…ou choisis un fichier</span>
            </div>
            <button class="btn ghost" type="submit" :disabled="loadingImport">
              {{ loadingImport ? 'Import…' : 'Importer' }}
            </button>
          </form>
        </article>

        <p v-if="error" class="error">{{ error }}</p>
      </section>
    </div>
  </main>
</template>

<style scoped>
.listes {
  list-style: none;
  margin: 0;
  padding: 0;
}

.liste-row {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  flex-wrap: wrap;
  padding: 0.5rem 0.15rem;
}
.liste-row + .liste-row {
  border-top: 1px dashed var(--ink-faint);
}

.liste-titre {
  flex: 1 1 8rem;
  min-width: 6rem;
  font-weight: 700;
  text-decoration: none;
  overflow-wrap: anywhere;
}
.liste-titre:hover {
  color: var(--tomate);
}

.liste-row .stamp {
  cursor: default;
  transform: rotate(-2deg);
  flex: none;
}
.stamp-created {
  color: var(--tomate);
  border-color: var(--tomate);
  box-shadow: inset 0 0 0 1.5px var(--tomate);
}
.stamp-visited {
  color: var(--bleu);
  border-color: var(--bleu);
  box-shadow: inset 0 0 0 1.5px var(--bleu);
}

.liste-date {
  margin-left: auto;
  font-size: 0.75rem;
  color: var(--ink-soft);
  white-space: nowrap;
}

.listes-vide {
  color: var(--ink-soft);
  font-weight: 700;
}
</style>

<script setup>
const router = useRouter()
const { user } = useAuth()
const newTitle = ref('')

const lists = ref([])
const listsLoading = ref(false)

watch(
  user,
  async (u) => {
    if (u) {
      listsLoading.value = true
      try {
        const res = await $fetch('/api/lists')
        lists.value = res.lists || []
      } catch {
        // 401 (non connecté) ou erreur réseau : on ignore silencieusement
        lists.value = []
      } finally {
        listsLoading.value = false
      }
    } else {
      lists.value = []
    }
  },
  { immediate: true }
)

const rtf = new Intl.RelativeTimeFormat('fr', { numeric: 'auto' })

function relativeDate(iso) {
  if (!iso) return '—'
  const diffSec = Math.round((new Date(iso).getTime() - Date.now()) / 1000)
  const abs = Math.abs(diffSec)
  if (abs < 60) return "à l'instant"
  if (abs < 3600) return rtf.format(Math.round(diffSec / 60), 'minute')
  if (abs < 86400) return rtf.format(Math.round(diffSec / 3600), 'hour')
  if (abs < 604800) return rtf.format(Math.round(diffSec / 86400), 'day')
  if (abs < 2629800) return rtf.format(Math.round(diffSec / 604800), 'week')
  if (abs < 31557600) return rtf.format(Math.round(diffSec / 2629800), 'month')
  return rtf.format(Math.round(diffSec / 31557600), 'year')
}

const EXAMPLE_LIST = `# WE à la mer

## Apéro
- [ ] Bières × 2 packs de 24
- [ ] Chips × 3 grands sachets
- [ ] Glaçons × 2 sacs

## Grillades
- [ ] Merguez × 2 kg
- [ ] Brochettes de bœuf × 12
- [ ] Charbon de bois × 1 sac

## Petit déj
- [ ] Œufs × 2 douzaines
- [ ] Pain de mie × 3 paquets
- [ ] Café moulu × 500 g`

const importContent = ref(EXAMPLE_LIST)
const loading = ref(false)
const loadingImport = ref(false)
const error = ref('')

function clearImport() {
  importContent.value = ''
}

async function createList() {
  loading.value = true
  error.value = ''
  try {
    const res = await $fetch('/api/lists', {
      method: 'POST',
      body: { title: newTitle.value }
    })
    router.push(res.url)
  } catch (e) {
    error.value = 'Erreur lors de la création'
  } finally {
    loading.value = false
  }
}

function handleFile(e) {
  const file = e.target.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    importContent.value = reader.result
  }
  reader.readAsText(file)
}

async function importList() {
  if (!importContent.value.trim()) return
  loadingImport.value = true
  error.value = ''
  try {
    const res = await $fetch('/api/lists/import', {
      method: 'POST',
      body: { content: importContent.value }
    })
    router.push(res.url)
  } catch (e) {
    error.value = 'Erreur lors de l\'import'
  } finally {
    loadingImport.value = false
  }
}
</script>
