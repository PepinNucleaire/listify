import { randomUUID } from 'node:crypto'
import { getDb } from '../../utils/db'
import {
  createSession,
  findUserByEmail,
  hashPassword,
  isValidEmail,
  normalizeEmail,
  rateLimit,
  setSessionCookie
} from '../../utils/auth'

export default defineEventHandler(async (event) => {
  rateLimit(event, 'register')

  const body = await readBody(event)
  const email = normalizeEmail(body?.email)
  const password = String(body?.password || '')

  if (!isValidEmail(email)) {
    throw createError({ statusCode: 400, message: 'Adresse email invalide' })
  }
  if (password.length < 8) {
    throw createError({ statusCode: 400, message: 'Le mot de passe doit contenir au moins 8 caractères' })
  }

  if (findUserByEmail(email)) {
    throw createError({ statusCode: 409, message: 'Email déjà utilisé' })
  }

  const id = randomUUID()
  getDb()
    .prepare('INSERT INTO users (id, email, password_hash, created_at) VALUES (?, ?, ?, ?)')
    .run(id, email, hashPassword(password), new Date().toISOString())

  const session = createSession(id)
  setSessionCookie(event, session.token, session.expiresAt)

  return { user: { id, email, pseudo: '' } }
})
