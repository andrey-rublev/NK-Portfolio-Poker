import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { PokerTable } from './PokerTable'
import { Card3D } from './Card3D'
import { Chips } from './Chips'
import { Players } from './Player'
import { cardLayouts, DECK_POSITION, CARD, CAMERA_HOME } from './layout'
import { prefersReducedMotion } from './motion'
import type { PortfolioCardData } from '../data/portfolio'

const LOOK_AT = new THREE.Vector3(0, 0.1, -0.2)

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

const INTRO_SECONDS = 2.0
const INTRO_START: [number, number, number] = [0, 17, 23]
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)

/**
 * Drives the camera every frame: a cinematic fly-in over the table at load
 * (synced with the deal), then a subtle idle drift + mouse parallax. Pulls back
 * on narrow/portrait screens so the table still fills the frame.
 */
function CameraController() {
  const camera = useThree((s) => s.camera)
  const size = useThree((s) => s.size)
  const pointer = useThree((s) => s.pointer)
  const finePointer = useRef(
    typeof window !== 'undefined' &&
      window.matchMedia('(pointer: fine)').matches,
  )
  const reducedMotion = useRef(prefersReducedMotion())

  useFrame((state) => {
    const aspect = size.width / Math.max(1, size.height)
    const extra = Math.max(0, 0.82 - aspect)
    const homeX = CAMERA_HOME[0]
    const homeY = CAMERA_HOME[1] + extra * 4.5
    const homeZ = CAMERA_HOME[2] + extra * 17

    const t = state.clock.elapsedTime
    // The fly-in always plays; only the perpetual idle drift respects reduce-motion.
    const e = easeOutCubic(Math.min(1, t / INTRO_SECONDS))
    const drift = reducedMotion.current ? 0 : e

    let x = THREE.MathUtils.lerp(INTRO_START[0], homeX, e)
    let y = THREE.MathUtils.lerp(INTRO_START[1], homeY, e)
    const z = THREE.MathUtils.lerp(INTRO_START[2], homeZ, e)

    // Once settled, breathe gently and follow the mouse a touch.
    x += Math.sin(t * 0.32) * 0.16 * drift
    y += Math.sin(t * 0.5) * 0.12 * drift
    if (finePointer.current) {
      x += pointer.x * 0.9 * drift
      y -= pointer.y * 0.5 * drift
    }

    camera.position.set(x, y, z)
    camera.lookAt(LOOK_AT)
  })

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
      <Players reducedMotion={reducedMotion} />

      {cardLayouts.map((layout) => (
        <Card3D
          key={layout.card.id}
          layout={layout}
          dealt={dealt}
          selected={selectedId === layout.card.id}
          anySelected={selectedId !== null}
          onSelect={onSelect}
        />
      ))}

      <CameraController />
    </>
  )
}
