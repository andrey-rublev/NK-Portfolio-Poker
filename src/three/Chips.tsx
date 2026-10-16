import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { BUTTON_POSITION, COMPACT_VIEW, TABLE, chipSpots } from './layout'
import { getChipTextures } from './chipTexture'
import { frameStep } from './frame'

/** Each seat's three stacks, by denomination. */
const CHIPS = [
  { color: '#b8232b', value: '5' },
  { color: '#1d7446', value: '25' },
  { color: '#202227', value: '100' },
]
const CHIP_R = 0.2
const CHIP_H = 0.045
/** Radius of the rounding where the rim meets each face. */
const CHIP_BEVEL = 0.012
/** Where a chip lying on the table rests its bottom face. */
const FELT_Y = TABLE.topY + 0.004

const clamp01 = (v: number) => Math.max(0, Math.min(1, v))
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3)

/** Stable pseudo-random angle so each chip in a stack sits at its own rotation. */
function randRot(n: number): number {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453
  return (s - Math.floor(s)) * Math.PI * 2
}

/** A small, stable offset in [-1, 1], so a stack isn't a perfect column. */
function jitter(n: number): number {
  const s = Math.sin(n * 91.7 + 47.3) * 24634.6345
  return (s - Math.floor(s)) * 2 - 1
}

/**
 * The pot: a wide, shallow oval between the board and the deck, with the burn
 * pile to its left and the dealer button to its right.
 */
const POT_CENTER: [number, number] = COMPACT_VIEW ? [0.4, 1.24] : [0.6, 1.22]
/**
 * Half-widths of the oval a thrown chip can land in (x across, z toward the
 * deck); a little smaller on the phone table, which is narrower.
 */
const POT_RX = COMPACT_VIEW ? 0.95 : 1.2
const POT_RZ = COMPACT_VIEW ? 0.34 : 0.36

/** Each seat's bankroll: how many chips of each denomination (see CHIPS). */
const COUNTS = [
  [12, 6, 14, 9, 5],
  [7, 9, 6, 8, 10],
  [4, 5, 6, 3, 5],
]

/**
 * Each player's bet in each round -- pre-flop, flop, turn, river -- as the
 * chips they throw in (indices into CHIPS): a single chip pre-flop and on the
 * turn, two of different colours on the flop and the river. Everyone bets the
 * same, so every seat needs at least 1 of the 5s, 3 of the 25s and 2 of the
 * 100s.
 */
const BETS = [
  [1],
  [0, 1],
  [2],
  [1, 2],
]
/**
 * Spots each thrown chip tries before settling in the lowest: one that lands
 * on top of the heap slides off it, so the pot spreads out low.
 */
const POT_TRIES = 3
/** The steepest a chip can lean against the pile (radians). */
const MAX_LEAN = 0.3
/** Seconds a thrown chip is in the air. */
const FLIGHT_SECONDS = 0.6
/** Gap between one chip leaving a hand and the next, and between players. */
const THROW_GAP = 0.05
/** Long enough for every chip of a round to land. */
const ROUND_SECONDS = THROW_GAP * 8 + FLIGHT_SECONDS

/**
 * A clay chip: flat faces and a rim rounded over at both edges. Groups: 0 the
 * rim, 1 the top face, 2 the bottom. The rim's texture wraps once round it
 * (u = angle / 2π) and the faces are mapped flat across the chip's full
 * radius, oriented so the edge spots on both meet (see chipTexture).
 */
function buildChipGeometry(): THREE.BufferGeometry {
  const r = CHIP_R
  const h = CHIP_H / 2
  const b = CHIP_BEVEL
  // The rim's profile, bottom face to top face (the order that faces outward).
  const profile: THREE.Vector2[] = []
  for (let i = 0; i <= 4; i += 1) {
    const a = -Math.PI / 2 + (i / 4) * (Math.PI / 2)
    profile.push(new THREE.Vector2(r - b + b * Math.cos(a), -h + b + b * Math.sin(a)))
  }
  for (let i = 0; i <= 4; i += 1) {
    const a = (i / 4) * (Math.PI / 2)
    profile.push(new THREE.Vector2(r - b + b * Math.cos(a), h - b + b * Math.sin(a)))
  }
  const rim = new THREE.LatheGeometry(profile, 48)
  const face = (y: number, flip: boolean) => {
    const g = new THREE.CircleGeometry(r - b, 48).rotateX(flip ? Math.PI / 2 : -Math.PI / 2).translate(0, y, 0)
    const pos = g.getAttribute('position')
    const uv = g.getAttribute('uv')
    for (let i = 0; i < pos.count; i += 1) {
      uv.setXY(i, 0.5 + pos.getX(i) / (2 * r), 0.5 - pos.getZ(i) / (2 * r))
    }
    return g
  }
  const merged = mergeGeometries([rim, face(h, false), face(-h, true)], true)
  rim.dispose()
  return merged
}

