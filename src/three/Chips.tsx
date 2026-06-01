import { useMemo } from 'react'
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
          {/* 0 = side, 1 = top, 2 = bottom */}
          <meshStandardMaterial attach="material-0" map={edge} roughness={0.5} metalness={0.05} />
          <meshStandardMaterial attach="material-1" map={face} roughness={0.42} metalness={0.05} />
          <meshStandardMaterial attach="material-2" map={face} roughness={0.42} metalness={0.05} />
        </mesh>
      ))}
    </group>
  )
}

/** Chip stacks beside each player, plus a pot in the middle. */
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

  // A small pot of mixed chips in the betting area.
  const pot = useMemo(() => {
    const out: { key: string; position: [number, number, number]; count: number; color: string }[] = []
    const spots: [number, number][] = [
      [0, -0.15],
      [0.32, 0.1],
      [-0.3, 0.08],
      [0.05, 0.34],
    ]
    spots.forEach(([x, z], i) => {
      out.push({
        key: `pot-${i}`,
        position: [x, 0, z],
        count: 2 + (i % 3),
        color: CHIP_COLORS[(i * 2) % CHIP_COLORS.length],
      })
    })
    return out
  }, [])

  return (
    <>
      {seatStacks.map((s) => (
        <ChipStack key={s.key} position={s.position} count={s.count} color={s.color} />
      ))}
      {pot.map((s) => (
        <ChipStack key={s.key} position={s.position} count={s.count} color={s.color} />
      ))}
    </>
  )
}
