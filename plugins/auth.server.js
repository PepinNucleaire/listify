import { getSessionUser } from '../server/utils/auth'

/**
 * Résout la session au premier rendu serveur : l'état `listify-user` est
 * hydraté avec l'utilisateur du cookie, donc le SSR affiche directement la
 * bonne barre de compte (connecté ou anonyme) — plus de flash anonyme.
 *
 * `useState` est appelé ici (et non `payload.state[...] = ...`) pour que
 * l'état soit créé au bon moment et sérialisé dans le payload SSR.
 */
export default defineNuxtPlugin((nuxtApp) => {
  const event = nuxtApp.ssrContext?.event
  if (!event) return

  const user = useState('listify-user', () => null)
  user.value = getSessionUser(event) ?? null
})
