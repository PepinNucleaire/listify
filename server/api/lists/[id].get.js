import { getList, touchVisit } from '../../utils/lists'
import { getSessionUser } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')

  const list = getList(id)

  if (!list || !list.uuid) {
    throw createError({ statusCode: 404, message: 'Liste introuvable' })
  }

  const user = getSessionUser(event)
  if (user) {
    touchVisit(list.uuid, user.id)
  }

  return list
})
