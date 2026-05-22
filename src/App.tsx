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
import {
  tableSeats,
  type PortfolioCardData,
  type Suit,
  type TableSeatData,
} from './data/portfolio'
import './App.css'

const SUIT_SYMBOLS: Record<Suit, string> = {
  spades: '\u2660',
  hearts: '\u2665',
  clubs: '\u2663',
  diamonds: '\u2666',
}

const CHIP_COLORS = ['#cf3030', '#1e64d6', '#f5ead2', '#f3bc40', '#121722']

type DetailTransitionPhase = 'idle' | 'opening' | 'open' | 'closing'
type RevertibleAnimation = {
  revert: () => unknown
}

interface DealerSeatLayout {
  id: TableSeatData['id']
  label: string
  depth: 'near' | 'mid' | 'far'
  chipStacks: number[]
  avatar: {
    skin: string
    hair: string
    shirt: string
    accent: string
  }
  position: {
    desktop: {
      left: string
      top: string
      rotate: number
      scale: number
      z: number
    }
    mobile: {
      left: string
      top: string
      rotate: number
      scale: number
      z: number
    }
  }
}

const DEALER_VIEW_LAYOUT: DealerSeatLayout[] = [
  {
    id: 'seat-southwest',
    label: 'Seat 1',
    depth: 'near',
    chipStacks: [5, 4],
    avatar: {
      skin: '#c98555',
      hair: '#23140d',
      shirt: '#235f4b',
      accent: '#74e2aa',
    },
    position: {
      desktop: { left: '20%', top: '68%', rotate: -22, scale: 1.08, z: 7 },
      mobile: { left: '18%', top: '68%', rotate: -24, scale: 0.9, z: 7 },
    },
  },
  {
    id: 'seat-northwest',
    label: 'Seat 2',
    depth: 'mid',
    chipStacks: [4, 3],
    avatar: {
      skin: '#e0aa7a',
      hair: '#302017',
      shirt: '#253d67',
      accent: '#7dbbff',
    },
    position: {
      desktop: { left: '24%', top: '31%', rotate: -15, scale: 0.9, z: 5 },
      mobile: { left: '21%', top: '36%', rotate: -17, scale: 0.72, z: 5 },
    },
  },
  {
    id: 'seat-north',
    label: 'Seat 3',
    depth: 'far',
    chipStacks: [5, 4, 3],
    avatar: {
      skin: '#b86f45',
      hair: '#17110c',
      shirt: '#6e2429',
      accent: '#ff947e',
    },
    position: {
      desktop: { left: '50%', top: '21%', rotate: 0, scale: 0.8, z: 4 },
      mobile: { left: '50%', top: '28%', rotate: 0, scale: 0.66, z: 4 },
    },
  },
  {
    id: 'seat-northeast',
    label: 'Seat 4',
    depth: 'mid',
    chipStacks: [4, 3],
    avatar: {
      skin: '#d79a63',
      hair: '#5b321b',
      shirt: '#5e3e7c',
      accent: '#c3a2ff',
    },
    position: {
      desktop: { left: '76%', top: '31%', rotate: 15, scale: 0.9, z: 5 },
      mobile: { left: '79%', top: '36%', rotate: 17, scale: 0.72, z: 5 },
    },
  },
  {
    id: 'seat-southeast',
    label: 'Seat 5',
    depth: 'near',
    chipStacks: [5, 4],
    avatar: {
      skin: '#cf8d58',
      hair: '#21140f',
      shirt: '#67441e',
      accent: '#ffc66c',
    },
    position: {
      desktop: { left: '80%', top: '68%', rotate: 22, scale: 1.08, z: 7 },
      mobile: { left: '82%', top: '68%', rotate: 24, scale: 0.9, z: 7 },
    },
  },
]

