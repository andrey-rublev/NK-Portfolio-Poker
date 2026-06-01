import { useEffect, useMemo, useState } from 'react'
import type { ThreeEvent } from '@react-three/fiber'
import { useSpring, animated } from '@react-spring/three'
import { createCardTexture } from './cardTextures'
import { CARD, DECK_POSITION } from './layout'
import type { CardLayout } from './layout'
import type { PortfolioCardData } from '../data/portfolio'

/** Flat on the felt, face-down. */
const FLAT_X = -Math.PI / 2
/** Where a selected card rises to — up off the table and toward the camera. */
const FOCUS_POSITION: [number, number, number] = [0, 3, 4.6]
/** Slow, gliding deal. */
const DEAL_CONFIG = { mass: 1, tension: 90, friction: 24 }
/** Snappier glide for the lift when a card is opened. */
const LIFT_CONFIG = { mass: 1, tension: 120, friction: 20 }

interface Card3DProps {
  layout: CardLayout
  dealt: boolean
  selected: boolean
  anySelected: boolean
  onSelect: (card: PortfolioCardData) => void
}

export function Card3D({ layout, dealt, selected, anySelected, onSelect }: Card3DProps) {
  const [hovered, setHovered] = useState(false)
  // The deal is staggered by *when* each card leaves the deck (not a spring
  // delay), so hover/open/close springs always respond immediately.
  const [outOfDeck, setOutOfDeck] = useState(dealt)
  const texture = useMemo(() => createCardTexture(layout.card), [layout.card])

  useEffect(() => {
    if (!dealt || outOfDeck) return
    const id = window.setTimeout(
      () => setOutOfDeck(true),
      layout.dealIndex * 230,
    )
    return () => window.clearTimeout(id)
  }, [dealt, outOfDeck, layout.dealIndex])

  const rest = layout.position
  const interactive = outOfDeck && !anySelected
  const active = hovered && interactive

  let position: [number, number, number] = rest
  let rotation: [number, number, number] = [FLAT_X, layout.yaw, 0]
  let scale = 1

  if (!outOfDeck) {
    position = DECK_POSITION
    rotation = [FLAT_X, 0, 0]
  } else if (selected) {
    // Physically rise off the table and stand up to face the camera.
    position = FOCUS_POSITION
    rotation = [0, 0, 0]
    scale = 1.7
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
    config: selected ? LIFT_CONFIG : DEAL_CONFIG,
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
      {/* Stays visible and rises when selected; the scrim veils it as the panel arrives. */}
      <mesh
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
