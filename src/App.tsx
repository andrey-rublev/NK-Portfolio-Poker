import { useEffect, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { Scene } from './three/Scene'
import { CAMERA_HOME } from './three/layout'
import { prefersReducedMotion } from './three/motion'
import { SectionPage } from './components/SectionPage'
import { owner, portfolioCards, lastDataUpdate } from './data/portfolio'
import type { PortfolioCardData } from './data/portfolio'
import './ui.css'

const BASE = import.meta.env.BASE_URL || '/'

function getRouteCardId(): string | null {
  let path = window.location.pathname
  if (path.startsWith(BASE)) path = path.slice(BASE.length)
  const slug = path.replace(/^\/+|\/+$/g, '')
  return portfolioCards.some((card) => card.id === slug) ? slug : null
}

function cardPath(id: string) {
  return `${BASE.replace(/\/$/, '')}/${id}`
}

function App() {
  // Initial-only values: lazy state keeps them stable without reading refs in render.
  // `reducedMotion` only governs *idle/ambient* loops now; the deal, fly-in, and
  // flip always play (deep links skip the deal by starting dealt=true).
  const [reducedMotion] = useState(prefersReducedMotion)
  const [selectedId, setSelectedId] = useState<string | null>(getRouteCardId)
  // The 3D card focuses immediately (selectedId); the HTML panel appears a beat
  // later (showOverlay) so the card-lift animation is visible first.
  const [showOverlay, setShowOverlay] = useState(() => getRouteCardId() !== null)
  const [dealt, setDealt] = useState(() => getRouteCardId() !== null)
  const [closing, setClosing] = useState(false)
  const openTimer = useRef<number | undefined>(undefined)
  const closeTimer = useRef<number | undefined>(undefined)

  const OVERLAY_DELAY = reducedMotion ? 0 : 520

  const selectedCard = selectedId
    ? portfolioCards.find((card) => card.id === selectedId) ?? null
    : null

  // Kick off the deal once after mount.
  useEffect(() => {
    if (dealt) return
    const id = window.setTimeout(() => setDealt(true), 400)
    return () => window.clearTimeout(id)
  }, [dealt])

  // Back / forward navigation — jump straight to the target state (no stagger).
  useEffect(() => {
    const onPop = () => {
      window.clearTimeout(openTimer.current)
      window.clearTimeout(closeTimer.current)
      setClosing(false)
      const next = getRouteCardId()
      setSelectedId(next)
      setShowOverlay(next !== null)
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  useEffect(
    () => () => {
      window.clearTimeout(openTimer.current)
      window.clearTimeout(closeTimer.current)
    },
    [],
  )

  const handleSelect = (card: PortfolioCardData) => {
    if (selectedId) return
    // Lift the 3D card now; reveal the detail panel once the lift is visible.
    setSelectedId(card.id)
    window.history.pushState({}, '', cardPath(card.id))
    window.clearTimeout(openTimer.current)
    openTimer.current = window.setTimeout(() => setShowOverlay(true), OVERLAY_DELAY)
  }

  const handleBack = () => {
    if (!selectedId || closing) return
    setClosing(true)
    window.history.pushState({}, '', BASE)
    window.clearTimeout(closeTimer.current)
    closeTimer.current = window.setTimeout(
      () => {
        setShowOverlay(false)
        setSelectedId(null)
        setClosing(false)
      },
      reducedMotion ? 0 : 340,
    )
  }

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
          selectedId={selectedId}
          reducedMotion={reducedMotion}
          onSelect={handleSelect}
        />
      </Canvas>

      <header className="scene-hud" aria-hidden={selectedCard ? true : undefined}>
        <span className="scene-hud__kicker">{owner.tagline}</span>
        <strong className="scene-hud__name">{owner.name}</strong>
        <span className="scene-hud__hint">Click a card to reveal a section</span>
      </header>

      {lastDataUpdate ? (
        <span className="data-stamp" aria-hidden="true">
          Updated {new Date(lastDataUpdate).toLocaleDateString()}
        </span>
      ) : null}

      {selectedCard && showOverlay ? (
        <SectionPage
          key={selectedCard.id}
          card={selectedCard}
          onBack={handleBack}
          closing={closing}
        />
      ) : null}
    </div>
  )
}

export default App
