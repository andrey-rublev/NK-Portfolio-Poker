import basePortfolio from './portfolio.json'
import overridesData from './generated/overrides.json'

export type Suit = 'spades' | 'hearts' | 'clubs' | 'diamonds'

export interface CardAction {
  label: string
  href: string
}

/** A titled cluster of bullets within a card (e.g. one job, one project). */
export interface CardGroup {
  heading?: string
  bullets: string[]
}

export interface PortfolioCardData {
  id: string
  label: string
  /** Header + sub-headed bullet groups rendered on the card. */
  groups: CardGroup[]
  accent: string
  suit: Suit
  rank: string
  actions?: CardAction[]
  /** Where the live content came from: 'manual' (base file), 'devpost', or 'linkedin'. */
  source?: string
}

export interface TableSeatData {
  id: string
  cards: PortfolioCardData[]
}

export interface PortfolioOwner {
  name: string
  tagline: string
  links: Record<string, string>
}

/** Fields the fetch pipeline is allowed to overwrite. Identity/layout fields are not. */
type CardOverride = Partial<
  Pick<PortfolioCardData, 'label' | 'groups' | 'actions' | 'source'>
>

interface OverridesFile {
  _meta?: {
    note?: string
    lastUpdated?: string | null
    sources?: Record<string, unknown>
  }
  [cardId: string]: CardOverride | OverridesFile['_meta']
}

const overrides = overridesData as OverridesFile

function mergeCard(base: PortfolioCardData): PortfolioCardData {
  const override = overrides[base.id] as CardOverride | undefined

  if (!override) {
    return { ...base, source: base.source ?? 'manual' }
  }

  return {
    ...base,
    ...override,
    // Arrays replace wholesale when provided, otherwise keep the base value.
    groups: override.groups ?? base.groups,
    actions: override.actions ?? base.actions,
    source: override.source ?? base.source ?? 'manual',
  }
}

export const owner = basePortfolio.owner as PortfolioOwner

export const tableSeats: TableSeatData[] = basePortfolio.seats.map((seat) => ({
  id: seat.id,
  cards: seat.cards.map((card) =>
    mergeCard({ ...card, suit: card.suit as Suit } as PortfolioCardData),
  ),
}))

export const portfolioCards: PortfolioCardData[] = tableSeats.flatMap(
  (seat) => seat.cards,
)

const byId = new Map(portfolioCards.map((card) => [card.id, card]))
const pickSections = (ids: string[]): PortfolioCardData[] =>
  ids
    .map((id) => byId.get(id))
    .filter((card): card is PortfolioCardData => Boolean(card))

/** The five seat "hands" — the most important sections, always available to flip. */
export const seatSections: PortfolioCardData[] = pickSections([
  'about',
  'work',
  'projects',
  'skills',
  'education',
])

/**
 * Supporting sections revealed on the community board, in deal order:
 * flop = [extracurriculars, certifications, awards], turn = [hobbies],
 * river = [contact].
 */
export const communitySections: PortfolioCardData[] = pickSections([
  'extracurriculars',
  'certifications',
  'awards',
  'hobbies',
  'contact',
])

export const lastDataUpdate: string | null =
  overrides._meta?.lastUpdated ?? null
