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
  pointsAwarded: number
}

export interface DailyTypeState {
  count: number
  nextPoints: number
}

export interface DailyState {
  totalScore: number
  perType: Record<string, DailyTypeState>
}
