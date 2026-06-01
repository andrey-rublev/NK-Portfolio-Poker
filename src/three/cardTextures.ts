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

  // Fine diagonal lattice
  ctx.strokeStyle = 'rgba(255,244,220,0.05)'
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

  // Double border
  ctx.strokeStyle = card.accent
  ctx.globalAlpha = 0.9
  ctx.lineWidth = 8
  roundedRect(ctx, 30, 30, W - 60, H - 60, 26)
  ctx.stroke()
  ctx.globalAlpha = 0.5
  ctx.strokeStyle = 'rgba(255,247,227,0.55)'
  ctx.lineWidth = 2
  roundedRect(ctx, 44, 44, W - 88, H - 88, 20)
  ctx.stroke()
  ctx.globalAlpha = 1

  // Center medallion
  ctx.save()
  ctx.translate(W / 2, H / 2)
  for (let r = 130; r > 70; r -= 14) {
    ctx.strokeStyle = `rgba(233,200,119,${0.12 + (130 - r) / 260})`
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.arc(0, 0, r, 0, Math.PI * 2)
    ctx.stroke()
  }
  ctx.fillStyle = card.accent
  ctx.globalAlpha = 0.16
  ctx.beginPath()
  ctx.arc(0, 0, 70, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()

  // Label
  ctx.globalAlpha = 1
  ctx.fillStyle = 'rgba(255,246,226,0.95)'
  ctx.font = '700 46px "Space Grotesk", system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(card.label.toUpperCase(), W / 2, H / 2)

  return canvas
}

function drawFront(card: PortfolioCardData): HTMLCanvasElement {
  const canvas = makeCanvas()
  const ctx = canvas.getContext('2d')!

  const grad = ctx.createLinearGradient(0, 0, 0, H)
  grad.addColorStop(0, '#fffdf7')
  grad.addColorStop(1, '#f0e6d2')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, W, H)

  // Faint inner frame
  ctx.strokeStyle = 'rgba(17,24,33,0.08)'
  ctx.lineWidth = 2
  roundedRect(ctx, 26, 26, W - 52, H - 52, 22)
  ctx.stroke()

  const suitColor = RED_SUITS.includes(card.suit) ? '#b3261e' : '#1b232e'
  const symbol = SUIT_SYMBOLS[card.suit]

  // Corner index (rank over suit), top-left and rotated bottom-right
  ctx.fillStyle = suitColor
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const drawCorner = (cornerX: number, cornerY: number, flip: boolean) => {
    ctx.save()
    ctx.translate(cornerX, cornerY)
    if (flip) ctx.rotate(Math.PI)
    ctx.font = '700 62px "Cormorant Garamond", Georgia, serif'
    ctx.fillText(card.rank, 0, -28)
    ctx.font = '700 46px serif'
    ctx.fillText(symbol, 0, 26)
    ctx.restore()
  }
  drawCorner(64, 78, false)
  drawCorner(W - 64, H - 78, true)

  // Central emblem
  ctx.save()
  ctx.translate(W / 2, H / 2)
  ctx.strokeStyle = card.accent
  ctx.lineWidth = 10
  ctx.globalAlpha = 0.6
  ctx.beginPath()
  ctx.arc(0, 0, 150, 0, Math.PI * 2)
  ctx.stroke()
  ctx.globalAlpha = 0.12
  ctx.fillStyle = card.accent
  ctx.beginPath()
  ctx.arc(0, 0, 150, 0, Math.PI * 2)
  ctx.fill()
  ctx.globalAlpha = 1
  ctx.fillStyle = suitColor
  ctx.font = '700 220px serif'
  ctx.fillText(symbol, 0, 10)
  ctx.restore()

  // Label band
  ctx.fillStyle = suitColor
  ctx.font = '700 30px "Space Grotesk", system-ui, sans-serif'
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
