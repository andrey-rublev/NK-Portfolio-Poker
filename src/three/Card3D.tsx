import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import { createCardFaces } from './cardTextures'
import { CARD, DECK_POSITION } from './layout'
import type { CardSlot } from './layout'

const FACE_DOWN_X = Math.PI / 2
const FACE_UP_X = -Math.PI / 2
/** Where a focused card flies — high in front of the camera, leaning back to read. */
const FOCUS_Y = 4.95
const FOCUS_Z = 6.1
const FOCUS_TILT = -0.4

const lerp = THREE.MathUtils.lerp
const clamp01 = (v: number) => Math.max(0, Math.min(1, v))
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3)
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

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

  // Smoothed base pose (deck/rest/hover) and focus progress, advanced per frame.
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

  useFrame(() => {
    const g = group.current
    if (!g) return

    // Target base pose (not focused).
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

    // Focus progress 0..1.
    prog.current = lerp(prog.current, focused ? 1 : 0, 0.14)
    const p = prog.current
    // Position leads (lift early / lower late); rotation lags (flip after lift).
    const liftT = easeOut(clamp01(p / 0.45))
    const flipT = easeInOut(clamp01((p - 0.2) / 0.8))

    g.position.set(
      lerp(b.pos[0], focusX, p),
      lerp(b.pos[1], FOCUS_Y, liftT),
      lerp(b.pos[2], FOCUS_Z, p),
    )
    g.rotation.set(
      lerp(b.rot[0], FOCUS_TILT, flipT),
      lerp(b.rot[1], 0, flipT),
      0,
    )
    const sc = lerp(b.scale, focusScale, p)
    g.scale.setScalar(sc)
  })

  // Community shows its big "cover" heading until focused, then the content.
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
    <group ref={group} renderOrder={focused ? 10 : 0}>
      <mesh castShadow receiveShadow onPointerOver={onOver} onPointerOut={onOut} onClick={onClick}>
        <boxGeometry args={[CARD.w, CARD.h, CARD.thickness]} />
        <meshStandardMaterial attach="material-0" color="#efe6d2" roughness={0.7} />
        <meshStandardMaterial attach="material-1" color="#efe6d2" roughness={0.7} />
        <meshStandardMaterial attach="material-2" color="#efe6d2" roughness={0.7} />
        <meshStandardMaterial attach="material-3" color="#efe6d2" roughness={0.7} />
        <meshStandardMaterial attach="material-4" map={frontMap} roughness={0.92} metalness={0} />
        <meshStandardMaterial attach="material-5" map={faces.back} roughness={0.85} metalness={0} />
      </mesh>
    </group>
  )
}
