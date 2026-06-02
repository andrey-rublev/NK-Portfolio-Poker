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
    <group position={[spot.x, 0, spot.z]} rotation-y={spot.faceYaw}>
      <group ref={ref}>
        {/* Tapered torso (waist narrower than chest) */}
        <mesh position={[0, 0.82, 0]} rotation-x={0.14} castShadow receiveShadow>
          <cylinderGeometry args={[0.3, 0.25, 0.72, 24]} />
          <meshStandardMaterial color={shirt} roughness={0.85} />
        </mesh>
        {/* Shoulders */}
        <mesh position={[0, 1.16, 0.02]} rotation-z={Math.PI / 2} castShadow>
          <capsuleGeometry args={[0.145, 0.4, 6, 16]} />
          <meshStandardMaterial color={shirt} roughness={0.85} />
        </mesh>
        {/* Neck */}
        <mesh position={[0, 1.31, 0.03]} castShadow>
          <cylinderGeometry args={[0.085, 0.1, 0.16, 14]} />
          <meshStandardMaterial color={skin} roughness={0.7} />
        </mesh>
        {/* Head (smaller, more in proportion) */}
        <mesh position={[0, 1.52, 0.05]} scale={[1, 1.12, 1]} castShadow>
          <sphereGeometry args={[0.2, 28, 28]} />
          <meshStandardMaterial color={skin} roughness={0.62} />
        </mesh>
        {/* Hair cap */}
        <mesh position={[0, 1.56, 0.02]} scale={[1, 1.05, 1]} castShadow>
          <sphereGeometry args={[0.212, 24, 24, 0, Math.PI * 2, 0, Math.PI * 0.6]} />
          <meshStandardMaterial color={hair} roughness={0.9} />
        </mesh>
        {/* Arms reaching forward onto the table, hand fixed to the arm's end */}
        {[-1, 1].map((side) => (
          <group
            key={side}
            position={[side * 0.34, 1.14, 0.08]}
            rotation={[-0.95, 0, side * 0.12]}
          >
            <mesh position={[0, -0.32, 0]} castShadow>
              <capsuleGeometry args={[0.095, 0.5, 6, 14]} />
              <meshStandardMaterial color={shirt} roughness={0.85} />
            </mesh>
            <mesh position={[0, -0.64, 0]} castShadow>
              <sphereGeometry args={[0.11, 16, 16]} />
              <meshStandardMaterial color={skin} roughness={0.7} />
            </mesh>
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
