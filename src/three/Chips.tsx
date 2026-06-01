import { useMemo } from 'react'
import { CARD, seatSpots } from './layout'

const CHIP_COLORS = ['#cf3030', '#1e64d6', '#f3bc40', '#e9ecf0', '#1f8a5b']
const CHIP_R = 0.2
const CHIP_H = 0.05

function ChipStack({
  position,
  count,
  color,
}: {
  position: [number, number, number]
  count: number
  color: string
}) {
  return (
    <group position={position}>
      {Array.from({ length: count }).map((_, i) => (
        <mesh
          key={i}
          position-y={CARD.restY + CHIP_H / 2 + i * CHIP_H}
          castShadow
          receiveShadow
        >
          <cylinderGeometry args={[CHIP_R, CHIP_R, CHIP_H, 28]} />
          <meshStandardMaterial color={color} roughness={0.42} metalness={0.12} />
        </mesh>
      ))}
    </group>
  )
}

/** A couple of chip stacks beside each seat for casino flavor. */
export function Chips() {
  const stacks = useMemo(() => {
    // Pull chips a little toward the table center so they sit in front of the
    // cards, then fan two stacks sideways.
    return seatSpots.flatMap((spot, si) =>
      [-1, 1].map((side) => ({
        key: `${spot.seatId}-${side}`,
        position: [
          spot.x * 0.78 + side * 0.5,
          0,
          spot.z * 0.78 + side * 0.12,
        ] as [number, number, number],
        count: 3 + ((si + (side > 0 ? 1 : 0)) % 4),
        color: CHIP_COLORS[(si + (side > 0 ? 2 : 0)) % CHIP_COLORS.length],
      })),
    )
  }, [])

  return (
    <>
      {stacks.map((s) => (
        <ChipStack key={s.key} position={s.position} count={s.count} color={s.color} />
      ))}
    </>
  )
}
