import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Environment, Lightformer } from '@react-three/drei'
import * as THREE from 'three'
import { PokerTable } from './PokerTable'
import { Card3D } from './Card3D'
import { Chips } from './Chips'
import { Players } from './Player'
import { Casino } from './Casino'
import {
  seatCards,
  communityCards,
  DECK_CARDS,
  DECK_POSITION,
  BURN_POSITION,
  CARD,
  CAMERA_HOME,
  FLOOR,
  TABLE,
  type CardSlot,
} from './layout'
import { getSharedBack, onCardFacesUpdated } from './cardTextures'
import { getCardGeometry } from './cardGeometry'
import { createFloorTexture } from './floorTexture'
import { Nameplates } from './Nameplates'
import { DealCue } from './DealCue'
import { motionOff } from './motion'
import { frameStep } from './frame'

const LOOK_AT = new THREE.Vector3(0, 0.1, -0.2)
const INTRO_SECONDS = 1.5
const INTRO_START: [number, number, number] = [0, 17, 23]
/** Fog distances past the camera's resting distance. */
const FOG_NEAR = 8.5
const FOG_FAR = 32.5
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)

/** Direction and base distance of the design camera from the look-at point. */
const HOME_VEC = new THREE.Vector3(CAMERA_HOME[0], CAMERA_HOME[1], CAMERA_HOME[2]).sub(LOOK_AT)
const HOME_DIST = HOME_VEC.length()
const HOME_UNIT = HOME_VEC.clone().normalize()
/** Table half-width (incl. rail) to keep within the horizontal field of view.
    Derived from the table, so the compact (phone) table needs less pull-back. */
const TABLE_HALF_W = TABLE.rx + 0.85

