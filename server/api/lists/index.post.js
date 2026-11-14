import { v4 as uuidv4 } from 'uuid'
import { writeListToDisk, getDataDir } from '../../utils/markdown'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const title = body?.title || 'Liste de courses'
  const dataDir = getDataDir()

  const id = uuidv4()

  const list = {
    title,
    uuid: id,
    sections: body?.items
      ? [{ name: '', items: body.items }]
      : []
  }

  writeListToDisk(dataDir, list)

  return { id, url: `/list/${id}` }
})
