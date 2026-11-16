import { getDb } from './db.js'
import { validateId } from './markdown.js'

/**
 * Repository SQLite des listes. Le modèle canonique { uuid, title, sections }
 * est inchangé : le contenu est stocké en colonne JSON (`content`), le titre
 * est dupliqué en colonne pour le tri/affichage sans parse.
 */

function rowToList(row) {
  const content = JSON.parse(row.content)
  return {
    uuid: row.id,
    title: content?.title ?? row.title,
    sections: content?.sections ?? []
  }
}

function contentOf(list) {
  return JSON.stringify({ title: list.title, sections: list.sections })
}

export function createList(list, ownerUserId = null) {
  const now = new Date().toISOString()
  // Upsert : en v1, importer un markdown dont l'UUID existe déjà écrasait la
  // liste — on préserve ce comportement (l'éventuel propriétaire est conservé).
  getDb()
    .prepare(`
      INSERT INTO lists (id, owner_user_id, title, content, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT (id) DO UPDATE SET
        title = excluded.title,
        content = excluded.content,
        updated_at = excluded.updated_at
    `)
    .run(list.uuid, ownerUserId, list.title, contentOf(list), now, now)
  return list
}

export function getList(id) {
  if (!validateId(id)) return null
  const row = getDb().prepare('SELECT * FROM lists WHERE id = ?').get(id)
  return row ? rowToList(row) : null
}

/**
 * Mutation transactionnelle : la liste est lue, passée à `mutate`, puis
 * réécrite dans BEGIN IMMEDIATE…COMMIT. La visite de l'utilisateur connecté
 * (si fourni) est enregistrée dans la même transaction.
 */
export function updateList(id, mutate, visitorUserId = null) {
  const db = getDb()
  db.exec('BEGIN IMMEDIATE')
  try {
    const row = db.prepare('SELECT * FROM lists WHERE id = ?').get(id)
    if (!row) {
      db.exec('ROLLBACK')
      return null
    }

    const list = rowToList(row)
    mutate(list)

    const now = new Date().toISOString()
    db.prepare('UPDATE lists SET title = ?, content = ?, updated_at = ? WHERE id = ?')
      .run(list.title, contentOf(list), now, id)

    if (visitorUserId) {
      touchVisitIn(db, id, visitorUserId)
    }

    db.exec('COMMIT')
    return list
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }
}

function touchVisitIn(db, listId, userId) {
  db.prepare(`
    INSERT INTO list_visits (user_id, list_id, last_visited)
    VALUES (?, ?, ?)
    ON CONFLICT (user_id, list_id) DO UPDATE SET last_visited = excluded.last_visited
  `).run(userId, listId, new Date().toISOString())
}

export function touchVisit(listId, userId) {
  touchVisitIn(getDb(), listId, userId)
}

/**
 * « Mes listes » : créées par l'utilisateur + visitées par son URL,
 * triées par dernière activité décroissante.
 */
export function listListsForUser(userId) {
  const rows = getDb()
    .prepare(`
      SELECT l.id, l.title, l.updated_at,
             CASE WHEN l.owner_user_id = ? THEN 1 ELSE 0 END AS owned,
             v.last_visited
      FROM lists l
      LEFT JOIN list_visits v ON v.list_id = l.id AND v.user_id = ?
      WHERE l.owner_user_id = ? OR v.user_id = ?
      ORDER BY COALESCE(v.last_visited, l.updated_at) DESC
    `)
    .all(userId, userId, userId, userId)

  return rows.map(row => ({
    id: row.id,
    title: row.title,
    origin: row.owned ? 'created' : 'visited',
    lastVisited: row.last_visited,
    updatedAt: row.updated_at
  }))
}
