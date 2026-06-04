import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import { createCardFaces } from './cardTextures'
import { getCardGeometry } from './cardGeometry'
import { CARD, DECK_POSITION } from './layout'
import type { CardSlot } from './layout'

const FACE_DOWN_X = Math.PI / 2
const FACE_UP_X = -Math.PI / 2

const lerp = THREE.MathUtils.lerp
const clamp01 = (v: number) => Math.max(0, Math.min(1, v))
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3)
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

// Scratch objects shared across instances (useFrame runs sequentially).
const _fwd = new THREE.Vector3()
const _right = new THREE.Vector3()
const _focusPos = new THREE.Vector3()
const _basePos = new THREE.Vector3()
const _lookT = new THREE.Vector3()
const _m4 = new THREE.Matrix4()
const _qBase = new THREE.Quaternion()
const _qFocus = new THREE.Quaternion()
const _euler = new THREE.Euler()
const UP = new THREE.Vector3(0, 1, 0)

interface Card3DProps {
  slot: CardSlot
  dealt: boolean
  focused: boolean
  interactive: boolean
  onToggle: (slot: CardSlot) => void
}

export function Card3D({ slot, dealt, focused, interactive, onToggle }: Card3DProps) {
  const group = useRef<THREE.Group>(null)
  const [hovered, setHovered] = useState(false)
  const [outOfDeck, setOutOfDeck] = useState(dealt)
  const faces = useMemo(() => createCardFaces(slot.section, slot.role), [slot.section, slot.role])

  const base = useRef({
    pos: [...DECK_POSITION] as [number, number, number],
    rot: [FACE_DOWN_X, 0, 0] as [number, number, number],
    scale: 1,
  })
  const prog = useRef(0)

  useEffect(() => {
    if (!dealt || outOfDeck) return
    const id = window.setTimeout(() => setOutOfDeck(true), slot.dealIndex * 200)
    return () => window.clearTimeout(id)
  }, [dealt, outOfDeck, slot.dealIndex])

  const isCommunity = slot.role === 'community'
  const rest = slot.position
  const focusX = isCommunity ? 0 : slot.role === 'label' ? -1.05 : 1.05
  const focusScale = isCommunity ? 1.65 : 1.5

  useFrame((state) => {
    const g = group.current
    if (!g) return

    // Smoothed base pose (deck / rest / hover).
    let tp: [number, number, number] = rest
    let tr: [number, number, number] = [FACE_DOWN_X, slot.yaw, 0]
    let ts = 1
    if (!outOfDeck) {
      tp = DECK_POSITION
      tr = [FACE_DOWN_X, 0, 0]
    } else if (isCommunity) {
      tr = [FACE_UP_X, 0, 0]
    } else if (hovered && interactive && !focused) {
      tp = [rest[0], rest[1] + 0.26, rest[2] - 0.1]
      tr = [FACE_DOWN_X - 0.3, slot.yaw, 0]
      ts = 1.05
    }

    const b = base.current
    const k = 0.16
    b.pos[0] = lerp(b.pos[0], tp[0], k)
    b.pos[1] = lerp(b.pos[1], tp[1], k)
    b.pos[2] = lerp(b.pos[2], tp[2], k)
    b.rot[0] = lerp(b.rot[0], tr[0], k)
    b.rot[1] = lerp(b.rot[1], tr[1], k)
    b.rot[2] = lerp(b.rot[2], tr[2], k)
    b.scale = lerp(b.scale, ts, k)

    // Lift in an arc whenever the card is edge-on (mid-flip) so it never knifes
    // through the felt when dealt face-up.
    const edgeOn =
      Math.min(Math.abs(b.rot[0] - FACE_DOWN_X), Math.abs(b.rot[0] - FACE_UP_X)) /
      (Math.PI / 2)
    const flipArc = Math.sin(clamp01(edgeOn) * (Math.PI / 2)) ** 2
    _basePos.set(b.pos[0], b.pos[1] + flipArc * 1.25, b.pos[2])
    _qBase.setFromEuler(_euler.set(b.rot[0], b.rot[1], 0))

    // Lower factor = slower pick-up (focus in) and put-down (focus out).
    prog.current = lerp(prog.current, focused ? 1 : 0, 0.06)
    const p = prog.current

    if (p < 0.001) {
      g.position.copy(_basePos)
      g.quaternion.copy(_qBase)
      g.scale.setScalar(b.scale)
      return
    }

    // Focus: fly to a spot in front of the camera, sized to fit the viewport
    // (works at any aspect, incl. tall/mobile), facing the camera.
    const cam = state.camera as THREE.PerspectiveCamera
    const fovV = ((cam.fov ?? 40) * Math.PI) / 180
    const tanV = Math.tan(fovV / 2)
    const aspect = state.size.width / Math.max(1, state.size.height)
    const tanH = tanV * aspect
    cam.getWorldDirection(_fwd)
    _right.crossVectors(_fwd, UP).normalize()
    const halfW = (isCommunity ? 0 : 1.05) + (CARD.w * focusScale) / 2 + 0.12
    const halfH = (CARD.h * focusScale) / 2 + 0.12
    const dist = Math.max(halfW / tanH, halfH / tanV) * 1.08
    _focusPos
      .copy(cam.position)
      .addScaledVector(_fwd, dist)
      .addScaledVector(_right, focusX)
    _lookT.copy(_focusPos).add(_fwd)
    _m4.lookAt(_focusPos, _lookT, UP)
    _qFocus.setFromRotationMatrix(_m4)

    // Position leads (clears the table); rotation lags (flips to face you).
    const posE = easeOut(clamp01(p / 0.55))
    const rotE = easeInOut(clamp01((p - 0.15) / 0.85))
    g.position.copy(_basePos).lerp(_focusPos, posE)
    g.quaternion.copy(_qBase).slerp(_qFocus, rotE)
    g.scale.setScalar(lerp(b.scale, focusScale, p))
  })

  const frontMap = isCommunity && !focused ? faces.cover ?? faces.front : faces.front

  const onOver = (e: ThreeEvent<PointerEvent>) => {
    if (!interactive) return
    e.stopPropagation()
    setHovered(true)
    document.body.style.cursor = 'pointer'
  }
  const onOut = () => {
    setHovered(false)
    document.body.style.cursor = ''
  }
  const onClick = (e: ThreeEvent<MouseEvent>) => {
    if (!interactive || !outOfDeck) return
    e.stopPropagation()
    onToggle(slot)
  }

  return (
    <>
      {/* Static, invisible hit target at the card's rest spot. Hovering it
          raises the visual card, but clicking the original footprint (even after
          it has raised) still selects the card. */}
      <mesh
        position={[rest[0], CARD.restY + 0.18, rest[2]]}
        onPointerOver={onOver}
        onPointerOut={onOut}
        onClick={onClick}
      >
        <boxGeometry args={[CARD.w + 0.06, 0.7, CARD.h + 0.06]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      <group ref={group} renderOrder={focused ? 10 : 0}>
        <mesh geometry={getCardGeometry()} castShadow receiveShadow>
          <meshStandardMaterial attach="material-0" map={frontMap} roughness={0.92} metalness={0} />
          <meshStandardMaterial attach="material-1" map={faces.back} roughness={0.85} metalness={0} />
          <meshStandardMaterial attach="material-2" color="#efe6d2" roughness={0.7} />
        </mesh>
      </group>
    </>
  )
}
