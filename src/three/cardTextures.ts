import * as THREE from 'three'
import type { PortfolioCardData } from '../data/portfolio'

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

/**
 * A face-down playing-card back: a deep crimson field with an ivory ornate
 * border and a center medallion holding the section name (no rank/suit, since
 * the card is face-down).
 */
function drawBack(card: PortfolioCardData): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!

  // Crimson field
  const grad = ctx.createLinearGradient(0, 0, 0, H)
  grad.addColorStop(0, '#7d2231')
  grad.addColorStop(1, '#4d101b')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, W, H)

  // Fine diagonal lattice (classic card-back weave)
  ctx.strokeStyle = 'rgba(255, 240, 224, 0.12)'
  ctx.lineWidth = 2
  for (let i = -H; i < W; i += 18) {
    ctx.beginPath()
    ctx.moveTo(i, 0)
    ctx.lineTo(i + H, H)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(i + H, 0)
    ctx.lineTo(i, H)
    ctx.stroke()
  }

  // Ivory double border
  ctx.strokeStyle = '#f3e9d6'
  ctx.lineWidth = 12
  roundedRect(ctx, 26, 26, W - 52, H - 52, 26)
  ctx.stroke()
  ctx.lineWidth = 3
  roundedRect(ctx, 44, 44, W - 88, H - 88, 18)
  ctx.stroke()

  // Center medallion
  ctx.save()
  ctx.translate(W / 2, H / 2)
  ctx.fillStyle = '#f5ecda'
  ctx.beginPath()
  ctx.ellipse(0, 0, 170, 120, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = '#7d2231'
  ctx.lineWidth = 6
  ctx.beginPath()
  ctx.ellipse(0, 0, 170, 120, 0, 0, Math.PI * 2)
  ctx.stroke()
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.ellipse(0, 0, 156, 108, 0, 0, Math.PI * 2)
  ctx.stroke()

  // Accent flourishes
  ctx.fillStyle = card.accent
  ctx.globalAlpha = 0.9
  ctx.beginPath()
  ctx.ellipse(0, -120, 10, 10, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.ellipse(0, 120, 10, 10, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.globalAlpha = 1

  // Section label (auto-fit), dark on the medallion
  const label = card.label.toUpperCase()
  let size = 60
  do {
    ctx.font = `800 ${size}px "Space Grotesk", system-ui, sans-serif`
    size -= 2
  } while (ctx.measureText(label).width > 290 && size > 22)
  ctx.fillStyle = '#4d101b'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(label, 0, 0)
  ctx.restore()

  return canvas
}

const cache = new Map<string, THREE.Texture>()

/** The single texture shown on both faces of a (face-down) card. */
export function createCardTexture(card: PortfolioCardData): THREE.Texture {
  const cached = cache.get(card.id)
  if (cached) return cached
  const tex = new THREE.CanvasTexture(drawBack(card))
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 16
  tex.needsUpdate = true
  cache.set(card.id, tex)
  return tex
}
