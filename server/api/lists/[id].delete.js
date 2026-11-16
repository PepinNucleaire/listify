import { getDb } from '../../utils/db'
import { getSessionUser } from '../../utils/auth'
import { validateId } from '../../utils/markdown'

export default defineEventHandler(async (event) => {
  const user = getSessionUser(event)
  if (!user) {
    throw createError({ statusCode: 401, message: 'Non connecté' })
  }

  const id = getRouterParam(event, 'id')
  if (!validateId(id)) {
    throw createError({ statusCode: 404, message: 'Liste introuvable' })
  }

  const row = getDb().prepare('SELECT owner_user_id FROM lists WHERE id = ?').get(id)
  if (!row) {
    throw createError({ statusCode: 404, message: 'Liste introuvable' })
  }

  // Seul le propriétaire peut supprimer une liste rattachée à un compte.
  if (row.owner_user_id && row.owner_user_id !== user.id) {
    throw createError({ statusCode: 403, message: 'Cette liste ne t\'appartient pas' })
  }

  getDb().prepare('DELETE FROM lists WHERE id = ?').run(id)

  return { deleted: true, id }
})
