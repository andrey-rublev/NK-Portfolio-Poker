import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { playerSpots, type PlayerSpot } from './layout'

const SKINS = ['#e8b48c', '#c98e63', '#a9714a', '#d9a173', '#8d5a3a']
const SHIRTS = ['#2f6f57', '#2d4a78', '#7a3340', '#5c4a86', '#b07a2e']
const HAIRS = ['#241710', '#14110d', '#3a2418', '#0e0c0a', '#4a2f1c']

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

  useFrame((state) => {
    if (reducedMotion || !ref.current) return
    const t = state.clock.elapsedTime
    ref.current.position.y = Math.sin(t * 0.8 + phase) * 0.022
    ref.current.rotation.z = Math.sin(t * 0.55 + phase) * 0.016
  })

  return (
    <group position={[spot.x, -0.35, spot.z]} rotation-y={spot.faceYaw} scale={1.95}>
      <group ref={ref}>
        {/* Tapered torso (waist narrower than chest) */}
        <mesh position={[0, 0.82, 0]} rotation-x={0.14} castShadow receiveShadow>
          <cylinderGeometry args={[0.3, 0.25, 0.72, 24]} />
          <meshStandardMaterial color={shirt} roughness={0.85} />
        </mesh>
        {/* Sloped shoulders */}
        <mesh position={[0, 1.17, 0.02]} rotation-z={Math.PI / 2} castShadow>
          <capsuleGeometry args={[0.135, 0.42, 6, 16]} />
          <meshStandardMaterial color={shirt} roughness={0.85} />
        </mesh>
        {/* Shirt collar */}
        <mesh position={[0, 1.26, 0.04]} rotation-x={Math.PI / 2} castShadow>
          <torusGeometry args={[0.12, 0.035, 10, 20]} />
          <meshStandardMaterial color={shirt} roughness={0.8} />
        </mesh>
        {/* Neck */}
        <mesh position={[0, 1.32, 0.03]} castShadow>
          <cylinderGeometry args={[0.08, 0.095, 0.16, 14]} />
          <meshStandardMaterial color={skin} roughness={0.7} />
        </mesh>
        {/* Head */}
        <mesh position={[0, 1.53, 0.05]} scale={[0.94, 1.14, 1]} castShadow>
          <sphereGeometry args={[0.2, 28, 28]} />
          <meshStandardMaterial color={skin} roughness={0.62} />
        </mesh>
        {/* Hair cap */}
        <mesh position={[0, 1.57, 0.015]} scale={[1, 1.08, 1.04]} castShadow>
          <sphereGeometry args={[0.214, 24, 24, 0, Math.PI * 2, 0, Math.PI * 0.62]} />
          <meshStandardMaterial color={hair} roughness={0.9} />
        </mesh>
        {/* Two-segment arms with bent elbows resting forward on the table */}
        {[-1, 1].map((side) => (
          <group key={side} position={[side * 0.3, 1.16, 0.04]} rotation={[-0.6, 0, side * 0.16]}>
            {/* upper arm */}
            <mesh position={[0, -0.19, 0]} castShadow>
              <capsuleGeometry args={[0.085, 0.3, 6, 12]} />
              <meshStandardMaterial color={shirt} roughness={0.85} />
            </mesh>
            {/* elbow → forearm bends forward */}
            <group position={[0, -0.4, 0]} rotation={[-0.85, 0, 0]}>
              <mesh position={[0, -0.18, 0]} castShadow>
                <capsuleGeometry args={[0.075, 0.3, 6, 12]} />
                <meshStandardMaterial color={skin} roughness={0.75} />
              </mesh>
              {/* hand */}
              <mesh position={[0, -0.4, 0.02]} scale={[1.1, 0.55, 1.3]} castShadow>
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
