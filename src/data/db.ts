import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { LogEntry } from '../domain/types'

interface DqsDBSchema extends DBSchema {
  entries: {
    key: string
    value: LogEntry
    indexes: {
      'by-date': string
      'by-timestamp': string
    }
  }
}

const DB_NAME = 'dqs-db'
const DB_VERSION = 1

let dbPromise: Promise<IDBPDatabase<DqsDBSchema>> | null = null

export function getDb(): Promise<IDBPDatabase<DqsDBSchema>> {
  if (!dbPromise) {
    dbPromise = openDB<DqsDBSchema>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const store = db.createObjectStore('entries', { keyPath: 'id' })
        store.createIndex('by-date', 'dateKey', { unique: false })
        store.createIndex('by-timestamp', 'timestamp', { unique: false })
      },
    })
  }

  return dbPromise
}
