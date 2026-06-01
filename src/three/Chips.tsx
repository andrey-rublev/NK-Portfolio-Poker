import { useMemo } from 'react'
import { CARD, seatSpots } from './layout'
import { getChipTextures } from './chipTexture'

const CHIP_COLORS = ['#c0282a', '#1f5fa8', '#d8a32b', '#e9ecf0', '#1f8a5b', '#2a2d33']
const CHIP_R = 0.21
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

/** Chip stacks beside each seat for casino flavor. */
export function Chips() {
  const stacks = useMemo(
    () =>
      seatSpots.flatMap((spot, si) =>
        [-1, 1].map((side) => ({
          key: `${spot.seatId}-${side}`,
          position: [
            spot.x * 0.78 + side * 0.52,
            0,
            spot.z * 0.78 + side * 0.12,
          ] as [number, number, number],
          count: 4 + ((si * 2 + (side > 0 ? 3 : 0)) % 6),
          color: CHIP_COLORS[(si * 2 + (side > 0 ? 1 : 0)) % CHIP_COLORS.length],
        })),
      ),
    [],
  )

  return (
    <>
      {stacks.map((s) => (
        <ChipStack key={s.key} position={s.position} count={s.count} color={s.color} />
      ))}
    </>
  )
}
