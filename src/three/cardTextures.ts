import * as THREE from 'three'
import type { PortfolioCardData, Suit } from '../data/portfolio'

const SUIT_SYMBOLS: Record<Suit, string> = {
  spades: '♠',
  hearts: '♥',
  clubs: '♣',
  diamonds: '♦',
}

const RED_SUITS: Suit[] = ['hearts', 'diamonds']

const W = 512
const H = 724

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function makeCanvas() {
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  return canvas
}

function toTexture(canvas: HTMLCanvasElement) {
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 16
  tex.needsUpdate = true
  return tex
}

/** The face-up side: a real card index (rank/suit) plus the section label. */
function drawLabelFace(card: PortfolioCardData): HTMLCanvasElement {
  const canvas = makeCanvas()
  const ctx = canvas.getContext('2d')!

  const grad = ctx.createLinearGradient(0, 0, 0, H)
  grad.addColorStop(0, '#fffdf7')
  grad.addColorStop(1, '#f1e7d4')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, W, H)

  const suitColor = RED_SUITS.includes(card.suit) ? '#b3261e' : '#1b232e'
  const symbol = SUIT_SYMBOLS[card.suit]

  // Accent frame
  ctx.strokeStyle = card.accent
  ctx.lineWidth = 10
  roundedRect(ctx, 22, 22, W - 44, H - 44, 28)
  ctx.stroke()

  // Corner rank + suit (top-left, rotated bottom-right)
  ctx.fillStyle = suitColor
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const corner = (cx: number, cy: number, flip: boolean) => {
    ctx.save()
    ctx.translate(cx, cy)
    if (flip) ctx.rotate(Math.PI)
    ctx.font = '700 60px "Cormorant Garamond", Georgia, serif'
    ctx.fillText(card.rank, 0, -26)
    ctx.font = '700 46px serif'
    ctx.fillText(symbol, 0, 24)
    ctx.restore()
  }
  corner(62, 76, false)
  corner(W - 62, H - 76, true)

  // Faint oversized suit watermark
  ctx.save()
  ctx.globalAlpha = 0.1
  ctx.fillStyle = suitColor
  ctx.font = '700 360px serif'
  ctx.fillText(symbol, W / 2, H / 2 + 10)
  ctx.restore()

  // The big section label (auto-fit to width), the hero of the card
  const label = card.label.toUpperCase()
  let size = 96
  do {
    ctx.font = `800 ${size}px "Space Grotesk", system-ui, sans-serif`
    size -= 3
  } while (ctx.measureText(label).width > W - 120 && size > 28)

  ctx.fillStyle = '#15202b'
  ctx.fillText(label, W / 2, H / 2)

  // Accent underline beneath the label
  const lw = Math.min(ctx.measureText(label).width, W - 140)
  ctx.fillStyle = card.accent
  ctx.fillRect((W - lw) / 2, H / 2 + size * 0.62 + 14, lw, 8)

  return canvas
}

/** The underside (mostly hidden): a classic patterned card back. */
function drawBack(card: PortfolioCardData): HTMLCanvasElement {
  const canvas = makeCanvas()
  const ctx = canvas.getContext('2d')!

  ctx.fillStyle = '#0c2018'
  ctx.fillRect(0, 0, W, H)
  const grad = ctx.createRadialGradient(W / 2, H / 2, 40, W / 2, H / 2, H * 0.72)
  grad.addColorStop(0, '#1c4534')
  grad.addColorStop(1, '#071611')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, W, H)

  ctx.strokeStyle = 'rgba(255,244,220,0.06)'
  ctx.lineWidth = 2
  for (let i = -H; i < W; i += 16) {
    ctx.beginPath()
    ctx.moveTo(i, 0)
    ctx.lineTo(i + H, H)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(i + H, 0)
    ctx.lineTo(i, H)
    ctx.stroke()
  }

  ctx.strokeStyle = card.accent
  ctx.globalAlpha = 0.85
  ctx.lineWidth = 8
  roundedRect(ctx, 30, 30, W - 60, H - 60, 26)
  ctx.stroke()
  ctx.globalAlpha = 1

  return canvas
}

const cache = new Map<string, { front: THREE.Texture; back: THREE.Texture }>()

export function createCardTextures(card: PortfolioCardData) {
  const cached = cache.get(card.id)
  if (cached) return cached
  const made = {
    front: toTexture(drawLabelFace(card)),
    back: toTexture(drawBack(card)),
  }
  cache.set(card.id, made)
  return made
}
