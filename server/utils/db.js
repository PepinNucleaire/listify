import { DatabaseSync } from 'node:sqlite'
import { mkdirSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { parseMarkdown, validateId } from './markdown.js'

/**
 * SQLite is the single source of truth for users, sessions, lists and visits.
 * The database lives in the directory configured through
 * `runtimeConfig.listify.dataDir` (env: `NUXT_LISTIFY_DATA_DIR`).
 */

let db = null
let databasePath = null

/**
 * Data directory: database file + markdown files picked up by the migration.
 */
export function getDataDir() {
  const config = useRuntimeConfig()
  return config.listify?.dataDir || '/app/data'
}

function initSchema(database) {
  database.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    PRAGMA busy_timeout = 5000;

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS lists (
      id TEXT PRIMARY KEY,
      owner_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS list_visits (
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      list_id TEXT NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
      last_visited TEXT NOT NULL,
      PRIMARY KEY (user_id, list_id)
    );

    CREATE INDEX IF NOT EXISTS idx_lists_owner ON lists(owner_user_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
  `)
}

/**
 * Import the markdown files found in the data directory (v1 storage) into
 * SQLite. Idempotent: an existing id is left untouched, and the .md files are
 * never deleted (they act as a backup).
 */
function migrateMarkdownFiles(database, dataDir) {
  let entries
  try {
    entries = readdirSync(dataDir, { withFileTypes: true })
  } catch (error) {
    console.warn(`[listify] Migration impossible : ${error.message}`)
    return
  }

  const insert = database.prepare(`
    INSERT OR IGNORE INTO lists (id, owner_user_id, title, content, created_at, updated_at)
    VALUES (?, NULL, ?, ?, ?, ?)
  `)

  let imported = 0

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.md')) continue

    const id = entry.name.slice(0, -'.md'.length)
    if (!validateId(id)) continue

    try {
      const filePath = join(dataDir, entry.name)
      const parsed = parseMarkdown(readFileSync(filePath, 'utf-8'))
      const mtime = statSync(filePath).mtime.toISOString()
      const title = parsed.title || 'Liste importée'

      const result = insert.run(
        id,
        title,
        JSON.stringify({ title, sections: parsed.sections }),
        mtime,
        mtime
      )
      if (result.changes > 0) imported += 1
    } catch (error) {
      console.warn(`[listify] Fichier markdown ignoré (${entry.name}) : ${error.message}`)
    }
  }

  if (imported > 0) {
    console.info(`[listify] Migration : ${imported} liste(s) importée(s) depuis ${dataDir}`)
  }
}

/**
 * Lazily open the database, create the schema and run the markdown migration.
 * A single DatabaseSync instance is reused for the whole Nitro process.
 */
export function getDb() {
  if (db) return db

  const dataDir = getDataDir()
  mkdirSync(dataDir, { recursive: true })
  databasePath = join(dataDir, 'listify.db')

  const database = new DatabaseSync(databasePath)
  initSchema(database)
  migrateMarkdownFiles(database, dataDir)

  // Expired sessions are useless; clean them up on boot.
  database.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(new Date().toISOString())

  db = database
  return db
}

export function getDatabasePath() {
  return databasePath
}

export function closeDb() {
  db?.close()
  db = null
  databasePath = null
}
