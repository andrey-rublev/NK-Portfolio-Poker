import { useEffect, type CSSProperties } from 'react'
import type { PortfolioCardData } from '../data/portfolio'

const SOURCE_LABELS: Record<string, string> = {
  devpost: 'Synced from Devpost',
  linkedin: 'Synced from LinkedIn',
}

interface SectionPageProps {
  card: PortfolioCardData
  onBack: () => void
  closing?: boolean
  /** Screen point the card was clicked — the panel flies out from here. */
  origin?: { x: number; y: number } | null
}

export function SectionPage({ card, onBack, closing = false, origin }: SectionPageProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onBack()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onBack])

  const sourceNote = card.source ? SOURCE_LABELS[card.source] : undefined

  // Offset from screen center to the clicked card, so the panel grows out of it.
  const fx = origin ? `${origin.x - window.innerWidth / 2}px` : '0px'
  const fy = origin ? `${origin.y - window.innerHeight / 2}px` : '0px'

  return (
    <section
      className={`detail-overlay${closing ? ' is-closing' : ''}`}
      style={{ '--accent': card.accent, '--fx': fx, '--fy': fy } as CSSProperties}
      aria-labelledby="detail-title"
    >
      <button className="detail-overlay__scrim" type="button" aria-label="Close" onClick={onBack} />

      <button className="detail-overlay__back" type="button" onClick={onBack}>
        ← Back to table
      </button>

      <article className="detail-card" role="dialog" aria-modal="true">
        <div className="detail-card__body">
          <span className="detail-card__label">{card.label}</span>
          <h1 id="detail-title" className="detail-card__title">
            {card.title}
          </h1>
          <p className="detail-card__detail">{card.detail}</p>

          <ul className="detail-card__list">
            {card.bullets.map((bullet) => (
              <li key={bullet}>{bullet}</li>
            ))}
          </ul>

          <div className="detail-card__tags">
            {card.tags.map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
          </div>

          {card.actions?.length ? (
            <div className="detail-card__actions">
              {card.actions.map((action) => {
                const external = action.href.startsWith('http')
                return (
                  <a
                    key={action.href}
                    href={action.href}
                    target={external ? '_blank' : undefined}
                    rel={external ? 'noreferrer' : undefined}
                  >
                    {action.label}
                  </a>
                )
              })}
            </div>
          ) : null}

          {sourceNote ? <p className="detail-card__source">{sourceNote}</p> : null}
        </div>
      </article>
    </section>
  )
}
