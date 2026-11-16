import { v4 as uuidv4 } from 'uuid'
import { createList } from '../../utils/lists'
import { getSessionUser } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const title = body?.title || 'Liste de courses'

  const id = uuidv4()

  const list = {
    uuid: id,
    title,
    sections: body?.items
      ? [{ name: '', items: body.items }]
      : []
  }

  const user = getSessionUser(event)
  createList(list, user?.id ?? null)

  return { id, url: `/list/${id}` }
})
