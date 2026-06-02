import { useMemo } from 'react'
import * as THREE from 'three'
import { CARD, chipSpots } from './layout'
import { getChipTextures } from './chipTexture'

const CHIP_COLORS = ['#c0282a', '#1f5fa8', '#d8a32b', '#e9ecf0', '#1f8a5b', '#2a2d33']
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

function blindTopTexture(text: string, color: string): THREE.Texture {
  const S = 128
  const c = document.createElement('canvas')
  c.width = c.height = S
  const ctx = c.getContext('2d')!
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.arc(S / 2, S / 2, S / 2, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = 'rgba(255,255,255,0.85)'
  ctx.lineWidth = 8
  ctx.beginPath()
  ctx.arc(S / 2, S / 2, S / 2 - 12, 0, Math.PI * 2)
  ctx.stroke()
  ctx.fillStyle = '#fff'
  ctx.font = '800 56px "Space Grotesk", system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, S / 2, S / 2 + 2)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.needsUpdate = true
  return tex
}

function BlindChip({
  position,
  text,
  color,
}: {
  position: [number, number, number]
  text: string
  color: string
}) {
  const top = useMemo(() => blindTopTexture(text, color), [text, color])
  return (
    <mesh position={position} castShadow receiveShadow>
      <cylinderGeometry args={[CHIP_R * 1.05, CHIP_R * 1.05, CHIP_H * 1.4, 36]} />
      <meshStandardMaterial attach="material-0" color={color} roughness={0.45} />
      <meshStandardMaterial attach="material-1" map={top} roughness={0.4} />
      <meshStandardMaterial attach="material-2" color={color} roughness={0.45} />
    </mesh>
  )
}

/** Chip stacks beside each player, a pot toward the dealer, and the blinds. */
export function Chips() {
  const seatStacks = useMemo(
    () =>
      chipSpots.map((spot, si) => ({
        key: spot.seatId,
        position: [spot.x, 0, spot.z] as [number, number, number],
        count: 5 + ((si * 3) % 6),
        color: CHIP_COLORS[si % CHIP_COLORS.length],
      })),
    [],
  )

  // Pot sits between the betting line and the dealer (toward the camera).
  const pot = useMemo(() => {
    const spots: [number, number][] = [
      [0, 0.7],
      [0.34, 0.92],
      [-0.32, 0.9],
      [0.04, 1.16],
    ]
    return spots.map(([x, z], i) => ({
      key: `pot-${i}`,
      position: [x, 0, z] as [number, number, number],
      count: 2 + (i % 3),
      color: CHIP_COLORS[(i * 2) % CHIP_COLORS.length],
    }))
  }, [])

  return (
    <>
      {seatStacks.map((s) => (
        <ChipStack key={s.key} position={s.position} count={s.count} color={s.color} />
      ))}
      {pot.map((s) => (
        <ChipStack key={s.key} position={s.position} count={s.count} color={s.color} />
      ))}
      {/* Blinds on the betting line in front of the two near seats */}
      <BlindChip position={[-1.55, CARD.restY + 0.03, 1.5]} text="SB" color="#1f5fa8" />
      <BlindChip position={[1.55, CARD.restY + 0.03, 1.5]} text="BB" color="#c0282a" />
    </>
  )
}
