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
        {/* Torso */}
        <mesh position={[0, 0.98, 0]} rotation-x={0.16} castShadow receiveShadow>
          <capsuleGeometry args={[0.47, 0.64, 8, 20]} />
          <meshStandardMaterial color={shirt} roughness={0.85} />
        </mesh>
        {/* Neck */}
        <mesh position={[0, 1.5, 0.05]} castShadow>
          <cylinderGeometry args={[0.13, 0.17, 0.22, 16]} />
          <meshStandardMaterial color={skin} roughness={0.7} />
        </mesh>
        {/* Head */}
        <mesh position={[0, 1.78, 0.07]} castShadow>
          <sphereGeometry args={[0.3, 28, 28]} />
          <meshStandardMaterial color={skin} roughness={0.62} />
        </mesh>
        {/* Hair cap */}
        <mesh position={[0, 1.82, 0.03]} castShadow>
          <sphereGeometry args={[0.315, 24, 24, 0, Math.PI * 2, 0, Math.PI * 0.62]} />
          <meshStandardMaterial color={hair} roughness={0.9} />
        </mesh>
        {/* Arms reaching onto the table */}
        <mesh position={[0.46, 1.02, 0.36]} rotation={[0.95, 0, -0.18]} castShadow>
          <capsuleGeometry args={[0.135, 0.66, 6, 14]} />
          <meshStandardMaterial color={shirt} roughness={0.85} />
        </mesh>
        <mesh position={[-0.46, 1.02, 0.36]} rotation={[0.95, 0, 0.18]} castShadow>
          <capsuleGeometry args={[0.135, 0.66, 6, 14]} />
          <meshStandardMaterial color={shirt} roughness={0.85} />
        </mesh>
        {/* Hands */}
        <mesh position={[0.52, 0.78, 0.78]} castShadow>
          <sphereGeometry args={[0.12, 16, 16]} />
          <meshStandardMaterial color={skin} roughness={0.7} />
        </mesh>
        <mesh position={[-0.52, 0.78, 0.78]} castShadow>
          <sphereGeometry args={[0.12, 16, 16]} />
          <meshStandardMaterial color={skin} roughness={0.7} />
        </mesh>
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
