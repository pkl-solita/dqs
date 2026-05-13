import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRegisterSW } from 'virtual:pwa-register/react'
import './App.css'
import { CATALOG } from './data/catalog'
import {
  addEntry,
  createLogEntry,
  getEntriesForDate,
  removeEntry,
} from './data/entriesRepo'
import { toLocalDateKey } from './domain/date'
import { computeDailyState, pointsForPortionAddition } from './domain/score'
import type { FoodTypeGroup, LogEntry } from './domain/types'

interface DailyTotal {
  dateKey: string
  total: number
}

function App() {
  const { needRefresh, updateServiceWorker } = useRegisterSW()

  const [activeTab, setActiveTab] = useState<'today' | 'history' | 'overview'>('today')
  const [todayEntries, setTodayEntries] = useState<LogEntry[]>([])
  const [historySeries, setHistorySeries] = useState<DailyTotal[]>([])
  const [useSampleData, setUseSampleData] = useState(false)
  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null)

  const todayKey = useMemo(() => toLocalDateKey(new Date()), [])

  const loadHistorySeries = useCallback(async (): Promise<void> => {
    const keys = lastNDates(30)
    const totals = await Promise.all(
      keys.map(async (dateKey) => {
        const entries = await getEntriesForDate(dateKey)
        const total = entries.reduce((sum, entry) => sum + entry.pointsAwarded, 0)
        return { dateKey, total }
      }),
    )

    setHistorySeries(totals)
  }, [])

  useEffect(() => {
    void (async () => {
      const entries = await getEntriesForDate(todayKey)
      setTodayEntries(entries)
      await loadHistorySeries()
    })()
  }, [loadHistorySeries, todayKey])

  const todayState = useMemo(
    () => computeDailyState(todayEntries, CATALOG),
    [todayEntries],
  )
  const displayedSeries = useMemo(
    () => (useSampleData ? buildSampleSeries(lastNDates(30)) : historySeries),
    [historySeries, useSampleData],
  )

  const selectedType = CATALOG.find((item) => item.id === selectedTypeId) ?? null
  const canRenderPortal = typeof document !== 'undefined'
  const selectedEntries = selectedType
    ? todayEntries.filter((entry) => entry.foodTypeId === selectedType.id)
    : []
  const foodTypeNameById = useMemo(
    () =>
      Object.fromEntries(
        CATALOG.map((foodType) => [foodType.id, foodType.name]),
      ),
    [],
  )

  useEffect(() => {
    if (!selectedType) {
      return
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.scrollTo({ top: 0, behavior: 'smooth' })

    function handleEscape(event: KeyboardEvent): void {
      if (event.key === 'Escape') {
        setSelectedTypeId(null)
      }
    }

    window.addEventListener('keydown', handleEscape)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleEscape)
    }
  }, [selectedType])

  async function handleAddServing(foodTypeId: string, portionUnits: 1 | 2): Promise<void> {
    const foodType = CATALOG.find((item) => item.id === foodTypeId)
    if (!foodType) {
      return
    }

    const currentPortionUnits = todayState.perType[foodType.id]?.portionUnits ?? 0
    const pointsAwarded = pointsForPortionAddition(foodType, currentPortionUnits, portionUnits)
    const newEntry = createLogEntry(foodType.id, pointsAwarded, portionUnits)

    await addEntryAndRefresh(newEntry)
  }

  async function addEntryAndRefresh(entry: LogEntry): Promise<void> {
    await addEntry(entry)
    const entries = await getEntriesForDate(todayKey)
    setTodayEntries(entries)
    await loadHistorySeries()
  }

  async function handleRemoveEntry(entryId: string): Promise<void> {
    await removeEntry(entryId)
    const entries = await getEntriesForDate(todayKey)
    setTodayEntries(entries)
    await loadHistorySeries()
  }

  function renderGroup(group: FoodTypeGroup): React.JSX.Element {
    return (
      <section className="group" key={group}>
        <header className="group-header">
          <h2>{groupLabel[group]}</h2>
        </header>
        <div className="tile-grid">
          {CATALOG.filter((item) => item.group === group).map((foodType) => {
            const stats = todayState.perType[foodType.id]
            const nextWholePoints = stats.nextPoints
            const nextPointsClass =
              nextWholePoints < 0 ? 'neg' : nextWholePoints === 0 ? 'zero' : 'pos'

            return (
              <article key={foodType.id} className="food-tile">
                <div className="tile-top">
                  <strong>{foodType.name}</strong>
                  <span className={`points-badge ${nextPointsClass}`}>
                    Next: {formatPoints(nextWholePoints, true)}
                  </span>
                </div>
                <div className="tile-meta">
                  <span>{formatServings(stats.count)}</span>
                </div>
                <div className="tile-actions">
                  <button
                    className="tile-action secondary"
                    type="button"
                    onClick={() => setSelectedTypeId(foodType.id)}
                  >
                    Details
                  </button>
                  <button
                    className="tile-action"
                    type="button"
                    onClick={() => void handleAddServing(foodType.id, 1)}
                  >
                    +½
                  </button>
                  <button
                    className="tile-action primary"
                    type="button"
                    onClick={() => void handleAddServing(foodType.id, 2)}
                  >
                    +1
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      </section>
    )
  }

  return (
    <div className="app-shell">
      {needRefresh[0] ? (
        <div className="update-banner">
          <span>A new version is available.</span>
          <button type="button" onClick={() => void updateServiceWorker(true)}>
            Reload
          </button>
        </div>
      ) : null}
      <header className="app-header">
        <div>
          <h1>DQS</h1>
          <p className="subhead">
            Tap a food type for each serving. Point values diminish as a type is repeated.
          </p>
        </div>
        <div className="score-card">
          <p>Today</p>
          <strong>{formatPoints(todayState.totalScore)}</strong>
          <span>DQS</span>
        </div>
      </header>

      <nav className="tabs" aria-label="Main screens">
        <button
          type="button"
          className={activeTab === 'today' ? 'active' : ''}
          onClick={() => setActiveTab('today')}
        >
          Today
        </button>
        <button
          type="button"
          className={activeTab === 'history' ? 'active' : ''}
          onClick={() => setActiveTab('history')}
        >
          History
        </button>
        <button
          type="button"
          className={activeTab === 'overview' ? 'active' : ''}
          onClick={() => setActiveTab('overview')}
        >
          Day Overview
        </button>
      </nav>

      {activeTab === 'today' ? (
        <main className="today-layout">
          {renderGroup('high')}
          {renderGroup('low')}
          {renderGroup('catchAll')}
        </main>
      ) : activeTab === 'history' ? (
        <main className="history-layout">
          <section className="history-panel">
            <div className="history-topline">
              <h2>Past 30 Days</h2>
              <label className="sample-toggle">
                <input
                  type="checkbox"
                  checked={useSampleData}
                  onChange={(event) => setUseSampleData(event.target.checked)}
                />
                Show sample data
              </label>
            </div>
            <HistoryChart series={displayedSeries} />
          </section>
        </main>
      ) : (
        <main className="overview-layout">
          <section className="overview-panel">
            <div className="history-topline">
              <h2>Today Overview</h2>
              <strong>{formatPoints(todayState.totalScore, true)} DQS</strong>
            </div>
            <ul className="entry-list overview-entry-list">
              {todayEntries.length === 0 ? (
                <li>No entries logged for today.</li>
              ) : (
                todayEntries.map((entry) => (
                  <li key={entry.id}>
                    <span>{new Date(entry.timestamp).toLocaleTimeString()}</span>
                    <span>{foodTypeNameById[entry.foodTypeId] ?? 'Unknown food type'}</span>
                    <span>
                      {formatPortion(entry.portionUnits)} | {formatPoints(entry.pointsAwarded, true)} pts
                    </span>
                    <button type="button" onClick={() => void handleRemoveEntry(entry.id)}>
                      Remove
                    </button>
                  </li>
                ))
              )}
            </ul>
          </section>
        </main>
      )}

      {selectedType && canRenderPortal
        ? createPortal(
            <section
              className="detail-sheet"
              role="dialog"
              aria-modal="true"
              aria-labelledby="detail-title"
              onClick={() => setSelectedTypeId(null)}
            >
              <div className="detail-content" onClick={(event) => event.stopPropagation()}>
                <div className="detail-head">
                  <h2 id="detail-title">{selectedType.name}</h2>
                  <button type="button" onClick={() => setSelectedTypeId(null)}>
                    Close
                  </button>
                </div>
                <p>{selectedType.definition}</p>
                <h3>Today entries</h3>
                <ul className="entry-list">
                  {selectedEntries.length === 0 ? (
                    <li>No entries yet today.</li>
                  ) : (
                    selectedEntries.map((entry) => (
                      <li key={entry.id}>
                        <span>{new Date(entry.timestamp).toLocaleTimeString()}</span>
                        <span>
                          {formatPortion(entry.portionUnits)} | {formatPoints(entry.pointsAwarded, true)} pts
                        </span>
                        <button type="button" onClick={() => void handleRemoveEntry(entry.id)}>
                          Remove
                        </button>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            </section>,
            document.body,
          )
        : null}
    </div>
  )
}

const groupLabel: Record<FoodTypeGroup, string> = {
  high: 'High-quality foods',
  low: 'Low-quality foods',
  catchAll: 'Catch-all categories',
}

function lastNDates(days: number): string[] {
  const today = new Date()
  const keys: string[] = []

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date(today)
    date.setDate(today.getDate() - offset)
    keys.push(toLocalDateKey(date))
  }

  return keys
}

function buildSampleSeries(dateKeys: string[]): DailyTotal[] {
  return dateKeys.map((dateKey, index) => {
    const wave = Math.sin(index / 2.2) * 6
    const trend = index * 0.12
    const weeklyBump = index % 7 === 5 ? 4 : 0
    return {
      dateKey,
      total: Math.round(14 + wave + trend + weeklyBump),
    }
  })
}

function HistoryChart({ series }: { series: DailyTotal[] }): React.JSX.Element {
  const width = 920
  const height = 300
  const padLeft = 44
  const padRight = 18
  const padTop = 22
  const padBottom = 42
  const usableWidth = width - padLeft - padRight
  const usableHeight = height - padTop - padBottom
  const totals = series.map((item) => item.total)
  const min = Math.min(0, ...totals)
  const max = Math.max(8, ...totals)
  const range = Math.max(1, max - min)

  function yFor(value: number): number {
    return padTop + ((max - value) / range) * usableHeight
  }

  const zeroY = yFor(0)
  const slotWidth = usableWidth / Math.max(1, series.length)
  const barWidth = Math.max(4, slotWidth * 0.72)

  const bars = series.map((item, index) => {
    const xCenter = padLeft + slotWidth * index + slotWidth / 2
    const barTop = yFor(Math.max(item.total, 0))
    const barBottom = yFor(Math.min(item.total, 0))
    return {
      label: item.dateKey,
      total: item.total,
      x: xCenter - barWidth / 2,
      y: Math.min(barTop, barBottom),
      height: Math.max(1, Math.abs(barBottom - barTop)),
      centerX: xCenter,
    }
  })

  const trendValues = series.map((_, index) => {
    const start = Math.max(0, index - 6)
    const window = totals.slice(start, index + 1)
    const sum = window.reduce((acc, value) => acc + value, 0)
    return sum / window.length
  })

  const trendPoints = trendValues.map((value, index) => {
    const x = bars[index]?.centerX ?? padLeft
    const y = yFor(value)
    return { x, y, value }
  })

  const trendLine = trendPoints.map((point) => `${point.x},${point.y}`).join(' ')

  const first = series[0]
  const middle = series[Math.floor(series.length / 2)]
  const last = series[series.length - 1]
  const latestTrend = trendValues[trendValues.length - 1]

  return (
    <figure className="dqs-chart-wrap">
      <svg className="dqs-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Past 30 days DQS chart">
        <line x1={padLeft} y1={padTop + usableHeight} x2={width - padRight} y2={padTop + usableHeight} className="axis" />
        <line x1={padLeft} y1={padTop} x2={padLeft} y2={padTop + usableHeight} className="axis" />
        <line x1={padLeft} y1={zeroY} x2={width - padRight} y2={zeroY} className="zero-axis" />

        {bars.map((bar, index) => (
          <g key={`${bar.label}-${index}`}>
            <rect
              x={bar.x}
              y={bar.y}
              width={barWidth}
              height={bar.height}
              rx="2.5"
              className={bar.total >= 0 ? 'score-bar pos' : 'score-bar neg'}
            />
            {index % 5 === 0 ? (
              <text x={bar.centerX} y={padTop + usableHeight + 17} textAnchor="middle" className="tick-label">
                {bar.label.slice(5)}
              </text>
            ) : null}
          </g>
        ))}

        {trendLine ? <polyline points={trendLine} className="trend-line" /> : null}
        {trendPoints.map((point, index) => (
          <circle key={`trend-${index}`} cx={point.x} cy={point.y} r="2.3" className="trend-dot" />
        ))}

        <text x={padLeft - 10} y={padTop + 10} textAnchor="end" className="value-label">
          {max}
        </text>
        <text x={padLeft - 10} y={padTop + usableHeight} textAnchor="end" className="value-label">
          {min}
        </text>
      </svg>

      <figcaption>
        <span>{first ? first.dateKey : ''}</span>
        <strong>
          Latest: {formatPoints(last ? last.total : 0)} DQS | Trend:{' '}
          {latestTrend ? latestTrend.toFixed(1) : '0.0'}
        </strong>
        <span>{middle ? middle.dateKey : ''}</span>
      </figcaption>
    </figure>
  )
}

function formatPoints(value: number, includeSign = false): string {
  const formatted = Number.isInteger(value) ? value.toString() : value.toFixed(1)
  if (includeSign && value > 0) {
    return `+${formatted}`
  }

  return formatted
}

function formatPortion(portionUnits: number): string {
  return portionUnits === 1 ? 'Half' : 'Whole'
}

function formatServings(servings: number): string {
  if (servings === 1) {
    return 'Today: 1 serving'
  }

  if (Number.isInteger(servings)) {
    return `Today: ${servings} servings`
  }

  return `Today: ${servings.toFixed(1)} servings`
}

export default App
