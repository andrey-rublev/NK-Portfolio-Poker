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
const R = 46

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
  tex.anisotropy = 8
  tex.needsUpdate = true
  return tex
}

function drawBack(card: PortfolioCardData): HTMLCanvasElement {
  const canvas = makeCanvas()
  const ctx = canvas.getContext('2d')!

  // Base
  roundedRect(ctx, 0, 0, W, H, R)
  ctx.clip()
  const grad = ctx.createLinearGradient(0, 0, W, H)
  grad.addColorStop(0, '#10271d')
  grad.addColorStop(1, '#061310')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, W, H)

  // Diagonal weave
  ctx.strokeStyle = 'rgba(255,244,220,0.06)'
  ctx.lineWidth = 3
  for (let i = -H; i < W; i += 22) {
    ctx.beginPath()
    ctx.moveTo(i, 0)
    ctx.lineTo(i + H, H)
    ctx.stroke()
  }

  // Accent top bar
  ctx.fillStyle = card.accent
  ctx.fillRect(40, 40, W - 80, 10)

  // Inner border
  ctx.strokeStyle = 'rgba(255,247,227,0.18)'
  ctx.lineWidth = 3
  roundedRect(ctx, 34, 34, W - 68, H - 68, 30)
  ctx.stroke()

  // Center medallion
  ctx.save()
  ctx.translate(W / 2, H / 2)
  ctx.strokeStyle = 'rgba(233,200,119,0.5)'
  ctx.lineWidth = 4
  ctx.beginPath()
  ctx.arc(0, 0, 120, 0, Math.PI * 2)
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(0, 0, 96, 0, Math.PI * 2)
  ctx.stroke()
  ctx.restore()

  // Label
  ctx.fillStyle = 'rgba(255,244,222,0.92)'
  ctx.font = '700 54px "Space Grotesk", system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(card.label.toUpperCase(), W / 2, H / 2)

  return canvas
}

function drawFront(card: PortfolioCardData): HTMLCanvasElement {
  const canvas = makeCanvas()
  const ctx = canvas.getContext('2d')!

  roundedRect(ctx, 0, 0, W, H, R)
  ctx.clip()
  const grad = ctx.createLinearGradient(0, 0, 0, H)
  grad.addColorStop(0, '#fff8ed')
  grad.addColorStop(0.6, '#f3e3ca')
  grad.addColorStop(1, '#e7d2b1')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, W, H)

  const suitColor = RED_SUITS.includes(card.suit) ? '#b3261e' : '#16202b'
  const symbol = SUIT_SYMBOLS[card.suit]

  // Corner rank + suit
  ctx.fillStyle = suitColor
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  const drawCorner = (x: number, y: number, flip: boolean) => {
    ctx.save()
    ctx.translate(x, y)
    if (flip) ctx.rotate(Math.PI)
    ctx.font = '700 68px "Cormorant Garamond", Georgia, serif'
    ctx.fillText(card.rank, 0, -34)
    ctx.font = '700 56px serif'
    ctx.fillText(symbol, 0, 30)
    ctx.restore()
  }
  drawCorner(70, 84, false)
  drawCorner(W - 70, H - 84, true)

  // Accent ring + big suit
  ctx.save()
  ctx.translate(W / 2, H / 2)
  ctx.strokeStyle = card.accent
  ctx.globalAlpha = 0.55
  ctx.lineWidth = 8
  ctx.beginPath()
  ctx.arc(0, 0, 150, 0, Math.PI * 2)
  ctx.stroke()
  ctx.globalAlpha = 1
  ctx.fillStyle = suitColor
  ctx.font = '700 230px serif'
  ctx.fillText(symbol, 0, 8)
  ctx.restore()

  // Label band
  ctx.fillStyle = suitColor
  ctx.font = '700 34px "Space Grotesk", system-ui, sans-serif'
  ctx.fillText(card.label.toUpperCase(), W / 2, H - 150)

  return canvas
}

const cache = new Map<string, { front: THREE.Texture; back: THREE.Texture }>()

export function createCardTextures(card: PortfolioCardData) {
  const cached = cache.get(card.id)
  if (cached) return cached
  const made = {
    front: toTexture(drawFront(card)),
    back: toTexture(drawBack(card)),
  }
  cache.set(card.id, made)
  return made
}
