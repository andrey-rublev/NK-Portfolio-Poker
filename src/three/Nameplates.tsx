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

/** A small accent gem (diamond) used as an end-cap on the plaque. */
function gem(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, accent: string) {
  ctx.save()
  ctx.translate(x, y)
  ctx.fillStyle = accent
  ctx.beginPath()
  ctx.moveTo(0, -r)
  ctx.lineTo(r * 0.72, 0)
  ctx.lineTo(0, r)
  ctx.lineTo(-r * 0.72, 0)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = 'rgba(255,248,225,0.85)'
  ctx.lineWidth = 1.5
  ctx.stroke()
  ctx.restore()
}

/** An engraved brass plaque, like a name plate set into the rail. */
function plateTexture(name: string, accent: string): THREE.Texture {
  const c = document.createElement('canvas')
  c.width = W
  c.height = Ht
  const ctx = c.getContext('2d')!
  const pad = 9
  const h = Ht - pad * 2
  const r = 18

  // Brass body with a vertical sheen.
  const grad = ctx.createLinearGradient(0, pad, 0, pad + h)
  grad.addColorStop(0, '#eed496')
  grad.addColorStop(0.42, '#c89a44')
  grad.addColorStop(0.55, '#b98a3a')
  grad.addColorStop(1, '#7a5b25')
  roundedRect(ctx, pad, pad, W - pad * 2, h, r)
  ctx.fillStyle = grad
  ctx.fill()

  // Dark outer edge + bright inner bevel for a raised metal look.
  ctx.lineWidth = 4
  ctx.strokeStyle = 'rgba(54,38,12,0.85)'
  ctx.stroke()
  roundedRect(ctx, pad + 7, pad + 7, W - pad * 2 - 14, h - 14, r - 6)
  ctx.lineWidth = 2
  ctx.strokeStyle = 'rgba(255,247,214,0.55)'
  ctx.stroke()

  // Accent gems at each end.
  gem(ctx, pad + 30, Ht / 2, 12, accent)
  gem(ctx, W - pad - 30, Ht / 2, 12, accent)

  // Engraved label: a light lower copy + a dark top copy = incised look.
  const label = name.toUpperCase()
  let size = 52
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  do {
    ctx.font = `800 ${size}px "Mulish", system-ui, sans-serif`
    size -= 2
  } while (ctx.measureText(label).width > W - 130 && size > 18)
  ctx.fillStyle = 'rgba(255,248,222,0.5)'
  ctx.fillText(label, W / 2 + 1.5, Ht / 2 + 3.5)
  ctx.fillStyle = '#3a2b10'
  ctx.fillText(label, W / 2, Ht / 2 + 1)

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
