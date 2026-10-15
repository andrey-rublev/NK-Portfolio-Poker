import * as THREE from 'three'

/** Edge spots round each chip. Its rim and faces line up on these angles (see Chips). */
export const CHIP_SPOTS = 6
/** Each spot's width, as a share of the way round the chip. */
const SPOT_SHARE = 0.06
const SPOT = '#f3eee2'

function mix(hex: string, target: number, amt: number) {
  const n = parseInt(hex.slice(1), 16)
  const r = (n >> 16) & 255
  const g = (n >> 8) & 255
  const b = n & 255
  const m = (c: number) => Math.round(c + (target - c) * amt)
  return `rgb(${m(r)}, ${m(g)}, ${m(b)})`
}
const lighten = (hex: string, amt: number) => mix(hex, 255, amt)
const darken = (hex: string, amt: number) => mix(hex, 0, amt)

function texture(canvas: HTMLCanvasElement) {
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 8
  tex.wrapS = THREE.RepeatWrapping
  tex.needsUpdate = true
  return tex
}

/** A faint mottle, like pressed clay. */
function grain(ctx: CanvasRenderingContext2D, w: number, h: number, count: number) {
  let s = 12345
  const rand = () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
  for (let i = 0; i < count; i += 1) {
    ctx.fillStyle = rand() > 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.07)'
    ctx.fillRect(rand() * w, rand() * h, 2, 2)
  }
}

/**
 * The face: clay in the chip's colour with the edge spots running in from the
 * rim, a moulded ring, and a cream inlay printed with the denomination. The
 * texture's full radius is the chip's full radius.
 */
function faceCanvas(color: string, value: string) {
  const S = 512
  const c = document.createElement('canvas')
  c.width = c.height = S
  const ctx = c.getContext('2d')!
  const cx = S / 2
  const R = S / 2

  ctx.fillStyle = color
  ctx.fillRect(0, 0, S, S)
  grain(ctx, S, S, 9000)

  // Edge spots, at the angles the rim's spots meet the face (see Chips).
  const spotW = SPOT_SHARE * 2 * Math.PI * R
  ctx.fillStyle = SPOT
  for (let k = 0; k < CHIP_SPOTS; k += 1) {
    ctx.save()
    ctx.translate(cx, cx)
    ctx.rotate(Math.PI / 2 - (k / CHIP_SPOTS) * Math.PI * 2)
    ctx.fillRect(R * 0.78, -spotW / 2, R * 0.3, spotW)
    ctx.restore()
  }

  // A moulded ring just inside the spots.
  ctx.strokeStyle = darken(color, 0.28)
  ctx.lineWidth = 5
  ctx.beginPath()
  ctx.arc(cx, cx, R * 0.74, 0, Math.PI * 2)
  ctx.stroke()
  ctx.strokeStyle = lighten(color, 0.22)
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(cx, cx, R * 0.7, 0, Math.PI * 2)
  ctx.stroke()

  // The inlay.
  const inlay = ctx.createRadialGradient(cx - R * 0.15, cx - R * 0.2, R * 0.05, cx, cx, R * 0.58)
  inlay.addColorStop(0, '#fffaf0')
  inlay.addColorStop(1, '#e6dcc7')
  ctx.fillStyle = inlay
  ctx.beginPath()
  ctx.arc(cx, cx, R * 0.56, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = color
  ctx.lineWidth = 7
  ctx.beginPath()
  ctx.arc(cx, cx, R * 0.48, 0, Math.PI * 2)
  ctx.stroke()

  ctx.fillStyle = color
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = `900 ${value.length > 2 ? 88 : 112}px "Mulish Variable", system-ui, sans-serif`
  ctx.fillText(value, cx, cx + 6)
  return c
}

/**
 * The rim, wrapped round the chip and over both rounded edges: clay with the
 * edge spots, each a cream block with two thin bars of the chip's colour.
 */
function edgeCanvas(color: string) {
  const W = 512
  const H = 64
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const ctx = c.getContext('2d')!
  ctx.fillStyle = color
  ctx.fillRect(0, 0, W, H)
  grain(ctx, W, H, 1500)

  const w = SPOT_SHARE * W
  for (let k = 0; k <= CHIP_SPOTS; k += 1) {
    // Spot k is centred on u = k / CHIP_SPOTS; the last repeats the first
    // across the seam.
    const x = (k / CHIP_SPOTS) * W - w / 2
    ctx.fillStyle = SPOT
    ctx.fillRect(x, 0, w, H)
    ctx.fillStyle = color
    ctx.fillRect(x + w * 0.3, H * 0.3, w * 0.1, H * 0.4)
    ctx.fillRect(x + w * 0.6, H * 0.3, w * 0.1, H * 0.4)
  }
  return c
}

const cache = new Map<string, { face: THREE.Texture; edge: THREE.Texture }>()

export function getChipTextures(color: string, value: string) {
  const key = `${color}/${value}`
  const hit = cache.get(key)
  if (hit) return hit
  const made = { face: texture(faceCanvas(color, value)), edge: texture(edgeCanvas(color)) }
  cache.set(key, made)
  return made
}
