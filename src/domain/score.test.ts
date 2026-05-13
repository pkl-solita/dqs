import { describe, expect, it } from 'vitest'
import { CATALOG } from '../data/catalog'
import {
  computeDailyState,
  pointsForNextServing,
  pointsForPortionAddition,
  pointsForServing,
} from './score'
import type { LogEntry } from './types'

describe('score engine', () => {
  it('returns scheduled values and tail fallback', () => {
    const wholeGrains = CATALOG.find((item) => item.id === 'whole-grains')
    expect(wholeGrains).toBeDefined()

    expect(pointsForServing(wholeGrains!, 1)).toBe(2)
    expect(pointsForServing(wholeGrains!, 6)).toBe(-1)
    expect(pointsForServing(wholeGrains!, 8)).toBe(-1)
  })

  it('calculates next points by current count', () => {
    const wholeGrains = CATALOG.find((item) => item.id === 'whole-grains')
    expect(wholeGrains).toBeDefined()

    expect(pointsForNextServing(wholeGrains!, 0)).toBe(2)
    expect(pointsForNextServing(wholeGrains!, 2)).toBe(1)
    expect(pointsForNextServing(wholeGrains!, 5)).toBe(-1)
  })

  it('calculates points for half and whole additions', () => {
    const wholeGrains = CATALOG.find((item) => item.id === 'whole-grains')
    expect(wholeGrains).toBeDefined()

    expect(pointsForPortionAddition(wholeGrains!, 0, 1)).toBe(1)
    expect(pointsForPortionAddition(wholeGrains!, 1, 1)).toBe(1)
    expect(pointsForPortionAddition(wholeGrains!, 1, 2)).toBe(2)
  })

  it('sums total and serving counts for a day', () => {
    const entries: LogEntry[] = [
      {
        id: '1',
        foodTypeId: 'whole-grains',
        dateKey: '2026-05-13',
        timestamp: '2026-05-13T08:00:00.000Z',
        portionUnits: 2,
        pointsAwarded: 2,
      },
      {
        id: '2',
        foodTypeId: 'vegetables',
        dateKey: '2026-05-13',
        timestamp: '2026-05-13T11:00:00.000Z',
        portionUnits: 2,
        pointsAwarded: 2,
      },
      {
        id: '3',
        foodTypeId: 'whole-grains',
        dateKey: '2026-05-13',
        timestamp: '2026-05-13T13:00:00.000Z',
        portionUnits: 2,
        pointsAwarded: 2,
      },
      {
        id: '4',
        foodTypeId: 'fried-foods',
        dateKey: '2026-05-13',
        timestamp: '2026-05-13T20:00:00.000Z',
        portionUnits: 2,
        pointsAwarded: -1,
      },
    ]

    const state = computeDailyState(entries, CATALOG)

    // whole-grains 1st+2nd serving = 2+2, vegetables 1st = 2,
    // fried-foods 1st = -2. Total = 4. Stored pointsAwarded on each entry
    // is ignored; totals are derived from the schedule + portion counts.
    expect(state.totalScore).toBe(4)
    expect(state.perType['whole-grains'].count).toBe(2)
    expect(state.perType['whole-grains'].nextPoints).toBe(1)
    expect(state.perType['vegetables'].count).toBe(1)
    expect(state.perType['fried-foods'].count).toBe(1)
    expect(state.perType['fried-foods'].nextPoints).toBe(-2)
    expect(state.perEntryPoints['1']).toBe(2)
    expect(state.perEntryPoints['3']).toBe(2)
    expect(state.perEntryPoints['4']).toBe(-2)
  })

  it('handles empty day with initial next points', () => {
    const state = computeDailyState([], CATALOG)
    expect(state.totalScore).toBe(0)
    expect(state.perType['whole-grains'].count).toBe(0)
    expect(state.perType['whole-grains'].nextPoints).toBe(2)
  })

  it('counts half portions and computes next whole correctly', () => {
    const entries: LogEntry[] = [
      {
        id: '1',
        foodTypeId: 'whole-grains',
        dateKey: '2026-05-13',
        timestamp: '2026-05-13T08:00:00.000Z',
        portionUnits: 1,
        pointsAwarded: 1,
      },
    ]

    const state = computeDailyState(entries, CATALOG)

    expect(state.perType['whole-grains'].count).toBe(0.5)
    expect(state.perType['whole-grains'].nextPoints).toBe(2)
    expect(state.totalScore).toBe(1)
  })

  it('recomputes total from schedule, not from stored pointsAwarded', () => {
    // Two vegetables entries: removing the first should not leave the
    // remaining entry crediting the 2nd-serving slot.
    const entries: LogEntry[] = [
      {
        id: 'a',
        foodTypeId: 'vegetables',
        dateKey: '2026-05-13',
        timestamp: '2026-05-13T08:00:00.000Z',
        portionUnits: 2,
        // Stale value from when this was the 1st serving.
        pointsAwarded: 2,
      },
    ]

    // Even if stored pointsAwarded were wrong (e.g. 999), totalScore must
    // reflect the schedule for the current portion count.
    entries[0].pointsAwarded = 999
    const state = computeDailyState(entries, CATALOG)
    expect(state.totalScore).toBe(2)
    expect(state.perEntryPoints['a']).toBe(2)
  })
})
