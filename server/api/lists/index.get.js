import { listListsForUser } from '../../utils/lists'
import { getSessionUser } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const user = getSessionUser(event)
  if (!user) {
    throw createError({ statusCode: 401, message: 'Non connecté' })
  }

  return { lists: listListsForUser(user.id) }
})
