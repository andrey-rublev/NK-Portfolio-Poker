import { useEffect, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import * as THREE from 'three'
import { Scene, type SceneProps } from './Scene'
import { CAMERA_HOME } from './layout'

/**
 * The 3D table, loaded as its own chunk (see App). Frames are drawn only when
 * something moves (`frameloop="demand"`; every animation requests its own
 * frames), so a still table or a card being read costs no GPU time at all.
 *
 * That is also why the render resolution is fixed rather than adaptive: a
 * frame-rate monitor reads an idle table as a terrible frame rate. The table
 * renders at up to 2x; a lifted card, once it has landed, gets the display's
 * full density (up to 3x), since its text is the whole point and a still frame
 * costs one render.
 */
export default function Stage(scene: SceneProps) {
  const nativeDpr = window.devicePixelRatio || 1
  const { focusedKey } = scene
  // Sharpen only after the card has landed: resizing the drawing buffer
  // mid-flight would stutter the lift.
  const [settledKey, setSettledKey] = useState<string | null>(null)
  useEffect(() => {
    if (!focusedKey) return
    const t = window.setTimeout(() => setSettledKey(focusedKey), 900)
    return () => window.clearTimeout(t)
  }, [focusedKey])
  const reading = focusedKey !== null && settledKey === focusedKey

  return (
    <Canvas
      frameloop="demand"
      shadows="percentage"
      dpr={Math.min(nativeDpr, reading ? 3 : 2)}
      // Neutral tone mapping keeps the felt green, card red and paper cream
      // true to their colours; the default (ACES) shifts saturated hues.
      gl={{ antialias: true, toneMapping: THREE.NeutralToneMapping }}
      camera={{ position: CAMERA_HOME, fov: 40, near: 0.1, far: 100 }}
    >
      <Scene {...scene} />
    </Canvas>
  )
}
