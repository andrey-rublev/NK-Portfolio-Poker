import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from 'react'
import { flushSync } from 'react-dom'
import { animate, createTimeline, stagger, utils } from 'animejs'
import { PlayingCard } from './components/PlayingCard'
import { tableSeats, type PortfolioCardData, type Suit } from './data/portfolio'
import './App.css'

const SUIT_SYMBOLS: Record<Suit, string> = {
  spades: '\u2660',
  hearts: '\u2665',
  clubs: '\u2663',
  diamonds: '\u2666',
}

const ALL_CARDS = tableSeats.flatMap((seat) => seat.cards)
const DEAL_ORDER = [0, 1].flatMap((round) =>
  tableSeats.map((seat) => ({ seat, round })),
)

type DetailTransitionPhase = 'idle' | 'opening' | 'open' | 'closing'
type RevertibleAnimation = {
  revert: () => unknown
}

const CHIP_COLORS = ['#cf3030', '#1e64d6', '#f0f3f0', '#f4b942', '#111827']

const CHIP_STACKS = [
  { id: 'stack-northwest', left: '35%', top: '39%', rotate: -18, count: 5 },
  { id: 'stack-north', left: '50%', top: '33%', rotate: 5, count: 6 },
  { id: 'stack-northeast', left: '65%', top: '39%', rotate: 18, count: 5 },
  { id: 'stack-southwest', left: '34%', top: '64%', rotate: 14, count: 6 },
  { id: 'stack-southeast', left: '66%', top: '64%', rotate: -13, count: 6 },
]

function getRouteCardId() {
  const slug = window.location.pathname.replace(/^\/+|\/+$/g, '')

  if (!slug) {
    return null
  }

  return ALL_CARDS.some((card) => card.id === slug) ? slug : null
}

function DeckStack() {
  return (
    <div className="deck-anchor" aria-hidden="true">
      <span className="deck-anchor__card deck-anchor__card--back-one" />
      <span className="deck-anchor__card deck-anchor__card--back-two" />
      <span className="deck-anchor__card deck-anchor__card--top" />
    </div>
  )
}

function TableCenterMark() {
  return (
    <div className="table-center-mark" aria-hidden="true">
      <span className="table-center-mark__rule" />
      <strong>Nikhil Kolli</strong>
      <span>Computer Engineering @ Purdue</span>
      <span className="table-center-mark__rule" />
    </div>
  )
}

function ChipScatter() {
  return (
    <div className="chip-stacks" aria-hidden="true">
      {CHIP_STACKS.map((stack, stackIndex) => (
        <div
          key={stack.id}
          className="chip-stack"
          style={
            {
              '--stack-left': stack.left,
              '--stack-top': stack.top,
              '--stack-rotate': `${stack.rotate}deg`,
            } as CSSProperties
          }
        >
          {Array.from({ length: stack.count }).map((_, chipIndex) => (
            <span
              key={`${stack.id}-${chipIndex}`}
              className="poker-chip"
              style={
                {
                  '--chip-index': chipIndex,
                  '--chip-color':
                    CHIP_COLORS[(stackIndex + chipIndex) % CHIP_COLORS.length],
                } as CSSProperties
              }
            />
          ))}
        </div>
      ))}
    </div>
  )
}

