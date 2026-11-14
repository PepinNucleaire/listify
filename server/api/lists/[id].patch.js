import { readListFromDisk, writeListToDisk, getDataDir } from '../../utils/markdown'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const body = await readBody(event)
  const dataDir = getDataDir()

  const list = readListFromDisk(dataDir, id)
  if (!list || !list.uuid) {
    throw createError({ statusCode: 404, message: 'Liste introuvable' })
  }

  const { action, sectionIndex, itemIndex, value } = body

  if (action === 'toggle') {
    const item = list.sections[sectionIndex]?.items[itemIndex]
    if (item) item.checked = !item.checked
  } else if (action === 'assign') {
    const item = list.sections[sectionIndex]?.items[itemIndex]
    if (item) {
      if (item.assign === value) {
        item.assign = ''
      } else {
        item.assign = value
      }
    }
  } else if (action === 'qty') {
    const item = list.sections[sectionIndex]?.items[itemIndex]
    if (item) item.qty = value
  } else if (action === 'text') {
    const item = list.sections[sectionIndex]?.items[itemIndex]
    if (item) item.text = value
  } else if (action === 'add') {
    const { sectionName, text, qty } = body
    let section = list.sections.find(s => s.name === sectionName)
    if (!section) {
      section = { name: sectionName, items: [] }
      list.sections.push(section)
    }
    section.items.push({ text, checked: false, qty: qty || '', assign: '' })
  } else if (action === 'delete') {
    list.sections[sectionIndex]?.items.splice(itemIndex, 1)
    list.sections = list.sections.filter(s => s.items.length > 0)
  }

  writeListToDisk(dataDir, list)

  return list
})
