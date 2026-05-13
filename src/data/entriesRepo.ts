import { getDb } from './db'
import { toLocalDateKey } from '../domain/date'
import type { LogEntry } from '../domain/types'

export function createLogEntry(foodTypeId: string, pointsAwarded: number, date = new Date()): LogEntry {
  return {
    id: crypto.randomUUID(),
    dateKey: toLocalDateKey(date),
    foodTypeId,
    timestamp: date.toISOString(),
    pointsAwarded,
  }
}

export async function addEntry(entry: LogEntry): Promise<void> {
  const db = await getDb()
  await db.put('entries', entry)
}

export async function removeEntry(id: string): Promise<void> {
  const db = await getDb()
  await db.delete('entries', id)
}

export async function getEntriesForDate(dateKey: string): Promise<LogEntry[]> {
  const db = await getDb()
  const tx = db.transaction('entries', 'readonly')
  const index = tx.store.index('by-date')
  const rows = await index.getAll(dateKey)
  await tx.done

  return rows.sort((a, b) => a.timestamp.localeCompare(b.timestamp))
}

export async function getAllDateKeys(): Promise<string[]> {
  const db = await getDb()
  const tx = db.transaction('entries', 'readonly')
  const keys = await tx.store.index('by-date').getAllKeys()
  await tx.done

  return Array.from(new Set(keys)).sort((a, b) => b.localeCompare(a))
}
