import { useMemo, useState } from 'react'
import type { ThreeEvent } from '@react-three/fiber'
import { useSpring, animated, config } from '@react-spring/three'
import { createCardTextures } from './cardTextures'
import { CARD, DECK_POSITION } from './layout'
import type { CardLayout } from './layout'
import type { PortfolioCardData } from '../data/portfolio'

/** Where a selected card flies to (in front of the camera). */
const FOCUS_POSITION: [number, number, number] = [0, 2.2, 4.3]
/** Flat on the felt with the label (front, +Z) face up and reading upright. */
const FLAT_X = -Math.PI / 2

interface Card3DProps {
  layout: CardLayout
  dealt: boolean
  selected: boolean
  anySelected: boolean
  onSelect: (card: PortfolioCardData) => void
}

export function Card3D({
  layout,
  dealt,
  selected,
  anySelected,
  onSelect,
}: Card3DProps) {
  const [hovered, setHovered] = useState(false)
  const { front, back } = useMemo(
    () => createCardTextures(layout.card),
    [layout.card],
  )

  const rest = layout.position
  const interactive = dealt && !anySelected
  const active = hovered && interactive

  let position: [number, number, number] = rest
  let rotation: [number, number, number] = [FLAT_X, layout.yaw, 0]
  let scale = 1

  if (!dealt) {
    position = DECK_POSITION
    rotation = [FLAT_X, 0, 0]
  } else if (selected) {
    // Lift the card up to face the camera as the detail panel opens.
    position = FOCUS_POSITION
    rotation = [0, 0, 0]
    scale = 1.85
  } else if (active) {
    // Tilt the card up toward the camera on hover for a clearer read.
    position = [rest[0], rest[1] + 0.4, rest[2] - 0.15]
    rotation = [FLAT_X + 0.5, layout.yaw, 0]
    scale = 1.07
  }

  const spring = useSpring({
    position,
    rotation,
    scale,
    delay: dealt ? layout.dealIndex * 105 : 0,
    config: selected ? config.gentle : config.stiff,
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
    onSelect(layout.card)
  }

  return (
    <animated.group
      position={spring.position as unknown as [number, number, number]}
      rotation={spring.rotation as unknown as [number, number, number]}
      scale={spring.scale}
    >
      <mesh
        castShadow
        receiveShadow
        onPointerOver={onOver}
        onPointerOut={onOut}
        onClick={onClick}
      >
        <boxGeometry args={[CARD.w, CARD.h, CARD.thickness]} />
        {/* edges */}
        <meshStandardMaterial attach="material-0" color="#efe6d2" roughness={0.7} />
        <meshStandardMaterial attach="material-1" color="#efe6d2" roughness={0.7} />
        <meshStandardMaterial attach="material-2" color="#efe6d2" roughness={0.7} />
        <meshStandardMaterial attach="material-3" color="#efe6d2" roughness={0.7} />
        {/* front (+Z) and back (-Z) — clearcoat gives a subtle card-stock sheen */}
        <meshPhysicalMaterial
          attach="material-4"
          map={front}
          roughness={0.5}
          clearcoat={0.35}
          clearcoatRoughness={0.45}
        />
        <meshPhysicalMaterial
          attach="material-5"
          map={back}
          roughness={0.52}
          clearcoat={0.3}
          clearcoatRoughness={0.5}
        />
      </mesh>
    </animated.group>
  )
}
