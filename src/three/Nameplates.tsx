import { useMemo } from 'react'
import * as THREE from 'three'
import { seatAnchors } from './layout'

const W = 360
const Ht = 110

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

  roundedRect(ctx, 6, 24, W - 12, Ht - 48, (Ht - 48) / 2)
  ctx.fillStyle = 'rgba(10, 9, 8, 0.9)'
  ctx.fill()
  ctx.lineWidth = 3
  ctx.strokeStyle = accent
  ctx.stroke()

  const label = name.toUpperCase()
  let size = 46
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  do {
    ctx.font = `700 ${size}px "Space Grotesk", system-ui, sans-serif`
    size -= 2
  } while (ctx.measureText(label).width > W - 60 && size > 16)
  ctx.fillStyle = '#fff3df'
  ctx.fillText(label, W / 2, Ht / 2)

  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 8
  tex.needsUpdate = true
  return tex
}

function Plate({ name, accent, x, z }: { name: string; accent: string; x: number; z: number }) {
  const tex = useMemo(() => plateTexture(name, accent), [name, accent])
  return (
    <sprite position={[x, 0.5, z]} scale={[1.5, 0.46, 1]}>
      <spriteMaterial map={tex} transparent depthWrite={false} />
    </sprite>
  )
}

/** A nameplate in front of each player showing that seat's section. */
export function Nameplates() {
  return (
    <>
      {seatAnchors.map((a) => (
        <Plate
          key={a.seatId}
          name={a.section.label}
          accent={a.section.accent}
          x={a.x}
          z={a.z}
        />
      ))}
    </>
  )
}
