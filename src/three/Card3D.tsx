import { useMemo, useState } from 'react'
import type { ThreeEvent } from '@react-three/fiber'
import { useSpring, animated } from '@react-spring/three'
import { createCardTexture } from './cardTextures'
import { CARD, DECK_POSITION } from './layout'
import type { CardLayout } from './layout'
import type { PortfolioCardData } from '../data/portfolio'

/** Flat on the felt, face-down. */
const FLAT_X = -Math.PI / 2
/** Slow, gliding deal. */
const DEAL_CONFIG = { mass: 1, tension: 90, friction: 24 }

interface Card3DProps {
  layout: CardLayout
  dealt: boolean
  selected: boolean
  anySelected: boolean
  onSelect: (card: PortfolioCardData, origin: { x: number; y: number }) => void
}

export function Card3D({ layout, dealt, selected, anySelected, onSelect }: Card3DProps) {
  const [hovered, setHovered] = useState(false)
  const texture = useMemo(() => createCardTexture(layout.card), [layout.card])

  const rest = layout.position
  const interactive = dealt && !anySelected
  const active = hovered && interactive

  let position: [number, number, number] = rest
  let rotation: [number, number, number] = [FLAT_X, layout.yaw, 0]
  let scale = 1

  if (!dealt) {
    position = DECK_POSITION
    rotation = [FLAT_X, 0, 0]
  } else if (active) {
    // Lift toward the camera on hover so it reads as interactive.
    position = [rest[0], rest[1] + 0.35, rest[2] - 0.12]
    rotation = [FLAT_X + 0.45, layout.yaw, 0]
    scale = 1.06
  }

  const spring = useSpring({
    position,
    rotation,
    scale,
    delay: dealt ? layout.dealIndex * 230 : 0,
    config: DEAL_CONFIG,
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
    document.body.style.cursor = ''
    onSelect(layout.card, { x: e.clientX, y: e.clientY })
  }

  return (
    <animated.group
      position={spring.position as unknown as [number, number, number]}
      rotation={spring.rotation as unknown as [number, number, number]}
      scale={spring.scale}
    >
      {/* Hidden while its detail panel is open (the panel takes its place). */}
      <mesh
        visible={!selected}
        castShadow
        receiveShadow
        onPointerOver={onOver}
        onPointerOut={onOut}
        onClick={onClick}
      >
        <boxGeometry args={[CARD.w, CARD.h, CARD.thickness]} />
        <meshStandardMaterial attach="material-0" color="#efe6d2" roughness={0.7} />
        <meshStandardMaterial attach="material-1" color="#efe6d2" roughness={0.7} />
        <meshStandardMaterial attach="material-2" color="#efe6d2" roughness={0.7} />
        <meshStandardMaterial attach="material-3" color="#efe6d2" roughness={0.7} />
        <meshStandardMaterial attach="material-4" map={texture} roughness={0.6} />
        <meshStandardMaterial attach="material-5" map={texture} roughness={0.6} />
      </mesh>
    </animated.group>
  )
}
