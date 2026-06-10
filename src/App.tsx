import { useEffect, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { Scene } from './three/Scene'
import { CAMERA_HOME, type CardSlot } from './three/layout'
import { prefersReducedMotion } from './three/motion'
import { owner } from './data/portfolio'
import './ui.css'

function App() {
  const [reducedMotion] = useState(prefersReducedMotion)
  const [dealt, setDealt] = useState(false)
  // The one hand/community card currently lifted to the camera (null = none).
  const [focusedKey, setFocusedKey] = useState<string | null>(null)
  // A street plays out in order: players bet (chips), then the dealer burns a
  // card, then the community card is revealed. Each stage lags the press so the
  // three animations run one after another rather than all at once.
  const [betStage, setBetStage] = useState(0)
  const [burnStage, setBurnStage] = useState(0)
  const [revealStage, setRevealStage] = useState(0)
  const dealing = useRef(false)
  const [showIntro, setShowIntro] = useState(true)
  // "Rotate your phone" tip — shown only on portrait phones (via CSS), and
  // dismissible. Rotating to landscape hides it automatically.
  const [rotateTipDismissed, setRotateTipDismissed] = useState(false)

  useEffect(() => {
    document.documentElement.dataset.reducedMotion = reducedMotion ? 'true' : 'false'
  }, [reducedMotion])

  // The deal begins only once the player closes the intro ("Deal me in").
  const handleStart = () => {
    setShowIntro(false)
    setDealt(true)
  }

  const handleToggle = (slot: CardSlot) => {
    const key = slot.role === 'community' ? slot.id : slot.handId
    setFocusedKey((prev) => (prev === key ? null : key))
  }

  const handleDeckPress = () => {
    if (dealing.current || revealStage >= 3) return
    dealing.current = true
    // 1) players push chips into the pot
    setBetStage((s) => Math.min(3, s + 1))
    // 2) the dealer burns a card once the chips have landed
    window.setTimeout(() => setBurnStage((s) => Math.min(3, s + 1)), 950)
    // 3) the community card is revealed once the burn has landed
    window.setTimeout(() => setRevealStage((s) => Math.min(3, s + 1)), 1650)
    window.setTimeout(() => {
      dealing.current = false
    }, 1750)
  }

  const handleDismiss = () => setFocusedKey(null)

  const boardLabel = focusedKey
    ? 'Click the card again to put it back'
    : revealStage === 0
      ? 'Click a hand to look · press the deck to deal the flop'
      : revealStage === 1
        ? 'Press the deck for the turn'
        : revealStage === 2
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
          betStage={betStage}
          burnStage={burnStage}
          revealStage={revealStage}
          onToggle={handleToggle}
          onDeckPress={handleDeckPress}
          onDismiss={handleDismiss}
        />
      </Canvas>

      <header className="scene-hud" aria-hidden={focusedKey ? 'true' : undefined}>
        <span className="scene-hud__kicker">{owner.tagline}</span>
        <strong className="scene-hud__name">{owner.name}</strong>
      </header>

      <p className="scene-hint">{boardLabel}</p>

      {!rotateTipDismissed && !focusedKey && (
        <div className="rotate-tip" role="note">
          <span className="rotate-tip__icon" aria-hidden="true">
            ⟳
          </span>
          <span>Rotate for the best experience</span>
          <button
            type="button"
            aria-label="Dismiss"
            onClick={() => setRotateTipDismissed(true)}
          >
            ✕
          </button>
        </div>
      )}

      <button
        className="help-btn"
        type="button"
        onClick={() => setShowIntro(true)}
        aria-label="How to play"
      >
        ?
      </button>

      {showIntro && (
        <div className="intro" role="dialog" aria-modal="true">
          <button
            className="intro__scrim"
            type="button"
            aria-label="Start"
            onClick={handleStart}
          />
          <div className="intro__panel">
            <h2 className="intro__title">Welcome</h2>
            <p className="intro__sub">
              This portfolio is a poker table. Here's how to play your hand:
            </p>
            <ul className="intro__steps">
              <li>
                <span style={{ color: '#1a2128' }}>♠</span>
                <span>Click a player's hand to read that section.</span>
              </li>
              <li>
                <span style={{ color: '#b3122a' }}>♥</span>
                <span>Press the deck to deal the community cards.</span>
              </li>
              <li>
                <span style={{ color: '#2b7a4b' }}>♣</span>
                <span>Click any card to bring it up — click it again or anywhere to put it back.</span>
              </li>
            </ul>
            <p className="intro__rotate">
              Tip: turn your phone sideways for the best view of the table.
            </p>
            <button className="intro__btn" type="button" onClick={handleStart}>
              Deal me in
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
