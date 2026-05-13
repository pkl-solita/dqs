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
  const perEntryPoints: Record<string, number> = {}
  const catalogById = new Map(catalog.map((foodType) => [foodType.id, foodType]))

  for (const foodType of catalog) {
    perType[foodType.id] = {
      count: 0,
      portionUnits: 0,
      nextPoints: pointsForPortionAddition(foodType, 0, WHOLE_PORTION_UNITS),
    }
  }

  // Replay entries in timestamp order so each entry's points reflect the
  // schedule position it occupied at the time of logging, independent of the
  // (now derived) value stored on the entry.
  const sortedEntries = [...entries].sort((a, b) =>
    a.timestamp.localeCompare(b.timestamp),
  )

  let totalScore = 0
  for (const entry of sortedEntries) {
    const foodType = catalogById.get(entry.foodTypeId)
    if (!foodType) {
      perEntryPoints[entry.id] = 0
      continue
    }

    const stats = perType[foodType.id]
    const portionUnitsToAdd = entryPortionUnits(entry)
    const points = pointsForPortionAddition(
      foodType,
      stats.portionUnits,
      portionUnitsToAdd,
    )
    stats.portionUnits += portionUnitsToAdd
    perEntryPoints[entry.id] = points
    totalScore += points
  }

  for (const foodType of catalog) {
    const stats = perType[foodType.id]
    stats.count = stats.portionUnits / WHOLE_PORTION_UNITS
    stats.nextPoints = pointsForPortionAddition(foodType, stats.portionUnits, WHOLE_PORTION_UNITS)
  }

  return { totalScore, perType, perEntryPoints }
}
