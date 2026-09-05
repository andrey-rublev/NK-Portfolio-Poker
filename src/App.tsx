import { useEffect, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { PerformanceMonitor } from '@react-three/drei'
import { Scene } from './three/Scene'
import { CAMERA_HOME, type CardSlot } from './three/layout'
import { prefersReducedMotion } from './three/motion'
import { owner } from './data/portfolio'
import {
  canFullscreen,
  isFullscreen,
  isIosSafari,
  isStandalone,
  toggleFullscreen,
} from './three/display'
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
  // Fullscreen is only offered where the API exists (not iPhone Safari).
  const [fsAvailable] = useState(() => canFullscreen() && !isStandalone())
  const [fullscreen, setFullscreen] = useState(false)
  // On iPhone Safari the only way to lose the toolbar is Add to Home Screen.
  const [a2hsDismissed, setA2hsDismissed] = useState(false)
  const [showA2hs] = useState(() => isIosSafari() && !isStandalone())
  // Adaptive render resolution: start at the display's native sharpness
  // (capped at 2x) and let the PerformanceMonitor walk it down toward 1x
  // only when the frame rate actually sags — sharp when there's headroom.
  const nativeDpr =
    typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2) : 1
  const [dpr, setDpr] = useState(nativeDpr)

  useEffect(() => {
    document.documentElement.dataset.reducedMotion = reducedMotion ? 'true' : 'false'
  }, [reducedMotion])

  // Keep the fullscreen button's icon in step with the actual state (the user
  // can leave fullscreen with Esc or a system gesture).
  useEffect(() => {
    const sync = () => setFullscreen(isFullscreen())
    document.addEventListener('fullscreenchange', sync)
    document.addEventListener('webkitfullscreenchange', sync)
    return () => {
      document.removeEventListener('fullscreenchange', sync)
      document.removeEventListener('webkitfullscreenchange', sync)
    }
  }, [])

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
        dpr={dpr}
        gl={{ antialias: true }}
        camera={{ position: CAMERA_HOME, fov: 40, near: 0.1, far: 100 }}
      >
        {/* Walk render resolution between 1x and native based on measured
            frame rate; if it keeps flip-flopping, settle at the low baseline. */}
        <PerformanceMonitor
          factor={1}
          onChange={({ factor }) => {
            const next = 1 + (nativeDpr - 1) * factor
            setDpr(Math.round(next * 10) / 10)
          }}
          flipflops={3}
          onFallback={() => setDpr(1)}
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
        </PerformanceMonitor>
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

      {fsAvailable && (
        <button
          className="fullscreen-btn"
          type="button"
          onClick={() => void toggleFullscreen()}
          aria-label={fullscreen ? 'Exit full screen' : 'Enter full screen'}
          title={fullscreen ? 'Exit full screen' : 'Full screen'}
        >
          {fullscreen ? '✕' : '⛶'}
        </button>
      )}

      <button
        className="help-btn"
        type="button"
        onClick={() => setShowIntro(true)}
        aria-label="How to play"
      >
        ?
      </button>

      {showA2hs && !a2hsDismissed && !showIntro && !focusedKey && (
        <div className="a2hs-tip" role="note">
          <span>
            For full screen: <strong>Share</strong> &rarr; <strong>Add to Home Screen</strong>
          </span>
          <button type="button" aria-label="Dismiss" onClick={() => setA2hsDismissed(true)}>
            ✕
          </button>
        </div>
      )}

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
