import { v4 as uuidv4 } from 'uuid'
import { parseMarkdown, writeListToDisk, getDataDir, validateId } from '../../utils/markdown'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const content = body?.content

  if (!content) {
    throw createError({ statusCode: 400, message: 'Contenu markdown requis' })
  }

  const dataDir = getDataDir()

  const parsed = parseMarkdown(content)

  // Validate or generate UUID
  const id = (parsed.uuid && validateId(parsed.uuid)) ? parsed.uuid : uuidv4()
  parsed.uuid = id

  if (!parsed.title) {
    parsed.title = 'Liste importée'
  }

  writeListToDisk(dataDir, parsed)

  return { id, url: `/list/${id}` }
})
