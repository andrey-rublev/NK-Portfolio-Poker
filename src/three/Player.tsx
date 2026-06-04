import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { playerSpots, type PlayerSpot } from './layout'

const SKINS = ['#e8b48c', '#c98e63', '#a9714a', '#d9a173', '#8d5a3a']
const SHIRTS = ['#2f6f57', '#2d4a78', '#7a3340', '#5c4a86', '#b07a2e']
const HAIRS = ['#241710', '#14110d', '#3a2418', '#0e0c0a', '#4a2f1c']
const PANTS = ['#2a2e35', '#1f2933', '#33302c', '#222428', '#2c2620']

const pick = (arr: string[], v: number) => arr[Math.round(v * (arr.length - 1))]

function PlayerFigure({
  spot,
  reducedMotion,
}: {
  spot: PlayerSpot
  reducedMotion: boolean
}) {
  const ref = useRef<THREE.Group>(null)
  const phase = spot.variant * Math.PI * 2
  const skin = pick(SKINS, spot.variant)
  const shirt = pick(SHIRTS, spot.variant)
  const hair = pick(HAIRS, spot.variant)
  const pants = pick(PANTS, spot.variant)

  useFrame((state) => {
    if (reducedMotion || !ref.current) return
    const t = state.clock.elapsedTime
    ref.current.position.y = Math.sin(t * 0.8 + phase) * 0.02
    ref.current.rotation.z = Math.sin(t * 0.55 + phase) * 0.014
  })

  return (
    <group position={[spot.x, -0.35, spot.z]} rotation-y={spot.faceYaw} scale={1.95}>
      <group ref={ref}>
        {/* Seat / hips */}
        <mesh position={[0, 0.2, -0.05]} castShadow receiveShadow>
          <cylinderGeometry args={[0.31, 0.28, 0.32, 24]} />
          <meshStandardMaterial color={pants} roughness={0.88} />
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
            <meshStandardMaterial color={pants} roughness={0.88} />
          </mesh>
        ))}
        {/* Belly / lower torso (tucks into the hips) */}
        <mesh position={[0, 0.5, -0.02]} castShadow receiveShadow>
          <cylinderGeometry args={[0.27, 0.3, 0.42, 24]} />
          <meshStandardMaterial color={shirt} roughness={0.85} />
        </mesh>
        {/* Chest / upper torso (slight lean over the table) */}
        <mesh position={[0, 0.9, 0.01]} rotation-x={0.12} castShadow receiveShadow>
          <cylinderGeometry args={[0.3, 0.27, 0.5, 24]} />
          <meshStandardMaterial color={shirt} roughness={0.85} />
        </mesh>
        {/* Sloped shoulders */}
        <mesh position={[0, 1.16, 0.03]} rotation-z={Math.PI / 2} castShadow>
          <capsuleGeometry args={[0.14, 0.44, 6, 16]} />
          <meshStandardMaterial color={shirt} roughness={0.85} />
        </mesh>
        {/* Shirt collar */}
        <mesh position={[0, 1.25, 0.05]} rotation-x={Math.PI / 2} castShadow>
          <torusGeometry args={[0.115, 0.034, 10, 20]} />
          <meshStandardMaterial color={shirt} roughness={0.8} />
        </mesh>
        {/* Neck */}
        <mesh position={[0, 1.32, 0.04]} castShadow>
          <cylinderGeometry args={[0.082, 0.1, 0.17, 14]} />
          <meshStandardMaterial color={skin} roughness={0.7} />
        </mesh>
        {/* Head */}
        <mesh position={[0, 1.53, 0.06]} scale={[0.94, 1.14, 1]} castShadow>
          <sphereGeometry args={[0.2, 28, 28]} />
          <meshStandardMaterial color={skin} roughness={0.62} />
        </mesh>
        {/* Ears */}
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * 0.19, 1.53, 0.04]} scale={[0.55, 1, 0.7]} castShadow>
            <sphereGeometry args={[0.052, 10, 10]} />
            <meshStandardMaterial color={skin} roughness={0.66} />
          </mesh>
        ))}
        {/* Hair cap */}
        <mesh position={[0, 1.575, 0.025]} scale={[1.02, 1.08, 1.06]} castShadow>
          <sphereGeometry args={[0.214, 24, 24, 0, Math.PI * 2, 0, Math.PI * 0.6]} />
          <meshStandardMaterial color={hair} roughness={0.9} />
        </mesh>
        {/* Arms: upper arm hangs down-and-out, forearm rests forward on the table */}
        {[-1, 1].map((side) => (
          <group key={side} position={[side * 0.31, 1.12, 0.02]} rotation={[-0.42, 0, side * 0.22]}>
            {/* upper arm */}
            <mesh position={[0, -0.2, 0]} castShadow>
              <capsuleGeometry args={[0.088, 0.32, 6, 12]} />
              <meshStandardMaterial color={shirt} roughness={0.85} />
            </mesh>
            {/* elbow → forearm bends forward to the felt */}
            <group position={[0, -0.42, 0]} rotation={[-1.0, 0, side * -0.05]}>
              <mesh position={[0, -0.2, 0]} castShadow>
                <capsuleGeometry args={[0.075, 0.34, 6, 12]} />
                <meshStandardMaterial color={skin} roughness={0.75} />
              </mesh>
              {/* hand */}
              <mesh position={[0, -0.42, 0.03]} scale={[1.1, 0.5, 1.35]} castShadow>
                <sphereGeometry args={[0.1, 14, 14]} />
                <meshStandardMaterial color={skin} roughness={0.72} />
              </mesh>
            </group>
          </group>
        ))}
      </group>
    </group>
  )
}

export function Players({ reducedMotion }: { reducedMotion: boolean }) {
  return (
    <>
      {playerSpots.map((spot) => (
        <PlayerFigure key={spot.seatId} spot={spot} reducedMotion={reducedMotion} />
      ))}
    </>
  )
}