/*
 * Every chip of one denomination -- in the players' stacks, in the air and in
 * the pot -- is drawn as a single InstancedMesh, one draw per material group
 * instead of one per chip. The geometry and materials are shared, built once,
 * and kept for the life of the page.
 */
let chipGeometry: THREE.BufferGeometry | null = null
const getChipGeometry = () => (chipGeometry ??= buildChipGeometry())

const materialCache = new Map<string, THREE.MeshStandardMaterial[]>()

/** [rim, top, bottom] -- the chip's three material groups. */
function getChipMaterials(chip: (typeof CHIPS)[number]): THREE.MeshStandardMaterial[] {
  let mats = materialCache.get(chip.value)
  if (!mats) {
    const { face, edge } = getChipTextures(chip.color, chip.value)
    const top = new THREE.MeshStandardMaterial({ map: face, roughness: 0.38, metalness: 0.04 })
    mats = [new THREE.MeshStandardMaterial({ map: edge, roughness: 0.46, metalness: 0.04 }), top, top]
    materialCache.set(chip.value, mats)
  }
  return mats
}

/** Where seat `seat`'s stack of denomination `d` stands. */
function stackSpot(seat: number, d: number): [number, number] {
  const { x, z } = chipSpots[seat]
  const len = Math.hypot(x, z) || 1
  // Tangent (along the rail) and inward (toward the middle) directions.
  const tx = -z / len
  const tz = x / len
  const off = CHIP_R * 1.06
  if (d === 0) return [x - tx * off, z - tz * off]
  if (d === 1) return [x + tx * off, z + tz * off]
  // The third stands in front of the other two, toward the middle.
  return [x - (x / len) * off * 1.75, z - (z / len) * off * 1.75]
}

/* ---------- The pile: how chips come to rest on one another ---------- */

/** A chip lying in the pot: its centre, and the way (u) and steepness its faces slope down. */
interface Landed {
  x: number
  y: number
  z: number
  ux: number
  uz: number
  slope: number
}

/** Height of the pile's surface at (px, pz): the highest chip face there, or the felt. */
function pileTop(pot: Landed[], px: number, pz: number): number {
  let top = FELT_Y
  for (const c of pot) {
    const dx = px - c.x
    const dz = pz - c.z
    if (dx * dx + dz * dz > CHIP_R * CHIP_R) continue
    top = Math.max(top, c.y + CHIP_H / 2 - c.slope * (dx * c.ux + dz * c.uz))
  }
  return top
}

/** Points under a chip where it is checked against the pile: its middle, and two rings. */
const FOOTPRINT: [number, number][] = [[0, 0]]
for (const [r, n] of [[0.5, 6], [0.95, 12]]) {
  for (let i = 0; i < n; i += 1) {
    const a = (i / n) * Math.PI * 2
    FOOTPRINT.push([Math.cos(a) * r * CHIP_R, Math.sin(a) * r * CHIP_R])
  }
}

/**
 * How a chip dropped at (x, z) settles onto the pile: it sits on the highest
 * point under its face, and if that point is off to one side it tips away from
 * it, as far as the chips below allow -- so it never passes through another.
 */
function settle(pot: Landed[], x: number, z: number): Landed {
  const under = FOOTPRINT.map(([fx, fz]) => pileTop(pot, x + fx, z + fz))
  let high = 0
  under.forEach((h, i) => {
    if (h > under[high] + 1e-6) high = i
  })
  const [hx, hz] = FOOTPRINT[high]
  const off = Math.hypot(hx, hz)
  let ux = 0
  let uz = 0
  let slope = 0
  if (off > 0 && under[high] - under[0] > 1e-4) {
    // Held up off-centre: tip away from that point until the face would touch
    // the pile anywhere else.
    ux = -hx / off
    uz = -hz / off
    slope = Math.tan(MAX_LEAN)
    FOOTPRINT.forEach(([fx, fz], i) => {
      const along = (fx - hx) * ux + (fz - hz) * uz
      if (along > 1e-6) slope = Math.min(slope, (under[high] - under[i]) / along)
    })
  }
  return { x, y: under[high] - slope * off + CHIP_H / 2, z, ux, uz, slope }
}

