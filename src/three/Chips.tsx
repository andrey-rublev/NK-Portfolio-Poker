import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { CARD, chipSpots } from './layout'
import { getChipTextures } from './chipTexture'

const RED = '#c0282a'
const BLUE = '#1f5fa8'
const CHIP_R = 0.2
const CHIP_H = 0.045

const lerp = THREE.MathUtils.lerp
const clamp01 = (v: number) => Math.max(0, Math.min(1, v))
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3)

/** The pot sits just right of centre; the burn pile is to its left. */
const POT_CENTER: [number, number] = [0.72, 0.92]

/** Differing bankrolls per seat (red main stack + smaller blue stack). */
const RED_COUNTS = [12, 6, 15, 9, 4]
const BLUE_COUNTS = [3, 8, 2, 5, 6]

function ChipStack({
  position,
  count,
  color,
}: {
  position: [number, number, number]
  count: number
  color: string
}) {
  const { face, edge } = useMemo(() => getChipTextures(color), [color])
  return (
    <group position={position}>
      {Array.from({ length: count }).map((_, i) => (
        <mesh
          key={i}
          position-y={CARD.restY + CHIP_H / 2 + i * CHIP_H}
          rotation-y={i * 0.4}
          castShadow
          receiveShadow
        >
          <cylinderGeometry args={[CHIP_R, CHIP_R, CHIP_H, 36]} />
          <meshStandardMaterial attach="material-0" map={edge} roughness={0.5} metalness={0.05} />
          <meshStandardMaterial attach="material-1" map={face} roughness={0.42} metalness={0.05} />
          <meshStandardMaterial attach="material-2" map={face} roughness={0.42} metalness={0.05} />
        </mesh>
      ))}
    </group>
  )
}

