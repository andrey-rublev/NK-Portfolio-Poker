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
const POT_CENTER: [number, number] = [0.72, 0.92]

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

interface Bet {
  street: number // 1 = flop, 2 = turn, 3 = river
  seat: number
  from: [number, number, number]
  land: [number, number, number]
  /** Fixed rotation about the chip's axis, so the pot doesn't look stamped. */
  spin: number
}

/**
 * On each street (flop/turn/river) every player picks one chip off a stack and
 * tosses it into the pot — the SAME contribution each, landing as its own
 * separate stack ringed around the pot, so the pot grows in equal columns.
 * Each denomination's pot chips are one InstancedMesh; a street's chips join
 * it as that street is bet.
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
  const bets = useMemo(() => {
    const byChip: Bet[][] = CHIPS.map(() => [])
    const n = chipSpots.length
    for (let street = 1; street <= 3; street += 1) {
      chipSpots.forEach((_, seat) => {
        // Each seat bets from one of its stacks.
        const d = seat % CHIPS.length
        const [sx, sz] = stackSpot(seat, d)
        const topY = CARD.restY + COUNTS[d][seat % COUNTS[d].length] * CHIP_H + 0.02
        // One separate landing column per seat, ringed tightly around the pot —
        // close together but still a hair more than a chip diameter apart.
        const a = (seat / n) * Math.PI * 2 + Math.PI / 2
        const lx = POT_CENTER[0] + Math.cos(a) * 0.38
        const lz = POT_CENTER[1] + Math.sin(a) * 0.38
        byChip[d].push({
          street,
          seat,
          from: [sx, topY, sz],
          land: [lx, CARD.restY + CHIP_H / 2 + (street - 1) * CHIP_H, lz],
          spin: randRot(seat * 31 + street),
        })
      })
    }
    return byChip
  }, [])

  useFrame((state, delta) => {
    if (prog.current < 1) {
      prog.current = Math.min(1, prog.current + frameStep(delta) / 0.8)
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
        if (bet.street === boardStage) {
          const t = clamp01((prog.current - bet.seat * 0.05) / 0.7)
          const p = easeOut(t)
          _chip.position.set(
            lerp(bet.from[0], bet.land[0], p),
            lerp(bet.from[1], bet.land[1], p) + Math.sin(t * Math.PI) * 0.95,
            lerp(bet.from[2], bet.land[2], p),
          )
          _chip.rotation.set(t * Math.PI * 2, bet.spin, 0) // tumble, ending flat
        } else {
          _chip.position.set(...bet.land)
          _chip.rotation.set(0, bet.spin, 0)
        }
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
