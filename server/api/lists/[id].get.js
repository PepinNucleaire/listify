import { readListFromDisk, getDataDir } from '../../utils/markdown'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const dataDir = getDataDir()

  const list = readListFromDisk(dataDir, id)

  if (!list || !list.uuid) {
    throw createError({ statusCode: 404, message: 'Liste introuvable' })
  }

  return list
})
