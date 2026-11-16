import { getDb } from '../../utils/db'
import { getSessionUser } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const user = getSessionUser(event)
  if (!user) {
    throw createError({ statusCode: 401, message: 'Non connecté' })
  }

  const body = await readBody(event)
  const pseudo = String(body?.pseudo ?? '').trim().slice(0, 40)

  getDb().prepare('UPDATE users SET pseudo = ? WHERE id = ?').run(pseudo, user.id)

  return { user: { ...user, pseudo } }
})
