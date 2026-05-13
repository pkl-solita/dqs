import type { DailyState, FoodType, LogEntry } from './types'

export function pointsForServing(foodType: FoodType, servingNumber: number): number {
  if (servingNumber <= 0) {
    return 0
  }

  const index = servingNumber - 1
  return foodType.pointSchedule[index] ?? foodType.tailPoints
}

export function pointsForNextServing(foodType: FoodType, currentCount: number): number {
  return pointsForServing(foodType, currentCount + 1)
}

export function computeDailyState(entries: LogEntry[], catalog: FoodType[]): DailyState {
  const perType: DailyState['perType'] = {}

  for (const foodType of catalog) {
    perType[foodType.id] = {
      count: 0,
      nextPoints: pointsForNextServing(foodType, 0),
    }
  }

  for (const entry of entries) {
    const current = perType[entry.foodTypeId]
    if (!current) {
      continue
    }

    current.count += 1
  }

  for (const foodType of catalog) {
    const stats = perType[foodType.id]
    stats.nextPoints = pointsForNextServing(foodType, stats.count)
  }

  const totalScore = entries.reduce((sum, entry) => sum + entry.pointsAwarded, 0)
  return { totalScore, perType }
}
