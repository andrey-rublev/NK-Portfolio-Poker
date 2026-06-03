import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { PokerTable } from './PokerTable'
import { Card3D } from './Card3D'
import { Chips } from './Chips'
import { Players } from './Player'
import {
  seatCards,
  communityCards,
  DECK_POSITION,
  BURN_POSITION,
  CARD,
  CAMERA_HOME,
  type CardSlot,
} from './layout'
import { getSharedBack } from './cardTextures'
import { createFloorTexture } from './floorTexture'
import { Nameplates } from './Nameplates'
import { prefersReducedMotion } from './motion'

const LOOK_AT = new THREE.Vector3(0, 0.1, -0.2)
const INTRO_SECONDS = 2.0
const INTRO_START: [number, number, number] = [0, 17, 23]
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)

function Floor() {
  const tex = useMemo(() => createFloorTexture(), [])
  return (
    <mesh rotation-x={-Math.PI / 2} position-y={-3.7} receiveShadow>
      <planeGeometry args={[80, 80]} />
      <meshStandardMaterial map={tex} roughness={0.95} metalness={0} />
    </mesh>
  )
}

function communityDealt(slot: CardSlot, boardStage: number): boolean {
  const cs = slot as { stage?: string }
  const need = cs.stage === 'flop' ? 1 : cs.stage === 'turn' ? 2 : 3
  return boardStage >= need
}

function Deck({ boardStage, onPress }: { boardStage: number; onPress: () => void }) {
  const back = useMemo(() => getSharedBack(), [])
  const dealtCount = boardStage === 0 ? 0 : boardStage === 1 ? 4 : boardStage === 2 ? 6 : 8
  const remaining = Math.max(4, 12 - dealtCount)

  return (
    <group position={DECK_POSITION}>
      {Array.from({ length: remaining }).map((_, i) => (
        <mesh
          key={i}
          position-y={i * CARD.thickness * 1.04}
          rotation-x={-Math.PI / 2}
          rotation-z={(i % 2 ? 1 : -1) * 0.012}
        >
          <boxGeometry args={[CARD.w, CARD.h, CARD.thickness]} />
          <meshStandardMaterial attach="material-0" color="#efe6d2" roughness={0.7} />
          <meshStandardMaterial attach="material-1" color="#efe6d2" roughness={0.7} />
          <meshStandardMaterial attach="material-2" color="#efe6d2" roughness={0.7} />
          <meshStandardMaterial attach="material-3" color="#efe6d2" roughness={0.7} />
          <meshStandardMaterial attach="material-4" map={back} roughness={0.6} alphaTest={0.5} />
          <meshStandardMaterial attach="material-5" color="#efe6d2" roughness={0.7} />
        </mesh>
      ))}
      {/* Click target covering the deck */}
      <mesh
        position-y={remaining * CARD.thickness * 1.04 + 0.2}
        rotation-x={-Math.PI / 2}
        onClick={(e) => {
          e.stopPropagation()
          onPress()
        }}
        onPointerOver={(e) => {
          e.stopPropagation()
          document.body.style.cursor = 'pointer'
        }}
        onPointerOut={() => {
          document.body.style.cursor = ''
        }}
      >
        <boxGeometry args={[CARD.w + 0.2, CARD.h + 0.2, 0.4]} />
        <meshStandardMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  )
}

function BurnPile({ boardStage }: { boardStage: number }) {
  const back = useMemo(() => getSharedBack(), [])
  // Face-down (back pattern up) under the pot.
  return (
    <group position={BURN_POSITION}>
      {Array.from({ length: boardStage }).map((_, i) => (
        <mesh
          key={i}
          position-y={i * CARD.thickness * 1.04}
          rotation-x={-Math.PI / 2}
          rotation-z={(i % 2 ? 1 : -1) * 0.18 + 0.25}
        >
          <boxGeometry args={[CARD.w, CARD.h, CARD.thickness]} />
          <meshStandardMaterial attach="material-0" color="#8c1a26" roughness={0.6} />
          <meshStandardMaterial attach="material-1" color="#8c1a26" roughness={0.6} />
          <meshStandardMaterial attach="material-2" color="#8c1a26" roughness={0.6} />
          <meshStandardMaterial attach="material-3" color="#8c1a26" roughness={0.6} />
          <meshStandardMaterial attach="material-4" map={back} roughness={0.6} alphaTest={0.5} />
          <meshStandardMaterial attach="material-5" map={back} roughness={0.6} alphaTest={0.5} />
        </mesh>
      ))}
    </group>
  )
}

