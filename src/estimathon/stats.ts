import type { Category } from './questions'

/**
 * Running totals for one group of attempts. In Estimathon mode a hit is an
 * interval that contains the answer and the width is high ÷ low; in Fermi mode
 * a hit is a guess within ×2 and the width is how many times off it was.
 */
export interface Tally {
  attempts: number
  hits: number
  /** Sum of ln(width) over attempts that had a guess. */
  logWidthSum: number
  /** Attempts that had a guess (a timed-out blank one has none). */
  widths: number
}

export interface Stats {
  total: Tally
  byCategory: Partial<Record<Category, Tally>>
}

export type Mode = 'interval' | 'single'

/** Each mode keeps its own progress. */
const KEYS: Record<Mode, string> = { interval: 'estimathon-stats-v1', single: 'estimathon-fermi-stats-v1' }

const emptyTally = (): Tally => ({ attempts: 0, hits: 0, logWidthSum: 0, widths: 0 })
export const emptyStats = (): Stats => ({ total: emptyTally(), byCategory: {} })

export function loadStats(mode: Mode): Stats {
  try {
    const saved = JSON.parse(localStorage.getItem(KEYS[mode]) ?? 'null') as Stats | null
    if (saved?.total && saved.byCategory) return saved
  } catch {
    // Private windows and blocked storage: start fresh.
  }
  return emptyStats()
}

export function saveStats(mode: Mode, stats: Stats) {
  try {
    if (stats.total.attempts === 0) localStorage.removeItem(KEYS[mode])
    else localStorage.setItem(KEYS[mode], JSON.stringify(stats))
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

/** Records one attempt. `ratio` is its width (see Tally), or null when no guess was given. */
export function record(stats: Stats, category: Category, hit: boolean, ratio: number | null): Stats {
  return {
    total: add(stats.total, hit, ratio),
    byCategory: { ...stats.byCategory, [category]: add(stats.byCategory[category] ?? emptyTally(), hit, ratio) },
  }
}

export const hitRate = (t: Tally) => (t.attempts ? t.hits / t.attempts : null)

/**
 * Average width (see Tally). It's the geometric mean, so one wild ×1000 doesn't
 * swamp a run of ×2s.
 */
export const averageWidth = (t: Tally) => (t.widths ? Math.exp(t.logWidthSum / t.widths) : null)
