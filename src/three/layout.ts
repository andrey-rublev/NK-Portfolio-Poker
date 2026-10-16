import {
  communitySections,
  seatSections,
  tableSeats,
} from '../data/portfolio'
import type { PortfolioCardData } from '../data/portfolio'

/**
 * Compact view for phones (decided once at load): the table is squeezed
 * narrower — closer to a circle — so it needs far less horizontal field of
 * view and the camera can sit closer on tall/narrow screens.
 */
export const COMPACT_VIEW =
  typeof window !== 'undefined' &&
  Math.min(window.innerWidth, window.innerHeight) < 700

/** Height of the casino floor; the felt sits at y = 0. */
export const FLOOR = -3.7

/** World units. The felt sits at y = 0; camera looks down from +Z/+Y. */
export const TABLE = {
  rx: COMPACT_VIEW ? 5.1 : 6,
  rz: 4,
  topY: 0,
  skirt: 0.9,
  railTube: 0.42,
}

/**
 * The padded rail: its centre line is an ellipse just outside the felt, and
 * its cross-section is a rounded rectangle `halfW` across (radially) and
 * `halfH` tall about height `y`.
 */
export const RAIL = {
  rx: TABLE.rx + 0.12,
  rz: TABLE.rz + 0.12,
  y: TABLE.topY + 0.16,
  halfW: 0.42,
  halfH: 0.3,
  corner: 0.14,
}

export const CARD = {
  w: 1.0,
  h: 1.42,
  thickness: 0.03,
  /** Resting height above the felt. */
  restY: 0.05,
}

const SEAT_ANGLES: Record<string, number> = {
  'seat-north': 90,
  'seat-northwest': 143,
  'seat-northeast': 37,
  'seat-southwest': 212,
  'seat-southeast': 328,
}

const SEAT_RADIUS_FACTOR = 0.7

/** Order the five seats are filled with sections / dealt. */
const SEAT_ORDER = [
  'seat-southwest',
  'seat-northwest',
  'seat-north',
  'seat-northeast',
  'seat-southeast',
]

function polar(angleDeg: number, factor: number): [number, number] {
  const a = (angleDeg * Math.PI) / 180
  return [TABLE.rx * factor * Math.cos(a), -TABLE.rz * factor * Math.sin(a)]
}

export type CardRole = 'label' | 'info' | 'community'

export interface CardSlot {
  id: string
  section: PortfolioCardData
  role: CardRole
  /** Cards sharing a hand flip together (seatId, or 'board' for community). */
  handId: string
  position: [number, number, number]
  yaw: number
  /** Order this card flies out of the deck during the initial deal. */
  dealIndex: number
}

/**
 * Five seat hands. Each seat shows ONE section across two cards: a labeled card
 * (section name) and an info card (the details). Clicking either flips both.
 */
export const seatCards: CardSlot[] = (() => {
  const slots: CardSlot[] = []
  const half = (CARD.w * 1.18) / 2

  seatSections.forEach((section, i) => {
    const seatId = SEAT_ORDER[i] ?? `seat-${i}`
    const angle = SEAT_ANGLES[seatId] ?? 90
    const [cx, cz] = polar(angle, SEAT_RADIUS_FACTOR)
    const a = (angle * Math.PI) / 180
    // Spin the hand so each card's long axis points outward toward the player
    // (short edge faces them, not the dealer), and spread the pair along the
    // tangent so the two cards sit side by side from that player's viewpoint.
    const yaw = Math.atan2(-Math.cos(a), Math.sin(a))
    let tx = -Math.sin(a)
    let tz = -Math.cos(a)
    // Keep the info card on the camera-right (+X) and the label on the left for
    // every seat (matching the focus layout) so a hand's two cards never cross
    // paths — and z-fight — on the way back down to the table.
    if (tx < 0) {
      tx = -tx
      tz = -tz
    }
    slots.push({
      id: `${seatId}-label`,
      section,
      role: 'label',
      handId: seatId,
      position: [cx - tx * half, CARD.restY, cz - tz * half],
      yaw,
      dealIndex: i, // first round: one labeled card per seat
    })
    slots.push({
      id: `${seatId}-info`,
      section,
      role: 'info',
      handId: seatId,
      position: [cx + tx * half, CARD.restY, cz + tz * half],
      yaw,
      dealIndex: seatSections.length + i, // second round
    })
  })

  return slots
})()

export interface CommunitySlot extends CardSlot {
  stage: 'flop' | 'turn' | 'river'
  boardIndex: number
}

/**
 * Board cards lie a little smaller on the narrow phone table, where five
 * full-size cards in a row would run into the side players' hands.
 */
export const BOARD_SCALE = COMPACT_VIEW ? 0.92 : 1

/**
 * The five community cards, laid out in a row across the middle of the felt,
 * clear of the hands either side, with the pot between them and the deck.
 */
