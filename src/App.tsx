import { useEffect, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { Scene } from './three/Scene'
import { CAMERA_HOME } from './three/layout'
import { SectionPage } from './components/SectionPage'
import { owner, portfolioCards, lastDataUpdate } from './data/portfolio'
import type { PortfolioCardData } from './data/portfolio'
import './ui.css'

const BASE = import.meta.env.BASE_URL || '/'

function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

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
  const [reducedMotion] = useState(prefersReducedMotion)
  const [selectedId, setSelectedId] = useState<string | null>(getRouteCardId)
  const [dealt, setDealt] = useState(
    () => prefersReducedMotion() || getRouteCardId() !== null,
  )
  const [closing, setClosing] = useState(false)
  const closeTimer = useRef<number | undefined>(undefined)

  const selectedCard = selectedId
    ? portfolioCards.find((card) => card.id === selectedId) ?? null
    : null

  // Kick off the deal once after mount.
  useEffect(() => {
    if (dealt) return
    const id = window.setTimeout(() => setDealt(true), 400)
    return () => window.clearTimeout(id)
  }, [dealt])

  // Back / forward navigation.
  useEffect(() => {
    const onPop = () => {
      window.clearTimeout(closeTimer.current)
      setClosing(false)
      setSelectedId(getRouteCardId())
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  useEffect(() => () => window.clearTimeout(closeTimer.current), [])

  const handleSelect = (card: PortfolioCardData) => {
    if (selectedId) return
    setSelectedId(card.id)
    window.history.pushState({}, '', cardPath(card.id))
  }

  const handleBack = () => {
    if (!selectedId || closing) return
    setClosing(true)
    window.history.pushState({}, '', BASE)
    closeTimer.current = window.setTimeout(() => {
      setSelectedId(null)
      setClosing(false)
    }, 340)
  }

  return (
    <div className="app-shell">
      <Canvas
        shadows
        frameloop="demand"
        dpr={[1, 2]}
        gl={{ antialias: true }}
        camera={{ position: CAMERA_HOME, fov: 38, near: 0.1, far: 100 }}
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

      {selectedCard ? (
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