/** A tall red stack with a shorter blue stack beside it, in front of each seat. */
function SeatChips({ x, z, idx }: { x: number; z: number; idx: number }) {
  // Tangential offset (perpendicular to the radial) keeps both stacks at the
  // same radius — side by side along the rail, neither sliding onto the cards.
  const len = Math.hypot(x, z) || 1
  const px = -z / len
  const pz = x / len
  const off = CHIP_R * 1.05
  const redPos: [number, number, number] = [x - px * off, 0, z - pz * off]
  const bluePos: [number, number, number] = [x + px * off, 0, z + pz * off]
  return (
    <>
      <ChipStack position={redPos} count={RED_COUNTS[idx % RED_COUNTS.length]} color={RED} />
      <ChipStack position={bluePos} count={BLUE_COUNTS[idx % BLUE_COUNTS.length]} color={BLUE} />
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
  ctx.font = '900 150px "Mulish", system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('D', cx, cx + 8)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.needsUpdate = true
  return tex
}

/**
 * The single dealer button. The outer group tilts it up to face the dealer
 * (front of the table); the inner group spins the cap so the "D" reads upright
 * from the dealer's seat.
 */
function DealerButton({ position }: { position: [number, number, number] }) {
  const top = useMemo(() => dealerTopTexture(), [])
  return (
    <group position={position} rotation-x={0.34}>
      <group rotation-y={Math.PI / 2}>
        <mesh castShadow receiveShadow>
          <cylinderGeometry args={[0.24, 0.24, CHIP_H * 1.3, 40]} />
          <meshStandardMaterial attach="material-0" color="#e7e1d2" roughness={0.5} />
          <meshStandardMaterial attach="material-1" map={top} roughness={0.45} />
          <meshStandardMaterial attach="material-2" color="#e7e1d2" roughness={0.5} />
        </mesh>
      </group>
    </group>
  )
}

interface Bet {
  street: number // 1 = flop, 2 = turn, 3 = river
  seat: number
  from: [number, number, number]
  land: [number, number, number]
  color: string
}

/**
 * On each street (flop/turn/river) every player picks a chip off their stack and
 * tosses it into the pot. The newest street's chips arc in; earlier ones rest in
 * the pot, so the pot grows as the hand plays out.
 */
function PotThrows({ boardStage }: { boardStage: number }) {
  const prog = useRef(1)
  const prev = useRef(boardStage)
  const refs = useRef<(THREE.Group | null)[]>([])

  useEffect(() => {
    if (boardStage > prev.current) prog.current = 0
    prev.current = boardStage
  }, [boardStage])

  const bets = useMemo<Bet[]>(() => {
    const list: Bet[] = []
    for (let street = 1; street <= 3; street += 1) {
      chipSpots.forEach((spot, seat) => {
        const topY = CARD.restY + RED_COUNTS[seat % RED_COUNTS.length] * CHIP_H + 0.02
        // Landing column ringed around the pot, growing one chip per street.
        const a = (seat / chipSpots.length) * Math.PI * 2 + Math.PI / 2
        const lx = POT_CENTER[0] + Math.cos(a) * 0.3
        const lz = POT_CENTER[1] + Math.sin(a) * 0.3
        list.push({
          street,
          seat,
          from: [spot.x, topY, spot.z],
          land: [lx, CARD.restY + CHIP_H / 2 + (street - 1) * CHIP_H, lz],
          color: seat % 2 === 0 ? RED : BLUE,
        })
      })
    }
    return list
  }, [])

  useFrame((_, dt) => {
    if (prog.current < 1) prog.current = Math.min(1, prog.current + dt / 0.85)
    bets.forEach((bet, i) => {
      const g = refs.current[i]
      if (!g || bet.street !== boardStage) return
      const stagger = bet.seat * 0.06
      const p = easeOut(clamp01((prog.current - stagger) / 0.7))
      const arc = Math.sin(clamp01((prog.current - stagger) / 0.7) * Math.PI) * 0.95
      g.position.set(
        lerp(bet.from[0], bet.land[0], p),
        lerp(bet.from[1], bet.land[1], p) + arc,
        lerp(bet.from[2], bet.land[2], p),
      )
      g.rotation.x = p * Math.PI * 2 // tumble, ending flat
      g.rotation.z = p * Math.PI
    })
  })

  return (
    <>
      {bets.map((bet, i) => {
        if (boardStage < bet.street) return null
        const flying = bet.street === boardStage
        const { face, edge } = getChipTextures(bet.color)
        return (
          <group
            key={i}
            ref={(el) => {
              refs.current[i] = el
            }}
            position={flying ? bet.from : bet.land}
          >
            <mesh castShadow receiveShadow rotation-y={i * 0.5}>
              <cylinderGeometry args={[CHIP_R, CHIP_R, CHIP_H, 36]} />
              <meshStandardMaterial attach="material-0" map={edge} roughness={0.5} metalness={0.05} />
              <meshStandardMaterial attach="material-1" map={face} roughness={0.42} metalness={0.05} />
              <meshStandardMaterial attach="material-2" map={face} roughness={0.42} metalness={0.05} />
            </mesh>
          </group>
        )
      })}
    </>
  )
}

/** Chip stacks beside each player, the (red/blue) pot, the button, and bets. */
export function Chips({ boardStage }: { boardStage: number }) {
  // The ante pot already on the felt before betting (red & blue only).
  const pot = useMemo(() => {
    const spots: Array<[number, number, number, string]> = [
      [0, 0, 3, RED],
      [0.17, 0.1, 2, BLUE],
      [-0.14, 0.12, 2, RED],
    ]
    return spots.map(([dx, dz, count, color], i) => ({
      key: `pot-${i}`,
      position: [POT_CENTER[0] + dx, 0, POT_CENTER[1] + dz] as [number, number, number],
      count,
      color,
    }))
  }, [])

  return (
    <>
      {chipSpots.map((spot, si) => (
        <SeatChips key={spot.seatId} x={spot.x} z={spot.z} idx={si} />
      ))}
      {pot.map((s) => (
        <ChipStack key={s.key} position={s.position} count={s.count} color={s.color} />
      ))}
      <PotThrows boardStage={boardStage} />
      <DealerButton position={[1.85, CARD.restY + 0.09, 1.5]} />
    </>
  )
}
