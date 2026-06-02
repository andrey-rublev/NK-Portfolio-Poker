import * as THREE from 'three'

let cached: THREE.Texture | null = null

/** A dark patterned casino-carpet floor texture (tiles via repeat wrapping). */
export function createFloorTexture(): THREE.Texture {
  if (cached) return cached
  const S = 256
  const c = document.createElement('canvas')
  c.width = c.height = S
  const ctx = c.getContext('2d')!

  ctx.fillStyle = '#241019'
  ctx.fillRect(0, 0, S, S)

  // Diamond lattice
  ctx.strokeStyle = 'rgba(120, 40, 60, 0.4)'
  ctx.lineWidth = 2
  for (let i = -S; i < S * 2; i += 40) {
    ctx.beginPath()
    ctx.moveTo(i, 0)
    ctx.lineTo(i + S, S)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(i + S, 0)
    ctx.lineTo(i, S)
    ctx.stroke()
  }
  // Speckle for texture
  for (let i = 0; i < 1600; i += 1) {
    ctx.fillStyle =
      Math.random() > 0.5 ? 'rgba(255,200,160,0.04)' : 'rgba(0,0,0,0.10)'
    ctx.fillRect(Math.random() * S, Math.random() * S, 2, 2)
  }

  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(10, 10)
  tex.needsUpdate = true
  cached = tex
  return tex
}
