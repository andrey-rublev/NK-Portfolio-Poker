import * as THREE from 'three'
import { TABLE } from './layout'

const DRINKS = ['#c0651a', '#9c1f3a', '#3a1e10', '#8fbf3f', '#d8a32b', '#7a2f8f']

/** Angles (deg) sitting between the seats — drinks nestle in the rail, not in
 *  front of a hand, so they never overlap the cards or nameplates. */
const HOLDER_ANGLES = [2, 63, 116, 177, 245, 300]

/** Top of the padded rail (matches PokerTable's rail tube). */
const RAIL_TOP = TABLE.topY + TABLE.railTube * 0.15 + TABLE.railTube

function Holder({ x, z, color }: { x: number; z: number; color: string }) {
  return (
    <group position={[x, 0, z]}>
      {/* Recessed cup-holder cup set into the rail */}
      <mesh position={[0, RAIL_TOP - 0.05, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.17, 0.17, 0.16, 24]} />
        <meshStandardMaterial color="#15140f" roughness={0.7} metalness={0.35} />
      </mesh>
      {/* Metal rim */}
      <mesh position={[0, RAIL_TOP + 0.008, 0]}>
        <torusGeometry args={[0.155, 0.022, 10, 24]} />
        <meshStandardMaterial color="#2c2922" roughness={0.45} metalness={0.5} />
      </mesh>
      {/* Liquid */}
      <mesh position={[0, RAIL_TOP + 0.14, 0]}>
        <cylinderGeometry args={[0.108, 0.108, 0.24, 24]} />
        <meshStandardMaterial color={color} roughness={0.25} metalness={0.05} />
      </mesh>
      {/* Glass tube (translucent, open-ended so the liquid shows) */}
      <mesh position={[0, RAIL_TOP + 0.18, 0]}>
        <cylinderGeometry args={[0.122, 0.115, 0.36, 28, 1, true]} />
        <meshStandardMaterial
          color="#dbeef6"
          roughness={0.05}
          metalness={0}
          transparent
          opacity={0.26}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Glass base */}
      <mesh position={[0, RAIL_TOP + 0.012, 0]}>
        <cylinderGeometry args={[0.12, 0.12, 0.024, 24]} />
        <meshStandardMaterial color="#dbeef6" roughness={0.1} transparent opacity={0.4} />
      </mesh>
    </group>
  )
}

/** Drinks resting in cup holders around the edge (rail) of the table. */
export function CupHolders() {
  return (
    <>
      {HOLDER_ANGLES.map((deg, i) => {
        const a = (deg * Math.PI) / 180
        const x = (TABLE.rx + 0.05) * Math.cos(a)
        const z = -(TABLE.rz + 0.05) * Math.sin(a)
        return <Holder key={deg} x={x} z={z} color={DRINKS[i % DRINKS.length]} />
      })}
    </>
  )
}