function Floor() {
  const tex = useMemo(() => createFloorTexture(), [])
  return (
    <mesh rotation-x={-Math.PI / 2} position-y={FLOOR} receiveShadow>
      <planeGeometry args={[160, 160]} />
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
  const deck = useRef<THREE.InstancedMesh>(null)

  // One instanced draw for the whole stack instead of one mesh per card.
  useLayoutEffect(() => {
    const m = deck.current
    if (!m) return
    const o = new THREE.Object3D()
    for (let i = 0; i < DECK_CARDS; i += 1) {
      o.position.set(0, i * CARD.thickness * 1.04, 0)
      o.rotation.set(-Math.PI / 2, 0, (i % 2 ? 1 : -1) * 0.012)
      o.updateMatrix()
      m.setMatrixAt(i, o.matrix)
    }
    m.instanceMatrix.needsUpdate = true
    m.computeBoundingSphere()
  }, [])

  return (
    <group position={DECK_POSITION}>
      <instancedMesh ref={deck} args={[getCardGeometry(), undefined, DECK_CARDS]}>
        <meshStandardMaterial attach="material-0" map={back} roughness={0.6} />
        <meshStandardMaterial attach="material-1" color="#efe6d2" roughness={0.7} />
        <meshStandardMaterial attach="material-2" color="#efe6d2" roughness={0.7} />
      </instancedMesh>
      {/* Click target covering the deck. Invisible objects are never drawn but
          still catch pointer events. */}
      <mesh
        visible={false}
        position-y={DECK_CARDS * CARD.thickness * 1.04 + 0.2}
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
  const invalidate = useThree((s) => s.invalidate)

  useEffect(() => {
    if (boardStage > prev.current) {
      prog.current = 0 // start the toss-in
      invalidate()
    }
    prev.current = boardStage
  }, [boardStage, invalidate])

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

  useFrame((state, delta) => {
    const g = flyRef.current
    if (!g) return
    if (prog.current < 1) {
      prog.current = Math.min(1, prog.current + frameStep(delta) / 0.5)
      state.invalidate()
    }
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

const vignetteMaterial = new THREE.ShaderMaterial({
  transparent: true,
  depthWrite: false,
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  // An ellipse 75% of the screen wide and 70% tall, centred a little above
  // the middle: clear inside 58% of it, darkening to half black at its rim.
  fragmentShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      float r = length(vec2((vUv.x - 0.5) / 0.75, (vUv.y - 0.52) / 0.7));
      gl_FragColor = vec4(0.016, 0.008, 0.012, 0.5 * clamp((r - 0.58) / 0.42, 0.0, 1.0));
    }
  `,
})

/**
 * A soft vignette that draws the eye to the table. It is a screen-filling
 * plane halfway between the camera and the table, so it darkens the table and
 * the room but never a card lifted up to read, which comes to rest nearer the
 * camera -- the edges of the screen stay exactly as dark whether or not a card
 * is up.
 */
function Vignette() {
  const ref = useRef<THREE.Mesh>(null)
  useFrame(({ camera, size }) => {
    const m = ref.current
    if (!m) return
    const cam = camera as THREE.PerspectiveCamera
    const depth = cam.position.distanceTo(LOOK_AT) * 0.5
    const halfH = depth * Math.tan(((cam.fov * Math.PI) / 180) / 2)
    camera.getWorldDirection(_camDir)
    m.position.copy(camera.position).addScaledVector(_camDir, depth)
    m.quaternion.copy(camera.quaternion)
    m.scale.set(halfH * 2 * (size.width / Math.max(1, size.height)), halfH * 2, 1)
  })
  return (
    <mesh ref={ref} material={vignetteMaterial} frustumCulled={false} raycast={() => null}>
      <planeGeometry />
    </mesh>
  )
}

/**
 * An invisible plane that hovers just in front of the camera while a card is
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
      visible={false}
      onClick={(e) => {
        e.stopPropagation()
        onDismiss()
      }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <planeGeometry args={[80, 80]} />
    </mesh>
  )
}

function CameraController({ dealt }: { dealt: boolean }) {
  const size = useThree((s) => s.size)
  const skipZoom = useRef(motionOff())
  const startT = useRef<number | null>(null)

  useFrame((state) => {
    const cam = state.camera as THREE.PerspectiveCamera
    const aspect = size.width / Math.max(1, size.height)
    const tanV = Math.tan((((cam.fov ?? 40) * Math.PI) / 180) / 2)
    const tanH = tanV * aspect
    // Pull back far enough that the table width fits horizontally — keeps the
    // sides from being cut off on tall/narrow (mobile) viewports.
    const dist = Math.max(HOME_DIST, TABLE_HALF_W / tanH)
    // Fog starts just beyond the table from wherever the camera rests, so a
    // tall screen's pulled-back camera doesn't sink the table into it (the
    // fly-in still starts out in the fog).
    const fog = state.scene.fog as THREE.Fog | null
    if (fog) {
      fog.near = dist + FOG_NEAR
      fog.far = dist + FOG_FAR
    }
    const hx = LOOK_AT.x + HOME_UNIT.x * dist
    const hy = LOOK_AT.y + HOME_UNIT.y * dist
    const hz = LOOK_AT.z + HOME_UNIT.z * dist
    // The fly-in starts only once the deal begins (not on page load behind the
    // intro), so the zoom accompanies the deal instead of preceding it.
    let e = 0
    if (skipZoom.current) {
      e = 1
    } else if (dealt) {
      // Timed from the first frame of the flight, so a pause before it (frames
      // are drawn on demand) doesn't eat into the animation.
      if (startT.current === null) startT.current = performance.now()
      e = easeOutCubic(Math.min(1, (performance.now() - startT.current) / 1000 / INTRO_SECONDS))
      if (e < 1) state.invalidate()
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

export interface SceneProps {
  dealt: boolean
  focusedKey: string | null
  /** Rounds of betting so far: pre-flop, then one per street. */
  betStage: number
  /** Dealer burns a card. */
  burnStage: number
  /** Community card(s) revealed; also drives the deck size + hint. */
  revealStage: number
  /** Label for the cue pointing at the deck, or null when there is nothing to deal. */
  dealCue: string | null
  /** Whether the room around the table is in view and should keep moving. */
  ambient: boolean
  onToggle: (slot: CardSlot) => void
  /** Clicking a seat's nameplate lifts that seat's hand. */
  onSelectSeat: (seatId: string) => void
  onDeckPress: () => void
  onDismiss: () => void
}

export function Scene({
  dealt,
  focusedKey,
  betStage,
  burnStage,
  revealStage,
  dealCue,
  ambient,
  onToggle,
  onSelectSeat,
  onDeckPress,
  onDismiss,
}: SceneProps) {
  const invalidate = useThree((s) => s.invalidate)
  const [still] = useState(motionOff)

  // Frames are drawn on demand. Each animation keeps requesting frames until it
  // settles; this starts them off whenever the hand moves on, and redraws when
  // the About photo finishes loading into its card.
  useEffect(() => {
    invalidate()
  }, [invalidate, dealt, focusedKey, betStage, burnStage, revealStage, dealCue])
  useEffect(() => onCardFacesUpdated(invalidate), [invalidate])

  return (
    <>
      <color attach="background" args={['#160a10']} />
      {/* near/far are set per frame from the camera distance (CameraController). */}
      <fog attach="fog" args={['#160a10', HOME_DIST + FOG_NEAR, HOME_DIST + FOG_FAR]} />

      {/* Soft studio reflections: a warm softbox over the table and two dim
          side panels, filmed once into an environment map (no HDR download).
          They give the chips, leather, brass and lacquer something to shine
          with. */}
      <Environment resolution={128} environmentIntensity={0.55}>
        <Lightformer form="rect" intensity={3} color="#ffe2b8" position={[0, 9, 1]} target={[0, 0, 0]} scale={[12, 7, 1]} />
        <Lightformer form="rect" intensity={1.1} color="#a9c8ff" position={[-11, 4, -5]} target={[0, 0, 0]} scale={[9, 4, 1]} />
        <Lightformer form="rect" intensity={0.9} color="#ffcf96" position={[11, 3, 9]} target={[0, 0, 0]} scale={[9, 4, 1]} />
      </Environment>

      <ambientLight intensity={0.3} />
      <hemisphereLight args={['#9fc8b4', '#140d07', 0.3]} />
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
        shadow-mapSize={[1024, 1024]}
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
      <Casino animate={ambient} still={still} />
      <PokerTable />
      <Chips rounds={betStage} />
      <Players />
      <Nameplates interactive={dealt && focusedKey === null} onSelect={onSelectSeat} />
      <Deck onPress={onDeckPress} />
      {dealCue && <DealCue label={dealCue} onPress={onDeckPress} />}
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
      <Vignette />
    </>
  )
}
