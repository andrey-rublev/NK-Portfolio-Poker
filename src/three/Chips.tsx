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

/** The pot sits just right of centre; the burn pile is to its left. */
const POT_CENTER: [number, number] = [0.72, 1.0]

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
 * Each player's bet on the flop, the turn and the river, as the chips they
 * throw in (indices into CHIPS). Everyone bets the same.
 */
const BETS = [
  [0, 1],
  [0, 1, 2],
  [0, 1, 2, 2],
]
/**
 * How far from the pot's middle each street's chips can land. Later bets land
 * nearer the middle, so they come down on the pile already there.
 */
const POT_SPREAD = [0.5, 0.42, 0.38]
/**
 * Spots each chip tries before settling in the lowest: a chip that lands on
 * the top of the heap slides off it, so the pot grows into a low mound rather
 * than a tower.
 */
const POT_TRIES = 3
/** The steepest a chip can lean against the pile (radians). */
const MAX_LEAN = 0.3

interface Bet {
  street: number // 1 = flop, 2 = turn, 3 = river
  /** How far into the throw (0 to 1) this chip leaves the player's hand. */
  delay: number
  from: [number, number, number]
  land: [number, number, number]
  /** How it lies once it lands: leaning, and turned about its own axis. */
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
 * Where every chip bet in the hand comes to rest, in the order they're thrown,
 * heaping up on one another untidily (see settle and POT_TRIES).
 */
function potLandings(): Bet[][] {
  let s = 17
  const rand = () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
  const pot: Landed[] = []
  const byChip: Bet[][] = CHIPS.map(() => [])
  BETS.forEach((bet, b) => {
    const street = b + 1
    chipSpots.forEach((_, seat) => {
      bet.forEach((d, k) => {
        let chip: Landed | null = null
        for (let t = 0; t < POT_TRIES; t += 1) {
          const a = rand() * Math.PI * 2
          const r = POT_SPREAD[b] * Math.sqrt(rand())
          const tried = settle(pot, POT_CENTER[0] + Math.cos(a) * r, POT_CENTER[1] + Math.sin(a) * r)
          if (!chip || tried.y < chip.y) chip = tried
        }
        const { x, y, z, ux, uz, slope } = chip!
        pot.push(chip!)

        const rest = new THREE.Quaternion().setFromAxisAngle(Y_AXIS, rand() * Math.PI * 2)
        if (slope > 0) rest.premultiply(new THREE.Quaternion().setFromAxisAngle(_tilt.set(uz, 0, -ux), Math.atan(slope)))
        const [sx, sz] = stackSpot(seat, d)
        byChip[d].push({
          street,
          delay: seat * 0.05 + k * 0.05,
          from: [sx, CARD.restY + COUNTS[d][seat % COUNTS[d].length] * CHIP_H + 0.02, sz],
          land: [x, y, z],
          rest,
        })
      })
    })
  })
  return byChip
}

/**
 * On each street (flop/turn/river) every player throws the same bet into the
 * pot -- a 5 and a 25 on the flop, a 5, a 25 and a 100 on the turn, and a 5, a
 * 25 and two 100s on the river -- a chip at a time, from their stacks, and the
 * chips heap up in the middle. Each denomination's pot chips are one
 * InstancedMesh; a street's chips join them as that street is bet.
 */
function PotThrows({ boardStage }: { boardStage: number }) {
  const prog = useRef(1)
  const prev = useRef(boardStage)
  const dirty = useRef(true)
  const meshes = useRef<(THREE.InstancedMesh | null)[]>([])
  const invalidate = useThree((s) => s.invalidate)

  useEffect(() => {
    if (boardStage > prev.current) prog.current = 0
    prev.current = boardStage
    dirty.current = true
    invalidate()
  }, [boardStage, invalidate])

  // One list per denomination, ordered by street, so the chips bet so far are
  // always a prefix of each list.
  const bets = useMemo(() => potLandings(), [])

  useFrame((state, delta) => {
    if (prog.current < 1) {
      prog.current = Math.min(1, prog.current + frameStep(delta) / 0.9)
      state.invalidate()
    } else if (!dirty.current) {
      return
    }
    dirty.current = false
    bets.forEach((list, d) => {
      const mesh = meshes.current[d]
      if (!mesh) return
      let count = 0
      for (const bet of list) {
        if (bet.street > boardStage) break
        _chip.quaternion.copy(bet.rest)
        if (bet.street === boardStage) {
          const t = clamp01((prog.current - bet.delay) / 0.6)
          const p = easeOut(t)
          _chip.position.set(
            lerp(bet.from[0], bet.land[0], p),
            lerp(bet.from[1], bet.land[1], p) + Math.sin(t * Math.PI) * 0.95,
            lerp(bet.from[2], bet.land[2], p),
          )
          // Tumbling end over end on the way, settling into its resting pose.
          _chip.quaternion.multiply(_qTumble.setFromAxisAngle(X_AXIS, (1 - p) * Math.PI * 2))
        } else {
          _chip.position.set(...bet.land)
        }
        _chip.scale.setScalar(1)
        _chip.updateMatrix()
        mesh.setMatrixAt(count, _chip.matrix)
        count += 1
      }
      mesh.count = count
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
          args={[getChipGeometry(), getChipMaterials(chip), Math.max(1, bets[d].length)]}
          count={0}
          frustumCulled={false}
          castShadow
          receiveShadow
        />
      ))}
    </>
  )
}

/** Chip stacks beside each player, the dealer button, and the betting pot. */
export function Chips({ boardStage }: { boardStage: number }) {
  return (
    <>
      <SeatStacks />
      <PotThrows boardStage={boardStage} />
      <DealerButton position={[1.85, CARD.restY + (CHIP_H * 1.3) / 2, 1.5]} />
    </>
  )
}
