import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { PokerTable } from './PokerTable'
import { Card3D } from './Card3D'
import { Chips } from './Chips'
import { cardLayouts, DECK_POSITION, CARD, CAMERA_HOME } from './layout'
import type { PortfolioCardData } from '../data/portfolio'

const LOOK_AT = new THREE.Vector3(0, -0.2, -0.3)

function Deck() {
  return (
    <group position={DECK_POSITION}>
      {Array.from({ length: 7 }).map((_, i) => (
        <mesh
          key={i}
          position-y={i * CARD.thickness * 1.1}
          rotation-x={-Math.PI / 2}
          rotation-z={(i % 2 ? 1 : -1) * 0.015}
          castShadow
        >
          <boxGeometry args={[CARD.w, CARD.h, CARD.thickness]} />
          <meshStandardMaterial color="#0d2c20" roughness={0.6} />
        </mesh>
      ))}
      {/* Dealer button */}
      <mesh position={[CARD.w * 0.95, 0.03, 0.25]} rotation-x={-Math.PI / 2} castShadow>
        <cylinderGeometry args={[0.17, 0.17, 0.05, 28]} />
        <meshStandardMaterial color="#f3ecda" roughness={0.4} metalness={0.1} />
      </mesh>
    </group>
  )
}

/**
 * Frames the table for the current viewport. Runs on mount and whenever the
 * canvas resizes, then requests a render — no continuous loop, so the scene
 * idles when nothing is animating (better battery, lets the GPU rest).
 */
function CameraController() {
  const camera = useThree((s) => s.camera)
  const size = useThree((s) => s.size)
  const invalidate = useThree((s) => s.invalidate)

  useEffect(() => {
    // Pull the camera back on narrow/portrait screens so the whole table fits.
    const aspect = size.width / Math.max(1, size.height)
    const extra = Math.max(0, 0.82 - aspect)
    camera.position.set(
      CAMERA_HOME[0],
      CAMERA_HOME[1] + extra * 4,
      CAMERA_HOME[2] + extra * 16,
    )
    camera.lookAt(LOOK_AT)
    camera.updateProjectionMatrix()
    invalidate()
  }, [camera, size, invalidate])

  return null
}

interface SceneProps {
  dealt: boolean
  selectedId: string | null
  reducedMotion: boolean
  onSelect: (card: PortfolioCardData) => void
}

export function Scene({ dealt, selectedId, reducedMotion, onSelect }: SceneProps) {
  return (
    <>
      <color attach="background" args={['#05110c']} />
      <fog attach="fog" args={['#05110c', 17, 36]} />

      <ambientLight intensity={0.5} />
      <hemisphereLight args={['#bfe3d0', '#160f08', 0.55]} />
      {/* Overhead poker lamp: warm pool of light, no shadow (avoids acne on the felt). */}
      <spotLight
        position={[0, 13, 1.5]}
        angle={0.62}
        penumbra={0.7}
        intensity={1500}
        distance={44}
        decay={2}
        color="#fff3da"
      />
      {/* Shadow caster: directional gives uniform shadow precision. */}
      <directionalLight
        position={[5, 13, 7]}
        intensity={2.1}
        color="#fff1d6"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0002}
        shadow-normalBias={0.04}
        shadow-camera-near={1}
        shadow-camera-far={42}
        shadow-camera-left={-11}
        shadow-camera-right={11}
        shadow-camera-top={11}
        shadow-camera-bottom={-11}
      />
      <pointLight position={[-9, 5, 9]} intensity={45} color="#ffd9a0" />
      <pointLight position={[9, 4, 6]} intensity={25} color="#9fd8ff" />

      <PokerTable />
      <Deck />
      <Chips />

      {cardLayouts.map((layout) => (
        <Card3D
          key={layout.card.id}
          layout={layout}
          dealt={dealt}
          selected={selectedId === layout.card.id}
          anySelected={selectedId !== null}
          reducedMotion={reducedMotion}
          onSelect={onSelect}
        />
      ))}

      <CameraController />
    </>
  )
}
