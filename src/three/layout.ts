import { portfolioCards, tableSeats } from '../data/portfolio'
import type { PortfolioCardData } from '../data/portfolio'

/** World units. The felt sits at y = 0; camera looks down from +Z/+Y. */
export const TABLE = {
  /** Felt ellipse radii (x across, z depth). */
  rx: 6,
  rz: 4,
  /** Felt top surface height. */
  topY: 0,
  /** Thickness of the wooden skirt below the felt. */
  skirt: 0.9,
  /** Padded rail tube radius. */
  railTube: 0.42,
}

export const CARD = {
  w: 0.92,
  h: 1.3,
  thickness: 0.025,
  /** Resting height above the felt. */
  restY: 0.04,
}

/**
 * Seat angles in degrees. 90 = far center (-Z), 270 = nearest the camera (+Z),
 * 0 = +X (right), 180 = -X (left). The camera sits to the south (+Z) looking north.
 */
const SEAT_ANGLES: Record<string, number> = {
  'seat-north': 90,
  'seat-northwest': 143,
  'seat-northeast': 37,
  'seat-southwest': 212,
  'seat-southeast': 328,
}

/** How far out along the ellipse each seat's cards rest (1 = felt edge). */
const SEAT_RADIUS_FACTOR = 0.74

export interface CardLayout {
  card: PortfolioCardData
  seatId: string
  /** Resting world position [x, y, z] on the felt. */
  position: [number, number, number]
  /** Resting yaw (radians) — small fan so a seat's two cards splay apart. */
  yaw: number
  /** Order the dealer flicks the cards out. */
  dealIndex: number
}

function polar(angleDeg: number, factor: number): [number, number] {
  const a = (angleDeg * Math.PI) / 180
  const x = TABLE.rx * factor * Math.cos(a)
  const z = -TABLE.rz * factor * Math.sin(a)
  return [x, z]
}

/**
 * Build the flat list of cards with their resting transforms. Two cards per
 * seat sit side by side, fanned slightly, with their tops pointing toward the
 * camera so every label reads upright.
 */
export const cardLayouts: CardLayout[] = (() => {
  const layouts: CardLayout[] = []

  tableSeats.forEach((seat) => {
    const angle = SEAT_ANGLES[seat.id] ?? 90
    const [cx, cz] = polar(angle, SEAT_RADIUS_FACTOR)
    // Spread the pair left/right relative to the camera (along world X).
    const spread = CARD.w * 0.62

    seat.cards.forEach((card, i) => {
      const offset = (i - (seat.cards.length - 1) / 2) * spread
      layouts.push({
        card,
        seatId: seat.id,
        position: [cx + offset, CARD.restY, cz],
        yaw: (i === 0 ? 1 : -1) * 0.12,
        dealIndex: 0, // assigned below
      })
    })
  })

  // Deal order: round-robin so it looks like a real deal (one card per seat,
  // then the second to each seat).
  const bySeat = new Map<string, CardLayout[]>()
  layouts.forEach((l) => {
    const arr = bySeat.get(l.seatId) ?? []
    arr.push(l)
    bySeat.set(l.seatId, arr)
  })
  const seatOrder = tableSeats.map((s) => s.id)
  let deal = 0
  for (let round = 0; round < 2; round += 1) {
    seatOrder.forEach((seatId) => {
      const arr = bySeat.get(seatId)
      if (arr && arr[round]) {
        arr[round].dealIndex = deal
        deal += 1
      }
    })
  }

  return layouts
})()

export const TOTAL_CARDS = portfolioCards.length

/** Deck origin — in front of the dealer (camera side), where cards fly from. */
export const DECK_POSITION: [number, number, number] = [0, CARD.restY, TABLE.rz * 0.42]

/** Default camera position (widescreen). CameraController pulls it back on narrow screens. */
export const CAMERA_HOME: [number, number, number] = [0, 8.2, 10.1]

export interface SeatSpot {
  seatId: string
  /** Center of the seat's cards on the felt. */
  x: number
  z: number
  angle: number
}

/** One anchor per seat — used to place chip stacks beside each player's cards. */
export const seatSpots: SeatSpot[] = tableSeats.map((seat) => {
  const angle = SEAT_ANGLES[seat.id] ?? 90
  const [x, z] = polar(angle, SEAT_RADIUS_FACTOR)
  return { seatId: seat.id, x, z, angle }
})

export interface PlayerSpot {
  seatId: string
  x: number
  z: number
  /** Yaw so a model built facing +Z turns to face the table center. */
  faceYaw: number
  /** Stable 0..1 used to vary skin/shirt per seat. */
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