export const communityCards: CommunitySlot[] = communitySections.map(
  (section, i) => {
    const spacing = CARD.w * BOARD_SCALE * (COMPACT_VIEW ? 1.1 : 1.14)
    const x = (i - (communitySections.length - 1) / 2) * spacing
    return {
      id: `community-${section.id}`,
      section,
      role: 'community',
      handId: 'board',
      position: [x, CARD.restY, COMPACT_VIEW ? -0.1 : -0.2],
      yaw: 0,
      dealIndex: i,
      stage: i < 3 ? 'flop' : i === 3 ? 'turn' : 'river',
      boardIndex: i,
    }
  },
)

/** The board card with the contact details, which the page's Contact button lifts. */
export const CONTACT_CARD_KEY = communityCards.find((s) => s.section.id === 'contact')?.id ?? null

/** Deck origin — front-center toward the dealer, clear of every seat and stack. */
export const DECK_POSITION: [number, number, number] = [
  0,
  CARD.restY,
  TABLE.rz * 0.66,
]

/** Cards in the deck. It never shrinks, so its top is always the same height. */
export const DECK_CARDS = 12

/**
 * Where a card waits to be dealt: lying on the top of the deck, one card's
 * spacing above its top card. Cards are dealt off the TOP of the deck (not the
 * base — no "bottom dealing").
 */
export const DECK_TOP: [number, number, number] = [
  DECK_POSITION[0],
  CARD.restY + DECK_CARDS * CARD.thickness * 1.04,
  DECK_POSITION[2],
]

/**
 * Burn cards stack face-down to the left of the pot, clear of its chips, the
 * board and the near-left seat's hand (closer in on the narrower phone table).
 * They're the board's size.
 */
export const BURN_POSITION: [number, number, number] = COMPACT_VIEW ? [-1.3, CARD.restY, 1.45] : [-1.4, CARD.restY, 1.55]

/** The dealer button, to the right of the pot. */
export const BUTTON_POSITION: [number, number] = COMPACT_VIEW ? [1.9, 1.3] : [2.1, 1.75]

export interface SeatAnchor {
  seatId: string
  section: PortfolioCardData
  x: number
  z: number
}

/**
 * Nameplate anchor in front of each player (the section is that seat's "name").
 * Pushed out past the cards (factor 1.0, vs the hand's 0.7) so the floating
 * plate sits in front of the player rather than hovering over the near seats'
 * (about / education) cards.
 */
export const seatAnchors: SeatAnchor[] = seatSections.map((section, i) => {
  const seatId = SEAT_ORDER[i] ?? `seat-${i}`
  const [x, z] = polar(SEAT_ANGLES[seatId] ?? 90, 1.0)
  return { seatId, section, x, z }
})

export const CAMERA_HOME: [number, number, number] = [0, 7.1, 8.9]

export interface ChipSpot {
  seatId: string
  x: number
  z: number
}

/**
 * One chip stack per seat, placed beside the player's two-card hand. We start
 * from the hand CENTRE (same radius as the cards) and slide tangentially along
 * the rail until the stack clears the hand footprint (half-span ≈ 1.1u + chip
 * radius), then clamp the result inside the felt ellipse so the stack never
 * lands on the cards and never pokes through the table edge.
 */
export const chipSpots: ChipSpot[] = SEAT_ORDER.map((seatId) => {
  const angle = SEAT_ANGLES[seatId] ?? 90
  const a = (angle * Math.PI) / 180
  const [hx, hz] = polar(angle, SEAT_RADIUS_FACTOR) // hand centre
  // Unit tangent of the seat ellipse (direction along the rail).
  let tx = -TABLE.rx * Math.sin(a)
  let tz = -TABLE.rz * Math.cos(a)
  const tl = Math.hypot(tx, tz) || 1
  tx /= tl
  tz /= tl
  let x = hx + tx * 1.8
  let z = hz + tz * 1.8
  // Keep the stack (plus its radius) comfortably inside the felt.
  const maxF = 0.85
  const f = Math.hypot(x / TABLE.rx, z / TABLE.rz)
  if (f > maxF) {
    x *= maxF / f
    z *= maxF / f
  }
  return { seatId, x, z }
})

/** Blinds + a bet stack sit on the betting line in front of two seats. */
export const BETTING_LINE_FACTOR = 0.46

export interface PlayerSpot {
  seatId: string
  x: number
  z: number
  faceYaw: number
  variant: number
}

/** How far each player sits back from the rail's centre line. */
export const PLAYER_SETBACK = 1.3

/**
 * One seated player behind each seat, squared up to the rail: every player
 * sits the same distance back from it and faces straight across it, so their
 * forearms rest on it the same way all round the table.
 */
export const playerSpots: PlayerSpot[] = tableSeats.map((seat, i) => {
  const a = ((SEAT_ANGLES[seat.id] ?? 90) * Math.PI) / 180
  // The rail's outward normal where the seat meets it.
  const nx = Math.cos(a) / RAIL.rx
  const nz = -Math.sin(a) / RAIL.rz
  const nl = Math.hypot(nx, nz)
  return {
    seatId: seat.id,
    x: RAIL.rx * Math.cos(a) + (nx / nl) * PLAYER_SETBACK,
    z: -RAIL.rz * Math.sin(a) + (nz / nl) * PLAYER_SETBACK,
    faceYaw: Math.atan2(-nx, -nz),
    variant: i / Math.max(1, tableSeats.length - 1),
  }
})