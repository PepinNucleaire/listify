/**
 * État de session partagé (comptes optionnels v2).
 * `user` vaut null pour un visiteur anonyme — comportement v1 inchangé.
 */
export function useAuth() {
  const user = useState('listify-user', () => null)

  async function fetchMe() {
    try {
      const res = await $fetch('/api/auth/me')
      user.value = res.user
    } catch {
      user.value = null
    }
  }

  async function register(email, password) {
    const res = await $fetch('/api/auth/register', {
      method: 'POST',
      body: { email, password }
    })
    user.value = res.user
  }

  async function login(email, password) {
    const res = await $fetch('/api/auth/login', {
      method: 'POST',
      body: { email, password }
    })
    user.value = res.user
  }

  async function logout() {
    try {
      await $fetch('/api/auth/logout', { method: 'POST' })
    } finally {
      user.value = null
    }
  }

  return { user, fetchMe, register, login, logout }
}
