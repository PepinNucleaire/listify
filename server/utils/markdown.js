/**
 * Parse markdown list content into structured data.
 *
 * Format:
 * ```
 * # Title
 * UUID: abc-123
 *
 * ## Section Name
 * - [ ] Item Name × Qty ← Pseudo
 * - [x] Item Name ← Pseudo1 & Pseudo2
 * ```
 */
export function parseMarkdown(content) {
  const lines = content.split('\n')
  let title = ''
  let uuid = ''
  const sections = []
  let currentSection = null

  for (const raw of lines) {
    const line = raw.trimEnd()

    // Title
    const titleMatch = line.match(/^#\s+(.+)/)
    if (titleMatch) {
      title = titleMatch[1].trim()
      continue
    }

    // UUID
    const uuidMatch = line.match(/^UUID:\s*(\S+)/)
    if (uuidMatch) {
      uuid = uuidMatch[1].trim()
      continue
    }

    // Section
    const sectionMatch = line.match(/^##\s+(.+)/)
    if (sectionMatch) {
      currentSection = { name: sectionMatch[1].trim(), items: [] }
      sections.push(currentSection)
      continue
    }

    // Item
    const itemMatch = line.match(/^-\s+(\[.\])\s+(.+)/)
    if (itemMatch) {
      const checked = itemMatch[1] === '[x]'
      let rest = itemMatch[2].trim()

      // Extract assignee: ← Pseudo or ← Pseudo1 & Pseudo2
      let assign = ''
      const assignMatch = rest.match(/\s*←\s*(.+)/)
      if (assignMatch) {
        assign = assignMatch[1].trim()
        rest = rest.slice(0, assignMatch.index).trim()
      }

      // Extract quantity: × N
      let qty = ''
      const qtyMatch = rest.match(/\s*×\s*(.+)/)
      if (qtyMatch) {
        qty = qtyMatch[1].trim()
        rest = rest.slice(0, qtyMatch.index).trim()
      }

      const item = {
        text: rest,
        checked,
        qty,
        assign
      }

      if (currentSection) {
        currentSection.items.push(item)
      } else {
        // Items before any section go into a default section
        const defaultSection = sections.find(s => s.name === '')
        if (defaultSection) {
          defaultSection.items.push(item)
        } else {
          sections.push({ name: '', items: [item] })
        }
      }
    }
  }

  return { title, uuid, sections }
}

/**
 * Generate markdown from structured data.
 */
export function generateMarkdown(list) {
  const lines = []

  if (list.title) lines.push(`# ${list.title}`)
  if (list.uuid) lines.push(`UUID: ${list.uuid}`)
  lines.push('')

  for (const section of list.sections) {
    if (section.name) {
      lines.push(`## ${section.name}`)
    }
    for (const item of section.items) {
      const check = item.checked ? '[x]' : '[ ]'
      let line = `- ${check} ${item.text}`
      if (item.qty) line += ` × ${item.qty}`
      if (item.assign) line += ` ← ${item.assign}`
      lines.push(line)
    }
    lines.push('')
  }

  // Remove trailing empty lines
  while (lines.length > 0 && lines[lines.length - 1] === '') {
    lines.pop()
  }
  lines.push('') // end with newline

  return lines.join('\n')
}

/**
 * Validate a list ID. Kept strict: IDs are capability tokens used in URLs and
 * as database keys, and must stay filename-safe for the markdown migration.
 */
export function validateId(id) {
  if (!id || typeof id !== 'string') return false
  // Only allow UUID-like strings: alphanumeric, hyphens, underscores
  return /^[a-zA-Z0-9_-]+$/.test(id)
}
