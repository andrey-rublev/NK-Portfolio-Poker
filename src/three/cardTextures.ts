import * as THREE from 'three'
import type { CardGroup, PortfolioCardData } from '../data/portfolio'
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

type Ctx = CanvasRenderingContext2D

const PAD = 46
const CONTENT_W = W - PAD * 2
const BULLET_INDENT = 28
const SUB_FONT = '800 28px "Mulish", system-ui, sans-serif'
const BULLET_FONT = '500 25px "Mulish", system-ui, sans-serif'
const SUB_LH = 33
const BULLET_LH = 31
const BULLET_GAP = 10
const GROUP_GAP = 18
const BODY = '#28323e'

function wrapLines(ctx: Ctx, text: string, maxW: number): string[] {
  const words = text.split(/\s+/)
  const lines: string[] = []
  let line = ''
  for (const word of words) {
    const test = line ? `${line} ${word}` : word
    if (line && ctx.measureText(test).width > maxW) {
      lines.push(line)
      line = word
    } else {
      line = test
    }
  }
  if (line) lines.push(line)
  return lines
}

interface Item {
  kind: 'sub' | 'bullet'
  lines: string[]
  /** Marks the first item of a group, used as a preferred page break. */
  groupStart: boolean
}

function buildItems(ctx: Ctx, groups: CardGroup[]): Item[] {
  const items: Item[] = []
  for (const group of groups) {
    if (group.heading) {
      ctx.font = SUB_FONT
      items.push({ kind: 'sub', lines: wrapLines(ctx, group.heading, CONTENT_W), groupStart: true })
    }
    group.bullets.forEach((b, i) => {
      ctx.font = BULLET_FONT
      items.push({
        kind: 'bullet',
        lines: wrapLines(ctx, b, CONTENT_W - BULLET_INDENT),
        groupStart: i === 0 && !group.heading,
      })
    })
  }
  return items
}

function itemHeight(it: Item): number {
  return it.kind === 'sub'
    ? GROUP_GAP + it.lines.length * SUB_LH
    : it.lines.length * BULLET_LH + BULLET_GAP
}

/** Draw items [from, to) starting at y; returns the y below the last one. */
function drawItems(
  ctx: Ctx,
  items: Item[],
  from: number,
  to: number,
  startY: number,
  accent: string,
): number {
  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'
  let y = startY
  for (let i = from; i < to; i += 1) {
    const it = items[i]
    if (it.kind === 'sub') {
      if (i !== from) y += GROUP_GAP
      ctx.font = SUB_FONT
      ctx.fillStyle = accent
      for (const ln of it.lines) {
        ctx.fillText(ln, PAD, y)
        y += SUB_LH
      }
      y += 4
    } else {
      ctx.font = BULLET_FONT
      ctx.fillStyle = accent
      ctx.fillText('•', PAD, y)
      ctx.fillStyle = BODY
      for (const ln of it.lines) {
        ctx.fillText(ln, PAD + BULLET_INDENT, y)
        y += BULLET_LH
      }
      y += BULLET_GAP
    }
  }
  return y
}

function headerFont(ctx: Ctx, size: number): Ctx {
  ctx.font = `900 ${size}px "Mulish", system-ui, sans-serif`
  return ctx
}

/** The section header at the top of a card; returns the y below it. */
function drawHeader(ctx: Ctx, label: string, accent: string): number {
  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'
  const tokens = labelTokens(label)
  const widest = (lns: string[]) => Math.max(...lns.map((l) => ctx.measureText(l).width))
  let size = 46
  let lines = wrapBig(headerFont(ctx, size), tokens, CONTENT_W)
  while ((lines.length > 2 || widest(lines) > CONTENT_W) && size > 26) {
    size -= 2
    lines = wrapBig(headerFont(ctx, size), tokens, CONTENT_W)
  }
  let y = 52
  ctx.fillStyle = accent
  for (const ln of lines) {
    ctx.fillText(ln, PAD, y)
    y += size * 1.02
  }
  ctx.fillRect(PAD, y + 2, 64, 6)
  return y + 24
}

function drawActions(ctx: Ctx, actions: { label: string }[], startY: number, accent: string): void {
  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'
  ctx.font = '700 23px "Mulish", system-ui, sans-serif'
  ctx.fillStyle = accent
  let y = startY
  for (const a of actions) {
    if (y > H - 46) break
    ctx.fillText(`→ ${a.label}`, PAD, y)
    y += 32
  }
}

function paper(ctx: CanvasRenderingContext2D, accent: string) {
  // The card's rounded geometry clips the silhouette, so the fill is a full
  // opaque rectangle; the accent keyline sits inside it.
  const grad = ctx.createLinearGradient(0, 0, 0, H)
  grad.addColorStop(0, '#fffdf7')
  grad.addColorStop(1, '#f1e7d4')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, W, H)
  ctx.strokeStyle = accent
  ctx.lineWidth = 12
  roundedRect(ctx, 22, 22, W - 44, H - 44, 28)
  ctx.stroke()
}

