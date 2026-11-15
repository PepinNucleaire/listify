import {
  createSession,
  findUserByEmail,
  normalizeEmail,
  rateLimit,
  setSessionCookie,
  verifyPassword
} from '../../utils/auth'

export default defineEventHandler(async (event) => {
  rateLimit(event, 'login')

  const body = await readBody(event)
  const email = normalizeEmail(body?.email)
  const password = String(body?.password || '')

  const user = findUserByEmail(email)
  // Message générique : pas de divulgation de l'existence d'un compte.
  if (!user || !verifyPassword(password, user.password_hash)) {
    throw createError({ statusCode: 401, message: 'Identifiants invalides' })
  }

  const session = createSession(user.id)
  setSessionCookie(event, session.token, session.expiresAt)

  return { user: { id: user.id, email: user.email } }
})