const seatById = new Map(tableSeats.map((seat) => [seat.id, seat]))
const dealerSeats = DEALER_VIEW_LAYOUT.map((layout) => {
  const seat = seatById.get(layout.id)

  if (!seat) {
    throw new Error(`Missing portfolio seat data for ${layout.id}`)
  }

  return { ...layout, seat }
})
const ALL_CARDS = dealerSeats.flatMap(({ seat }) => seat.cards)
const DEAL_ORDER = [0, 1].flatMap((round) =>
  dealerSeats.map((dealerSeat) => ({ dealerSeat, round })),
)

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

function SeatChipBank({
  seatIndex,
  chipStacks,
}: {
  seatIndex: number
  chipStacks: number[]
}) {
  return (
    <div className="seat-chip-bank" aria-hidden="true">
      {chipStacks.map((chipCount, stackIndex) => (
        <div
          key={`${seatIndex}-${stackIndex}`}
          className="seat-chip-stack"
          style={
            {
              '--chip-stack-index': stackIndex,
              '--chip-stack-count': chipStacks.length,
            } as CSSProperties
          }
        >
          {Array.from({ length: chipCount }).map((_, chipIndex) => (
            <span
              key={`${seatIndex}-${stackIndex}-${chipIndex}`}
              className="poker-chip"
              style={
                {
                  '--chip-index': chipIndex,
                  '--chip-color':
                    CHIP_COLORS[
                      (seatIndex + stackIndex + chipIndex) % CHIP_COLORS.length
                    ],
                } as CSSProperties
              }
            />
          ))}
        </div>
      ))}
    </div>
  )
}

