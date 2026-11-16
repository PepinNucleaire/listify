import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import { getCookie, setCookie, deleteCookie, getRequestIP, createError } from 'h3'
import { getDb } from './db.js'

/**
 * Auth « maison » : comptes email + mot de passe (scrypt), sessions en base
 * exposées via un cookie httpOnly. Zéro dépendance npm.
 *
 * Le cookie n'a volontairement PAS de flag `Secure` : l'app est accessible en
 * HTTP simple sur le LAN, où un cookie Secure serait systématiquement rejeté.
 * SameSite=Lax + mutations exclusivement en POST/PATCH couvrent le CSRF pour
 * ce threat model.
 */

export const SESSION_COOKIE = 'listify_session'
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000 // 30 jours

// ---------------------------------------------------------------------------
// Mots de passe — « scrypt:<salt-hex>:<hash-hex> »
// ---------------------------------------------------------------------------

export function hashPassword(password) {
  const salt = randomBytes(16)
  const hash = scryptSync(password, salt, 64)
  return `scrypt:${salt.toString('hex')}:${hash.toString('hex')}`
}

export function verifyPassword(password, stored) {
  const parts = String(stored || '').split(':')
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false
  const expected = Buffer.from(parts[2], 'hex')
  const actual = scryptSync(password, Buffer.from(parts[1], 'hex'), expected.length)
  return expected.length === actual.length && timingSafeEqual(expected, actual)
}

// ---------------------------------------------------------------------------
// Comptes
// ---------------------------------------------------------------------------

export function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase()
}

export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export function findUserByEmail(email) {
  return getDb().prepare('SELECT * FROM users WHERE email = ?').get(normalizeEmail(email))
}

// ---------------------------------------------------------------------------
// Sessions
// ---------------------------------------------------------------------------

export function createSession(userId) {
  const token = randomBytes(32).toString('hex')
  const now = new Date()
  const expiresAt = new Date(now.getTime() + SESSION_TTL_MS)
  getDb()
    .prepare('INSERT INTO sessions (token, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)')
    .run(token, userId, expiresAt.toISOString(), now.toISOString())
  return { token, expiresAt }
}

export function setSessionCookie(event, token, expiresAt) {
  setCookie(event, SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    expires: expiresAt
  })
}

export function clearSessionCookie(event) {
  deleteCookie(event, SESSION_COOKIE, { path: '/' })
}

/**
 * Utilisateur de la requête d'après le cookie de session, ou null.
 * Une session expirée est supprimée à la volée.
 */
export function getSessionUser(event) {
  const token = getCookie(event, SESSION_COOKIE)
  if (!token) return null

  const row = getDb()
    .prepare(`
      SELECT users.id, users.email, users.pseudo, sessions.expires_at
      FROM sessions
      JOIN users ON users.id = sessions.user_id
      WHERE sessions.token = ?
    `)
    .get(token)

  if (!row) return null

  if (row.expires_at <= new Date().toISOString()) {
    getDb().prepare('DELETE FROM sessions WHERE token = ?').run(token)
    return null
  }

  return { id: row.id, email: row.email, pseudo: row.pseudo || '' }
}

export function destroySession(event) {
  const token = getCookie(event, SESSION_COOKIE)
  if (token) {
    getDb().prepare('DELETE FROM sessions WHERE token = ?').run(token)
  }
  clearSessionCookie(event)
}

// ---------------------------------------------------------------------------
// Rate-limit best-effort, en mémoire (une seule instance Nitro)
// ---------------------------------------------------------------------------

const WINDOW_MS = 15 * 60 * 1000
const MAX_ATTEMPTS = 20
const attempts = new Map() // clé → { count, resetAt }

export function rateLimit(event, scope) {
  const ip = getRequestIP(event, { xForwardedFor: true }) || 'local'
  const key = `${scope}:${ip}`
  const now = Date.now()

  let entry = attempts.get(key)
  if (!entry || entry.resetAt <= now) {
    entry = { count: 0, resetAt: now + WINDOW_MS }
    attempts.set(key, entry)
  }
  entry.count += 1

  if (entry.count > MAX_ATTEMPTS) {
    throw createError({ statusCode: 429, message: 'Trop de tentatives, réessayez plus tard' })
  }

  // Ménage occasionnel des vieilles entrées.
  if (attempts.size > 1000) {
    for (const [k, v] of attempts) {
      if (v.resetAt <= now) attempts.delete(k)
    }
  }
}
