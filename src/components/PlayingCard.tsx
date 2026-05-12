import type { CSSProperties, PointerEvent } from 'react'

interface PlayingCardProps {
  label: string
  accent: string
}

function updateTilt(event: PointerEvent<HTMLElement>) {
  if (event.pointerType !== 'mouse') {
    return
  }

  const rect = event.currentTarget.getBoundingClientRect()
  const x = (event.clientX - rect.left) / rect.width
  const y = (event.clientY - rect.top) / rect.height
  const rotateX = (0.5 - y) * 8
  const rotateY = (x - 0.5) * 10

  event.currentTarget.style.setProperty('--tilt-x', `${rotateX.toFixed(2)}deg`)
  event.currentTarget.style.setProperty('--tilt-y', `${rotateY.toFixed(2)}deg`)
  event.currentTarget.style.setProperty('--pointer-x', `${(x * 100).toFixed(1)}%`)
  event.currentTarget.style.setProperty('--pointer-y', `${(y * 100).toFixed(1)}%`)
}

function resetTilt(event: PointerEvent<HTMLElement>) {
  event.currentTarget.style.setProperty('--tilt-x', '0deg')
  event.currentTarget.style.setProperty('--tilt-y', '0deg')
  event.currentTarget.style.setProperty('--pointer-x', '50%')
  event.currentTarget.style.setProperty('--pointer-y', '50%')
}

export function PlayingCard({ label, accent }: PlayingCardProps) {
  return (
    <article
      className="playing-card-back"
      style={{ '--accent': accent } as CSSProperties}
      onPointerMove={updateTilt}
      onPointerLeave={resetTilt}
    >
      <span className="playing-card-back__sheen" />
      <span className="playing-card-back__line" />
      <span className="playing-card-back__pattern" />
      <span className="playing-card-back__label">{label}</span>
    </article>
  )
}
