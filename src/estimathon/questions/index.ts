/**
 * Estimathon practice questions.
 *
 * Hand-written questions live in one file per category as compact rows (see
 * build.ts for the format): add a row to add a question. families.ts holds
 * questions worked out from small reference tables.
 */
import { FAMILY_QUESTIONS } from './families'
import { LEGACY_QUESTIONS } from './legacy'
import population from './population'
import geography from './geography'
import space from './space'
import physics from './physics'
import nature from './nature'
import money from './money'
import history from './history'
import sports from './sports'
import technology from './technology'
import everyday from './everyday'
import type { Category, Difficulty, Question } from './types'

export type { Category, Difficulty, GuideStep, Question } from './types'

export const CATEGORY_LABELS: Record<Category, string> = {
  population: 'Population',
  geography: 'Geography',
  space: 'Space',
  physics: 'Physics & chemistry',
  nature: 'Nature & the body',
  money: 'Money',
  history: 'History',
  sports: 'Sports',
  technology: 'Technology',
  everyday: 'Everyday objects',
}

export const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard']

export const QUESTIONS: Question[] = [
  ...LEGACY_QUESTIONS,
  ...population,
  ...geography,
  ...space,
  ...physics,
  ...nature,
  ...money,
  ...history,
  ...sports,
  ...technology,
  ...everyday,
  ...FAMILY_QUESTIONS,
]
