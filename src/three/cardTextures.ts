import * as THREE from 'three'
import type { CardGroup, PortfolioCardData } from '../data/portfolio'
import type { CardRole } from './layout'
import { inkColor } from '../theme'
import { drawCardBack } from './cardBack'
import { skillLogoImage } from '../data/skillLogos'

const W = 512
const H = 731

/**
 * A card-sized canvas. Everything is drawn in the card's own 512 x 731 units;
 * `scale` only raises the pixel density (the reading copies use 2x).
 */
function canvas2d(scale = 1) {
  const c = document.createElement('canvas')
  c.width = W * scale
  c.height = H * scale
  const ctx = c.getContext('2d')!
  ctx.scale(scale, scale)
  return { c, ctx }
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
const BODY = '#28323e'

/** Text metrics at a given scale — cards shrink their text rather than clip. */
interface Metrics {
  subFont: string
  bulletFont: string
  subLh: number
  bulletLh: number
  bulletGap: number
  groupGap: number
  subGap: number
  indent: number
}

function metrics(s: number): Metrics {
  return {
    subFont: `800 ${28 * s}px "Mulish Variable", system-ui, sans-serif`,
    bulletFont: `500 ${25 * s}px "Mulish Variable", system-ui, sans-serif`,
    subLh: 33 * s,
    bulletLh: 31 * s,
    bulletGap: 10 * s,
    groupGap: 18 * s,
    subGap: 4 * s,
    indent: 28 * s,
  }
}

/** Progressively smaller text, tried in order until the content fits. */
const SCALES = [1, 0.95, 0.9, 0.85, 0.8, 0.75, 0.7]

/**
 * Split on whitespace, but keep a parenthesised span — a date range like
 * "(Aug 2026–Present)" — as one unbreakable token so it never wraps mid-range.
 */
function textTokens(text: string): string[] {
  const out: string[] = []
  let buf = ''
  let open = 0
  for (const word of text.split(/\s+/)) {
    open += (word.split('(').length - 1) - (word.split(')').length - 1)
    buf = buf ? `${buf} ${word}` : word
    if (open <= 0) {
      out.push(buf)
      buf = ''
      open = 0
    }
  }
  if (buf) out.push(buf)
  return out
}

function wrapLines(ctx: Ctx, text: string, maxW: number): string[] {
  const words = textTokens(text)
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
  /** Drawn in place of the bullet (a skill's logo). */
  logo?: HTMLImageElement
}

function buildItems(ctx: Ctx, groups: CardGroup[], m: Metrics): Item[] {
  const items: Item[] = []
  for (const group of groups) {
    if (group.heading) {
      ctx.font = m.subFont
      items.push({ kind: 'sub', lines: wrapLines(ctx, group.heading, CONTENT_W), groupStart: true })
    }
    group.bullets.forEach((b, i) => {
      ctx.font = m.bulletFont
      items.push({
        kind: 'bullet',
        lines: wrapLines(ctx, b, CONTENT_W - m.indent),
        groupStart: i === 0 && !group.heading,
        logo: skillLogoImage(b),
      })
    })
  }
  return items
}

function itemHeight(it: Item, m: Metrics): number {
  return it.kind === 'sub'
    ? m.groupGap + it.lines.length * m.subLh + m.subGap
    : it.lines.length * m.bulletLh + m.bulletGap
}

/** Total height of items [from, to). */
function itemsHeight(items: Item[], from: number, to: number, m: Metrics): number {
  let total = 0
  for (let i = from; i < to; i += 1) total += itemHeight(items[i], m)
  return total
}

/** Build the items at the largest scale whose total height fits `cap`. */
function fitItems(ctx: Ctx, groups: CardGroup[], cap: number): { items: Item[]; m: Metrics } {
  let fallback: { items: Item[]; m: Metrics } | null = null
  for (const scale of SCALES) {
    const m = metrics(scale)
    const items = buildItems(ctx, groups, m)
    fallback = { items, m }
    if (itemsHeight(items, 0, items.length, m) <= cap) return { items, m }
  }
  return fallback!
}

/** Draw items [from, to) starting at y; returns the y below the last one. */
function drawItems(
  ctx: Ctx,
  items: Item[],
  from: number,
  to: number,
  startY: number,
  accent: string,
  m: Metrics,
): number {
  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'
  // Text uses the readable shade of the accent; the bright accent itself is
  // kept for the frame and rules (see inkColor).
  const ink = inkColor(accent)
  let y = startY
  for (let i = from; i < to; i += 1) {
    const it = items[i]
    if (it.kind === 'sub') {
      if (i !== from) y += m.groupGap
      ctx.font = m.subFont
      ctx.fillStyle = ink
      for (const ln of it.lines) {
        ctx.fillText(ln, PAD, y)
        y += m.subLh
      }
      y += m.subGap
    } else {
      ctx.font = m.bulletFont
      ctx.fillStyle = ink
      if (it.logo) {
        // Centred on the first line, in the bullet's column.
        const size = m.bulletLh * 0.74
        ctx.drawImage(it.logo, PAD - size * 0.14, y + (m.bulletLh - size) / 2 - m.bulletLh * 0.06, size, size)
      } else {
        ctx.fillText('•', PAD, y)
      }
      ctx.fillStyle = BODY
      for (const ln of it.lines) {
        ctx.fillText(ln, PAD + m.indent, y)
        y += m.bulletLh
      }
      y += m.bulletGap
    }
  }
  return y
}

function headerFont(ctx: Ctx, size: number): Ctx {
  ctx.font = `900 ${size}px "Mulish Variable", system-ui, sans-serif`
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
  ctx.fillStyle = inkColor(accent)
  for (const ln of lines) {
    ctx.fillText(ln, PAD, y)
    y += size * 1.02
  }
  ctx.fillStyle = accent
  ctx.fillRect(PAD, y + 2, 64, 6)
  return y + 24
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
function buildHandSpread(s: PortfolioCardData, scale = 1): Spread {
  const left = canvas2d(scale)
  const right = canvas2d(scale)
  paper(left.ctx, s.accent)
  paper(right.ctx, s.accent)

  const yLeft = drawHeader(left.ctx, s.label, s.accent)
  const yRight = 52
  const leftCap = H - 46 - yLeft
  const rightCap = H - 46 - yRight

  // Try progressively smaller text until the groups split cleanly across the
  // two cards; shrinking beats clipping or orphaning half a role.
  let picked: { items: Item[]; m: Metrics; k: number } | null = null
  for (const scale of SCALES) {
    const m = metrics(scale)
    const items = buildItems(left.ctx, s.groups, m)
    let bestK = -1
    let bestScore = Infinity
    for (let k = 0; k <= items.length; k += 1) {
      // Only ever split BETWEEN whole groups so a heading and its bullets
      // always stay together on the same card.
      const boundary =
        k === 0 || k === items.length || items[k].kind === 'sub' || items[k].groupStart
      if (!boundary) continue
      const lh = itemsHeight(items, 0, k, m)
      const rh = itemsHeight(items, k, items.length, m)
      if (lh > leftCap || rh > rightCap) continue
      const score = Math.abs(lh - rh)
      if (score < bestScore) {
        bestScore = score
        bestK = k
      }
    }
    if (bestK >= 0) {
      picked = { items, m, k: bestK }
      break
    }
  }

  if (!picked) {
    // Even the smallest text won't split cleanly: fill the left card at that
    // size and overflow onto the right.
    const m = metrics(SCALES[SCALES.length - 1])
    const items = buildItems(left.ctx, s.groups, m)
    let acc = 0
    let k = 0
    for (let i = 0; i < items.length; i += 1) {
      const h = itemHeight(items[i], m)
      if (acc + h > leftCap) break
      acc += h
      k = i + 1
    }
    // Never end the left card on a heading — push it to the right card.
    while (k > 0 && items[k - 1].kind === 'sub') k -= 1
    picked = { items, m, k }
  }

  drawItems(left.ctx, picked.items, 0, picked.k, yLeft, s.accent, picked.m)
  drawItems(right.ctx, picked.items, picked.k, picked.items.length, yRight, s.accent, picked.m)
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
  const maxW = W - 32
  ctx.letterSpacing = '-1px'
  let size = 156
  let lines: string[] = []
  for (; size >= 52; size -= 3) {
    ctx.font = `900 ${size}px "Mulish Variable", system-ui, sans-serif`
    lines = wrapBig(ctx, tokens, maxW)
    const widest = Math.max(...lines.map((l) => ctx.measureText(l).width))
    if (widest <= maxW && lines.length * size * 1.02 <= H - 110) break
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

/** Community content (the card's reverse): header at top, then the grouped bullets. */
function drawCommunityContent(s: PortfolioCardData, scale = 1): HTMLCanvasElement {
  const { c, ctx } = canvas2d(scale)
  paper(ctx, s.accent)
  const y0 = drawHeader(ctx, s.label, s.accent)
  const { items, m } = fitItems(ctx, s.groups, H - 46 - y0)
  drawItems(ctx, items, 0, items.length, y0, s.accent, m)
  return c
}

/* ---------- About card: headshot on the left, bio on the right ---------- */

const ABOUT_PHOTO = { x: PAD - 6, y: 152, w: W - (PAD - 6) * 2, h: 468 }

function drawAboutLeft(s: PortfolioCardData, scale = 1): HTMLCanvasElement {
  const { c, ctx } = canvas2d(scale)
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

function drawAboutRight(s: PortfolioCardData, scale = 1): HTMLCanvasElement {
  const { c, ctx } = canvas2d(scale)
  paper(ctx, s.accent)
  const { items, m } = fitItems(ctx, s.groups, H - 46 - 60)
  drawItems(ctx, items, 0, items.length, 60, s.accent, m)
  return c
}

/**
 * Load public/about.jpeg into the reserved photo area, then notify (texture
 * update). The context keeps the canvas's scale, so the photo is drawn at the
 * canvas's full density.
 */
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
  /** Community cards only: the section content, printed on the card's reverse. */
  content?: THREE.Texture
}
let sharedBack: THREE.Texture | null = null
const cache = new Map<string, Faces>()
const updateListeners = new Set<() => void>()

/**
 * Subscribe to a card face changing after it was created (the About photo
 * arriving), so an on-demand canvas knows to redraw. Returns an unsubscribe.
 */
export function onCardFacesUpdated(listener: () => void): () => void {
  updateListeners.add(listener)
  return () => {
    updateListeners.delete(listener)
  }
}
const spreadCache = new Map<string, Spread>()

function notifyUpdated() {
  updateListeners.forEach((listener) => listener())
}

export function getSharedBack(): THREE.Texture {
  if (!sharedBack) sharedBack = toTex(drawCardBack())
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
        notifyUpdated()
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
    // The title is the face-up side on the board; the content is printed on
    // the reverse and revealed by turning the card over. It turns about its
    // vertical axis, which would read mirror-image, so the texture is flipped
    // horizontally to cancel that out.
    const content = toTex(drawCommunityContent(section))
    content.repeat.x = -1
    content.offset.x = 1
    faces = { front: toTex(drawCommunityCover(section)), back: getSharedBack(), content }
  }
  cache.set(key, faces)
  return faces
}

/* ---------- High-resolution reading faces ---------- */

const READING_SCALE = 2
/** Reading faces are 4x the memory of a table face, so only a few are kept. */
const READING_KEEP = 4
const readingFaces = new Map<string, THREE.Texture>() // oldest first
let readingSpread: { id: string; spread: Spread } | null = null

/**
 * The face a lifted card is read from, at twice the resolution. Table faces
 * are 512px wide -- plenty on the felt, but soft once a card fills half of a
 * high-density screen. Built when a card lands and kept for the last few cards
 * read; older ones are released.
 */
export function getReadingFace(section: PortfolioCardData, role: CardRole): THREE.Texture {
  const key = `${section.id}:${role}`
  const hit = readingFaces.get(key)
  if (hit) {
    readingFaces.delete(key)
    readingFaces.set(key, hit)
    return hit
  }

  let tex: THREE.Texture
  if (role === 'community') {
    tex = toTex(drawCommunityContent(section, READING_SCALE))
    tex.repeat.x = -1
    tex.offset.x = 1
  } else if (section.id === 'about') {
    if (role === 'label') {
      const canvas = drawAboutLeft(section, READING_SCALE)
      const photoTex = toTex(canvas)
      loadAboutPhoto(canvas, () => {
        photoTex.needsUpdate = true
        notifyUpdated()
      })
      tex = photoTex
    } else {
      tex = toTex(drawAboutRight(section, READING_SCALE))
    }
  } else {
    // A hand's two faces come from one layout pass, so keep the latest spread.
    if (readingSpread?.id !== section.id) {
      readingSpread = { id: section.id, spread: buildHandSpread(section, READING_SCALE) }
    }
    tex = toTex(role === 'label' ? readingSpread.spread.left : readingSpread.spread.right)
  }

  readingFaces.set(key, tex)
  while (readingFaces.size > READING_KEEP) {
    const [oldKey, old] = readingFaces.entries().next().value!
    readingFaces.delete(oldKey)
    old.dispose()
  }
  return tex
}
