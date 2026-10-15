import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { CARD, chipSpots } from './layout'
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

const lerp = THREE.MathUtils.lerp
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
 * The pot sits just right of centre, in front of the board; the burn pile is
 * to its left and the deck in front.
 */
const POT_CENTER: [number, number] = [0.65, 1.15]

/** Differing bankrolls per seat: how many chips of each denomination (see CHIPS). */
const COUNTS = [
  [12, 6, 15, 9, 4],
  [3, 8, 2, 5, 6],
  [2, 3, 5, 1, 4],
]

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
 * Every chip of one denomination is drawn as a single InstancedMesh -- one draw
 * per material group instead of one per chip -- so the geometry and materials
 * are shared, built once, and kept for the life of the page.
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

const _chip = new THREE.Object3D()

/** A static set of chips of one denomination, one instance per chip. */
function ChipInstances({ chip, matrices }: { chip: (typeof CHIPS)[number]; matrices: THREE.Matrix4[] }) {
  const ref = useRef<THREE.InstancedMesh>(null)
  useLayoutEffect(() => {
    const m = ref.current
    if (!m) return
    matrices.forEach((matrix, i) => m.setMatrixAt(i, matrix))
    m.instanceMatrix.needsUpdate = true
    m.computeBoundingSphere()
  }, [matrices])
  return (
    <instancedMesh
      ref={ref}
      args={[getChipGeometry(), getChipMaterials(chip), matrices.length]}
      castShadow
      receiveShadow
    />
  )
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

/**
 * Three stacks in front of each seat -- two side by side along the rail and a
 * third in front of them -- each a hair out of true, as hand-stacked chips are.
 */
function SeatStacks() {
  const stacks = useMemo(
    () =>
      CHIPS.map((_, d) => {
        const out: THREE.Matrix4[] = []
        chipSpots.forEach((_, seat) => {
          const [x, z] = stackSpot(seat, d)
          const count = COUNTS[d][seat % COUNTS[d].length]
          for (let i = 0; i < count; i += 1) {
            const n = seat * 97 + d * 31 + i
            _chip.position.set(x + jitter(n) * 0.006, CARD.restY + CHIP_H / 2 + i * CHIP_H, z + jitter(n + 0.5) * 0.006)
            _chip.rotation.set(0, randRot(n), 0)
            _chip.updateMatrix()
            out.push(_chip.matrix.clone())
          }
        })
        return out
      }),
    [],
  )
  return (
    <>
      {CHIPS.map((chip, d) => (
        <ChipInstances key={chip.value} chip={chip} matrices={stacks[d]} />
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
 * Each player's bet in each round -- pre-flop, flop, turn, river -- as the
 * chips they throw in (indices into CHIPS). Everyone bets the same.
 */
const BETS = [
  [0, 1],
  [0, 1, 1],
  [0, 1, 2],
  [1, 2, 2],
]
const WORTH = [5, 25, 100]
/** How far from the pot's middle a thrown chip can land. */
const POT_SPREAD = 0.5
/**
 * Spots each thrown chip tries before settling in the lowest: one that lands
 * on top of the heap slides off it, so the pot stays a low mound.
 */
const POT_TRIES = 3
/** The steepest a chip can lean against the pile (radians). */
const MAX_LEAN = 0.3
/** Chips per stack once the dealer has tidied the pot. */
const STACK_MAX = 5
/** Where the dealer's tidy stacks stand, round the pot's middle. */
const STACK_SLOTS: [number, number][] = [[0, 0]]
for (let i = 0; i < 6; i += 1) {
  const a = (i / 6) * Math.PI * 2 + Math.PI / 6
  STACK_SLOTS.push([Math.cos(a) * 0.42, Math.sin(a) * 0.42])
}
/** Seconds the dealer takes to gather the last round's chips into stacks. */
const GATHER_SECONDS = 0.45
/** The next bets start flying this far into the gather. */
const THROW_START = GATHER_SECONDS * 0.6
/** Seconds a thrown chip is in the air. */
const FLIGHT_SECONDS = 0.6
/** Gap between one chip leaving a hand and the next, and between players. */
const THROW_GAP = 0.05
/** Long enough for a round's gather and every throw to finish. */
const ROUND_SECONDS = THROW_START + THROW_GAP * 8 + FLIGHT_SECONDS

/** A chip thrown into the pot in one round. */
interface Throw {
  d: number
  /** Seconds into the round's throwing before it leaves the player's hand. */
  delay: number
  from: [number, number, number]
  land: [number, number, number]
  /** How it lies once it lands: leaning, and turned about its own axis. */
  rest: THREE.Quaternion
}

/** A chip in one of the dealer's tidy stacks. */
interface Stacked {
  d: number
  at: [number, number, number]
  rest: THREE.Quaternion
}

/** A chip in the pot: its centre, and the way (u) and steepness its faces slope down. */
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
  let top = CARD.restY
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

const X_AXIS = new THREE.Vector3(1, 0, 0)
const Y_AXIS = new THREE.Vector3(0, 1, 0)
const _tilt = new THREE.Vector3()
const _qTumble = new THREE.Quaternion()
const _qFlight = new THREE.Quaternion()
const smooth = THREE.MathUtils.smoothstep

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

/**
 * The whole hand's pot, worked out once: the chips thrown in each round, and
 * the tidy stacks the dealer makes of everything bet by the end of each round,
 * colouring up to as few chips as the total allows -- so the pot shrinks back
 * down before the next round's bets land on and around it.
 */
function potPlan(): { throws: Throw[][]; stacks: Stacked[][] } {
  let s = 17
  const rand = () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
  const throws: Throw[][] = []
  const stacks: Stacked[][] = []
  let total = 0
  BETS.forEach((bet, round) => {
    // This round's chips settle onto the stacks left by the rounds before.
    const pile: Landed[] = (stacks[round - 1] ?? []).map(({ at }) => ({ x: at[0], y: at[1], z: at[2], ux: 0, uz: 0, slope: 0 }))
    const thrown: Throw[] = []
    chipSpots.forEach((_, seat) => {
      bet.forEach((d, k) => {
        let chip: Landed | null = null
        for (let t = 0; t < POT_TRIES; t += 1) {
          const a = rand() * Math.PI * 2
          const r = POT_SPREAD * Math.sqrt(rand())
          const tried = settle(pile, POT_CENTER[0] + Math.cos(a) * r, POT_CENTER[1] + Math.sin(a) * r)
          if (!chip || tried.y < chip.y) chip = tried
        }
        const { x, y, z, ux, uz, slope } = chip!
        pile.push(chip!)
        const rest = new THREE.Quaternion().setFromAxisAngle(Y_AXIS, rand() * Math.PI * 2)
        if (slope > 0) rest.premultiply(new THREE.Quaternion().setFromAxisAngle(_tilt.set(uz, 0, -ux), Math.atan(slope)))
        const [sx, sz] = stackSpot(seat, d)
        thrown.push({
          d,
          delay: (seat + k) * THROW_GAP,
          from: [sx, CARD.restY + COUNTS[d][seat % COUNTS[d].length] * CHIP_H + 0.02, sz],
          land: [x, y, z],
          rest,
        })
        total += WORTH[d]
      })
    })
    throws.push(thrown)

    // The dealer's stacks of the pot so far: the biggest chips first, each
    // denomination starting a stack of its own.
    const stacked: Stacked[] = []
    let left = total
    let slot = -1
    for (let d = CHIPS.length - 1; d >= 0; d -= 1) {
      const n = Math.floor(left / WORTH[d])
      left -= n * WORTH[d]
      for (let i = 0; i < n; i += 1) {
        if (i % STACK_MAX === 0) slot += 1
        const [ox, oz] = STACK_SLOTS[slot % STACK_SLOTS.length]
        const level = i % STACK_MAX
        const n0 = round * 97 + slot * 13 + level
        stacked.push({
          d,
          at: [
            POT_CENTER[0] + ox + jitter(n0) * 0.008,
            CARD.restY + CHIP_H / 2 + level * CHIP_H,
            POT_CENTER[1] + oz + jitter(n0 + 0.5) * 0.008,
          ],
          rest: new THREE.Quaternion().setFromAxisAngle(Y_AXIS, rand() * Math.PI * 2),
        })
      }
    }
    stacks.push(stacked)
  })
  return { throws, stacks }
}

/**
 * The pot. In each betting round -- pre-flop as the hand is dealt, then the
 * flop, turn and river -- every player throws in the same bet, a few chips of
 * different colours, and they heap up in the middle. As the next round starts
 * the dealer gathers those loose chips into a few tidy stacks of bigger chips,
 * so the pot never grows over the board. Each denomination's pot chips are one
 * InstancedMesh.
 */
function Pot({ rounds }: { rounds: number }) {
  // Seconds since the latest round began (it starts long settled).
  const clock = useRef(Infinity)
  const prev = useRef(rounds)
  const meshes = useRef<(THREE.InstancedMesh | null)[]>([])
  const invalidate = useThree((s) => s.invalidate)
  const plan = useMemo(() => potPlan(), [])
  const capacity = useMemo(
    () => CHIPS.map((_, d) => [...plan.throws.flat(), ...plan.stacks.flat()].filter((c) => c.d === d).length),
    [plan],
  )

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
    const counts = CHIPS.map(() => 0)
    const put = (d: number, x: number, y: number, z: number, q: THREE.Quaternion, scale = 1) => {
      const mesh = meshes.current[d]
      if (!mesh || scale <= 0.001) return
      _chip.position.set(x, y, z)
      _chip.quaternion.copy(q)
      _chip.scale.setScalar(scale)
      _chip.updateMatrix()
      mesh.setMatrixAt(counts[d], _chip.matrix)
      counts[d] += 1
    }

    const now = rounds - 1 // the round being bet, or last bet
    if (now >= 1) {
      // The dealer gathers the last round's loose chips into the middle as
      // the pot's stacks are made up again with bigger chips.
      const g = clamp01(t / GATHER_SECONDS)
      if (now >= 2) for (const c of plan.stacks[now - 2]) put(c.d, ...c.at, c.rest, 1 - smooth(g, 0.3, 0.9))
      for (const c of plan.stacks[now - 1]) put(c.d, ...c.at, c.rest, smooth(g, 0.4, 1))
      if (g < 1) {
        const e = g * g * (3 - 2 * g)
        for (const c of plan.throws[now - 1]) {
          put(
            c.d,
            lerp(c.land[0], POT_CENTER[0], e * 0.7),
            lerp(c.land[1], CARD.restY + CHIP_H / 2, e),
            lerp(c.land[2], POT_CENTER[1], e * 0.7),
            c.rest,
            1 - smooth(g, 0.55, 1),
          )
        }
      }
    }
    if (now >= 0) {
      // This round's bets, thrown once the gather is under way.
      const start = now >= 1 ? THROW_START : 0
      for (const c of plan.throws[now]) {
        const f = clamp01((t - start - c.delay) / FLIGHT_SECONDS)
        if (f <= 0) continue
        const p = easeOut(f)
        // Tumbling end over end on the way, settling into its resting pose.
        _qFlight.copy(c.rest).multiply(_qTumble.setFromAxisAngle(X_AXIS, (1 - p) * Math.PI * 2))
        put(
          c.d,
          lerp(c.from[0], c.land[0], p),
          lerp(c.from[1], c.land[1], p) + Math.sin(f * Math.PI) * 0.95,
          lerp(c.from[2], c.land[2], p),
          _qFlight,
        )
      }
    }
    meshes.current.forEach((mesh, d) => {
      if (!mesh) return
      mesh.count = counts[d]
      mesh.instanceMatrix.needsUpdate = true
    })
  })

  // Not frustum-culled: the instances move, which would leave a cached bounding
  // sphere stale. The pot is always on screen anyway.
  return (
    <>
      {CHIPS.map((chip, d) => (
        <instancedMesh
          key={chip.value}
          ref={(m) => {
            meshes.current[d] = m
          }}
          args={[getChipGeometry(), getChipMaterials(chip), Math.max(1, capacity[d])]}
          count={0}
          frustumCulled={false}
          castShadow
          receiveShadow
        />
      ))}
    </>
  )
}

/**
 * Chip stacks beside each player, the dealer button, and the pot after
 * `rounds` rounds of betting.
 */
export function Chips({ rounds }: { rounds: number }) {
  return (
    <>
      <SeatStacks />
      <Pot rounds={rounds} />
      <DealerButton position={[1.85, CARD.restY + (CHIP_H * 1.3) / 2, 1.5]} />
    </>
  )
}
