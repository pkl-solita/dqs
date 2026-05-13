import type { DailyState, FoodType, LogEntry } from './types'

const HALF_PORTION_UNITS = 1
const WHOLE_PORTION_UNITS = 2

export function pointsForServing(foodType: FoodType, servingNumber: number): number {
  if (servingNumber <= 0) {
    return 0
  }

  const index = servingNumber - 1
  return foodType.pointSchedule[index] ?? foodType.tailPoints
}

export function entryPortionUnits(entry: LogEntry): number {
  return entry.portionUnits === HALF_PORTION_UNITS ? HALF_PORTION_UNITS : WHOLE_PORTION_UNITS
}

export function pointsForPortionAddition(
  foodType: FoodType,
  currentPortionUnits: number,
  portionUnitsToAdd: number,
): number {
  if (portionUnitsToAdd <= 0) {
    return 0
  }

  let points = 0

  for (let unitOffset = 1; unitOffset <= portionUnitsToAdd; unitOffset += 1) {
    const portionStep = currentPortionUnits + unitOffset
    const servingNumber = Math.ceil(portionStep / WHOLE_PORTION_UNITS)
    points += pointsForServing(foodType, servingNumber) / WHOLE_PORTION_UNITS
  }

  return points
}

export function pointsForNextServing(foodType: FoodType, currentCount: number): number {
  return pointsForPortionAddition(foodType, currentCount * WHOLE_PORTION_UNITS, WHOLE_PORTION_UNITS)
}

export function computeDailyState(entries: LogEntry[], catalog: FoodType[]): DailyState {
  const perType: DailyState['perType'] = {}

  for (const foodType of catalog) {
    perType[foodType.id] = {
      count: 0,
      portionUnits: 0,
      nextPoints: pointsForPortionAddition(foodType, 0, WHOLE_PORTION_UNITS),
    }
  }

  for (const entry of entries) {
    const current = perType[entry.foodTypeId]
    if (!current) {
      continue
    }

    current.portionUnits += entryPortionUnits(entry)
  }

  for (const foodType of catalog) {
    const stats = perType[foodType.id]
    stats.count = stats.portionUnits / WHOLE_PORTION_UNITS
    stats.nextPoints = pointsForPortionAddition(foodType, stats.portionUnits, WHOLE_PORTION_UNITS)
  }

  const totalScore = entries.reduce((sum, entry) => sum + entry.pointsAwarded, 0)
  return { totalScore, perType }
}
