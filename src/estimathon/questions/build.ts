import type { Category, Difficulty, GuideStep, Question } from './types'

/** A guide step: [the number, where it comes from]. */
export type Step = [step: string, source: string]

/**
 * One question, written compactly:
 * [prompt, answer, unit, difficulty (e/m/h), where the answer comes from, ...guide steps]
 * The answer must be above zero: intervals are scored as high ÷ low.
 */
export type Row = [prompt: string, answer: number, unit: string, difficulty: 'e' | 'm' | 'h', answerSource: string, ...guide: Step[]]

const DIFFICULTY = { e: 'easy', m: 'medium', h: 'hard' } as const

const slug = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 72)

export function question(
  category: Category,
  prompt: string,
  answer: number,
  unit: string,
  difficulty: Difficulty,
  answerSource: string,
  guide: GuideStep[],
): Question {
  return { id: `${category}-${slug(prompt)}`, prompt, answer, unit, category, difficulty, answerSource, guide }
}

export function build(category: Category, rows: Row[]): Question[] {
  return rows.map(([prompt, answer, unit, d, answerSource, ...guide]) =>
    question(category, prompt, answer, unit, DIFFICULTY[d], answerSource, guide.map(([step, source]) => ({ step, source }))),
  )
}

/** A rounded number for a guide step: 2 significant figures by default. */
export const round = (n: number, digits = 2) => n.toLocaleString('en-US', { maximumSignificantDigits: digits })

const SUPERSCRIPT = '⁰¹²³⁴⁵⁶⁷⁸⁹'
/** Scientific notation for a guide step, e.g. "6.0 × 10²³". */
export function sci(n: number, digits = 2) {
  const [mantissa, exp] = n.toExponential(digits - 1).split('e')
  const power = String(Number(exp))
    .replace('-', '⁻')
    .replace(/\d/g, (d) => SUPERSCRIPT[Number(d)])
  return `${mantissa} × 10${power}`
}
