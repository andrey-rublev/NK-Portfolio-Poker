import type { Category } from './questions'

/** Running totals for one group of attempts. */
export interface Tally {
  attempts: number
  hits: number
  /** Sum of ln(high / low) over attempts that had an interval. */
  logWidthSum: number
  /** Attempts that had an interval (a timed-out blank one has none). */
  widths: number
}

export interface Stats {
  total: Tally
  byCategory: Partial<Record<Category, Tally>>
}

const KEY = 'estimathon-stats-v1'

const emptyTally = (): Tally => ({ attempts: 0, hits: 0, logWidthSum: 0, widths: 0 })
export const emptyStats = (): Stats => ({ total: emptyTally(), byCategory: {} })

export function loadStats(): Stats {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Stats | null
    if (saved?.total && saved.byCategory) return saved
  } catch {
    // Private windows and blocked storage: start fresh.
  }
  return emptyStats()
}

export function saveStats(stats: Stats) {
  try {
    if (stats.total.attempts === 0) localStorage.removeItem(KEY)
    else localStorage.setItem(KEY, JSON.stringify(stats))
  } catch {
    // Progress just won't persist.
  }
}

function add(t: Tally, hit: boolean, ratio: number | null): Tally {
  return {
    attempts: t.attempts + 1,
    hits: t.hits + (hit ? 1 : 0),
    logWidthSum: t.logWidthSum + (ratio === null ? 0 : Math.log(ratio)),
    widths: t.widths + (ratio === null ? 0 : 1),
  }
}

/** Records one attempt. `ratio` is high/low, or null when no interval was given. */
export function record(stats: Stats, category: Category, hit: boolean, ratio: number | null): Stats {
  return {
    total: add(stats.total, hit, ratio),
    byCategory: { ...stats.byCategory, [category]: add(stats.byCategory[category] ?? emptyTally(), hit, ratio) },
  }
}

export const hitRate = (t: Tally) => (t.attempts ? t.hits / t.attempts : null)

/**
 * Average interval width as a high/low ratio. It's the geometric mean, so one
 * wild ×1000 interval doesn't swamp a run of ×2s.
 */
export const averageWidth = (t: Tally) => (t.widths ? Math.exp(t.logWidthSum / t.widths) : null)
