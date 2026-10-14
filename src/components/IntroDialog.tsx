import { useRef } from 'react'
import { Modal } from './Modal'

interface IntroDialogProps {
  /** First visit: closing it deals the hand. Reopened from "?", it just closes. */
  firstVisit: boolean
  onClose: () => void
  onViewList: () => void
}

export function IntroDialog({ firstVisit, onClose, onViewList }: IntroDialogProps) {
  const primary = useRef<HTMLButtonElement>(null)

  return (
    <Modal labelledBy="intro-title" className="intro" initialFocus={primary} onClose={onClose}>
      <div className="intro__panel">
        <h2 id="intro-title" className="intro__title">
          Welcome
        </h2>
        <p className="intro__sub">This portfolio is a poker table. Here's how to play your hand:</p>
        <ul className="intro__steps">
          <li>
            <span aria-hidden="true" style={{ color: '#1a2128' }}>
              ♠
            </span>
            <span>Click a player's name or hand to read that section.</span>
          </li>
          <li>
            <span aria-hidden="true" style={{ color: '#b3122a' }}>
              ♥
            </span>
            <span>Press the deck to deal the community cards.</span>
          </li>
          <li>
            <span aria-hidden="true" style={{ color: '#2b7a4b' }}>
              ♣
            </span>
            <span>Click any card to bring it up — click it again or anywhere to put it back.</span>
          </li>
        </ul>
        <p className="intro__rotate">Tip: turn your phone sideways for the best view of the table.</p>
        <button ref={primary} className="intro__btn" type="button" onClick={onClose}>
          {firstVisit ? 'Deal me in' : 'Back to the table'}
        </button>
        <button className="intro__alt" type="button" onClick={onViewList}>
          Rather skim? View as list
        </button>
      </div>
    </Modal>
  )
}
