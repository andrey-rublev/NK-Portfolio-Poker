import { useEffect, useMemo, useState } from 'react'
import type { ThreeEvent } from '@react-three/fiber'
import { useSpring, animated } from '@react-spring/three'
import { createCardFaces } from './cardTextures'
import { CARD, DECK_POSITION } from './layout'
import type { CardSlot } from './layout'

const FACE_DOWN_X = Math.PI / 2
const DEAL_CONFIG = { mass: 1, tension: 90, friction: 24 }
const FLIP_CONFIG = { mass: 1, tension: 140, friction: 18 }

interface Card3DProps {
  slot: CardSlot
  dealt: boolean
  revealed: boolean
  interactive: boolean
  onToggle: (slot: CardSlot) => void
}

export function Card3D({ slot, dealt, revealed, interactive, onToggle }: Card3DProps) {
  const [hovered, setHovered] = useState(false)
  const [outOfDeck, setOutOfDeck] = useState(dealt)
  const faces = useMemo(
    () => createCardFaces(slot.section, slot.role),
    [slot.section, slot.role],
  )

  useEffect(() => {
    if (!dealt || outOfDeck) return
    const id = window.setTimeout(() => setOutOfDeck(true), slot.dealIndex * 200)
    return () => window.clearTimeout(id)
  }, [dealt, outOfDeck, slot.dealIndex])

  const rest = slot.position
  const isCommunity = slot.role === 'community'

  let position: [number, number, number] = rest
  let rotation: [number, number, number] = [FACE_DOWN_X, slot.yaw, 0]
  let scale = 1

  if (!outOfDeck) {
    position = DECK_POSITION
    rotation = [FACE_DOWN_X, 0, 0]
  } else if (revealed && isCommunity) {
    // Community cards lie face-up flat on the board.
    rotation = [-Math.PI / 2, 0, 0]
  } else if (revealed) {
    // Seat cards flip up off the table and lean toward the camera to read.
    position = [rest[0], rest[1] + 0.7, rest[2] + 0.5]
    rotation = [-0.5, slot.yaw * 0.3, 0]
    scale = 1.5
  } else if (hovered && interactive) {
    position = [rest[0], rest[1] + 0.28, rest[2] - 0.1]
    rotation = [FACE_DOWN_X - 0.32, slot.yaw, 0]
    scale = 1.05
  }

  const spring = useSpring({
    position,
    rotation,
    scale,
    config: revealed ? FLIP_CONFIG : DEAL_CONFIG,
  })

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
    if (!interactive) return
    e.stopPropagation()
    onToggle(slot)
  }

  return (
    <animated.group
      position={spring.position as unknown as [number, number, number]}
      rotation={spring.rotation as unknown as [number, number, number]}
      scale={spring.scale}
    >
      <mesh castShadow receiveShadow onPointerOver={onOver} onPointerOut={onOut} onClick={onClick}>
        <boxGeometry args={[CARD.w, CARD.h, CARD.thickness]} />
        <meshStandardMaterial attach="material-0" color="#efe6d2" roughness={0.7} />
        <meshStandardMaterial attach="material-1" color="#efe6d2" roughness={0.7} />
        <meshStandardMaterial attach="material-2" color="#efe6d2" roughness={0.7} />
        <meshStandardMaterial attach="material-3" color="#efe6d2" roughness={0.7} />
        {/* front (+Z) carries the content; back (-Z) is the crimson card-back */}
        <meshStandardMaterial attach="material-4" map={faces.front} roughness={0.55} />
        <meshStandardMaterial attach="material-5" map={faces.back} roughness={0.6} />
      </mesh>
    </animated.group>
  )
}
