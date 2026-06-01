import * as THREE from 'three'

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

function texture(canvas: HTMLCanvasElement, repeatX = 1) {
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 8
  if (repeatX !== 1) {
    tex.wrapS = THREE.RepeatWrapping
    tex.repeat.set(repeatX, 1)
  }
  tex.needsUpdate = true
  return tex
}

/** Top/bottom face: edge spots, rings, and a lighter inlay center. */
function faceCanvas(color: string) {
  const S = 256
  const c = document.createElement('canvas')
  c.width = c.height = S
  const ctx = c.getContext('2d')!
  const cx = S / 2
  const R = S / 2 - 2

  ctx.fillStyle = color
  ctx.beginPath()
  ctx.arc(cx, cx, R, 0, Math.PI * 2)
  ctx.fill()

  // Edge spots
  const spots = 8
  ctx.fillStyle = '#f5f1e8'
  for (let i = 0; i < spots; i += 1) {
    const a = (i / spots) * Math.PI * 2
    ctx.save()
    ctx.translate(cx, cx)
    ctx.rotate(a)
    ctx.fillRect(R - 46, -16, 40, 32)
    ctx.restore()
  }

  // Rings
  ctx.strokeStyle = lighten(color, 0.35)
  ctx.lineWidth = 4
  ctx.beginPath()
  ctx.arc(cx, cx, R - 54, 0, Math.PI * 2)
  ctx.stroke()

  // Inlay center
  ctx.fillStyle = lighten(color, 0.18)
  ctx.beginPath()
  ctx.arc(cx, cx, R * 0.5, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = darken(color, 0.25)
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.arc(cx, cx, R * 0.5, 0, Math.PI * 2)
  ctx.stroke()

  // Subtle highlight
  const grad = ctx.createRadialGradient(cx - 40, cx - 40, 10, cx, cx, R)
  grad.addColorStop(0, 'rgba(255,255,255,0.25)')
  grad.addColorStop(0.4, 'rgba(255,255,255,0)')
  ctx.fillStyle = grad
  ctx.beginPath()
  ctx.arc(cx, cx, R, 0, Math.PI * 2)
  ctx.fill()

  return c
}

/** Side: base colour with evenly spaced contrasting stripes (edge spots). */
function edgeCanvas(color: string) {
  const W = 256
  const H = 32
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const ctx = c.getContext('2d')!
  ctx.fillStyle = color
  ctx.fillRect(0, 0, W, H)
  ctx.fillStyle = '#f5f1e8'
  const stripes = 12
  const w = W / stripes
  for (let i = 0; i < stripes; i += 1) {
    ctx.fillRect(i * w + w * 0.34, 0, w * 0.32, H)
  }
  // top/bottom shading for a rounded look
  const grad = ctx.createLinearGradient(0, 0, 0, H)
  grad.addColorStop(0, 'rgba(255,255,255,0.18)')
  grad.addColorStop(0.5, 'rgba(0,0,0,0)')
  grad.addColorStop(1, 'rgba(0,0,0,0.28)')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, W, H)
  return c
}

const cache = new Map<string, { face: THREE.Texture; edge: THREE.Texture }>()

export function getChipTextures(color: string) {
  const hit = cache.get(color)
  if (hit) return hit
  const made = {
    face: texture(faceCanvas(color)),
    edge: texture(edgeCanvas(color), 1),
  }
  cache.set(color, made)
  return made
}
