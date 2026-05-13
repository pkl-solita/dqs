export type FoodTypeGroup = 'high' | 'low' | 'catchAll'

export interface FoodType {
  id: string
  name: string
  group: FoodTypeGroup
  definition: string
  pointSchedule: number[]
  tailPoints: number
}

export interface LogEntry {
  id: string
  dateKey: string
  foodTypeId: string
  timestamp: string
  // 1 = half portion, 2 = whole portion
  portionUnits: number
  pointsAwarded: number
}

export interface DailyTypeState {
  count: number
  portionUnits: number
  nextPoints: number
}

export interface DailyState {
  totalScore: number
  perType: Record<string, DailyTypeState>
  /** Points each entry contributed, keyed by entry id. */
  perEntryPoints: Record<string, number>
}
