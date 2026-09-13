import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { createCardFaces } from './cardTextures'
import { getCardGeometry } from './cardGeometry'
import { CARD, DECK_TOP } from './layout'
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
const _camUp = new THREE.Vector3()
const _focusPos = new THREE.Vector3()
const _basePos = new THREE.Vector3()
const _lookT = new THREE.Vector3()
const _m4 = new THREE.Matrix4()
const _qBase = new THREE.Quaternion()
const _qFocus = new THREE.Quaternion()
const _qFlip = new THREE.Quaternion()
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
  const backMat = useRef<THREE.MeshStandardMaterial>(null)
  const [hovered, setHovered] = useState(false)
  const [outOfDeck, setOutOfDeck] = useState(dealt)
  const faces = useMemo(() => createCardFaces(slot.section, slot.role), [slot.section, slot.role])

  const base = useRef({
    pos: [...DECK_TOP] as [number, number, number],
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

  useFrame((state, dt) => {
    const g = group.current
    if (!g) return

    // Smoothed base pose (deck / rest / hover).
    let tp: [number, number, number] = rest
    let tr: [number, number, number] = [FACE_DOWN_X, slot.yaw, 0]
    let ts = 1
    if (!outOfDeck) {
      tp = DECK_TOP
      tr = [FACE_DOWN_X, 0, 0]
    } else if (isCommunity) {
      tr = [FACE_UP_X, 0, 0]
    } else if (hovered && interactive && !focused) {
      tp = [rest[0], rest[1] + 0.26, rest[2] - 0.1]
      tr = [FACE_DOWN_X - 0.3, slot.yaw, 0]
      ts = 1.05
    }

    const b = base.current
    // Time-corrected smoothing so motion takes the same real-world time at any
    // frame rate (≈ the old per-frame 0.16 at 60 fps).
    const k = 1 - Math.exp(-10.5 * dt)
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
    // YXZ so yaw spins the flat card about the vertical axis (point it at the
    // player) before it is laid flat by the X rotation.
    _qBase.setFromEuler(_euler.set(b.rot[0], b.rot[1], 0, 'YXZ'))

    // Lower rate = slower pick-up (focus in) and put-down (focus out).
    // Time-corrected (≈ the old per-frame 0.06 at 60 fps).
    prog.current = lerp(prog.current, focused ? 1 : 0, 1 - Math.exp(-3.7 * dt))
    const p = prog.current
    const lifted = p > 0.001

    // A lifted card draws after the nameplates, so it covers them rather than
    // the plates (which ignore depth) printing over its text.
    g.renderOrder = lifted ? 10 : 0

    // A community card's content is printed on its reverse. The reverse faces
    // the felt the whole time the card rests face-up, so it keeps the ordinary
    // card back until the card leaves the table -- that swap is never visible.
    if (faces.content && backMat.current) {
      const want = lifted ? faces.content : faces.back
      if (backMat.current.map !== want) backMat.current.map = want
    }

    if (!lifted) {
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
    _camUp.crossVectors(_right, _fwd).normalize()
    // On tall (portrait/phone) screens a hand's two cards stack vertically —
    // label on top, info below — so each card sits far closer to the camera
    // than a side-by-side pair squeezed into a narrow field of view.
    const portrait = aspect < 0.9
    const fx = portrait ? 0 : focusX
    const fy =
      portrait && !isCommunity
        ? (slot.role === 'label' ? 1 : -1) * ((CARD.h * focusScale) / 2 + 0.07)
        : 0
    const pad = portrait ? 0.06 : 0.12
    const halfW = Math.abs(fx) + (CARD.w * focusScale) / 2 + pad
    const halfH = Math.abs(fy) + (CARD.h * focusScale) / 2 + pad
    const dist = Math.max(halfW / tanH, halfH / tanV) * (portrait ? 1.12 : 1.08)
    // Bias the portrait stack upward so its bottom clears the hint pill.
    const fyBias = portrait ? 0.14 : 0
    _focusPos
      .copy(cam.position)
      .addScaledVector(_fwd, dist)
      .addScaledVector(_right, fx)
      .addScaledVector(_camUp, fy + fyBias)
    _lookT.copy(_focusPos).add(_fwd)
    _m4.lookAt(_focusPos, _lookT, UP)
    _qFocus.setFromRotationMatrix(_m4)

    // Position leads (clears the table); rotation lags (flips to face you).
    // A community card turns to face you title-first over the first half of
    // the lift, then turns over like a page to show the content on its back.
    const posE = easeOut(clamp01(p / 0.55))
    const rotE = easeInOut(clamp01((p - 0.15) / (isCommunity ? 0.45 : 0.85)))
    g.position.copy(_basePos).lerp(_focusPos, posE)
    g.quaternion.copy(_qBase).slerp(_qFocus, rotE)
    if (isCommunity) {
      const flipE = easeInOut(clamp01((p - 0.5) / 0.5))
      g.quaternion.multiply(_qFlip.setFromAxisAngle(UP, Math.PI * flipE))
    }
    g.scale.setScalar(lerp(b.scale, focusScale, p))
  })

  // Links live on the right (info) card of a hand, or the single community card.
  const actions = slot.section.actions
  const showLinks = focused && slot.role !== 'label' && !!actions && actions.length > 0

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

      {/* Materials are `transparent` at full opacity purely for draw order:
          three.js sorts opaque and transparent objects in separate passes, and
          the nameplates are transparent, so only a transparent card can be
          ordered above them. */}
      <group ref={group}>
        <mesh geometry={getCardGeometry()} castShadow receiveShadow>
          <meshStandardMaterial attach="material-0" map={faces.front} transparent roughness={0.92} metalness={0} />
          <meshStandardMaterial ref={backMat} attach="material-1" map={faces.back} transparent roughness={0.85} metalness={0} />
          <meshStandardMaterial attach="material-2" color="#efe6d2" transparent roughness={0.7} />
        </mesh>
        {showLinks && actions && (
          // A community card is read from its back, so its links sit on that side.
          <Html position={[0, -0.5, isCommunity ? -0.06 : 0.06]} center>
            <div className="card-link-row">
              {actions.map((a) => (
                <a key={a.href} href={a.href} target="_blank" rel="noopener noreferrer">
                  {a.label}
                </a>
              ))}
            </div>
          </Html>
        )}
      </group>
    </>
  )
}