interface Spread {
  left: HTMLCanvasElement
  right: HTMLCanvasElement
}

/**
 * A seat hand's two cards as one spread: the left card carries the section
 * header then content; the content then flows onto the right card. The split is
 * chosen to balance the two cards, prefers group boundaries, never orphans a
 * sub-heading, and keeps each side within the card.
 */
function buildHandSpread(s: PortfolioCardData): Spread {
  const left = canvas2d()
  const right = canvas2d()
  paper(left.ctx, s.accent)
  paper(right.ctx, s.accent)

  const items = buildItems(left.ctx, s.groups)
  const heights = items.map(itemHeight)
  const sum = (a: number, b: number) => heights.slice(a, b).reduce((x, y) => x + y, 0)

  const yLeft = drawHeader(left.ctx, s.label, s.accent)
  const yRight = 52
  const leftCap = H - 46 - yLeft
  const rightCap = H - 46 - yRight - (s.actions?.length ? 44 : 0)

  let bestK = -1
  let bestScore = Infinity
  for (let k = 0; k <= items.length; k += 1) {
    if (k > 0 && items[k - 1].kind === 'sub') continue // never orphan a heading
    const lh = sum(0, k)
    const rh = sum(k, items.length)
    if (lh > leftCap || rh > rightCap) continue
    const boundary =
      k === 0 || k === items.length || items[k].kind === 'sub' || items[k].groupStart
    const score = Math.abs(lh - rh) + (boundary ? 0 : 90)
    if (score < bestScore) {
      bestScore = score
      bestK = k
    }
  }
  if (bestK < 0) {
    // Fallback: fill the left card, overflow onto the right.
    let acc = 0
    bestK = 0
    for (let i = 0; i < items.length; i += 1) {
      if (acc + heights[i] > leftCap) break
      acc += heights[i]
      bestK = i + 1
    }
    // Never end the left card on a heading — push it to the right card.
    while (bestK > 0 && items[bestK - 1].kind === 'sub') bestK -= 1
  }

  drawItems(left.ctx, items, 0, bestK, yLeft, s.accent)
  const yEnd = drawItems(right.ctx, items, bestK, items.length, yRight, s.accent)
  if (s.actions?.length) drawActions(right.ctx, s.actions, yEnd + 8, s.accent)
  return { left: left.c, right: right.c }
}

/** Tokens for the big cover label, breaking at spaces and after hyphens. */
function labelTokens(label: string): string[] {
  return label
    .toUpperCase()
    .split(/\s+/)
    .flatMap((w) => (w.includes('-') ? w.split(/(?<=-)/) : [w]))
}

function wrapBig(ctx: Ctx, tokens: string[], maxW: number): string[] {
  const lines: string[] = []
  let line = ''
  for (const tok of tokens) {
    const sep = line && !line.endsWith('-') ? ' ' : ''
    const test = line + sep + tok
    if (line && ctx.measureText(test).width > maxW) {
      lines.push(line)
      line = tok
    } else {
      line = test
    }
  }
  if (line) lines.push(line)
  return lines
}

/** Community "cover" shown on the board: the section name, wrapped big. */
function drawCommunityCover(s: PortfolioCardData): HTMLCanvasElement {
  const { c, ctx } = canvas2d()
  paper(ctx, s.accent)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  const tokens = labelTokens(s.label)
  const maxW = W - 64
  let size = 140
  let lines: string[] = []
  for (; size >= 54; size -= 4) {
    ctx.font = `900 ${size}px "Mulish", system-ui, sans-serif`
    lines = wrapBig(ctx, tokens, maxW)
    const widest = Math.max(...lines.map((l) => ctx.measureText(l).width))
    if (widest <= maxW && lines.length * size * 1.02 <= H - 150) break
  }

  const lh = size * 1.02
  let y = H / 2 - ((lines.length - 1) * lh) / 2 - 6
  ctx.lineJoin = 'round'
  for (const ln of lines) {
    ctx.strokeStyle = 'rgba(0,0,0,0.5)'
    ctx.lineWidth = Math.max(4, size * 0.05)
    ctx.strokeText(ln, W / 2, y)
    ctx.fillStyle = '#000000'
    ctx.fillText(ln, W / 2, y)
    y += lh
  }
  ctx.fillStyle = s.accent
  ctx.fillRect(W / 2 - 90, y - lh / 2 + size * 0.46, 180, 12)
  return c
}