function PlayerAvatar({
  avatar,
}: {
  avatar: DealerSeatLayout['avatar']
}) {
  return (
    <div
      className="player-station"
      style={
        {
          '--avatar-skin': avatar.skin,
          '--avatar-hair': avatar.hair,
          '--avatar-shirt': avatar.shirt,
          '--avatar-accent': avatar.accent,
        } as CSSProperties
      }
      aria-hidden="true"
    >
      <div className="player-chair" />
      <div className="player-avatar">
        <span className="player-avatar__neck" />
        <span className="player-avatar__body" />
        <span className="player-avatar__head">
          <span className="player-avatar__hair" />
          <span className="player-avatar__ear player-avatar__ear--left" />
          <span className="player-avatar__ear player-avatar__ear--right" />
          <span className="player-avatar__eye player-avatar__eye--left" />
          <span className="player-avatar__eye player-avatar__eye--right" />
          <span className="player-avatar__nose" />
          <span className="player-avatar__smile" />
        </span>
      </div>
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

        <div className="section-page__reveal">
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

  const blankMark = document.createElement('div')
  blankMark.className = 'travel-card__blank-mark'

  const blankHalo = document.createElement('span')
  blankHalo.className = 'travel-card__blank-halo'

  const blankPip = document.createElement('strong')
  blankPip.textContent = card.label

  back.append(backPattern, backLabel)
  blankMark.append(blankHalo, blankPip)
  front.append(frontRank, blankMark)
  inner.append(back, front)
  travelCard.append(inner)

  document.body.append(travelCard)

  return { travelCard, inner }
}

function createDealCardClone(motion: HTMLElement, targetRect: DOMRect) {
  const cardFace = motion.firstElementChild?.cloneNode(true)
  const dealCard = document.createElement('div')
  dealCard.className = 'deal-fly-card'
  dealCard.style.width = `${targetRect.width}px`
  dealCard.style.height = `${targetRect.height}px`

  if (cardFace instanceof HTMLElement) {
    dealCard.append(cardFace)
  }

  document.body.append(dealCard)

  return dealCard
}

function App() {
  const rootRef = useRef<HTMLDivElement>(null)
  const ambientAnimations = useRef<RevertibleAnimation[]>([])
  const dealTimeouts = useRef<number[]>([])
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
    const dealerZone = root.querySelector<HTMLElement>('.dealer-zone')
    const dealerButton = root.querySelector<HTMLElement>('.dealer-button')
    const tableGlow = root.querySelector<HTMLElement>('.table-glow')
    const centerMark = root.querySelector<HTMLElement>('.table-center-mark')
    const sceneHud = root.querySelector<HTMLElement>('.scene-hud')
    const seatClusters = Array.from(
      root.querySelectorAll<HTMLElement>('.seat-cluster'),
    )
    const seatSpots = Array.from(root.querySelectorAll<HTMLElement>('.seat-spot'))
    const chipStacks = Array.from(
      root.querySelectorAll<HTMLElement>('.seat-chip-stack'),
    )
    const chips = Array.from(root.querySelectorAll<HTMLElement>('.poker-chip'))
    const motions = DEAL_ORDER.map((_, index) =>
      root.querySelector<HTMLElement>(`[data-deal-index="${index}"]`),
    ).filter((node): node is HTMLElement => node !== null)

    if (
      !deck ||
      !dealerZone ||
      !dealerButton ||
      !tableGlow ||
      !centerMark ||
      !sceneHud ||
      motions.length === 0
    ) {
      return undefined
    }

    const finishDealImmediately = () => {
      utils.set([centerMark, sceneHud, dealerZone, ...seatClusters], {
        opacity: 1,
      })
      utils.set([...seatSpots, ...chipStacks, ...chips, ...motions], {
        opacity: 1,
      })
      setDealComplete(true)
    }

    if (reduceMotion || initialRouteCardId.current) {
      finishDealImmediately()
      return undefined
    }

    setDealComplete(false)
    setActiveCardId(null)
    utils.set([centerMark, sceneHud, dealerZone, ...seatClusters], {
      opacity: 0,
    })
    utils.set([...seatSpots, ...chipStacks, ...chips, ...motions], {
      opacity: 0,
    })

    const intro = createTimeline({
      defaults: { ease: 'outQuart' },
    })

    intro
      .add(
        sceneHud,
        {
          opacity: [0, 1],
          y: [-10, 0],
          duration: 520,
          ease: 'outExpo',
        },
        160,
      )
      .add(
        centerMark,
        {
          opacity: [0, 1],
          duration: 840,
          ease: 'outExpo',
        },
        320,
      )
      .add(
        seatClusters,
        {
          opacity: [0, 1],
          duration: 620,
          delay: stagger(80, { from: 'center' }),
          ease: 'outQuad',
        },
        620,
      )
      .add(
        seatSpots,
        {
          opacity: [0, 1],
          duration: 520,
          delay: stagger(70, { from: 'center' }),
          ease: 'outQuad',
        },
        660,
      )
      .add(
        chipStacks,
        {
          opacity: [0, 1],
          duration: 420,
          delay: stagger(36, { from: 'center' }),
          ease: 'outQuad',
        },
        820,
      )
      .add(
        chips,
        {
          opacity: [0, 1],
          duration: 220,
          delay: stagger(10),
          ease: 'outQuad',
        },
        920,
      )
      .add(
        dealerZone,
        {
          opacity: [0, 1],
          y: [16, 0],
          duration: 540,
          ease: 'outExpo',
        },
        1160,
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

    let completedDeals = 0

    motions.forEach((motion, index) => {
      const timeoutId = window.setTimeout(() => {
        const deckRect = deck.getBoundingClientRect()
        const targetRect = motion.getBoundingClientRect()
        const dealCard = createDealCardClone(motion, targetRect)
        const startLeft = deckRect.left + deckRect.width / 2 - targetRect.width / 2
        const startTop =
          deckRect.top + deckRect.height / 2 - targetRect.height / 2

        utils.set(dealCard, {
          left: startLeft,
          top: startTop,
          scale: 0.16,
          rotate: index % 2 === 0 ? -22 : 20,
          opacity: 0,
        })

        animate(deck, {
          y: [0, -8, 0],
          duration: 190,
          ease: 'inOutSine',
        })

        animate(dealCard, {
          left: targetRect.left,
          top: targetRect.top,
          scale: [0.16, 1],
          rotate: 0,
          opacity: [0, 1],
          duration: 690,
          ease: 'outExpo',
          onComplete: () => {
            utils.set(motion, { opacity: 1 })
            animate(motion, {
              y: [0, 4, 0],
              duration: 150,
              ease: 'inOutSine',
            })
            dealCard.remove()
            completedDeals += 1

            if (completedDeals === motions.length) {
              setDealComplete(true)
            }
          },
        })
      }, 1640 + index * 210)

      dealTimeouts.current.push(timeoutId)
    })

    ambientAnimations.current = [
      intro,
      animate(tableGlow, {
        scale: [1, 1.04],
        opacity: [0.7, 0.9],
        duration: 3600,
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
      dealTimeouts.current.forEach((timeoutId) => window.clearTimeout(timeoutId))
      dealTimeouts.current = []
      ambientAnimations.current.forEach((animation) => animation.revert())
      ambientAnimations.current = []
      document.querySelectorAll('.deal-fly-card').forEach((node) => node.remove())
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
        duration: 360,
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
        scale: 0.97,
        filter: 'brightness(0.58) blur(3px)',
        duration: 420,
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

    const openDetailFromPeek = () => {
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
      const revealItems = Array.from(
        sectionCard.querySelectorAll<HTMLElement>('.section-page__reveal > *'),
      )

      utils.set(sectionCard, { opacity: 0, y: 22, scale: 0.98 })
      utils.set(revealItems, { opacity: 0, y: 18 })

      const targetRect = sectionCard.getBoundingClientRect()
      const centerWidth = Math.min(440, window.innerWidth * 0.76)
      const centerHeight = Math.min(610, window.innerHeight * 0.78)
      const centerLeft = window.innerWidth / 2 - centerWidth / 2
      const centerTop = window.innerHeight / 2 - centerHeight / 2

      // Intentional "teleport": after the table peek, the opened card becomes
      // the center focus before it grows into the full detail panel.
      utils.set(travelCard, {
        left: centerLeft,
        top: centerTop,
        width: centerWidth,
        height: centerHeight,
        x: 0,
        y: 0,
        scale: 0.78,
        rotate: 0,
        rotateX: 0,
        opacity: 1,
      })

      const detailTimeline = createTimeline({
        defaults: { ease: 'inOutCubic' },
        onComplete: () => {
          source.style.visibility = ''
          utils.set(sectionPage, { opacity: 1 })
          utils.set(sectionCard, { opacity: 1, y: 0, scale: 1 })
          utils.set(revealItems, { opacity: 1, y: 0 })
          animate(travelCard, {
            opacity: 0,
            duration: 90,
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
            duration: 320,
            ease: 'outQuad',
          },
          0,
        )
        .add(
          '.table-stage',
          {
            scale: 0.97,
            filter: 'brightness(0.58) blur(3px)',
            duration: 680,
            ease: 'inOutCubic',
          },
          0,
        )
        .add(
          travelCard,
          {
            left: targetRect.left,
            top: targetRect.top,
            width: targetRect.width,
            height: targetRect.height,
            scale: 1,
            duration: 620,
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
            duration: 260,
            ease: 'outQuad',
          },
          540,
        )
        .add(
          revealItems,
          {
            opacity: [0, 1],
            y: [18, 0],
            duration: 520,
            delay: stagger(58),
            ease: 'outExpo',
          },
          620,
        )
        .add(
          travelCard,
          {
            opacity: 0,
            duration: 210,
            ease: 'outQuad',
          },
          760,
        )
    }

    const peekTimeline = createTimeline({
      defaults: { ease: 'inOutCubic' },
      onComplete: openDetailFromPeek,
    })

    peekTimeline
      .add(
        travelCard,
        {
          y: [-4, -30],
          scale: [1, 1.12],
          rotate: card.rank === 'A' || card.rank === 'K' ? -4 : 4,
          rotateX: [0, 11],
          duration: 260,
          ease: 'outQuad',
        },
        0,
      )
      .add(
        inner,
        {
          rotateY: 180,
          duration: 620,
          ease: 'inOutQuart',
        },
        80,
      )
      .add(
        travelCard,
        {
          y: -16,
          scale: 1.07,
          rotateX: 0,
          duration: 210,
          ease: 'outQuad',
        },
        560,
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
          duration: 700,
          ease: 'inOutCubic',
        },
        0,
      )
      .add(
        sectionPage,
        {
          opacity: 0,
          duration: 500,
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
          duration: 760,
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
          duration: 170,
          ease: 'outQuad',
        },
        650,
      )
  }

  return (
    <div className="app-shell" ref={rootRef}>
      <div className="scene-hud" aria-hidden="true">
        <span>Dealer view</span>
        <strong>Peek a card to reveal the portfolio</strong>
      </div>

      <div className="table-stage">
        <div className="casino-depth" />

        <div className="table-shell">
          <div className="table-rim table-rim--outer" />
          <div className="table-rim table-rim--inner" />

          <div className="table-surface">
            <div className="table-glow" />
            <TableCenterMark />

            <div className="board-slot" aria-hidden="true">
              <span>Portfolio Hold&apos;em</span>
              {Array.from({ length: 5 }).map((_, index) => (
                <i key={index} />
              ))}
            </div>

            {dealerSeats.map((dealerSeat, seatIndex) => (
              <div
                key={dealerSeat.id}
                className={`seat-cluster seat-cluster--${dealerSeat.depth}`}
                data-seat-index={seatIndex}
                style={
                  {
                    '--seat-left': dealerSeat.position.desktop.left,
                    '--seat-top': dealerSeat.position.desktop.top,
                    '--seat-rotate': `${dealerSeat.position.desktop.rotate}deg`,
                    '--seat-scale': dealerSeat.position.desktop.scale,
                    '--seat-z': dealerSeat.position.desktop.z,
                    '--seat-left-mobile': dealerSeat.position.mobile.left,
                    '--seat-top-mobile': dealerSeat.position.mobile.top,
                    '--seat-rotate-mobile': `${dealerSeat.position.mobile.rotate}deg`,
                    '--seat-scale-mobile': dealerSeat.position.mobile.scale,
                    '--seat-z-mobile': dealerSeat.position.mobile.z,
                  } as CSSProperties
                }
              >
                <PlayerAvatar avatar={dealerSeat.avatar} />

                <div className="seat-spot" aria-hidden="true">
                  <span>{dealerSeat.label}</span>
                </div>

                <SeatChipBank
                  seatIndex={seatIndex}
                  chipStacks={dealerSeat.chipStacks}
                />

                <div className="pocket-row">
                  {dealerSeat.seat.cards.map((card, cardIndex) => {
                    const isActive = activeCardId === card.id
                    const dealIndex = cardIndex * dealerSeats.length + seatIndex

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
                        aria-label={`Peek at ${card.label}`}
                      >
                        <div
                          className="pocket-card-motion"
                          data-deal-index={dealIndex}
                        >
                          <PlayingCard label={card.label} accent={card.accent} />
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}

            <div className="dealer-zone" aria-hidden="true">
              <DeckStack />
              <div className="dealer-button">Dealer</div>
            </div>
          </div>
        </div>

        <div className="dealer-foreground" aria-hidden="true">
          <div className="chip-tray">
            {CHIP_COLORS.map((color, index) => (
              <span
                key={color}
                className="tray-chip"
                style={
                  {
                    '--chip-color': color,
                    '--tray-index': index,
                  } as CSSProperties
                }
              />
            ))}
          </div>
          <span className="dealer-hand dealer-hand--left" />
          <span className="dealer-hand dealer-hand--right" />
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
