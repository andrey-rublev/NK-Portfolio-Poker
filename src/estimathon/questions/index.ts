/**
 * Estimathon practice questions, written in the spirit of fermi.gg: things you
 * can work out on a napkin.
 *
 * Hand-written questions live in one file per category as compact rows (see
 * build.ts for the format): add a row to add a question. families.ts builds
 * whole families of questions from small reference tables.
 */
import { FAMILY_QUESTIONS } from './families'
import food from './food'
import everyday from './everyday'
import people from './people'
import travel from './travel'
import money from './money'
import sports from './sports'
import nature from './nature'
import body from './body'
import world from './world'
import tech from './tech'
import type { Category, Difficulty, Question } from './types'

export type { Category, Difficulty, GuideStep, Question } from './types'

export const CATEGORY_LABELS: Record<Category, string> = {
  food: 'Food & drink',
  everyday: 'Everyday life',
  people: 'People & places',
  travel: 'Travel & transport',
  money: 'Money & business',
  sports: 'Sports & games',
  nature: 'Animals & nature',
  body: 'The human body',
  world: 'Earth, space & science',
  tech: 'Tech & engineering',
}

export const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard']

export const QUESTIONS: Question[] = [
  ...food,
  ...everyday,
  ...people,
  ...travel,
  ...money,
  ...sports,
  ...nature,
  ...body,
  ...world,
  ...tech,
  ...FAMILY_QUESTIONS,
]
