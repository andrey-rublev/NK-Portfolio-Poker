import {
  communitySections,
  seatSections,
  tableSeats,
} from '../data/portfolio'
import type { PortfolioCardData } from '../data/portfolio'

/** World units. The felt sits at y = 0; camera looks down from +Z/+Y. */
export const TABLE = {
  rx: 6,
  rz: 4,
  topY: 0,
  skirt: 0.9,
  railTube: 0.42,
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
  const spread = CARD.w * 1.18

  seatSections.forEach((section, i) => {
    const seatId = SEAT_ORDER[i] ?? `seat-${i}`
    const [cx, cz] = polar(SEAT_ANGLES[seatId] ?? 90, SEAT_RADIUS_FACTOR)
    slots.push({
      id: `${seatId}-label`,
      section,
      role: 'label',
      handId: seatId,
      position: [cx - spread / 2, CARD.restY, cz],
      yaw: 0.04,
      dealIndex: i, // first round: one labeled card per seat
    })
    slots.push({
      id: `${seatId}-info`,
      section,
      role: 'info',
      handId: seatId,
      position: [cx + spread / 2, CARD.restY, cz],
      yaw: -0.04,
      dealIndex: seatSections.length + i, // second round
    })
  })

  return slots
})()

export interface CommunitySlot extends CardSlot {
  stage: 'flop' | 'turn' | 'river'
  boardIndex: number
}

/** The five community cards, laid out in a row across the middle of the felt. */
export const communityCards: CommunitySlot[] = communitySections.map(
  (section, i) => {
    const spacing = CARD.w * 1.14
    const x = (i - (communitySections.length - 1) / 2) * spacing
    return {
      id: `community-${section.id}`,
      section,
      role: 'community',
      handId: 'board',
      position: [x, CARD.restY, -TABLE.rz * 0.12],
      yaw: 0,
      dealIndex: i,
      stage: i < 3 ? 'flop' : i === 3 ? 'turn' : 'river',
      boardIndex: i,
    }
  },
)

/** Deck origin — in front of the dealer (camera side), where cards fly from. */
export const DECK_POSITION: [number, number, number] = [
  TABLE.rx * 0.34,
  CARD.restY,
  TABLE.rz * 0.5,
]

/** Where burn cards get tossed, beside the deck. */
export const BURN_POSITION: [number, number, number] = [
  TABLE.rx * 0.34 - 0.5,
  CARD.restY,
  TABLE.rz * 0.5 - 0.3,
]

export const CAMERA_HOME: [number, number, number] = [0, 7.1, 8.9]

export interface ChipSpot {
  seatId: string
  x: number
  z: number
}

/** A chip stack beside each seat, kept inside the felt so nothing clips the rail. */
export const chipSpots: ChipSpot[] = SEAT_ORDER.map((seatId) => {
  const angle = SEAT_ANGLES[seatId] ?? 90
  const a = (angle * Math.PI) / 180
  const [bx, bz] = polar(angle, 0.78)
  const tx = -TABLE.rx * Math.sin(a)
  const tz = -TABLE.rz * Math.cos(a)
  const tl = Math.hypot(tx, tz) || 1
  return { seatId, x: bx + (tx / tl) * 0.62, z: bz + (tz / tl) * 0.62 }
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

/** One seated player just outside the rail behind each seat, facing the table. */
export const playerSpots: PlayerSpot[] = tableSeats.map((seat, i) => {
  const angle = SEAT_ANGLES[seat.id] ?? 90
  const [x, z] = polar(angle, 1.16)
  return {
    seatId: seat.id,
    x,
    z,
    faceYaw: Math.atan2(-x, -z),
    variant: i / Math.max(1, tableSeats.length - 1),
  }
})
