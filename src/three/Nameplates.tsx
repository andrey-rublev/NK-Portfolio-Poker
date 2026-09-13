import { useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { COMPACT_VIEW, seatAnchors } from './layout'

/** Larger plates on phones so the seat labels stay readable from further away. */
const PLATE_SCALE = COMPACT_VIEW ? 1.32 : 1

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

/**
 * Plate textures are built once and kept. The plates unmount whenever a card
 * is focused, so without this every release rebuilt five canvas textures and
 * abandoned the previous five on the GPU -- a leak that grew with every card
 * the visitor opened.
 */
const plateCache = new Map<string, THREE.Texture>()

function getPlateTexture(name: string, accent: string): THREE.Texture {
  const key = `${name}|${accent}`
  let tex = plateCache.get(key)
  if (!tex) {
    tex = plateTexture(name, accent)
    plateCache.set(key, tex)
  }
  return tex
}

const BASE_W = 1.62 * PLATE_SCALE
const BASE_H = 0.51 * PLATE_SCALE

interface PlateProps {
  name: string
  accent: string
  x: number
  z: number
  /** Nameplates only answer to clicks once the hand has actually been dealt. */
  interactive: boolean
  onSelect: () => void
}

function Plate({ name, accent, x, z, interactive, onSelect }: PlateProps) {
  const tex = useMemo(() => getPlateTexture(name, accent), [name, accent])
  const ref = useRef<THREE.Sprite>(null)
  const [hovered, setHovered] = useState(false)
  const grow = useRef(0)

  // Ease toward the hovered size rather than snapping, matching the easing
  // used elsewhere in the scene (frame-rate independent).
  useFrame((_, dt) => {
    const sprite = ref.current
    if (!sprite) return
    const want = hovered && interactive ? 1 : 0
    grow.current = THREE.MathUtils.lerp(grow.current, want, 1 - Math.exp(-14 * dt))
    const s = 1 + grow.current * 0.1
    sprite.scale.set(BASE_W * s, BASE_H * s, 1)
    sprite.position.y = 0.8 + grow.current * 0.05
  })

  // depthTest off (+ a high renderOrder) so the label always draws above the
  // table, rail, players' hands, and resting cards.
  // Hover is tracked even while the plate is inert, so a plate that becomes
  // inert under a resting pointer (a card was just lifted) settles back down
  // instead of staying enlarged once it is interactive again.
  return (
    <sprite
      ref={ref}
      position={[x, 0.8, z]}
      scale={[BASE_W, BASE_H, 1]}
      renderOrder={5}
      onClick={
        interactive
          ? (e) => {
              e.stopPropagation()
              onSelect()
            }
          : undefined
      }
      onPointerOver={(e) => {
        setHovered(true)
        if (!interactive) return
        e.stopPropagation()
        document.body.style.cursor = 'pointer'
      }}
      onPointerOut={() => {
        setHovered(false)
        document.body.style.cursor = ''
      }}
    >
      <spriteMaterial map={tex} transparent depthWrite={false} depthTest={false} />
    </sprite>
  )
}

/**
 * A floating nameplate in front of each player showing that seat's section.
 * Clicking one lifts that seat's hand, so the labels double as the scene's
 * navigation. The plates stay up while a card is lifted; the lifted card is
 * ordered to draw after them, so it covers them (see Card3D).
 */
export function Nameplates({
  interactive,
  onSelect,
}: {
  interactive: boolean
  onSelect: (seatId: string) => void
}) {
  return (
    <>
      {seatAnchors.map((a) => (
        <Plate
          key={a.seatId}
          name={a.section.label}
          accent={a.section.accent}
          x={a.x}
          z={a.z}
          interactive={interactive}
          onSelect={() => onSelect(a.seatId)}
        />
      ))}
    </>
  )
}
