import * as THREE from 'three'

let cached: THREE.Texture | null = null

/** Procedural felt: a soft central light pool, darker rim, and fine woven speckle. */
export function createFeltTexture(): THREE.Texture {
  if (cached) return cached

  const S = 1024
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = S
  const ctx = canvas.getContext('2d')!

  // Base + radial shading (lamp pool in the middle)
  ctx.fillStyle = '#0a5e3d'
  ctx.fillRect(0, 0, S, S)
  const grad = ctx.createRadialGradient(S / 2, S / 2, S * 0.06, S / 2, S / 2, S * 0.62)
  grad.addColorStop(0, '#168f5d')
  grad.addColorStop(0.55, '#0c6b46')
  grad.addColorStop(1, '#05381f')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, S, S)

  // Fine woven speckle
  const dots = 24000
  for (let i = 0; i < dots; i += 1) {
    const x = Math.random() * S
    const y = Math.random() * S
    const light = Math.random() > 0.5
    ctx.fillStyle = light
      ? 'rgba(255,255,255,0.025)'
      : 'rgba(0,0,0,0.04)'
    ctx.fillRect(x, y, 1.5, 1.5)
  }

  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 8
  tex.needsUpdate = true
  cached = tex
  return tex
}