/** Community content (after click): header at top, then the grouped bullets. */
function drawCommunityContent(s: PortfolioCardData): HTMLCanvasElement {
  const { c, ctx } = canvas2d()
  paper(ctx, s.accent)
  const items = buildItems(ctx, s.groups)
  const y0 = drawHeader(ctx, s.label, s.accent)
  const yEnd = drawItems(ctx, items, 0, items.length, y0, s.accent)
  if (s.actions?.length) drawActions(ctx, s.actions, yEnd + 8, s.accent)
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

  // Cream card stock — shows through as the white border.
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

/* ---------- About card: headshot on the left, bio on the right ---------- */

const ABOUT_PHOTO = { x: PAD - 6, y: 152, w: W - (PAD - 6) * 2, h: 468 }

function drawAboutLeft(s: PortfolioCardData): HTMLCanvasElement {
  const { c, ctx } = canvas2d()
  paper(ctx, s.accent)
  drawHeader(ctx, s.label, s.accent)
  const { x, y, w, h } = ABOUT_PHOTO
  // Soft placeholder + person silhouette, shown until the photo loads.
  ctx.save()
  roundedRect(ctx, x, y, w, h, 20)
  ctx.clip()
  const g = ctx.createLinearGradient(0, y, 0, y + h)
  g.addColorStop(0, '#e9e0cd')
  g.addColorStop(1, '#d6c9ad')
  ctx.fillStyle = g
  ctx.fillRect(x, y, w, h)
  ctx.fillStyle = 'rgba(120,108,86,0.4)'
  const cx = x + w / 2
  ctx.beginPath()
  ctx.arc(cx, y + h * 0.4, w * 0.17, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.ellipse(cx, y + h * 0.96, w * 0.32, h * 0.32, 0, Math.PI, Math.PI * 2)
  ctx.fill()
  ctx.restore()
  ctx.strokeStyle = 'rgba(0,0,0,0.16)'
  ctx.lineWidth = 3
  roundedRect(ctx, x, y, w, h, 20)
  ctx.stroke()
  return c
}

function drawAboutRight(s: PortfolioCardData): HTMLCanvasElement {
  const { c, ctx } = canvas2d()
  paper(ctx, s.accent)
  const items = buildItems(ctx, s.groups)
  drawItems(ctx, items, 0, items.length, 60, s.accent)
  return c
}

/** Load public/about.jpg into the reserved photo area, then notify (texture update). */
function loadAboutPhoto(canvas: HTMLCanvasElement, onReady: () => void): void {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const img = new Image()
  img.onload = () => {
    const { x, y, w, h } = ABOUT_PHOTO
    ctx.save()
    roundedRect(ctx, x, y, w, h, 20)
    ctx.clip()
    const ar = img.width / img.height
    let dw = w
    let dh = h
    if (ar > w / h) dw = h * ar
    else dh = w / ar
    ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh)
    ctx.restore()
    ctx.strokeStyle = 'rgba(0,0,0,0.18)'
    ctx.lineWidth = 3
    roundedRect(ctx, x, y, w, h, 20)
    ctx.stroke()
    onReady()
  }
  let triedJpg = false
  img.onerror = () => {
    // Try .jpg if .jpeg is missing; otherwise keep the placeholder.
    if (!triedJpg) {
      triedJpg = true
      img.src = `${import.meta.env.BASE_URL}about.jpg`
    }
  }
  img.src = `${import.meta.env.BASE_URL}about.jpeg`
}

interface Faces {
  front: THREE.Texture
  back: THREE.Texture
  cover?: THREE.Texture
}
let sharedBack: THREE.Texture | null = null
const cache = new Map<string, Faces>()
const spreadCache = new Map<string, Spread>()

export function getSharedBack(): THREE.Texture {
  if (!sharedBack) sharedBack = toTex(drawBack())
  return sharedBack
}

function getSpread(section: PortfolioCardData): Spread {
  let sp = spreadCache.get(section.id)
  if (!sp) {
    sp = buildHandSpread(section)
    spreadCache.set(section.id, sp)
  }
  return sp
}

export function createCardFaces(section: PortfolioCardData, role: CardRole): Faces {
  const key = `${section.id}:${role}`
  const hit = cache.get(key)
  if (hit) return hit

  let faces: Faces
  if (role === 'label') {
    if (section.id === 'about') {
      const canvas = drawAboutLeft(section)
      const tex = toTex(canvas)
      loadAboutPhoto(canvas, () => {
        tex.needsUpdate = true
      })
      faces = { front: tex, back: getSharedBack() }
    } else {
      faces = { front: toTex(getSpread(section).left), back: getSharedBack() }
    }
  } else if (role === 'info') {
    faces =
      section.id === 'about'
        ? { front: toTex(drawAboutRight(section)), back: getSharedBack() }
        : { front: toTex(getSpread(section).right), back: getSharedBack() }
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