function SectionPage({
  card,
  onBack,
  phase,
}: {
  card: PortfolioCardData
  onBack: () => void
  phase: DetailTransitionPhase
}) {
  return (
    <section
      className={`section-page section-page--${phase}`}
      aria-labelledby="section-page-title"
    >
      <button className="section-page__back" type="button" onClick={onBack}>
        Back to table
      </button>

      <div className="section-page__card">
        <div className="section-page__rank" aria-hidden="true">
          <span>{card.rank}</span>
          <span>{SUIT_SYMBOLS[card.suit]}</span>
        </div>

        <span className="section-page__label">{card.label}</span>
        <h1 id="section-page-title">{card.title}</h1>
        <p className="section-page__detail">{card.detail}</p>

        <ul className="section-page__list">
          {card.bullets.map((bullet) => (
            <li key={bullet}>{bullet}</li>
          ))}
        </ul>

        <div className="section-page__tags">
          {card.tags.map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </div>

        {card.actions?.length ? (
          <div className="section-page__actions">
            {card.actions.map((action) => (
              <a
                key={action.href}
                href={action.href}
                target={action.href.startsWith('http') ? '_blank' : undefined}
                rel={action.href.startsWith('http') ? 'noreferrer' : undefined}
              >
                {action.label}
              </a>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  )
}

function createTravelCard(card: PortfolioCardData, sourceRect: DOMRect) {
  const travelCard = document.createElement('div')
  travelCard.className = 'travel-card'
  travelCard.style.left = `${sourceRect.left}px`
  travelCard.style.top = `${sourceRect.top}px`
  travelCard.style.width = `${sourceRect.width}px`
  travelCard.style.height = `${sourceRect.height}px`

  const inner = document.createElement('div')
  inner.className = 'travel-card__inner'

  const back = document.createElement('div')
  back.className = 'travel-card__face travel-card__back'
  back.style.setProperty('--accent', card.accent)

  const backPattern = document.createElement('span')
  backPattern.className = 'travel-card__pattern'

  const backLabel = document.createElement('span')
  backLabel.className = 'travel-card__back-label'
  backLabel.textContent = card.label

  const front = document.createElement('div')
  front.className = 'travel-card__face travel-card__front'
  front.style.setProperty('--accent', card.accent)

  const frontRank = document.createElement('div')
  frontRank.className = 'travel-card__rank'
  frontRank.textContent = `${card.rank} ${SUIT_SYMBOLS[card.suit]}`

  const frontLabel = document.createElement('span')
  frontLabel.className = 'travel-card__front-label'
  frontLabel.textContent = card.label

  const frontTitle = document.createElement('strong')
  frontTitle.textContent = card.title

  back.append(backPattern, backLabel)
  front.append(frontRank, frontLabel, frontTitle)
  inner.append(back, front)
  travelCard.append(inner)

  document.body.append(travelCard)

  return { travelCard, inner }
}

function App() {
  const rootRef = useRef<HTMLDivElement>(null)
  const ambientAnimations = useRef<RevertibleAnimation[]>([])
  const transitionInProgress = useRef(false)
  const [dealComplete, setDealComplete] = useState(false)
  const [activeCardId, setActiveCardId] = useState<string | null>(null)
  const [routeCardId, setRouteCardId] = useState<string | null>(getRouteCardId)
  const [detailPhase, setDetailPhase] = useState<DetailTransitionPhase>(() =>
    getRouteCardId() ? 'open' : 'idle',
  )
  const initialRouteCardId = useRef(routeCardId)

  const routeCard =
    routeCardId === null
      ? null
      : ALL_CARDS.find((card) => card.id === routeCardId) ?? null

  useLayoutEffect(() => {
    const root = rootRef.current

    if (!root) {
      return undefined
    }

    const reduceMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches
    const deck = root.querySelector<HTMLElement>('.deck-anchor')
    const seatSpots = tableSeats
      .map((_, index) =>
        root.querySelector<HTMLElement>(`[data-seat-index="${index}"]`),
      )
      .filter((node): node is HTMLElement => node !== null)
    const motions = DEAL_ORDER.map((_, index) =>
      root.querySelector<HTMLElement>(`[data-deal-index="${index}"]`),
    ).filter((node): node is HTMLElement => node !== null)
    const chipStacks = Array.from(
      root.querySelectorAll<HTMLElement>('.chip-stack'),
    )
    const chips = Array.from(root.querySelectorAll<HTMLElement>('.poker-chip'))
    const centerMark = root.querySelector<HTMLElement>('.table-center-mark')
    const dealerZone = root.querySelector<HTMLElement>('.dealer-zone')
    const dealerButton = root.querySelector<HTMLElement>('.dealer-button')
    const tableGlow = root.querySelector<HTMLElement>('.table-glow')

    if (
      !deck ||
      motions.length === 0 ||
      !centerMark ||
      !dealerZone ||
      !dealerButton ||
      !tableGlow
    ) {
      return undefined
    }

    const showFinishedState = () => {
      utils.set(motions, {
        x: 0,
        y: 0,
        scale: 1,
        rotate: 0,
        opacity: 1,
      })
      utils.set(seatSpots, { opacity: 1 })
      utils.set(chipStacks, { opacity: 1 })
      utils.set(chips, { opacity: 1 })
      utils.set(centerMark, { opacity: 1 })
      utils.set(dealerZone, { opacity: 1 })
      setDealComplete(true)
    }

    if (reduceMotion || initialRouteCardId.current) {
      showFinishedState()
      return undefined
    }

    const deckRect = deck.getBoundingClientRect()

    setDealComplete(false)
    setActiveCardId(null)

    motions.forEach((motion, index) => {
      const cardRect = motion.getBoundingClientRect()
      const deltaX =
        deckRect.left + deckRect.width / 2 - (cardRect.left + cardRect.width / 2)
      const deltaY =
        deckRect.top + deckRect.height / 2 - (cardRect.top + cardRect.height / 2)

      utils.set(motion, {
        x: deltaX,
        y: deltaY,
        scale: 0.12,
        rotate: index % 2 === 0 ? -24 : 22,
        opacity: 0,
      })
    })

    utils.set(seatSpots, { opacity: 0 })
    utils.set(dealerZone, { opacity: 0 })
    utils.set(centerMark, { opacity: 0 })
    utils.set(chipStacks, { opacity: 0 })
    utils.set(chips, { opacity: 0 })

    const dealTimeline = createTimeline({
      defaults: {
        ease: 'outQuart',
      },
      onComplete: () => {
        setDealComplete(true)
      },
    })

    dealTimeline
      .add(
        centerMark,
        {
          opacity: [0, 1],
          duration: 760,
          ease: 'outExpo',
        },
        280,
      )
      .add(
        chipStacks,
        {
          opacity: [0, 1],
          duration: 680,
          delay: stagger(72, { from: 'center' }),
          ease: 'outQuad',
        },
        560,
      )
      .add(
        chips,
        {
          opacity: [0, 1],
          duration: 240,
          delay: stagger(18),
          ease: 'outQuad',
        },
        640,
      )
      .add(
        dealerZone,
        {
          opacity: [0, 1],
          duration: 520,
          ease: 'outExpo',
        },
        980,
      )
      .add(
        deck,
        {
          rotate: [0, -5, 0],
          duration: 220,
          ease: 'inOutSine',
        },
        1390,
      )
      .add(
        dealerButton,
        {
          scale: [1, 1.04, 1],
          duration: 260,
          ease: 'inOutSine',
        },
        1400,
      )

    motions.forEach((motion, index) => {
      const currentDeal = DEAL_ORDER[index]
      const seatIndex = index % tableSeats.length
      const dealStart = 1660 + index * 205

      if (currentDeal.round === 0) {
        dealTimeline.add(
          seatSpots[seatIndex],
          {
            opacity: [0, 1],
            duration: 280,
            ease: 'outQuart',
          },
          dealStart - 70,
        )
      }

      dealTimeline
        .add(
          deck,
          {
            y: [0, -7, 0],
            duration: 180,
            ease: 'inOutQuad',
          },
          dealStart - 26,
        )
        .add(
          motion,
          {
            x: 0,
            y: 0,
            scale: 1,
            rotate: 0,
            opacity: [0, 1],
            duration: 640,
            ease: 'outExpo',
          },
          dealStart,
        )
        .add(
          motion,
          {
            y: [0, 3, 0],
            duration: 150,
            ease: 'inOutSine',
          },
          dealStart + 500,
        )
    })

    ambientAnimations.current = [
      dealTimeline,
      animate(tableGlow, {
        scale: [1, 1.055],
        opacity: [0.72, 0.9],
        duration: 3400,
        alternate: true,
        loop: true,
        ease: 'inOutSine',
      }),
      animate(dealerButton, {
        y: [0, -5],
        duration: 2400,
        alternate: true,
        loop: true,
        ease: 'inOutSine',
      }),
    ]

    return () => {
      ambientAnimations.current.forEach((animation) => animation.revert())
      ambientAnimations.current = []
    }
  }, [])

  useEffect(() => {
    const handlePopState = () => {
      const nextCardId = getRouteCardId()
      setRouteCardId(nextCardId)
      setDetailPhase(nextCardId ? 'open' : 'idle')
    }

    window.addEventListener('popstate', handlePopState)

    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [])

  useEffect(() => {
    if (!routeCard && detailPhase === 'idle') {
      animate('.table-stage', {
        scale: 1,
        filter: 'brightness(1) blur(0px)',
        duration: 320,
        ease: 'outQuad',
      })
      return
    }

    if (routeCard && detailPhase === 'open') {
      utils.set('.section-page', { opacity: 1 })
      utils.set('.section-page__card', {
        opacity: 1,
        y: 0,
        scale: 1,
      })
      animate('.table-stage', {
        scale: 0.965,
        filter: 'brightness(0.62) blur(3px)',
        duration: 400,
        ease: 'outQuad',
      })
    }
  }, [routeCard, detailPhase])

  const openCardPage = (card: PortfolioCardData) => {
    if (!dealComplete || transitionInProgress.current || routeCard) {
      return
    }

    const source = rootRef.current?.querySelector<HTMLElement>(
      `[data-card-id="${card.id}"] .pocket-card-motion`,
    )

    if (!source) {
      return
    }

    transitionInProgress.current = true
    setActiveCardId(card.id)

    const sourceRect = source.getBoundingClientRect()
    const { travelCard, inner } = createTravelCard(card, sourceRect)

    source.style.visibility = 'hidden'

    const openDetailFromTable = () => {
      flushSync(() => {
        setRouteCardId(card.id)
        setDetailPhase('opening')
      })

      window.history.pushState({}, '', `/${card.id}`)

      const sectionPage = document.querySelector<HTMLElement>('.section-page')
      const sectionCard =
        document.querySelector<HTMLElement>('.section-page__card')

      if (!sectionPage || !sectionCard) {
        source.style.visibility = ''
        travelCard.remove()
        setDetailPhase('open')
        transitionInProgress.current = false
        return
      }

      utils.set(sectionPage, { opacity: 0 })

      utils.set(sectionCard, { opacity: 0, y: 0, scale: 1 })

      const targetRect = sectionCard?.getBoundingClientRect()

      utils.set(sectionCard, {
        opacity: 0,
        y: 18,
        scale: 0.985,
      })

      const target = targetRect ?? {
        left:
          window.innerWidth / 2 - Math.min(760, window.innerWidth * 0.9) / 2,
        top:
          window.innerHeight / 2 -
          Math.min(760, window.innerHeight * 0.86) / 2,
        width: Math.min(760, window.innerWidth * 0.9),
        height: Math.min(760, window.innerHeight * 0.86),
      }
      const centerWidth = Math.min(430, window.innerWidth * 0.74)
      const centerHeight = Math.min(590, window.innerHeight * 0.78)
      const centerLeft = window.innerWidth / 2 - centerWidth / 2
      const centerTop = window.innerHeight / 2 - centerHeight / 2

      utils.set(travelCard, {
        left: centerLeft,
        top: centerTop,
        x: 0,
        y: 0,
        width: centerWidth,
        height: centerHeight,
        scale: 0.82,
        rotate: 0,
        opacity: 1,
      })

      const detailTimeline = createTimeline({
        defaults: { ease: 'inOutCubic' },
        onComplete: () => {
          source.style.visibility = ''
          utils.set(sectionPage, { opacity: 1 })
          utils.set(sectionCard, { opacity: 1, y: 0, scale: 1 })
          animate(travelCard, {
            opacity: 0,
            duration: 80,
            onComplete: () => travelCard.remove(),
          })
          setDetailPhase('open')
          transitionInProgress.current = false
        },
      })

      detailTimeline
        .add(
          sectionPage,
          {
            opacity: [0, 1],
            duration: 280,
            ease: 'outQuad',
          },
          0,
        )
        .add(
          '.table-stage',
          {
            scale: 0.965,
            filter: 'brightness(0.62) blur(3px)',
            duration: 640,
            ease: 'inOutCubic',
          },
          0,
        )
        .add(
          travelCard,
          {
            left: target.left,
            top: target.top,
            width: target.width,
            height: target.height,
            scale: 1,
            duration: 540,
            ease: 'outExpo',
          },
          80,
        )
        .add(
          sectionCard,
          {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 220,
            ease: 'outQuad',
          },
          480,
        )
        .add(
          travelCard,
          {
            opacity: 0,
            duration: 160,
            ease: 'outQuad',
          },
          540,
        )
    }

    const flipTimeline = createTimeline({
      defaults: { ease: 'inOutCubic' },
      onComplete: () => {
        openDetailFromTable()
      },
    })

    flipTimeline
      .add(
        travelCard,
        {
          y: -18,
          scale: 1.08,
          rotate: card.rank === 'A' || card.rank === 'K' ? -3 : 3,
          duration: 200,
          ease: 'outQuad',
        },
        0,
      )
      .add(
        inner,
        {
          rotateY: 180,
          duration: 560,
          ease: 'inOutQuart',
        },
        80,
      )
      .add(
        travelCard,
        {
          y: -8,
          scale: 1.04,
          duration: 180,
          ease: 'outQuad',
        },
        480,
      )
  }

  const goBackToTable = () => {
    if (!routeCard || transitionInProgress.current) {
      return
    }

    const source = rootRef.current?.querySelector<HTMLElement>(
      `[data-card-id="${routeCard.id}"] .pocket-card-motion`,
    )
    const sectionPage = document.querySelector<HTMLElement>('.section-page')
    const sectionCard =
      document.querySelector<HTMLElement>('.section-page__card')

    if (!source || !sectionPage || !sectionCard) {
      window.history.pushState({}, '', '/')
      setRouteCardId(null)
      setActiveCardId(null)
      setDetailPhase('idle')
      return
    }

    transitionInProgress.current = true
    setDetailPhase('closing')

    const sourceRect = source.getBoundingClientRect()
    const startRect = sectionCard.getBoundingClientRect()
    const { travelCard, inner } = createTravelCard(routeCard, startRect)

    source.style.visibility = 'hidden'
    utils.set(inner, { rotateY: 180 })
    utils.set(sectionCard, { opacity: 0 })

    const timeline = createTimeline({
      defaults: { ease: 'inOutCubic' },
      onComplete: () => {
        source.style.visibility = ''
        travelCard.remove()
        window.history.pushState({}, '', '/')
        setRouteCardId(null)
        setActiveCardId(null)
        setDetailPhase('idle')
        transitionInProgress.current = false
      },
    })

    timeline
      .add(
        '.table-stage',
        {
          scale: 1,
          filter: 'brightness(1) blur(0px)',
          duration: 680,
          ease: 'inOutCubic',
        },
        0,
      )
      .add(
        sectionPage,
        {
          opacity: 0,
          duration: 480,
          ease: 'inOutQuad',
        },
        120,
      )
      .add(
        travelCard,
        {
          left: sourceRect.left,
          top: sourceRect.top,
          width: sourceRect.width,
          height: sourceRect.height,
          duration: 740,
          ease: 'inOutExpo',
        },
        0,
      )
      .add(
        inner,
        {
          rotateY: 0,
          duration: 660,
          ease: 'inOutQuart',
        },
        80,
      )
      .add(
        travelCard,
        {
          opacity: 0,
          duration: 160,
          ease: 'outQuad',
        },
        640,
      )
  }

  return (
    <div className="app-shell" ref={rootRef}>
      <div className="table-stage">
        <div className="table-shell">
          <div className="table-shell__rim" />

          <div className="table-surface">
            <div className="table-glow" />
            <TableCenterMark />
            <ChipScatter />

            {tableSeats.map((seat, seatIndex) => (
              <div
                key={`${seat.id}-spot`}
                className="seat-spot"
                style={
                  {
                    '--seat-left-desktop': seat.position.desktop.left,
                    '--seat-top-desktop': seat.position.desktop.top,
                    '--seat-rotate-desktop': `${seat.position.desktop.rotate}deg`,
                    '--seat-left-mobile': seat.position.mobile.left,
                    '--seat-top-mobile': seat.position.mobile.top,
                    '--seat-rotate-mobile': `${seat.position.mobile.rotate}deg`,
                  } as CSSProperties
                }
                data-seat-index={seatIndex}
                aria-hidden="true"
              />
            ))}

            <div className="dealer-zone" aria-hidden="true">
              <DeckStack />
              <div className="dealer-button">Dealer</div>
            </div>

            {tableSeats.map((seat, seatIndex) => (
              <div
                key={seat.id}
                className="seat-group"
                style={
                  {
                    '--seat-left-desktop': seat.position.desktop.left,
                    '--seat-top-desktop': seat.position.desktop.top,
                    '--seat-rotate-desktop': `${seat.position.desktop.rotate}deg`,
                    '--seat-left-mobile': seat.position.mobile.left,
                    '--seat-top-mobile': seat.position.mobile.top,
                    '--seat-rotate-mobile': `${seat.position.mobile.rotate}deg`,
                  } as CSSProperties
                }
              >
                {seat.cards.map((card, cardIndex) => {
                  const isActive = activeCardId === card.id
                  const dealIndex = cardIndex * tableSeats.length + seatIndex

                  return (
                    <button
                      key={card.id}
                      type="button"
                      className={`pocket-card-shell pocket-card-shell--${cardIndex}${
                        isActive ? ' is-active' : ''
                      }`}
                      data-card-id={card.id}
                      onClick={() => openCardPage(card)}
                      disabled={!dealComplete || routeCard !== null}
                      aria-label={`Open ${card.label}`}
                    >
                      <div className="pocket-card-motion" data-deal-index={dealIndex}>
                        <PlayingCard label={card.label} accent={card.accent} />
                      </div>
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {routeCard ? (
        <SectionPage
          card={routeCard}
          onBack={goBackToTable}
          phase={detailPhase}
        />
      ) : null}
    </div>
  )
}

export default App
