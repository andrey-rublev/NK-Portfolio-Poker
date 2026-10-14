import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { CARD, chipSpots } from './layout'
import { getChipTextures } from './chipTexture'
import { frameStep } from './frame'

const RED = '#c0282a'
const BLUE = '#1f5fa8'
const CHIP_R = 0.2
const CHIP_H = 0.045

const lerp = THREE.MathUtils.lerp
const clamp01 = (v: number) => Math.max(0, Math.min(1, v))
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3)

/** Stable pseudo-random angle so each chip in a stack sits at its own rotation. */
function randRot(n: number): number {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453
  return (s - Math.floor(s)) * Math.PI * 2
}

/** The pot sits just right of centre; the burn pile is to its left. */
const POT_CENTER: [number, number] = [0.72, 0.92]

/** Differing bankrolls per seat (red main stack + smaller blue stack). */
const RED_COUNTS = [12, 6, 15, 9, 4]
const BLUE_COUNTS = [3, 8, 2, 5, 6]

/*
 * Every chip of one colour is drawn as a single InstancedMesh -- one draw per
 * material group instead of one per chip -- so the geometry and materials are
 * shared, built once, and kept for the life of the page.
 */
let chipGeometry: THREE.CylinderGeometry | null = null
const getChipGeometry = () => (chipGeometry ??= new THREE.CylinderGeometry(CHIP_R, CHIP_R, CHIP_H, 36))

const materialCache = new Map<string, THREE.MeshStandardMaterial[]>()

/** [rim, top, bottom] -- the cylinder's three material groups. */
function getChipMaterials(color: string): THREE.MeshStandardMaterial[] {
  let mats = materialCache.get(color)
  if (!mats) {
    const { face, edge } = getChipTextures(color)
    const top = new THREE.MeshStandardMaterial({ map: face, roughness: 0.42, metalness: 0.05 })
    mats = [new THREE.MeshStandardMaterial({ map: edge, roughness: 0.5, metalness: 0.05 }), top, top]
    materialCache.set(color, mats)
  }
  return mats
}

const _chip = new THREE.Object3D()

/** A static set of chips of one colour, one instance per chip. */
function ChipInstances({ color, matrices }: { color: string; matrices: THREE.Matrix4[] }) {
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
      args={[getChipGeometry(), getChipMaterials(color), matrices.length]}
      castShadow
      receiveShadow
    />
  )
}

/**
 * A tall red stack with a shorter blue stack beside it, in front of each seat.
 * A tangential offset (perpendicular to the radial) keeps both stacks at the
 * same radius -- side by side along the rail, neither sliding onto the cards.
 */
function SeatStacks() {
  const stacks = useMemo(() => {
    const red: THREE.Matrix4[] = []
    const blue: THREE.Matrix4[] = []
    const stack = (out: THREE.Matrix4[], x: number, z: number, count: number, seed: number) => {
      for (let i = 0; i < count; i += 1) {
        _chip.position.set(x, CARD.restY + CHIP_H / 2 + i * CHIP_H, z)
        _chip.rotation.set(0, randRot(seed + i), 0)
        _chip.updateMatrix()
        out.push(_chip.matrix.clone())
      }
    }
    chipSpots.forEach(({ x, z }, idx) => {
      const len = Math.hypot(x, z) || 1
      const px = -z / len
      const pz = x / len
      const off = CHIP_R * 1.05
      stack(red, x - px * off, z - pz * off, RED_COUNTS[idx % RED_COUNTS.length], idx * 13)
      stack(blue, x + px * off, z + pz * off, BLUE_COUNTS[idx % BLUE_COUNTS.length], idx * 13 + 101)
    })
    return { red, blue }
  }, [])
  return (
    <>
      <ChipInstances color={RED} matrices={stacks.red} />
      <ChipInstances color={BLUE} matrices={stacks.blue} />
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
 * On each street (flop/turn/river) every player picks one chip off their stack
 * and tosses it into the pot — the SAME contribution each, landing as its own
 * separate stack ringed around the pot, so the pot grows in equal columns.
 * Each colour's pot chips are one InstancedMesh; a street's chips join it as
 * that street is bet.
 */
function PotThrows({ boardStage }: { boardStage: number }) {
  const prog = useRef(1)
  const prev = useRef(boardStage)
  const dirty = useRef(true)
  const red = useRef<THREE.InstancedMesh>(null)
  const blue = useRef<THREE.InstancedMesh>(null)
  const invalidate = useThree((s) => s.invalidate)

  useEffect(() => {
    if (boardStage > prev.current) prog.current = 0
    prev.current = boardStage
    dirty.current = true
    invalidate()
  }, [boardStage, invalidate])

  // Ordered by street, so the chips bet so far are always a prefix of each list.
  const bets = useMemo(() => {
    const byColor: Record<string, Bet[]> = { [RED]: [], [BLUE]: [] }
    const n = chipSpots.length
    for (let street = 1; street <= 3; street += 1) {
      chipSpots.forEach((spot, seat) => {
        const topY = CARD.restY + RED_COUNTS[seat % RED_COUNTS.length] * CHIP_H + 0.02
        // One separate landing column per seat, ringed tightly around the pot —
        // close together but still a hair more than a chip diameter apart.
        const a = (seat / n) * Math.PI * 2 + Math.PI / 2
        const lx = POT_CENTER[0] + Math.cos(a) * 0.38
        const lz = POT_CENTER[1] + Math.sin(a) * 0.38
        byColor[seat % 2 === 0 ? RED : BLUE].push({
          street,
          seat,
          from: [spot.x, topY, spot.z],
          land: [lx, CARD.restY + CHIP_H / 2 + (street - 1) * CHIP_H, lz],
          spin: randRot(seat * 31 + street),
        })
      })
    }
    return byColor
  }, [])

  useFrame((state, delta) => {
    if (prog.current < 1) {
      prog.current = Math.min(1, prog.current + frameStep(delta) / 0.8)
      state.invalidate()
    } else if (!dirty.current) {
      return
    }
    dirty.current = false
    const meshes: [THREE.InstancedMesh | null, Bet[]][] = [
      [red.current, bets[RED]],
      [blue.current, bets[BLUE]],
    ]
    for (const [mesh, list] of meshes) {
      if (!mesh) continue
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
    }
  })

  // Not frustum-culled: the instances move, which would leave a cached bounding
  // sphere stale. The pot is always on screen anyway.
  return (
    <>
      <instancedMesh
        ref={red}
        args={[getChipGeometry(), getChipMaterials(RED), bets[RED].length]}
        count={0}
        frustumCulled={false}
        castShadow
        receiveShadow
      />
      <instancedMesh
        ref={blue}
        args={[getChipGeometry(), getChipMaterials(BLUE), bets[BLUE].length]}
        count={0}
        frustumCulled={false}
        castShadow
        receiveShadow
      />
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
