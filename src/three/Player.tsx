import { playerSpots, type PlayerSpot } from './layout'

const SKINS = ['#e8b48c', '#c98e63', '#a9714a', '#d9a173', '#8d5a3a']
const SHIRTS = ['#2f6f57', '#2d4a78', '#7a3340', '#5c4a86', '#b07a2e']
const HAIRS = ['#241710', '#14110d', '#3a2418', '#0e0c0a', '#4a2f1c']
const PANTS = ['#2a2e35', '#1f2933', '#33302c', '#222428', '#2c2620']

const pick = (arr: string[], v: number) => arr[Math.round(v * (arr.length - 1))]

/** One arm: shoulder → (bent elbow) → forearm → hand resting on the table edge. */
function Arm({ side, skin, shirt }: { side: number; skin: string; shirt: string }) {
  return (
    <group position={[side * 0.26, 1.05, 0.05]} rotation={[-0.5, 0, side * 0.12]}>
      {/* upper arm (sleeve) */}
      <mesh position={[0, -0.22, 0]} castShadow>
        <capsuleGeometry args={[0.088, 0.34, 8, 14]} />
        <meshStandardMaterial color={shirt} roughness={0.85} />
      </mesh>
      {/* forearm bends further forward and down to the felt */}
      <group position={[0, -0.45, 0]} rotation={[-0.32, 0, 0]}>
        <mesh position={[0, -0.23, 0]} castShadow>
          <capsuleGeometry args={[0.072, 0.4, 8, 14]} />
          <meshStandardMaterial color={skin} roughness={0.74} />
        </mesh>
        {/* hand resting palm-down, fingers forward */}
        <mesh position={[0, -0.47, 0.06]} rotation-x={0.5} scale={[1.05, 0.5, 1.5]} castShadow>
          <sphereGeometry args={[0.1, 16, 14]} />
          <meshStandardMaterial color={skin} roughness={0.72} />
        </mesh>
      </group>
    </group>
  )
}

function PlayerFigure({ spot }: { spot: PlayerSpot }) {
  const skin = pick(SKINS, spot.variant)
  const shirt = pick(SHIRTS, spot.variant)
  const hair = pick(HAIRS, spot.variant)
  const pants = pick(PANTS, spot.variant)

  return (
    <group position={[spot.x, -0.35, spot.z]} rotation-y={spot.faceYaw} scale={1.95}>
      {/* Seat / hips */}
      <mesh position={[0, 0.2, -0.05]} castShadow receiveShadow>
        <cylinderGeometry args={[0.31, 0.28, 0.32, 24]} />
        <meshStandardMaterial color={pants} roughness={0.9} />
      </mesh>
      {/* Thighs reaching forward under the table (the seated lap) */}
      {[-1, 1].map((s) => (
        <mesh
          key={s}
          position={[s * 0.16, 0.12, 0.28]}
          rotation-x={Math.PI / 2.05}
          castShadow
          receiveShadow
        >
          <capsuleGeometry args={[0.125, 0.42, 6, 12]} />
          <meshStandardMaterial color={pants} roughness={0.9} />
        </mesh>
      ))}
      {/* Waist → chest as one tapering torso (narrow at the waist, broad at the chest) */}
      <mesh position={[0, 0.52, -0.01]} castShadow receiveShadow>
        <cylinderGeometry args={[0.3, 0.27, 0.42, 28]} />
        <meshStandardMaterial color={shirt} roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.9, 0.01]} rotation-x={0.06} castShadow receiveShadow>
        <cylinderGeometry args={[0.34, 0.3, 0.42, 28]} />
        <meshStandardMaterial color={shirt} roughness={0.85} />
      </mesh>
      {/* Shoulder yoke + rounded deltoids, overlapping the chest top so they blend */}
      <mesh position={[0, 1.07, 0.02]} rotation-z={Math.PI / 2} castShadow>
        <capsuleGeometry args={[0.155, 0.4, 8, 18]} />
        <meshStandardMaterial color={shirt} roughness={0.85} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.31, 1.07, 0.02]} castShadow>
          <sphereGeometry args={[0.155, 18, 16]} />
          <meshStandardMaterial color={shirt} roughness={0.85} />
        </mesh>
      ))}
      {/* Trapezius filler so the neck meets the shoulders smoothly */}
      <mesh position={[0, 1.14, 0.0]} scale={[1.4, 0.7, 1.1]} castShadow>
        <sphereGeometry args={[0.16, 18, 14]} />
        <meshStandardMaterial color={shirt} roughness={0.85} />
      </mesh>
      {/* Neck */}
      <mesh position={[0, 1.24, 0.03]} castShadow>
        <cylinderGeometry args={[0.085, 0.1, 0.17, 16]} />
        <meshStandardMaterial color={skin} roughness={0.7} />
      </mesh>
      {/* Head */}
      <mesh position={[0, 1.46, 0.05]} scale={[0.94, 1.12, 1]} castShadow>
        <sphereGeometry args={[0.2, 30, 30]} />
        <meshStandardMaterial color={skin} roughness={0.6} />
      </mesh>
      {/* Ears */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.19, 1.46, 0.03]} scale={[0.55, 1, 0.7]} castShadow>
          <sphereGeometry args={[0.05, 12, 12]} />
          <meshStandardMaterial color={skin} roughness={0.65} />
        </mesh>
      ))}
      {/* Hair cap */}
      <mesh position={[0, 1.5, 0.02]} scale={[1.04, 1.1, 1.08]} castShadow>
        <sphereGeometry args={[0.205, 26, 24, 0, Math.PI * 2, 0, Math.PI * 0.62]} />
        <meshStandardMaterial color={hair} roughness={0.92} />
      </mesh>
      <Arm side={-1} skin={skin} shirt={shirt} />
      <Arm side={1} skin={skin} shirt={shirt} />
    </group>
  )
}

export function Players() {
  return (
    <>
      {playerSpots.map((spot) => (
        <PlayerFigure key={spot.seatId} spot={spot} />
      ))}
    </>
  )
}
