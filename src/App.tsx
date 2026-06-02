import { useEffect, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { Scene } from './three/Scene'
import { CAMERA_HOME, type CardSlot } from './three/layout'
import { prefersReducedMotion } from './three/motion'
import { owner, lastDataUpdate } from './data/portfolio'
import './ui.css'

function App() {
  const [reducedMotion] = useState(prefersReducedMotion)
  const [dealt, setDealt] = useState(false)
  // The one hand/community card currently lifted to the camera (null = none).
  const [focusedKey, setFocusedKey] = useState<string | null>(null)
  const [boardStage, setBoardStage] = useState(0)

  useEffect(() => {
    document.documentElement.dataset.reducedMotion = reducedMotion ? 'true' : 'false'
  }, [reducedMotion])

  useEffect(() => {
    if (dealt) return
    const id = window.setTimeout(() => setDealt(true), 400)
    return () => window.clearTimeout(id)
  }, [dealt])

  const handleToggle = (slot: CardSlot) => {
    const key = slot.role === 'community' ? slot.id : slot.handId
    setFocusedKey((prev) => (prev === key ? null : key))
  }

  const handleDeckPress = () => {
    setBoardStage((stage) => Math.min(3, stage + 1))
  }

  const boardLabel = focusedKey
    ? 'Click the card again to put it back'
    : boardStage === 0
      ? 'Click a hand to look · press the deck to deal the flop'
      : boardStage === 1
        ? 'Press the deck for the turn'
        : boardStage === 2
          ? 'Press the deck for the river'
          : 'Click any card to look'

  return (
    <div className="app-shell">
      <Canvas
        shadows
        dpr={[1, 2]}
        gl={{ antialias: true }}
        camera={{ position: CAMERA_HOME, fov: 40, near: 0.1, far: 100 }}
      >
        <Scene
          dealt={dealt}
          focusedKey={focusedKey}
          boardStage={boardStage}
          reducedMotion={reducedMotion}
          onToggle={handleToggle}
          onDeckPress={handleDeckPress}
        />
      </Canvas>

      <header className="scene-hud">
        <span className="scene-hud__kicker">{owner.tagline}</span>
        <strong className="scene-hud__name">{owner.name}</strong>
        <span className="scene-hud__hint">{boardLabel}</span>
      </header>

      {lastDataUpdate ? (
        <span className="data-stamp" aria-hidden="true">
          Updated {new Date(lastDataUpdate).toLocaleDateString()}
        </span>
      ) : null}
    </div>
  )
}

export default App
