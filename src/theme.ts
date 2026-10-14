/** Colour helpers shared by the 3D card faces and the HTML text view. */

/** The darkest shade of the card paper (the bottom of its gradient). */
export const PAPER_DARK = '#f1e7d4'

function channel(c: number): number {
  const s = c / 255
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
}

function luminance([r, g, b]: number[]): number {
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

function contrast(a: number[], b: number[]): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

function hexToRgb(hex: string): number[] {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function rgbToHex(rgb: number[]): string {
  return `#${rgb.map((c) => Math.round(c).toString(16).padStart(2, '0')).join('')}`
}

function hslToRgb(h: number, s: number, l: number): number[] {
  const k = (n: number) => (n + h * 12) % 12
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
  return [f(0) * 255, f(8) * 255, f(4) * 255]
}

function rgbToHsl([r, g, b]: number[]): [number, number, number] {
  const [rn, gn, bn] = [r / 255, g / 255, b / 255]
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const l = (max + min) / 2
  if (max === min) return [0, 0, l]
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  const h =
    max === rn ? (gn - bn) / d + (gn < bn ? 6 : 0) : max === gn ? (bn - rn) / d + 2 : (rn - gn) / d + 4
  return [h / 6, s, l]
}

const inkCache = new Map<string, string>()

/**
 * A darker shade of a card's accent, for text on the cream paper. The bright
 * accents work as rules and borders but are far too light to read as text
 * (1.5-2.2:1), so this keeps the hue and lowers the lightness until the colour
 * meets WCAG AA for body text (4.5:1) against the darkest paper.
 */
export function inkColor(accent: string): string {
  const hit = inkCache.get(accent)
  if (hit) return hit
  const paper = hexToRgb(PAPER_DARK)
  const [h, s, l0] = rgbToHsl(hexToRgb(accent))
  let l = l0
  let rgb = hexToRgb(accent)
  while (contrast(rgb, paper) < 4.5 && l > 0) {
    l -= 0.01
    rgb = hslToRgb(h, s, l)
  }
  const ink = rgbToHex(rgb)
  inkCache.set(accent, ink)
  return ink
}
