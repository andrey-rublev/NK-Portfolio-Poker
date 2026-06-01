import * as THREE from 'three'

const W = 360
const H = 120

const cache = new Map<string, THREE.Texture>()

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

/** A billboarded nameplate: cream text on a dark translucent pill with an accent underline. */
export function createLabelTexture(text: string, accent: string): THREE.Texture {
  const key = `${text}|${accent}`
  const hit = cache.get(key)
  if (hit) return hit

  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!

  // Pill
  roundedRect(ctx, 8, 24, W - 16, H - 48, (H - 48) / 2)
  ctx.fillStyle = 'rgba(7, 17, 12, 0.82)'
  ctx.fill()
  ctx.lineWidth = 3
  ctx.strokeStyle = accent
  ctx.stroke()

  // Auto-fit text
  const label = text.toUpperCase()
  let size = 52
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  do {
    ctx.font = `700 ${size}px "Space Grotesk", system-ui, sans-serif`
    size -= 2
  } while (ctx.measureText(label).width > W - 56 && size > 18)

  ctx.fillStyle = '#fff4e0'
  ctx.shadowColor = 'rgba(0,0,0,0.6)'
  ctx.shadowBlur = 6
  ctx.fillText(label, W / 2, H / 2)

  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 8
  tex.needsUpdate = true
  cache.set(key, tex)
  return tex
}
