import { useMemo, useState } from 'react'
import { useThree, type ThreeEvent } from '@react-three/fiber'
import { useSpring, animated, config } from '@react-spring/three'
import { createCardTextures } from './cardTextures'
import { CARD, DECK_POSITION } from './layout'
import type { CardLayout } from './layout'
import type { PortfolioCardData } from '../data/portfolio'

/** Where a selected card flies to (in front of the camera). */
const FOCUS_POSITION: [number, number, number] = [0, 2.6, 4.1]

interface Card3DProps {
  layout: CardLayout
  dealt: boolean
  selected: boolean
  anySelected: boolean
  reducedMotion: boolean
  onSelect: (card: PortfolioCardData) => void
}

export function Card3D({
  layout,
  dealt,
  selected,
  anySelected,
  reducedMotion,
  onSelect,
}: Card3DProps) {
  const [hovered, setHovered] = useState(false)
  const invalidate = useThree((s) => s.invalidate)
  const { front, back } = useMemo(
    () => createCardTextures(layout.card),
    [layout.card],
  )

  const rest = layout.position
  const interactive = dealt && !anySelected
  const active = hovered && interactive

  let position: [number, number, number] = rest
  let rotation: [number, number, number] = [Math.PI / 2, layout.yaw, 0]
  let scale = 1

  if (!dealt) {
    position = DECK_POSITION
    rotation = [Math.PI / 2, 0, 0]
  } else if (selected) {
    position = FOCUS_POSITION
    rotation = [0.04, 0, 0]
    scale = 2.15
  } else if (active) {
    position = [rest[0], rest[1] + 0.55, rest[2] - 0.25]
    rotation = [Math.PI / 2 - 0.5, layout.yaw * 0.5, 0]
    scale = 1.08
  }

  const spring = useSpring({
    position,
    rotation,
    scale,
    delay: dealt && !reducedMotion ? layout.dealIndex * 105 : 0,
    immediate: reducedMotion,
    config: selected ? config.gentle : config.stiff,
    // Drive renders while animating (the Canvas uses frameloop="demand").
    onChange: () => invalidate(),
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
        {/* front (+Z) and back (-Z) */}
        <meshStandardMaterial attach="material-4" map={front} roughness={0.55} />
        <meshStandardMaterial attach="material-5" map={back} roughness={0.55} />
      </mesh>
    </animated.group>
  )
}
