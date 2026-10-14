import * as THREE from 'three'

/** A seeded random source, so the procedural textures are the same every visit. */
function seeded(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

function toTexture(canvas: HTMLCanvasElement, repeatU = 1): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.wrapS = THREE.RepeatWrapping
  tex.repeat.set(repeatU, 1)
  tex.anisotropy = 8
  return tex
}

let wood: THREE.CanvasTexture | null = null

/**
 * Lacquered dark wood, grain running along u (the length of the racetrack
 * band and around the skirt). Tiles seamlessly in u.
 */
export function getWoodTexture(): THREE.CanvasTexture {
  if (wood) return wood
  const W = 1024
  const H = 128
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const ctx = c.getContext('2d')!
  const rand = seeded(7)

  const base = ctx.createLinearGradient(0, 0, 0, H)
  base.addColorStop(0, '#5b3119')
  base.addColorStop(0.5, '#6a3a1e')
  base.addColorStop(1, '#4e2914')
  ctx.fillStyle = base
  ctx.fillRect(0, 0, W, H)

  // Grain: long, gently wavy strands. Each wave completes whole periods across
  // the width so the texture still tiles.
  for (let i = 0; i < 110; i += 1) {
    const y0 = rand() * H
    const amp = 1 + rand() * 4
    const waves = 1 + Math.floor(rand() * 3)
    const phase = rand() * Math.PI * 2
    const dark = rand() > 0.35
    ctx.strokeStyle = dark ? `rgba(30, 12, 4, ${0.12 + rand() * 0.22})` : `rgba(190, 120, 70, ${0.05 + rand() * 0.1})`
    ctx.lineWidth = 0.6 + rand() * 1.8
    ctx.beginPath()
    for (let x = 0; x <= W; x += 8) {
      const y = y0 + Math.sin((x / W) * Math.PI * 2 * waves + phase) * amp
      if (x === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.stroke()
  }

  wood = toTexture(c)
  return wood
}

/** Where the rail's stitch lines run, as fractions of the rail profile (see PokerTable). */
export const RAIL_STITCHES = [0.31, 0.47]

let leather: THREE.CanvasTexture | null = null

/**
 * Dark padded leather for the rail: a fine pebble grain and two rows of cream
 * stitching along its top. u runs around the table, v across the profile.
 */
export function getLeatherTexture(): THREE.CanvasTexture {
  if (leather) return leather
  const W = 1024
  const H = 256
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const ctx = c.getContext('2d')!
  const rand = seeded(11)

  ctx.fillStyle = '#4b2c1c'
  ctx.fillRect(0, 0, W, H)

  // Pebble grain.
  for (let i = 0; i < 26000; i += 1) {
    const light = rand() > 0.5
    ctx.fillStyle = light ? 'rgba(255, 220, 190, 0.035)' : 'rgba(0, 0, 0, 0.08)'
    ctx.fillRect(rand() * W, rand() * H, 1.5, 1.5)
  }

  // Stitching: short angled dashes with a dark thread hole either side.
  for (const v of RAIL_STITCHES) {
    // Canvas textures are flipped on upload: canvas row y is v = 1 - y / H.
    const y = (1 - v) * H
    for (let x = 0; x < W; x += 14) {
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)'
      ctx.lineWidth = 3.2
      ctx.beginPath()
      ctx.moveTo(x + 1, y + 1)
      ctx.lineTo(x + 9, y - 0.5)
      ctx.stroke()
      ctx.strokeStyle = 'rgba(232, 214, 182, 0.85)'
      ctx.lineWidth = 1.8
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.lineTo(x + 8, y - 1.5)
      ctx.stroke()
    }
  }

  leather = toTexture(c)
  return leather
}
