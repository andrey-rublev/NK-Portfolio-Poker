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

  // Shrink-to-fit, but stay big and bold so the label reads on the felt.
  let size = 150
  const label = s.label.toUpperCase()
  do {
    ctx.font = `900 ${size}px "Space Grotesk", system-ui, sans-serif`
    size -= 2
  } while (ctx.measureText(label).width > W - 44 && size > 64)

  const midY = H / 2 - 6
  // Crisp pure-black word with a thin dark outline so light can't wash it out.
  ctx.lineJoin = 'round'
  ctx.strokeStyle = 'rgba(0,0,0,0.55)'
  ctx.lineWidth = 6
  ctx.strokeText(label, W / 2, midY)
  ctx.fillStyle = '#000000'
  ctx.fillText(label, W / 2, midY)

  // Accent rule under the word.
  ctx.fillStyle = s.accent
  ctx.fillRect(W / 2 - 104, midY + size * 0.58, 208, 12)

  // Smaller serif title beneath, so the big label clearly dominates.
  ctx.fillStyle = '#241d12'
  ctx.font = '700 38px "Cormorant Garamond", Georgia, serif'
  drawWrapped(ctx, s.title, W / 2, midY + size * 0.58 + 44, W - 96, 44)
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

  ctx.font = '500 24px "Space Grotesk", system-ui, sans-serif'
  for (const bullet of s.bullets) {
    if (y > H - 60) break
    ctx.fillStyle = s.accent
    ctx.fillText('•', pad, y)
    ctx.fillStyle = '#15202b'
    y = drawWrapped(ctx, bullet, pad + 24, y, W - pad * 2 - 24, 31, H - 60) + 9
  }
  return c
}

/**
 * One classic, identical card back: a cream border framing a deep-red field, a
 * fine all-over diamond lattice, and a central radial medallion (starburst +
 * flower-of-life rosette). Symmetric and instantly readable as a card back.
 */
function drawBack(): HTMLCanvasElement {
  const { c, ctx } = canvas2d()
  const cx = W / 2
  const cy = H / 2
  const RED = '#b3122a'
  const RED_DK = '#7a0c1c'
  const CREAM = '#f6efdd'

  // Cream card stock — this shows through as the white border.
  ctx.fillStyle = CREAM
  ctx.fillRect(0, 0, W, H)

  // Red printed panel, inset from the edge, with a soft vignette.
  const M = 30
  const vg = ctx.createRadialGradient(cx, cy, 40, cx, cy, H * 0.6)
  vg.addColorStop(0, RED)
  vg.addColorStop(1, RED_DK)
  ctx.fillStyle = vg
  roundedRect(ctx, M, M, W - 2 * M, H - 2 * M, 26)
  ctx.fill()

  // Cream keylines framing the panel.
  ctx.strokeStyle = CREAM
  ctx.lineWidth = 6
  roundedRect(ctx, M + 12, M + 12, W - 2 * (M + 12), H - 2 * (M + 12), 18)
  ctx.stroke()
  ctx.lineWidth = 2
  roundedRect(ctx, M + 20, M + 20, W - 2 * (M + 20), H - 2 * (M + 20), 14)
  ctx.stroke()

  // Fine all-over lattice of tiny cream diamonds, clipped to the panel.
  ctx.save()
  roundedRect(ctx, M + 22, M + 22, W - 2 * (M + 22), H - 2 * (M + 22), 12)
  ctx.clip()
  ctx.fillStyle = 'rgba(246,239,221,0.16)'
  const g = 26
  for (let yy = M; yy < H - M; yy += g) {
    for (let xx = M; xx < W - M; xx += g) {
      ctx.save()
      ctx.translate(xx, yy)
      ctx.rotate(Math.PI / 4)
      ctx.fillRect(-3, -3, 6, 6)
      ctx.restore()
    }
  }
  ctx.restore()

  // Central ornate medallion.
  ctx.save()
  ctx.translate(cx, cy)

  // Cream disc backdrop with a red core.
  ctx.fillStyle = CREAM
  ctx.beginPath()
  ctx.arc(0, 0, 150, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = RED
  ctx.beginPath()
  ctx.arc(0, 0, 138, 0, Math.PI * 2)
  ctx.fill()

  // Cream starburst petals around the rim.
  ctx.fillStyle = CREAM
  const petals = 24
  for (let i = 0; i < petals; i += 1) {
    ctx.rotate((Math.PI * 2) / petals)
    ctx.beginPath()
    ctx.ellipse(0, -126, 7, 20, 0, 0, Math.PI * 2)
    ctx.fill()
  }

  // Two concentric rings.
  ctx.strokeStyle = CREAM
  ctx.lineWidth = 4
  ctx.beginPath()
  ctx.arc(0, 0, 108, 0, Math.PI * 2)
  ctx.stroke()
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(0, 0, 100, 0, Math.PI * 2)
  ctx.stroke()

  // Flower-of-life rosette: six circles around a centre.
  ctx.lineWidth = 2.5
  const rosR = 46
  for (let i = 0; i < 6; i += 1) {
    const a = ((Math.PI * 2) / 6) * i
    ctx.beginPath()
    ctx.arc(Math.cos(a) * rosR, Math.sin(a) * rosR, rosR, 0, Math.PI * 2)
    ctx.stroke()
  }
  ctx.beginPath()
  ctx.arc(0, 0, rosR, 0, Math.PI * 2)
  ctx.stroke()

  // Centre hub.
  ctx.fillStyle = CREAM
  ctx.beginPath()
  ctx.arc(0, 0, 14, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = RED
  ctx.beginPath()
  ctx.arc(0, 0, 7, 0, Math.PI * 2)
  ctx.fill()

  ctx.restore()

  // Corner fans.
  const fan = (x: number, y: number, rot: number) => {
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(rot)
    ctx.strokeStyle = 'rgba(246,239,221,0.85)'
    ctx.lineWidth = 3
    for (let i = 0; i < 4; i += 1) {
      ctx.beginPath()
      ctx.arc(0, 0, 16 + i * 9, 0, Math.PI / 2)
      ctx.stroke()
    }
    ctx.restore()
  }
  const inset = 64
  fan(inset, inset, 0)
  fan(W - inset, inset, Math.PI / 2)
  fan(W - inset, H - inset, Math.PI)
  fan(inset, H - inset, -Math.PI / 2)

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
