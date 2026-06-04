import { useMemo } from 'react'
import * as THREE from 'three'
import { CARD, chipSpots } from './layout'
import { getChipTextures } from './chipTexture'

const RED = '#c0282a'
const BLUE = '#1f5fa8'
const GOLD = '#d8a32b'
const GREEN = '#1f8a5b'
const CHIP_R = 0.2
const CHIP_H = 0.045

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
      <ChipStack position={redPos} count={8 + (idx % 3)} color={RED} />
      <ChipStack position={bluePos} count={3 + (idx % 2)} color={BLUE} />
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

/** The single dealer button, tilted to face the dealer (front of the table). */
function DealerButton({ position }: { position: [number, number, number] }) {
  const top = useMemo(() => dealerTopTexture(), [])
  return (
    <mesh position={position} rotation-x={0.34} castShadow receiveShadow>
      <cylinderGeometry args={[0.24, 0.24, CHIP_H * 1.3, 40]} />
      <meshStandardMaterial attach="material-0" color="#e7e1d2" roughness={0.5} />
      <meshStandardMaterial attach="material-1" map={top} roughness={0.45} />
      <meshStandardMaterial attach="material-2" color="#e7e1d2" roughness={0.5} />
    </mesh>
  )
}

/** Chip stacks beside each player, the pot toward the dealer, and the button. */
export function Chips() {
  // Pot sits between the betting line and the dealer (toward the camera).
  const pot = useMemo(() => {
    const spots: [number, number][] = [
      [0, 0.7],
      [0.34, 0.92],
      [-0.32, 0.9],
      [0.04, 1.16],
    ]
    const cols = [RED, GOLD, GREEN, BLUE]
    return spots.map(([x, z], i) => ({
      key: `pot-${i}`,
      position: [x, 0, z] as [number, number, number],
      count: 2 + (i % 3),
      color: cols[i % cols.length],
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
      <DealerButton position={[1.55, CARD.restY + 0.09, 1.45]} />
    </>
  )
}
