import { describe, expect, it } from 'vitest'
import { CATALOG } from '../data/catalog'
import { computeDailyState, pointsForNextServing, pointsForServing } from './score'
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

  it('sums total and serving counts for a day', () => {
    const entries: LogEntry[] = [
      {
        id: '1',
        foodTypeId: 'whole-grains',
        dateKey: '2026-05-13',
        timestamp: '2026-05-13T08:00:00.000Z',
        pointsAwarded: 2,
      },
      {
        id: '2',
        foodTypeId: 'vegetables',
        dateKey: '2026-05-13',
        timestamp: '2026-05-13T11:00:00.000Z',
        pointsAwarded: 2,
      },
      {
        id: '3',
        foodTypeId: 'whole-grains',
        dateKey: '2026-05-13',
        timestamp: '2026-05-13T13:00:00.000Z',
        pointsAwarded: 2,
      },
      {
        id: '4',
        foodTypeId: 'fried-foods',
        dateKey: '2026-05-13',
        timestamp: '2026-05-13T20:00:00.000Z',
        pointsAwarded: -1,
      },
    ]

    const state = computeDailyState(entries, CATALOG)

    expect(state.totalScore).toBe(5)
    expect(state.perType['whole-grains'].count).toBe(2)
    expect(state.perType['whole-grains'].nextPoints).toBe(1)
    expect(state.perType['vegetables'].count).toBe(1)
    expect(state.perType['fried-foods'].count).toBe(1)
    expect(state.perType['fried-foods'].nextPoints).toBe(-2)
  })

  it('handles empty day with initial next points', () => {
    const state = computeDailyState([], CATALOG)
    expect(state.totalScore).toBe(0)
    expect(state.perType['whole-grains'].count).toBe(0)
    expect(state.perType['whole-grains'].nextPoints).toBe(2)
  })
})
