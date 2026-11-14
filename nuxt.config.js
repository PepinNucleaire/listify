export default defineNuxtConfig({
  compatibilityDate: '2026-06-07',
  app: {
    head: {
      title: 'Listify — Liste de courses'
    }
  },
  nitro: {
    output: {
      dir: 'output'
    }
  },
  runtimeConfig: {
    listify: {
      dataDir: ''
    }
  }
})
