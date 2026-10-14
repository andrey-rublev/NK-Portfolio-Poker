import { Suspense, lazy, useEffect, useRef, useState } from 'react'
import { owner } from './data/portfolio'
import { canvasFontsReady } from './fonts'
import type { CardSlot } from './three/layout'
import { prefersReducedMotion } from './three/motion'
import {
  SHIM_COLLAPSE_PX,
  canFullscreen,
  isFullscreen,
  isStandalone,
  needsScrollShim,
  toggleFullscreen,
} from './three/display'
import { IntroDialog } from './components/IntroDialog'
import { PortfolioSections } from './components/PortfolioText'
import { StageBoundary } from './components/StageBoundary'
import { hasWebGL } from './webgl'
import { TextView } from './components/TextView'
import './ui.css'

// three.js and the scene are most of the download, so they load as a separate
// chunk: the page and the welcome card appear first, and the table streams in
// behind them. The card faces are painted onto canvases, which can't swap a
// font in later the way HTML does, so the table also waits for Mulish.
const Stage = lazy(() =>
  Promise.all([import('./three/Stage'), canvasFontsReady()]).then(([stage]) => stage),
)

const DEAL_CUES = ['Deal the flop', 'Deal the turn', 'Deal the river']

function ListIcon() {
  return (
    <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true" focusable="false">
      <path
        d="M7 5h10M7 10h10M7 15h10M3 5h.01M3 10h.01M3 15h.01"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}

function App() {
  const [reducedMotion] = useState(prefersReducedMotion)
  const [webgl] = useState(hasWebGL)
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
  // 'welcome' on arrival (closing it deals the hand), 'help' when reopened.
  const [intro, setIntro] = useState<'welcome' | 'help' | null>('welcome')
  const [textOpen, setTextOpen] = useState(false)
  // The deck cue waits for the opening deal to finish, so it isn't competing
  // with ten cards flying out of the deck.
  const [cueReady, setCueReady] = useState(false)
  // "Rotate your phone" tip — shown only on portrait phones (via CSS), and
  // dismissible. Rotating to landscape hides it automatically.
  const [rotateTipDismissed, setRotateTipDismissed] = useState(false)
  // Fullscreen is only offered where the API exists (not iPhone Safari).
  const [fsAvailable] = useState(() => canFullscreen() && !isStandalone())
  const [fullscreen, setFullscreen] = useState(false)
  // iPhone browsers have no Fullscreen API, but they *do* retract their own
  // toolbars once the page scrolls. `scrollShim` makes the document a little
  // taller than the viewport so that gesture exists; `chromeHidden` tracks
  // whether the visitor has already taken it.
  const [scrollShim] = useState(needsScrollShim)
  const [chromeHidden, setChromeHidden] = useState(false)

  useEffect(() => {
    document.documentElement.dataset.reducedMotion = reducedMotion ? 'true' : 'false'
  }, [reducedMotion])

  // Scroll shim: opt the document into a small amount of vertical scroll so
  // mobile Safari retracts its address and tab bars. The scene itself is fixed,
  // so scrolling moves nothing on screen -- it only buys back the chrome's
  // height, which `100dvh` then hands to the canvas.
  useEffect(() => {
    if (!scrollShim) return
    const root = document.documentElement
    root.dataset.scrollShim = 'on'
    const onScroll = () => setChromeHidden(window.scrollY > SHIM_COLLAPSE_PX)
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => {
      window.removeEventListener('scroll', onScroll)
      delete root.dataset.scrollShim
    }
  }, [scrollShim])

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

  // Esc puts a lifted card back. Open dialogs handle Esc themselves.
  const overlayOpen = intro !== null || textOpen
  useEffect(() => {
    if (!focusedKey || overlayOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFocusedKey(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [focusedKey, overlayOpen])

  const closeIntro = () => {
    // The deal begins only once the visitor closes the welcome card.
    if (intro === 'welcome') {
      setDealt(true)
      window.setTimeout(() => setCueReady(true), 2400)
    }
    setIntro(null)
  }

  const openTextView = () => {
    if (intro) closeIntro()
    setTextOpen(true)
  }

  const handleToggle = (slot: CardSlot) => {
    const key = slot.role === 'community' ? slot.id : slot.handId
    setFocusedKey((prev) => (prev === key ? null : key))
  }

  // A seat's nameplate lifts that seat's hand, exactly like clicking its cards.
  const handleSeatSelect = (seatId: string) => {
    setFocusedKey((prev) => (prev === seatId ? null : seatId))
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

  const boardLabel = focusedKey
    ? 'Click the card again to put it back'
    : revealStage === 0
      ? 'Click a name or hand to look · press the deck to deal the flop'
      : revealStage === 1
        ? 'Press the deck for the turn'
        : revealStage === 2
          ? 'Press the deck for the river'
          : 'Click any card to look'

  // Point at the deck whenever another street can be dealt: hidden while one is
  // still playing out (the chips move first) and while a card is being read.
  const dealCue =
    cueReady && !focusedKey && betStage === revealStage && revealStage < 3
      ? DEAL_CUES[revealStage]
      : null

  // Shown instead of the table when the browser can't run it.
  const noTable = (
    <div className="no-webgl">
      <p>This browser can't show the 3D table.</p>
      <button type="button" className="intro__btn" onClick={openTextView}>
        View as list
      </button>
    </div>
  )

  return (
    <div className={focusedKey ? 'app-shell is-reading' : 'app-shell'}>
      {webgl ? (
        <StageBoundary fallback={noTable}>
          <Suspense
            fallback={
              <p className="stage-loading" role="status">
                Shuffling the deck…
              </p>
            }
          >
            <Stage
              dealt={dealt}
              focusedKey={focusedKey}
              betStage={betStage}
              burnStage={burnStage}
              revealStage={revealStage}
              dealCue={dealCue}
              onToggle={handleToggle}
              onSelectSeat={handleSeatSelect}
              onDeckPress={handleDeckPress}
              onDismiss={() => setFocusedKey(null)}
            />
          </Suspense>
        </StageBoundary>
      ) : (
        noTable
      )}

      <header className="scene-hud" aria-hidden={focusedKey ? 'true' : undefined}>
        <span className="scene-hud__kicker">{owner.tagline}</span>
        <strong className="scene-hud__name">{owner.name}</strong>
      </header>

      {!focusedKey && (
        // The label shortens to "List" on phones; the accessible name stays whole.
        <button type="button" className="list-btn" onClick={openTextView} aria-label="View as list">
          <ListIcon />
          <span className="list-btn__long">View as list</span>
          <span className="list-btn__short">List</span>
        </button>
      )}

      {webgl && (
        <p className="scene-hint" aria-live="polite">
          {boardLabel}
        </p>
      )}

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
        onClick={() => setIntro('help')}
        aria-label="How to play"
      >
        ?
      </button>

      {scrollShim && !chromeHidden && !intro && !focusedKey && (
        <div className="swipe-tip" role="note">
          <span className="swipe-tip__icon" aria-hidden="true">
            ↑
          </span>
          <span>
            Swipe up for <strong>full screen</strong>
          </span>
        </div>
      )}

      {/* The whole portfolio as text, always in the page for screen readers and
          search engines; the canvas above carries none of it. */}
      <main className="visually-hidden" aria-labelledby="portfolio-title">
        <h1 id="portfolio-title">{owner.name}</h1>
        <p>{owner.tagline}</p>
        <PortfolioSections level={2} idPrefix="pt" untabbable />
      </main>

      {intro && (
        <IntroDialog firstVisit={intro === 'welcome'} onClose={closeIntro} onViewList={openTextView} />
      )}
      {textOpen && <TextView onClose={() => setTextOpen(false)} />}
    </div>
  )
}

export default App
