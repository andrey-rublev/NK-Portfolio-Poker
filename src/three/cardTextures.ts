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

function drawWrapped(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxW: number,
  lineH: number,
  maxY = H - 40,
): number {
  const words = text.split(/\s+/)
  let line = ''
  let cy = y
  for (const word of words) {
    const test = line ? `${line} ${word}` : word
    if (ctx.measureText(test).width > maxW && line) {
      if (cy > maxY) return cy
      ctx.fillText(line, x, cy)
      line = word
      cy += lineH
    } else {
      line = test
    }
  }
  if (line && cy <= maxY) {
    ctx.fillText(line, x, cy)
    cy += lineH
  }
  return cy
}

function paper(ctx: CanvasRenderingContext2D, accent: string) {
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

/** Left card of a seat hand: small heading at the top, then content. */
function drawHandLeft(s: PortfolioCardData): HTMLCanvasElement {
  const { c, ctx } = canvas2d()
  paper(ctx, s.accent)
  const pad = 54
  let y = 64
  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'

  ctx.fillStyle = s.accent
  ctx.font = '800 30px "Space Grotesk", system-ui, sans-serif'
  ctx.fillText(s.label.toUpperCase(), pad, y)
  y += 44

  ctx.fillStyle = '#15202b'
  ctx.font = '700 50px "Cormorant Garamond", Georgia, serif'
  y = drawWrapped(ctx, s.title, pad, y, W - pad * 2, 52) + 18

  ctx.fillStyle = '#3a4452'
  ctx.font = '500 29px "Space Grotesk", system-ui, sans-serif'
  drawWrapped(ctx, s.detail, pad, y, W - pad * 2, 39)
  return c
}

/** Right card of a seat hand: the bullets, tags and links. */
function drawHandRight(s: PortfolioCardData): HTMLCanvasElement {
  const { c, ctx } = canvas2d()
  paper(ctx, s.accent)
  const pad = 54
  let y = 64
  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'

  ctx.fillStyle = '#15202b'
  ctx.font = '500 28px "Space Grotesk", system-ui, sans-serif'
  for (const bullet of s.bullets) {
    if (y > H - 150) break
    ctx.fillStyle = s.accent
    ctx.fillText('•', pad, y)
    ctx.fillStyle = '#15202b'
    y = drawWrapped(ctx, bullet, pad + 26, y, W - pad * 2 - 26, 36, H - 150) + 12
  }

  if (s.actions?.length) {
    y += 6
    ctx.fillStyle = s.accent
    ctx.font = '700 24px "Space Grotesk", system-ui, sans-serif'
    for (const a of s.actions) {
      if (y > H - 70) break
      ctx.fillText(`→ ${a.label}`, pad, y)
      y += 34
    }
  }
  return c
}

/** Community card "cover": a big centered section name to read on the board. */
function drawCommunityCover(s: PortfolioCardData): HTMLCanvasElement {
  const { c, ctx } = canvas2d()
  paper(ctx, s.accent)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  let size = 100
  const label = s.label.toUpperCase()
  do {
    ctx.font = `800 ${size}px "Space Grotesk", system-ui, sans-serif`
    size -= 3
  } while (ctx.measureText(label).width > W - 110 && size > 34)
  ctx.fillStyle = '#15202b'
  ctx.fillText(label, W / 2, H / 2 - 18)

  ctx.fillStyle = s.accent
  ctx.fillRect(W / 2 - 80, H / 2 + 44, 160, 10)

  ctx.fillStyle = '#5b4a35'
  ctx.font = '600 36px "Cormorant Garamond", Georgia, serif'
  drawWrapped(ctx, s.title, W / 2, H / 2 + 78, W - 120, 44)
  return c
}

/** Community card content (after click): small heading at top + content. */
function drawCommunityContent(s: PortfolioCardData): HTMLCanvasElement {
  const { c, ctx } = canvas2d()
  paper(ctx, s.accent)
  const pad = 50
  let y = 56
  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'

  ctx.fillStyle = s.accent
  ctx.font = '800 28px "Space Grotesk", system-ui, sans-serif'
  ctx.fillText(s.label.toUpperCase(), pad, y)
  y += 42

  ctx.fillStyle = '#15202b'
  ctx.font = '700 44px "Cormorant Garamond", Georgia, serif'
  y = drawWrapped(ctx, s.title, pad, y, W - pad * 2, 46) + 14

  ctx.fillStyle = '#3a4452'
  ctx.font = '500 27px "Space Grotesk", system-ui, sans-serif'
  y = drawWrapped(ctx, s.detail, pad, y, W - pad * 2, 36) + 14

  ctx.font = '500 26px "Space Grotesk", system-ui, sans-serif'
  for (const bullet of s.bullets) {
    if (y > H - 70) break
    ctx.fillStyle = s.accent
    ctx.fillText('•', pad, y)
    ctx.fillStyle = '#15202b'
    y = drawWrapped(ctx, bullet, pad + 24, y, W - pad * 2 - 24, 34, H - 70) + 10
  }
  return c
}

/** One ornate red Bicycle-style back, identical on every card. */
function drawBack(): HTMLCanvasElement {
  const { c, ctx } = canvas2d()
  const cx = W / 2
  const cy = H / 2

  ctx.fillStyle = '#b01e2e'
  ctx.fillRect(0, 0, W, H)

  ctx.strokeStyle = '#fbf6ec'
  ctx.lineWidth = 16
  roundedRect(ctx, 24, 24, W - 48, H - 48, 30)
  ctx.stroke()
  ctx.lineWidth = 3
  roundedRect(ctx, 46, 46, W - 92, H - 92, 22)
  ctx.stroke()

  ctx.save()
  roundedRect(ctx, 52, 52, W - 104, H - 104, 18)
  ctx.clip()
  ctx.strokeStyle = 'rgba(255,246,236,0.32)'
  ctx.lineWidth = 1.4
  for (let i = -H; i < W; i += 13) {
    ctx.beginPath()
    ctx.moveTo(i, 0)
    ctx.lineTo(i + H, H)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(i + H, 0)
    ctx.lineTo(i, H)
    ctx.stroke()
  }
  for (let r = 250; r > 140; r -= 16) {
    ctx.strokeStyle = 'rgba(255,246,236,0.20)'
    ctx.beginPath()
    ctx.ellipse(cx, cy, r * 0.62, r, 0, 0, Math.PI * 2)
    ctx.stroke()
  }
  ctx.restore()

  ctx.fillStyle = '#fbf6ec'
  ctx.beginPath()
  ctx.ellipse(cx, cy, 92, 132, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = '#b01e2e'
  ctx.lineWidth = 5
  ctx.beginPath()
  ctx.ellipse(cx, cy, 92, 132, 0, 0, Math.PI * 2)
  ctx.stroke()
  ctx.save()
  ctx.translate(cx, cy)
  ctx.strokeStyle = '#b01e2e'
  ctx.lineWidth = 3
  for (let k = 0; k < 12; k += 1) {
    ctx.rotate((Math.PI * 2) / 12)
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.quadraticCurveTo(22, 40, 0, 96)
    ctx.quadraticCurveTo(-22, 40, 0, 0)
    ctx.stroke()
  }
  ctx.fillStyle = '#b01e2e'
  ctx.beginPath()
  ctx.arc(0, 0, 16, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
  return c
}

interface Faces {
  front: THREE.Texture
  back: THREE.Texture
  cover?: THREE.Texture
}
let sharedBack: THREE.Texture | null = null
const cache = new Map<string, Faces>()

export function getSharedBack(): THREE.Texture {
  if (!sharedBack) sharedBack = toTex(drawBack())
  return sharedBack
}

export function createCardFaces(section: PortfolioCardData, role: CardRole): Faces {
  const key = `${section.id}:${role}`
  const hit = cache.get(key)
  if (hit) return hit

  let faces: Faces
  if (role === 'label') {
    faces = { front: toTex(drawHandLeft(section)), back: getSharedBack() }
  } else if (role === 'info') {
    faces = { front: toTex(drawHandRight(section)), back: getSharedBack() }
  } else {
    faces = {
      front: toTex(drawCommunityContent(section)),
      cover: toTex(drawCommunityCover(section)),
      back: getSharedBack(),
    }
  }
  cache.set(key, faces)
  return faces
}
