import { v4 as uuidv4 } from 'uuid'
import { createList } from '../../utils/lists'
import { getSessionUser } from '../../utils/auth'
import { parseMarkdown, validateId } from '../../utils/markdown'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const content = body?.content

  if (!content) {
    throw createError({ statusCode: 400, message: 'Contenu markdown requis' })
  }

  const parsed = parseMarkdown(content)

  // Validate or generate UUID
  const id = (parsed.uuid && validateId(parsed.uuid)) ? parsed.uuid : uuidv4()
  parsed.uuid = id

  if (!parsed.title) {
    parsed.title = 'Liste importée'
  }

  const user = getSessionUser(event)
  createList(parsed, user?.id ?? null)

  return { id, url: `/list/${id}` }
})