/* ---------- The hand's chips, worked out once ---------- */

interface Pose {
  p: THREE.Vector3
  q: THREE.Quaternion
}

const Y_AXIS = new THREE.Vector3(0, 1, 0)
const X_AXIS = new THREE.Vector3(1, 0, 0)
const _tilt = new THREE.Vector3()

/** A chip lying as `at` describes, turned `yaw` about its own axis. */
function poseOf(at: Landed, yaw: number): Pose {
  const q = new THREE.Quaternion().setFromAxisAngle(Y_AXIS, yaw)
  if (at.slope > 0) q.premultiply(new THREE.Quaternion().setFromAxisAngle(_tilt.set(at.uz, 0, -at.ux), Math.atan(at.slope)))
  return { p: new THREE.Vector3(at.x, at.y, at.z), q }
}

/** A chip a player bets: which stack chip it is, when it goes, and where it lands. */
interface Bet {
  d: number
  round: number
  /** The chip in the player's stack (an index into that denomination's stack chips). */
  stackChip: number
  /** Seconds into the round before it leaves the player's hand. */
  delay: number
  land: Pose
}

/**
 * Every chip of the hand: the players' stacks, and the chips they bet, round
 * by round. Each bet is the top chip of the player's stack, so the stacks go
 * down as the hand goes on. A round's bets land on and around the chips
 * already in the pot, and stay where they land.
 */
function handPlan(): { stacks: Pose[][]; bets: Bet[] } {
  let s = 17
  const rand = () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }

  // The players' stacks, bottom chip first, and each stack's current top.
  const stacks: Pose[][] = CHIPS.map(() => [])
  const top: number[][] = CHIPS.map(() => [])
  chipSpots.forEach((_, seat) => {
    CHIPS.forEach((_, d) => {
      const [x, z] = stackSpot(seat, d)
      for (let i = 0; i < COUNTS[d][seat]; i += 1) {
        const n = seat * 97 + d * 31 + i
        stacks[d].push({
          p: new THREE.Vector3(x + jitter(n) * 0.006, FELT_Y + CHIP_H / 2 + i * CHIP_H, z + jitter(n + 0.5) * 0.006),
          q: new THREE.Quaternion().setFromAxisAngle(Y_AXIS, randRot(n)),
        })
      }
      top[d][seat] = stacks[d].length - 1
    })
  })

  const bets: Bet[] = []
  // The chips in the pot.
  const pile: Landed[] = []
  BETS.forEach((bet, round) => {
    chipSpots.forEach((_, seat) => {
      bet.forEach((d, k) => {
        let at: Landed | null = null
        for (let t = 0; t < POT_TRIES; t += 1) {
          const a = rand() * Math.PI * 2
          const r = Math.sqrt(rand())
          const tried = settle(pile, POT_CENTER[0] + Math.cos(a) * r * POT_RX, POT_CENTER[1] + Math.sin(a) * r * POT_RZ)
          if (!at || tried.y < at.y) at = tried
        }
        pile.push(at!)
        bets.push({ d, round, stackChip: top[d][seat], delay: (seat + k) * THROW_GAP, land: poseOf(at!, rand() * Math.PI * 2) })
        top[d][seat] -= 1
      })
    })
  })
  return { stacks, bets }
}

const _chip = new THREE.Object3D()
const _q = new THREE.Quaternion()
const _qTumble = new THREE.Quaternion()

/**
 * Every chip on the table after `rounds` rounds of betting (pre-flop as the
 * hand is dealt, then the flop, turn and river): the stacks in front of each
 * player, and the pot. In each round every player throws the same bet (see
 * BETS) off the tops of their stacks into the pot, onto the chips already
 * there.
 */
