const SCALE: Record<string, number> = {
  k: 1e3,
  thousand: 1e3,
  m: 1e6,
  mn: 1e6,
  million: 1e6,
  b: 1e9,
  bn: 1e9,
  billion: 1e9,
  t: 1e12,
  tn: 1e12,
  trillion: 1e12,
}

/**
 * Reads a guess as typed: "2500000", "2,500,000", "2.5e6", "2.5m",
 * "2.5 million" or "2.5x10^6". Returns null for anything else.
 */
export function parseGuess(raw: string): number | null {
  const s = raw.trim().toLowerCase().replace(/[,_\s]/g, '').replace('×', 'x')
  const m = /^(\d*\.?\d+)(?:e([+-]?\d+)|[x*]10\^([+-]?\d+))?([a-z]*)$/.exec(s)
  if (!m) return null
  const scale = m[4] ? SCALE[m[4]] : 1
  if (scale === undefined) return null
  const n = Number(m[1]) * 10 ** Number(m[2] ?? m[3] ?? 0) * scale
  return Number.isFinite(n) ? n : null
}

const SUPERSCRIPT = '⁰¹²³⁴⁵⁶⁷⁸⁹'
const plain = new Intl.NumberFormat('en-US', { maximumFractionDigits: 4 })
const words = new Intl.NumberFormat('en-US', { notation: 'compact', compactDisplay: 'long', maximumSignificantDigits: 4 })

/** A number for display: digits up to the trillions, scientific notation beyond. */
export function formatNumber(n: number): string {
  const abs = Math.abs(n)
  if (abs !== 0 && (abs >= 1e15 || abs < 0.001)) {
    const [mantissa, exp] = n.toExponential(3).split('e')
    const power = String(Number(exp))
      .replace('-', '⁻')
      .replace(/\d/g, (d) => SUPERSCRIPT[Number(d)])
    return `${Number(mantissa)} × 10${power}`
  }
  return plain.format(n)
}

/** "383.3 billion" alongside a long number, where it helps; null otherwise. */
export function numberInWords(n: number): string | null {
  return Math.abs(n) >= 1e6 && Math.abs(n) < 1e15 ? words.format(n) : null
}
