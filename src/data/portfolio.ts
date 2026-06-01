import basePortfolio from './portfolio.json'
import overridesData from './generated/overrides.json'

export type Suit = 'spades' | 'hearts' | 'clubs' | 'diamonds'

export interface CardAction {
  label: string
  href: string
}

export interface PortfolioCardData {
  id: string
  label: string
  title: string
  teaser: string
  detail: string
  bullets: string[]
  tags: string[]
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
  Pick<
    PortfolioCardData,
    'label' | 'title' | 'teaser' | 'detail' | 'bullets' | 'tags' | 'actions' | 'source'
  >
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
    bullets: override.bullets ?? base.bullets,
    tags: override.tags ?? base.tags,
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

export const lastDataUpdate: string | null =
  overrides._meta?.lastUpdated ?? null