function TableChips({ rounds }: { rounds: number }) {
  // Seconds since the latest round began (it starts long settled).
  const clock = useRef(Infinity)
  const prev = useRef(rounds)
  const meshes = useRef<(THREE.InstancedMesh | null)[]>([])
  const invalidate = useThree((s) => s.invalidate)
  const plan = useMemo(() => handPlan(), [])

  useEffect(() => {
    if (rounds > prev.current) clock.current = 0
    prev.current = rounds
    invalidate()
  }, [rounds, invalidate])

  useFrame((state, delta) => {
    if (clock.current < ROUND_SECONDS) {
      clock.current += frameStep(delta)
      state.invalidate()
    }
    const t = clock.current
    const now = rounds - 1 // the round being bet, or last bet
    const counts = CHIPS.map(() => 0)
    const put = (d: number, p: THREE.Vector3, q: THREE.Quaternion) => {
      const mesh = meshes.current[d]
      if (!mesh) return
      _chip.position.copy(p)
      _chip.quaternion.copy(q)
      _chip.updateMatrix()
      mesh.setMatrixAt(counts[d], _chip.matrix)
      counts[d] += 1
    }

    // Which stack chips have been bet (and so are no longer in the stacks).
    const thrown = plan.stacks.map((list) => new Uint8Array(list.length))
    for (const b of plan.bets) {
      if (b.round > now) continue
      let f = 1
      if (b.round === now) {
        f = clamp01((t - b.delay) / FLIGHT_SECONDS)
        if (f <= 0) continue
      }
      thrown[b.d][b.stackChip] = 1
      if (f < 1) {
        // In the air: off the top of the stack, tumbling end over end in an
        // arc, and settling into the pose it lands in.
        const from = plan.stacks[b.d][b.stackChip]
        const p = easeOut(f)
        _chip.position.lerpVectors(from.p, b.land.p, p)
        _chip.position.y += Math.sin(f * Math.PI) * 0.95
        _q.slerpQuaternions(from.q, b.land.q, p).multiply(_qTumble.setFromAxisAngle(X_AXIS, (1 - p) * Math.PI * 2))
        put(b.d, _chip.position, _q)
      } else {
        put(b.d, b.land.p, b.land.q)
      }
    }
    plan.stacks.forEach((list, d) => {
      list.forEach((c, i) => {
        if (!thrown[d][i]) put(d, c.p, c.q)
      })
    })

    meshes.current.forEach((mesh, d) => {
      if (!mesh) return
      mesh.count = counts[d]
      mesh.instanceMatrix.needsUpdate = true
    })
  })

  // Not frustum-culled: the instances move, which would leave a cached bounding
  // sphere stale. The chips are always on screen anyway.
  return (
    <>
      {CHIPS.map((chip, d) => (
        <instancedMesh
          key={chip.value}
          ref={(m) => {
            meshes.current[d] = m
          }}
          args={[getChipGeometry(), getChipMaterials(chip), plan.stacks[d].length]}
          count={0}
          frustumCulled={false}
          castShadow
          receiveShadow
        />
      ))}
    </>
  )
}

/** Top face of the dealer button: cream disc, navy rings, bold "D". */
function dealerTopTexture(): THREE.Texture {
  const S = 256
  const c = document.createElement('canvas')
  c.width = c.height = S
  const ctx = c.getContext('2d')!
  const cx = S / 2
  ctx.fillStyle = '#f1ece0'
  ctx.beginPath()
  ctx.arc(cx, cx, S / 2 - 2, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = '#1f3a6b'
  ctx.lineWidth = 11
  ctx.beginPath()
  ctx.arc(cx, cx, S / 2 - 16, 0, Math.PI * 2)
  ctx.stroke()
  ctx.lineWidth = 5
  ctx.beginPath()
  ctx.arc(cx, cx, S / 2 - 34, 0, Math.PI * 2)
  ctx.stroke()
  ctx.fillStyle = '#1f3a6b'
  ctx.font = '900 150px "Mulish Variable", system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('D', cx, cx + 8)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.needsUpdate = true
  return tex
}

/** The single dealer button, lying flat on the felt with the "D" reading upright. */
function DealerButton({ position }: { position: [number, number, number] }) {
  const top = useMemo(() => dealerTopTexture(), [])
  return (
    <mesh position={position} rotation-y={Math.PI / 2} castShadow receiveShadow>
      <cylinderGeometry args={[0.24, 0.24, CHIP_H * 1.3, 40]} />
      <meshStandardMaterial attach="material-0" color="#e7e1d2" roughness={0.5} />
      <meshStandardMaterial attach="material-1" map={top} roughness={0.45} />
      <meshStandardMaterial attach="material-2" color="#e7e1d2" roughness={0.5} />
    </mesh>
  )
}

/**
 * The chips -- players' stacks and the pot -- after `rounds` rounds of
 * betting, and the dealer button.
 */
export function Chips({ rounds }: { rounds: number }) {
  return (
    <>
      <TableChips rounds={rounds} />
      <DealerButton position={[BUTTON_POSITION[0], FELT_Y + (CHIP_H * 1.3) / 2, BUTTON_POSITION[1]]} />
    </>
  )
}
