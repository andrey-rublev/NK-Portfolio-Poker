import type { CSSProperties } from 'react'
import {
  communitySections,
  owner,
  seatSections,
  type CardGroup,
} from '../data/portfolio'
import { inkColor } from '../theme'
import { orgLogoUrl, skillLogoUrl } from '../data/logos'

/** Every section in reading order: the five seat hands, then the board. */
const SECTIONS = [...seatSections, ...communitySections]

const EMAIL = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i
const PHONE = /^\+?[\d\s().-]{7,}$/
// Deliberately narrow (a short list of TLDs) so tool names like "Next.js" stay text.
const WEB = /^(?:https?:\/\/)?(?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:com|org|net|io|dev|edu|me|ai|co|app)(?:\/\S*)?$/i

/** Contact details become real links; every other line is left as plain text. */
function hrefFor(text: string): string | null {
  if (EMAIL.test(text)) return `mailto:${text}`
  if (PHONE.test(text) && text.replace(/\D/g, '').length >= 7) return `tel:${text.replace(/[^\d+]/g, '')}`
  if (WEB.test(text)) return /^https?:/i.test(text) ? text : `https://${text}`
  return null
}

/** Short, link-free, sentence-free lines (skills, hobbies) read best as tags. */
function isTagList(group: CardGroup): boolean {
  return group.bullets.every((b) => b.length <= 32 && !b.endsWith('.') && !hrefFor(b))
}

/** A job's or school's heading, led by its logo when there is one. */
function GroupHeading({ as: Tag, heading }: { as: 'h3' | 'h4'; heading: string }) {
  const logo = orgLogoUrl(heading)
  return (
    <Tag className="pt-group__heading">
      {logo && <img className="pt-org-logo" src={logo} alt="" />}
      {heading}
    </Tag>
  )
}

const NewTab = () => <span className="visually-hidden"> (opens in a new tab)</span>

interface PortfolioSectionsProps {
  /** Heading level for section titles; group headings sit one level below. */
  level: 2 | 3
  /** Prefix for heading ids, so two copies on one page don't collide. */
  idPrefix: string
  /** Include the About photo. */
  showPhoto?: boolean
  /**
   * Keep links out of the Tab order. Used by the always-present, visually hidden
   * copy, whose links would otherwise be invisible focus stops; screen readers
   * still reach them with their own link navigation.
   */
  untabbable?: boolean
}

/**
 * The whole portfolio as plain HTML -- the same words as the cards, from the
 * same data -- for screen readers, search engines, keyboard users, and anyone
 * who would rather skim than play.
 */
export function PortfolioSections({ level, idPrefix, showPhoto, untabbable }: PortfolioSectionsProps) {
  const Title = `h${level}` as 'h2' | 'h3'
  const Sub = `h${level + 1}` as 'h3' | 'h4'
  const tabIndex = untabbable ? -1 : undefined

  return (
    <>
      {SECTIONS.map((s) => {
        const id = `${idPrefix}-${s.id}`
        const style = { '--accent': s.accent, '--ink': inkColor(s.accent) } as CSSProperties
        return (
          <section key={s.id} className="pt-section" aria-labelledby={id} style={style}>
            <Title id={id} className="pt-section__title">
              {s.label}
            </Title>
            {showPhoto && s.id === 'about' && (
              <img
                className="pt-photo"
                src={`${import.meta.env.BASE_URL}about.jpeg`}
                alt={owner.name}
                width={864}
                height={936}
                loading="lazy"
                decoding="async"
              />
            )}
            {s.groups.map((g, i) => (
              <div key={i} className="pt-group">
                {g.heading && <GroupHeading as={Sub} heading={g.heading} />}
                <ul className={isTagList(g) ? 'pt-tags' : 'pt-list'}>
                  {g.bullets.map((b) => {
                    const href = hrefFor(b)
                    const logo = skillLogoUrl(b)
                    return (
                      <li key={b}>
                        {logo && <img className="pt-logo" src={logo} alt="" width={16} height={16} />}
                        {href ? (
                          <a href={href} tabIndex={tabIndex}>
                            {b}
                          </a>
                        ) : (
                          b
                        )}
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}
            {s.actions && s.actions.length > 0 && (
              <ul className="pt-actions">
                {s.actions.map((a) => (
                  <li key={a.href}>
                    <a href={a.href} target="_blank" rel="noopener noreferrer" tabIndex={tabIndex}>
                      {a.label}
                      <NewTab />
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )
      })}
    </>
  )
}
