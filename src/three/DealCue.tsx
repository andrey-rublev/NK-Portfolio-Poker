import { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { DECK_POSITION, DECK_TOP } from './layout'
import { prefersReducedMotion } from './motion'

const PULSE_SECONDS = 1.8
const RING: [number, number, number] = [0.98, 1.05, 64]
const GOLD = '#f3c56b'

interface DealCueProps {
  /** e.g. "Deal the flop". */
  label: string
  onPress: () => void
}

/**
 * Points the visitor at the deck while there are streets left to deal: a gold
 * ring on the felt around the deck with a ripple pulsing out of it, and a
 * labelled button floating just above. The button is a real DOM control, so
 * dealing is reachable from the keyboard as well as by pressing the deck.
 */
export function DealCue({ label, onPress }: DealCueProps) {
  const [reducedMotion] = useState(prefersReducedMotion)
  const ripple = useRef<THREE.Mesh>(null)
  const rippleMat = useRef<THREE.MeshBasicMaterial>(null)

  useFrame((state) => {
    const m = ripple.current
    const mat = rippleMat.current
    if (!m || !mat) return
    const t = (state.clock.elapsedTime % PULSE_SECONDS) / PULSE_SECONDS
    m.scale.setScalar(1 + t * 0.5)
    mat.opacity = 0.65 * (1 - t) ** 2
  })

  return (
    <group position={[DECK_POSITION[0], 0.02, DECK_POSITION[2]]}>
      <mesh rotation-x={-Math.PI / 2}>
        <ringGeometry args={RING} />
        <meshBasicMaterial color={GOLD} transparent opacity={0.5} depthWrite={false} toneMapped={false} />
      </mesh>
      {!reducedMotion && (
        <mesh ref={ripple} rotation-x={-Math.PI / 2}>
          <ringGeometry args={RING} />
          <meshBasicMaterial ref={rippleMat} color={GOLD} transparent depthWrite={false} toneMapped={false} />
        </mesh>
      )}
      {/* Kept under the page's own overlays (hint, intro) rather than drei's
          default z-index, which would float it above everything. The visible
          text stays a one-word chip so it never covers the pot or burn pile on
          a small table; the street it deals is in its name and the hint pill. */}
      <Html position={[0, DECK_TOP[1] + 0.9, 0]} center zIndexRange={[14, 12]}>
        <button type="button" className="deal-cue" onClick={onPress} aria-label={label} title={label}>
          <span className="deal-cue__label">Deal</span>
          <span className="deal-cue__arrow" aria-hidden="true">
            ▾
          </span>
        </button>
      </Html>
    </group>
  )
}
