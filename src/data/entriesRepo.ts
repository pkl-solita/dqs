import { getDb } from './db'
import { toLocalDateKey } from '../domain/date'
import type { LogEntry } from '../domain/types'

function createUuid(): string {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)

  // RFC 4122 variant + version bits for a v4 UUID.
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80

  const hex = Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

export function createLogEntry(
  foodTypeId: string,
  pointsAwarded: number,
  portionUnits = 2,
  date = new Date(),
): LogEntry {
  return {
    id: createUuid(),
    dateKey: toLocalDateKey(date),
    foodTypeId,
    timestamp: date.toISOString(),
    portionUnits,
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