const _camDir = new THREE.Vector3()

/**
 * A transparent plane that hovers just in front of the camera while a card is
 * focused, so a click ANYWHERE (felt, players, or the card itself) dismisses it.
 * Only mounted while something is focused, so it never blocks normal play.
 */
function DismissCatcher({ onDismiss }: { onDismiss: () => void }) {
  const ref = useRef<THREE.Mesh>(null)
  const camera = useThree((s) => s.camera)
  useFrame(() => {
    const m = ref.current
    if (!m) return
    camera.getWorldDirection(_camDir)
    m.position.copy(camera.position).addScaledVector(_camDir, 1.6)
    m.quaternion.copy(camera.quaternion)
  })
  return (
    <mesh
      ref={ref}
      renderOrder={50}
      onClick={(e) => {
        e.stopPropagation()
        onDismiss()
      }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <planeGeometry args={[80, 80]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} depthTest={false} />
    </mesh>
  )
}

function CameraController() {
  const camera = useThree((s) => s.camera)
  const size = useThree((s) => s.size)
  const reducedMotion = useRef(prefersReducedMotion())

  useFrame((state) => {
    const aspect = size.width / Math.max(1, size.height)
    const extra = Math.max(0, 1.4 - aspect)
    const homeY = CAMERA_HOME[1] + extra * 3.5
    const homeZ = CAMERA_HOME[2] + extra * 10.5
    const t = state.clock.elapsedTime
    const e = reducedMotion.current ? 1 : easeOutCubic(Math.min(1, t / INTRO_SECONDS))
    camera.position.set(
      CAMERA_HOME[0],
      THREE.MathUtils.lerp(INTRO_START[1], homeY, e),
      THREE.MathUtils.lerp(INTRO_START[2], homeZ, e),
    )
    camera.lookAt(LOOK_AT)
  })
  return null
}

interface SceneProps {
  dealt: boolean
  focusedKey: string | null
  boardStage: number
  reducedMotion: boolean
  onToggle: (slot: CardSlot) => void
  onDeckPress: () => void
  onDismiss: () => void
}

export function Scene({
  dealt,
  focusedKey,
  boardStage,
  reducedMotion,
  onToggle,
  onDeckPress,
  onDismiss,
}: SceneProps) {
  return (
    <>
      <color attach="background" args={['#160a10']} />
      <fog attach="fog" args={['#160a10', 20, 44]} />

      <ambientLight intensity={0.54} />
      <hemisphereLight args={['#9fc8b4', '#140d07', 0.46]} />
      <spotLight
        position={[0, 13, 1.5]}
        angle={0.62}
        penumbra={0.95}
        intensity={220}
        distance={42}
        decay={2}
        color="#ffeccb"
      />
      <directionalLight
        position={[5, 13, 7]}
        intensity={0.62}
        color="#ffe8c8"
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
      <pointLight position={[-9, 5, 9]} intensity={13} color="#ffd9a0" />
      <pointLight position={[9, 4, 6]} intensity={8} color="#9fd8ff" />

      <Floor />
      <PokerTable />
      <Chips />
      <Players reducedMotion={reducedMotion} />
      <Nameplates />
      <Deck boardStage={boardStage} onPress={onDeckPress} />
      <BurnPile boardStage={boardStage} />

      {seatCards.map((slot) => (
        <Card3D
          key={slot.id}
          slot={slot}
          dealt={dealt}
          focused={focusedKey === slot.handId}
          interactive
          onToggle={onToggle}
        />
      ))}

      {communityCards.map((slot) => {
        const isDealt = communityDealt(slot, boardStage)
        return (
          <Card3D
            key={slot.id}
            slot={slot}
            dealt={isDealt}
            focused={focusedKey === slot.id}
            interactive={isDealt}
            onToggle={onToggle}
          />
        )
      })}

      {focusedKey && <DismissCatcher onDismiss={onDismiss} />}

      <CameraController />
    </>
  )
}
