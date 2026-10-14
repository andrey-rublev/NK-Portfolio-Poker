import { useRef } from 'react'
import { owner } from '../data/portfolio'
import { Modal } from './Modal'
import { PortfolioSections } from './PortfolioText'

/** The "View as list" panel: every section as one scrollable page. */
export function TextView({ onClose }: { onClose: () => void }) {
  // Focus lands on the scrolling body, so the arrow keys and Page Down scroll
  // it straight away and a screen reader starts reading from the top.
  const body = useRef<HTMLDivElement>(null)

  return (
    <Modal labelledBy="text-view-title" className="text-view" initialFocus={body} onClose={onClose}>
      <div className="text-view__panel">
        <header className="text-view__header">
          <div>
            <p className="text-view__kicker">{owner.tagline}</p>
            <h2 id="text-view-title" className="text-view__title">
              {owner.name}
            </h2>
          </div>
          <button type="button" className="text-view__close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </header>
        <div ref={body} className="text-view__body" tabIndex={-1}>
          <PortfolioSections level={3} idPrefix="tv" showPhoto />
          <button type="button" className="text-view__back" onClick={onClose}>
            Back to the table
          </button>
        </div>
      </div>
    </Modal>
  )
}
