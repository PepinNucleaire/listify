<template>
  <main class="home">
    <div class="awning" aria-hidden="true"></div>

    <div class="container">
      <header class="hero">
        <span class="wordmark">Listify</span>
        <p class="tagline">La liste de courses pour le WE entre copains.</p>
      </header>

      <section class="stack">
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

<script setup>
const router = useRouter()
const newTitle = ref('')

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
