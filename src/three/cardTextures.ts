import * as THREE from 'three'
import type { PortfolioCardData } from '../data/portfolio'
import type { CardRole } from './layout'

const W = 512
const H = 731

function canvas2d() {
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  return { c, ctx: c.getContext('2d')! }
}

function toTex(c: HTMLCanvasElement) {
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 16
  tex.needsUpdate = true
  return tex
}

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

/** Wrap text to a width, returning lines; draws and returns the new y. */
function drawWrapped(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxW: number,
  lineH: number,
): number {
  const words = text.split(/\s+/)
  let line = ''
  let cy = y
  for (const word of words) {
    const test = line ? `${line} ${word}` : word
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, cy)
      line = word
      cy += lineH
    } else {
      line = test
    }
  }
  if (line) {
    ctx.fillText(line, x, cy)
    cy += lineH
  }
  return cy
}

function paperBackground(ctx: CanvasRenderingContext2D, accent: string) {
  const grad = ctx.createLinearGradient(0, 0, 0, H)
  grad.addColorStop(0, '#fffdf7')
  grad.addColorStop(1, '#f1e7d4')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, W, H)
  ctx.strokeStyle = accent
  ctx.lineWidth = 12
  roundedRect(ctx, 22, 22, W - 44, H - 44, 30)
  ctx.stroke()
}

/** The big "labeled" face of a seat hand: section name + title. */
function drawLabelFace(section: PortfolioCardData): HTMLCanvasElement {
  const { c, ctx } = canvas2d()
  paperBackground(ctx, section.accent)

  ctx.textAlign = 'center'
  // Accent bar
  ctx.fillStyle = section.accent
  ctx.fillRect(W / 2 - 70, 150, 140, 12)

  // Big label, auto-fit
  let size = 110
  const label = section.label.toUpperCase()
  do {
    ctx.font = `800 ${size}px "Space Grotesk", system-ui, sans-serif`
    size -= 3
  } while (ctx.measureText(label).width > W - 110 && size > 36)
  ctx.fillStyle = '#15202b'
  ctx.textBaseline = 'middle'
  ctx.fillText(label, W / 2, H / 2 - 20)

  // Title beneath
  ctx.fillStyle = '#5b4a35'
  ctx.font = '600 38px "Cormorant Garamond", Georgia, serif'
  drawWrapped(ctx, section.title, W / 2, H / 2 + 90, W - 120, 46)
  return c
}

/** The "info" face of a seat hand: details + bullets. */
function drawInfoFace(section: PortfolioCardData): HTMLCanvasElement {
  const { c, ctx } = canvas2d()
  paperBackground(ctx, section.accent)

  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'
  const pad = 56
  let y = 70

  ctx.fillStyle = section.accent
  ctx.font = '800 30px "Space Grotesk", system-ui, sans-serif'
  ctx.fillText(section.label.toUpperCase(), pad, y)
  y += 52

  ctx.fillStyle = '#3a4452'
  ctx.font = '500 30px "Space Grotesk", system-ui, sans-serif'
  y = drawWrapped(ctx, section.detail, pad, y, W - pad * 2, 40) + 18

  ctx.fillStyle = '#15202b'
  ctx.font = '500 29px "Space Grotesk", system-ui, sans-serif'
  for (const bullet of section.bullets) {
    if (y > H - 90) break
    ctx.fillStyle = section.accent
    ctx.fillText('•', pad, y)
    ctx.fillStyle = '#15202b'
    y = drawWrapped(ctx, bullet, pad + 28, y, W - pad * 2 - 28, 38) + 12
  }
  return c
}

/** A community card: label + title + the first key point. */
function drawCommunityFace(section: PortfolioCardData): HTMLCanvasElement {
  const { c, ctx } = canvas2d()
  paperBackground(ctx, section.accent)

  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  let y = 70

  ctx.fillStyle = section.accent
  ctx.font = '800 34px "Space Grotesk", system-ui, sans-serif'
  ctx.fillText(section.label.toUpperCase(), W / 2, y)
  y += 64

  ctx.fillStyle = '#15202b'
  ctx.font = '700 56px "Cormorant Garamond", Georgia, serif'
  y = drawWrapped(ctx, section.title, W / 2, y, W - 90, 60) + 24

  ctx.textAlign = 'left'
  ctx.fillStyle = '#3a4452'
  ctx.font = '500 28px "Space Grotesk", system-ui, sans-serif'
  drawWrapped(ctx, section.teaser, 56, y, W - 112, 38)
  return c
}

/** Crimson playing-card back, optionally with the section name in the medallion. */
function drawBack(label?: string, accent = '#d8a32b'): HTMLCanvasElement {
  const { c, ctx } = canvas2d()
  const grad = ctx.createLinearGradient(0, 0, 0, H)
  grad.addColorStop(0, '#7d2231')
  grad.addColorStop(1, '#4d101b')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, W, H)

  ctx.strokeStyle = 'rgba(255,240,224,0.12)'
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

  ctx.strokeStyle = '#f3e9d6'
  ctx.lineWidth = 12
  roundedRect(ctx, 26, 26, W - 52, H - 52, 26)
  ctx.stroke()

  if (label) {
    ctx.save()
    ctx.translate(W / 2, H / 2)
    ctx.fillStyle = '#f5ecda'
    ctx.beginPath()
    ctx.ellipse(0, 0, 180, 130, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = accent
    ctx.lineWidth = 6
    ctx.beginPath()
    ctx.ellipse(0, 0, 180, 130, 0, 0, Math.PI * 2)
    ctx.stroke()
    let size = 66
    const text = label.toUpperCase()
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    do {
      ctx.font = `800 ${size}px "Space Grotesk", system-ui, sans-serif`
      size -= 2
    } while (ctx.measureText(text).width > 300 && size > 24)
    ctx.fillStyle = '#4d101b'
    ctx.fillText(text, 0, 0)
    ctx.restore()
  }
  return c
}

interface Faces {
  front: THREE.Texture
  back: THREE.Texture
}
const cache = new Map<string, Faces>()

export function createCardFaces(
  section: PortfolioCardData,
  role: CardRole,
): Faces {
  const key = `${section.id}:${role}`
  const hit = cache.get(key)
  if (hit) return hit

  let frontCanvas: HTMLCanvasElement
  if (role === 'label') frontCanvas = drawLabelFace(section)
  else if (role === 'info') frontCanvas = drawInfoFace(section)
  else frontCanvas = drawCommunityFace(section)

  // Only the labeled seat card carries the section name on its back.
  const backCanvas = drawBack(
    role === 'label' ? section.label : undefined,
    section.accent,
  )

  const faces = { front: toTex(frontCanvas), back: toTex(backCanvas) }
  cache.set(key, faces)
  return faces
}
