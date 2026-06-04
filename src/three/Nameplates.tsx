import { useMemo } from 'react'
import * as THREE from 'three'
import { seatAnchors } from './layout'

const W = 420
const Ht = 132

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

function plateTexture(name: string, accent: string): THREE.Texture {
  const c = document.createElement('canvas')
  c.width = W
  c.height = Ht
  const ctx = c.getContext('2d')!
  const pad = 10
  const h = Ht - pad * 2

  // Brushed dark plate with a subtle vertical sheen
  const grad = ctx.createLinearGradient(0, pad, 0, pad + h)
  grad.addColorStop(0, '#22262b')
  grad.addColorStop(0.5, '#15181c')
  grad.addColorStop(1, '#0c0e11')
  roundedRect(ctx, pad, pad, W - pad * 2, h, h / 2)
  ctx.fillStyle = grad
  ctx.fill()
  // Accent ring + inner hairline
  ctx.lineWidth = 4
  ctx.strokeStyle = accent
  ctx.stroke()
  ctx.lineWidth = 1.5
  ctx.strokeStyle = 'rgba(255,255,255,0.18)'
  roundedRect(ctx, pad + 6, pad + 6, W - pad * 2 - 12, h - 12, (h - 12) / 2)
  ctx.stroke()

  // Accent dot on the left, like a dealer plaque
  ctx.fillStyle = accent
  ctx.beginPath()
  ctx.arc(pad + 34, Ht / 2, 9, 0, Math.PI * 2)
  ctx.fill()

  const label = name.toUpperCase()
  let size = 50
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  do {
    ctx.font = `800 ${size}px "Mulish", system-ui, sans-serif`
    size -= 2
  } while (ctx.measureText(label).width > W - 110 && size > 18)
  ctx.fillStyle = '#fff4e0'
  ctx.fillText(label, W / 2 + 14, Ht / 2 + 2)

  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 8
  tex.needsUpdate = true
  return tex
}

function Plate({ name, accent, x, z }: { name: string; accent: string; x: number; z: number }) {
  const tex = useMemo(() => plateTexture(name, accent), [name, accent])
  return (
    <sprite position={[x, 0.66, z]} scale={[1.62, 0.51, 1]}>
      <spriteMaterial map={tex} transparent depthWrite={false} />
    </sprite>
  )
}

/** A floating nameplate in front of each player showing that seat's section. */
export function Nameplates() {
  return (
    <>
      {seatAnchors.map((a) => (
        <Plate key={a.seatId} name={a.section.label} accent={a.section.accent} x={a.x} z={a.z} />
      ))}
    </>
  )
}
