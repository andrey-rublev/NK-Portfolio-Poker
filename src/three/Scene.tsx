import { useEffect, useMemo, useRef } from 'react'
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
import { getCardGeometry } from './cardGeometry'
import { createFloorTexture } from './floorTexture'
import { Nameplates } from './Nameplates'
import { prefersReducedMotion } from './motion'

const LOOK_AT = new THREE.Vector3(0, 0.1, -0.2)
const INTRO_SECONDS = 1.5
const INTRO_START: [number, number, number] = [0, 17, 23]
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)

/** Direction and base distance of the design camera from the look-at point. */
const HOME_VEC = new THREE.Vector3(CAMERA_HOME[0], CAMERA_HOME[1], CAMERA_HOME[2]).sub(LOOK_AT)
const HOME_DIST = HOME_VEC.length()
const HOME_UNIT = HOME_VEC.clone().normalize()
/** Table half-width (incl. rail) to keep within the horizontal field of view. */
const TABLE_HALF_W = 6.8

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

function Deck({ onPress }: { onPress: () => void }) {
  const back = useMemo(() => getSharedBack(), [])
  // Constant height so the deck's top stays at DECK_TOP — cards always deal off
  // the top (no floating card, no dealing from the middle as the deck shrinks).
  const remaining = 12

  return (
    <group position={DECK_POSITION}>
      {Array.from({ length: remaining }).map((_, i) => (
        <mesh
          key={i}
          geometry={getCardGeometry()}
          position-y={i * CARD.thickness * 1.04}
          rotation-x={-Math.PI / 2}
          rotation-z={(i % 2 ? 1 : -1) * 0.012}
        >
          <meshStandardMaterial attach="material-0" map={back} roughness={0.6} />
          <meshStandardMaterial attach="material-1" color="#efe6d2" roughness={0.7} />
          <meshStandardMaterial attach="material-2" color="#efe6d2" roughness={0.7} />
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

const burnRestAngle = (i: number) => (i % 2 ? 1 : -1) * 0.18 + 0.25

/**
 * Burn cards stack face-down under the pot. Each time the dealer burns a card
 * (boardStage increments) the newest card is tossed in from the deck with a
 * little arc and spin before settling onto the pile.
 */
function BurnPile({ boardStage }: { boardStage: number }) {
  const back = useMemo(() => getSharedBack(), [])
  const flyRef = useRef<THREE.Group>(null)
  const prog = useRef(1)
  const prev = useRef(boardStage)

  useEffect(() => {
    if (boardStage > prev.current) prog.current = 0 // start the toss-in
    prev.current = boardStage
  }, [boardStage])

  // Deck position expressed relative to the burn-pile group origin.
  const deckLocal = useMemo<[number, number, number]>(
    () => [
      DECK_POSITION[0] - BURN_POSITION[0],
      DECK_POSITION[1] - BURN_POSITION[1] + 0.35,
      DECK_POSITION[2] - BURN_POSITION[2],
    ],
    [],
  )

  const topIndex = boardStage - 1
  const restY = topIndex >= 0 ? topIndex * CARD.thickness * 1.04 : 0
  const restAngle = burnRestAngle(Math.max(0, topIndex))
  const spinFrom = restAngle + (topIndex % 2 ? -1 : 1) * 1.0

  useFrame((_, dt) => {
    const g = flyRef.current
    if (!g) return
    if (prog.current < 1) prog.current = Math.min(1, prog.current + dt / 0.5)
    const p = easeOutCubic(prog.current)
    const arc = Math.sin(Math.min(1, prog.current) * Math.PI) * 0.7
    g.position.set(
      THREE.MathUtils.lerp(deckLocal[0], 0, p),
      THREE.MathUtils.lerp(deckLocal[1], restY, p) + arc,
      THREE.MathUtils.lerp(deckLocal[2], 0, p),
    )
    g.rotation.x = -Math.PI / 2
    g.rotation.z = THREE.MathUtils.lerp(spinFrom, restAngle, p)
  })

  return (
    <group position={BURN_POSITION}>
      {/* Settled burn cards (every card except the one currently flying in) */}
      {Array.from({ length: Math.max(0, boardStage - 1) }).map((_, i) => (
        <mesh
          key={i}
          geometry={getCardGeometry()}
          position-y={i * CARD.thickness * 1.04}
          rotation-x={-Math.PI / 2}
          rotation-z={burnRestAngle(i)}
        >
          <meshStandardMaterial attach="material-0" map={back} roughness={0.6} />
          <meshStandardMaterial attach="material-1" map={back} roughness={0.6} />
          <meshStandardMaterial attach="material-2" color="#8c1a26" roughness={0.6} />
        </mesh>
      ))}
      {/* The most-recently burned card, tossed in from the deck */}
      {boardStage > 0 && (
        <group ref={flyRef}>
          <mesh geometry={getCardGeometry()}>
            <meshStandardMaterial attach="material-0" map={back} roughness={0.6} />
            <meshStandardMaterial attach="material-1" map={back} roughness={0.6} />
            <meshStandardMaterial attach="material-2" color="#8c1a26" roughness={0.6} />
          </mesh>
        </group>
      )}
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

function CameraController({ dealt }: { dealt: boolean }) {
  const size = useThree((s) => s.size)
  const reducedMotion = useRef(prefersReducedMotion())
  const startT = useRef<number | null>(null)

  useFrame((state) => {
    const cam = state.camera as THREE.PerspectiveCamera
    const aspect = size.width / Math.max(1, size.height)
    const tanV = Math.tan((((cam.fov ?? 40) * Math.PI) / 180) / 2)
    const tanH = tanV * aspect
    // Pull back far enough that the table width fits horizontally — keeps the
    // sides from being cut off on tall/narrow (mobile) viewports.
    const dist = Math.max(HOME_DIST, TABLE_HALF_W / tanH)
    const hx = LOOK_AT.x + HOME_UNIT.x * dist
    const hy = LOOK_AT.y + HOME_UNIT.y * dist
    const hz = LOOK_AT.z + HOME_UNIT.z * dist
    // The fly-in starts only once the deal begins (not on page load behind the
    // intro), so the zoom accompanies the deal instead of preceding it.
    let e = 0
    if (reducedMotion.current) {
      e = 1
    } else if (dealt) {
      if (startT.current === null) startT.current = state.clock.elapsedTime
      e = easeOutCubic(Math.min(1, (state.clock.elapsedTime - startT.current) / INTRO_SECONDS))
    }
    cam.position.set(
      THREE.MathUtils.lerp(INTRO_START[0], hx, e),
      THREE.MathUtils.lerp(INTRO_START[1], hy, e),
      THREE.MathUtils.lerp(INTRO_START[2], hz, e),
    )
    cam.lookAt(LOOK_AT)
  })
  return null
}

interface SceneProps {
  dealt: boolean
  focusedKey: string | null
  /** Players bet chips. */
  betStage: number
  /** Dealer burns a card. */
  burnStage: number
  /** Community card(s) revealed; also drives the deck size + hint. */
  revealStage: number
  onToggle: (slot: CardSlot) => void
  onDeckPress: () => void
  onDismiss: () => void
}

export function Scene({
  dealt,
  focusedKey,
  betStage,
  burnStage,
  revealStage,
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
      <Chips boardStage={betStage} />
      <Players />
      <Nameplates />
      <Deck onPress={onDeckPress} />
      <BurnPile boardStage={burnStage} />

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
        const isDealt = communityDealt(slot, revealStage)
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

      <CameraController dealt={dealt} />
    </>
  )
}
