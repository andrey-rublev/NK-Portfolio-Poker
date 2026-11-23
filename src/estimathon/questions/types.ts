export type Category =
  | 'food'
  | 'everyday'
  | 'people'
  | 'travel'
  | 'money'
  | 'sports'
  | 'nature'
  | 'body'
  | 'world'
  | 'tech'

export type Difficulty = 'easy' | 'medium' | 'hard'

export interface GuideStep {
  /** One link in the estimate, e.g. "US population ≈ 330 million". */
  step: string
  /** Where that number comes from. */
  source: string
}

export interface Question {
  id: string
  prompt: string
  answer: number
  unit: string
  category: Category
  difficulty: Difficulty
  /** Where the true answer comes from. */
  answerSource: string
  guide: GuideStep[]
}
