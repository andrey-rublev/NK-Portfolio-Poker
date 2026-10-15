import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js'
import { FLOOR } from './layout'
import { frameStep } from './frame'

/*
 * The casino floor around the table: a bank of slot machines behind the far
 * players, two poker and two blackjack tables with their dealers and players,
 * a lamp over each of those, and people strolling an aisle round the room.
 *
 * Everything that stands still is merged by finish into a handful of meshes;
 * the walkers are instanced, one mesh per body part. None of it casts shadows.
 */

type Vec3 = [number, number, number]

/** Everything in the room is dimmed by this, so the eye stays on the table. */
const ROOM_TINT = '#a8a8a8'

/** A small seeded random source, so the room is the same every visit. */
function seeded(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}
const pick = <T,>(rand: () => number, list: T[]) => list[Math.floor(rand() * list.length)]

const SKINS = ['#e8b48c', '#c98e63', '#a9714a', '#d9a173', '#8d5a3a', '#f0c7a0']
const HAIRS = ['#241710', '#14110d', '#3a2418', '#6b4a2b', '#b9a27e', '#8e8a85']
const SHIRTS = ['#2d4a78', '#7a3340', '#3f5a3a', '#d8cfbd', '#3a3a42', '#1f5f63', '#9b6b2c', '#5c4a86', '#e9e4da']
const PANTS = ['#1f242c', '#2a2e35', '#33302c', '#1a1c20', '#3b3f4a']

/* ------------------------------------------------------------------------ */
/* Building                                                                  */
/* ------------------------------------------------------------------------ */

/**
 * Parts are placed in a throwaway scene graph, then merged into one geometry
 * with each part's colour kept as a vertex colour.
 */
class Batch {
  /** Batches that share a root can place parts in each other's groups. */
  readonly root: THREE.Group
  constructor(root = new THREE.Group()) {
    this.root = root
  }
  private parts: { mesh: THREE.Mesh; color: THREE.Color }[] = []

  group(parent: THREE.Object3D, position: Vec3, yaw = 0, scale = 1): THREE.Group {
    const g = new THREE.Group()
    g.position.set(...position)
    g.rotation.y = yaw
    g.scale.setScalar(scale)
    parent.add(g)
    return g
  }

  add(
    parent: THREE.Object3D,
    geometry: THREE.BufferGeometry,
    color: string,
    position: Vec3,
    rotation: Vec3 = [0, 0, 0],
    scale: Vec3 = [1, 1, 1],
  ): THREE.Mesh {
    const mesh = new THREE.Mesh(geometry)
    mesh.position.set(...position)
    mesh.rotation.set(...rotation)
    mesh.scale.set(...scale)
    parent.add(mesh)
    this.parts.push({ mesh, color: new THREE.Color(color) })
    return mesh
  }

  /** A capsule from a to b (in parent units); its rounded ends make the joints. */
  limb(parent: THREE.Object3D, a: Vec3, b: Vec3, r: number, color: string) {
    const va = new THREE.Vector3(...a)
    const vb = new THREE.Vector3(...b)
    const mesh = this.add(parent, capsule(r, va.distanceTo(vb)), color, [
      (a[0] + b[0]) / 2,
      (a[1] + b[1]) / 2,
      (a[2] + b[2]) / 2,
    ])
    mesh.quaternion.setFromUnitVectors(UP, vb.sub(va).normalize())
  }

  /** Everything added so far as one geometry. `uv` is kept only when asked for. */
  build(keepUv = false): THREE.BufferGeometry {
    this.root.updateMatrixWorld(true)
    const geometries = this.parts.map(({ mesh, color }) => {
      let g = mesh.geometry.clone()
      if (!keepUv) g.deleteAttribute('uv')
      if (!g.index) g = mergeVertices(g)
      g.applyMatrix4(mesh.matrixWorld)
      const colors = new Float32Array(g.getAttribute('position').count * 3)
      for (let i = 0; i < colors.length; i += 3) color.toArray(colors, i)
      g.setAttribute('color', new THREE.BufferAttribute(colors, 3))
      return g
    })
    const merged = mergeGeometries(geometries)
    geometries.forEach((g) => g.dispose())
    return merged
  }
}

const UP = new THREE.Vector3(0, 1, 0)
const box = (w: number, h: number, d: number) => new THREE.BoxGeometry(w, h, d)
const cyl = (rt: number, rb: number, h: number, seg = 16) => new THREE.CylinderGeometry(rt, rb, h, seg)
const sphere = (r: number, w = 12, h = 10) => new THREE.SphereGeometry(r, w, h)
const capsule = (r: number, l: number) => new THREE.CapsuleGeometry(r, l, 4, 8)
/** The top of a sphere: a cap of hair. */
const cap = (r: number) => new THREE.SphereGeometry(r, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.55)

/** A closed ring along an ellipse (or an open arc of one) at height y. */
function ellipseTube(rx: number, rz: number, y: number, r: number, from = 0, to = Math.PI * 2) {
  const closed = to - from >= Math.PI * 2
  const pts: THREE.Vector3[] = []
  const n = closed ? 48 : 24
  for (let i = 0; i < n + (closed ? 0 : 1); i += 1) {
    const a = from + ((to - from) * i) / n
    pts.push(new THREE.Vector3(rx * Math.cos(a), y, rz * Math.sin(a)))
  }
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, closed), closed ? 96 : 48, r, 8, closed)
}

interface Look {
  skin: string
  hair: string
  shirt: string
  pants: string
}

function randomLook(rand: () => number): Look {
  return { skin: pick(rand, SKINS), hair: pick(rand, HAIRS), shirt: pick(rand, SHIRTS), pants: pick(rand, PANTS) }
}

/** Figures are built in the seated players' units (see Player) and scaled by this. */
const FIG = 1.95

/**
 * A seated figure on a stool, in figure units: seat top at y = 0, facing +z,
 * hands resting at `hand` (one each side of the middle).
 */
function seatedFigure(b: Batch, g: THREE.Group, look: Look, seatY: number, hand: [number, number], stool = true) {
  const floor = (FLOOR - seatY) / FIG
  if (stool) {
    b.add(g, cyl(0.34, 0.34, 0.08, 18), '#3a1418', [0, -0.04, 0])
    b.add(g, cyl(0.04, 0.05, -0.08 - floor, 10), '#1c130d', [0, (floor - 0.08) / 2, 0])
    b.add(g, cyl(0.24, 0.28, 0.04, 18), '#1c130d', [0, floor + 0.02, 0])
  }
  for (const s of [-1, 1]) {
    b.limb(g, [s * 0.15, 0.12, -0.02], [s * 0.15, 0.12, 0.4], 0.12, look.pants)
    b.limb(g, [s * 0.15, 0.1, 0.42], [s * 0.15, Math.max(floor + 0.1, -0.7), 0.5], 0.095, look.pants)
  }
  b.add(g, capsule(0.25, 0.52), look.shirt, [0, 0.7, 0], [0.06, 0, 0], [1.18, 1, 0.8])
  b.add(g, cyl(0.08, 0.09, 0.16, 10), look.skin, [0, 1.24, 0.02])
  b.add(g, sphere(0.19), look.skin, [0, 1.42, 0.04], undefined, [0.95, 1.1, 1])
  b.add(g, cap(0.2), look.hair, [0, 1.45, 0.01], [-0.3, 0, 0], [1, 1.05, 1.08])
  for (const s of [-1, 1]) {
    const shoulder: Vec3 = [s * 0.31, 1.06, 0.02]
    const elbow: Vec3 = [s * 0.36, 0.72, 0.26]
    const wrist: Vec3 = [s * 0.2, hand[0], hand[1]]
    b.limb(g, shoulder, elbow, 0.085, look.shirt)
    b.limb(g, elbow, wrist, 0.072, look.shirt)
    b.add(g, sphere(0.075, 10, 8), look.skin, [wrist[0] * 0.85, wrist[1], wrist[2] + 0.06], undefined, [1, 0.7, 1.3])
  }
}

/** A dealer standing behind a table, hands on the felt, in figure units (feet at y = 0). */
function dealer(b: Batch, g: THREE.Group, look: Look) {
  const top = -FLOOR / FIG // the felt, in figure units above the floor
  for (const s of [-1, 1]) b.add(g, capsule(0.1, top - 0.35), '#15161a', [s * 0.13, (top - 0.35) / 2 + 0.1, 0])
  b.add(g, capsule(0.25, 0.6), '#f1ede4', [0, top + 0.2, 0], undefined, [1.15, 1, 0.78])
  b.add(g, capsule(0.255, 0.42), '#17181c', [0, top + 0.12, 0.004], undefined, [1.17, 1, 0.8])
  b.add(g, box(0.05, 0.05, 0.02), '#7a1f2b', [0, top + 0.68, 0.2])
  b.add(g, sphere(0.19), look.skin, [0, top + 0.98, 0.02], undefined, [0.95, 1.1, 1])
  b.add(g, cap(0.2), look.hair, [0, top + 1.01, 0], [-0.3, 0, 0], [1, 1.05, 1.08])
  for (const s of [-1, 1]) {
    b.limb(g, [s * 0.31, top + 0.6, 0], [s * 0.36, top + 0.25, 0.2], 0.08, '#f1ede4')
    b.limb(g, [s * 0.36, top + 0.25, 0.2], [s * 0.2, top + 0.05, 0.5], 0.068, '#f1ede4')
  }
}

/** Where a player's hands rest on a table's rail, in figure units (height, reach). */
const RAIL_HANDS: [number, number] = [0.42, 0.62]

/** A pendant lamp: a cord, a dark shade, and its glowing underside (on the glow batch). */
function pendant(still: Batch, glow: Batch, x: number, z: number, y: number, w: number, d: number) {
  for (const s of [-1, 1]) still.add(still.root, cyl(0.025, 0.025, 8, 6), '#0d0b09', [x + s * w * 0.3, y + 4.4, z])
  still.add(still.root, box(w, 0.55, d), '#14301f', [x, y + 0.27, z])
  still.add(still.root, box(w + 0.12, 0.08, d + 0.12), '#b08a3e', [x, y, z])
  glow.add(glow.root, box(w - 0.2, 0.02, d - 0.2), '#ffe3ae', [x, y - 0.03, z])
}

/** One table's light falling on its felt and the carpet round it. */
interface Pool {
  x: number
  z: number
  y: number
  sx: number
  sz: number
  yaw: number
}

/** An oval poker table in play: felt, rail, players round it and a dealer. */
function pokerTable(still: Batch, glow: Batch, pools: Pool[], rand: () => number, x: number, z: number, yaw: number, felt: string) {
  const g = still.group(still.root, [x, 0, z], yaw)
  const rx = 4.6
  const rz = 3.05
  still.add(g, cyl(1, 1, 0.12, 48), felt, [0, -0.06, 0], undefined, [rx, 1, rz])
  still.add(g, ellipseTube(rx + 0.12, rz + 0.12, 0.12, 0.24), '#2c1a12', [0, 0, 0])
  still.add(g, cyl(1, 0.92, 0.8, 48), '#3b2216', [0, -0.5, 0], undefined, [rx + 0.1, 1, rz + 0.1])
  still.add(g, cyl(1.05, 1.5, -FLOOR - 0.9, 24), '#1d120b', [0, (FLOOR - 0.9) / 2, 0])
  // The board and the pot.
  for (let i = 0; i < 5; i += 1) still.add(g, box(0.62, 0.025, 0.88), '#efe6d2', [(i - 2) * 0.72, 0.013, -0.2])
  for (const [cx, cz, h, c] of [[0.9, 0.9, 0.25, '#b8232b'], [0.4, 1.05, 0.18, '#1d7446'], [-0.6, 0.95, 0.3, '#202227']] as const) {
    still.add(g, cyl(0.2, 0.2, h, 14), c, [cx, h / 2, cz])
  }
  // Players round the far side of the oval; the dealer at the near middle.
  const seats = [200, 245, 295, 340, 20, 160]
  for (const deg of seats) {
    const a = (deg * Math.PI) / 180
    const nx = Math.cos(a) / rx
    const nz = Math.sin(a) / rz
    const nl = Math.hypot(nx, nz)
    const px = rx * Math.cos(a) + (nx / nl) * 1.35
    const pz = rz * Math.sin(a) + (nz / nl) * 1.35
    if (rand() < 0.2) continue // an empty seat
    const fig = still.group(g, [px, -0.35, pz], Math.atan2(-nx, -nz), FIG)
    seatedFigure(still, fig, randomLook(rand), -0.35, RAIL_HANDS)
    // Their two cards.
    still.add(g, box(0.5, 0.02, 0.7), '#efe6d2', [px * 0.66, 0.012, pz * 0.66], [0, rand(), 0])
  }
  dealer(still, still.group(g, [0, FLOOR, rz + 0.95], Math.PI, FIG), randomLook(rand))
  pendant(still, glow, x, z, 7.5, 5.2, 2.0)
  pools.push({ x, z, y: 0.02, sx: rx * 2.3, sz: rz * 2.3, yaw }, { x, z, y: FLOOR + 0.02, sx: rx * 3.4, sz: rz * 3.4, yaw })
}

/** A half-moon blackjack table: dealer on the flat side, players round the curve. */
function blackjackTable(still: Batch, glow: Batch, pools: Pool[], rand: () => number, x: number, z: number, yaw: number, felt: string) {
  const g = still.group(still.root, [x, 0, z], yaw)
  const R = 3.5
  const half = (r: number, h: number, seg = 32) => new THREE.CylinderGeometry(r, r, h, seg, 1, false, -Math.PI / 2, Math.PI)
  still.add(g, half(R, 0.12), felt, [0, -0.06, 0])
  still.add(g, ellipseTube(R + 0.12, R + 0.12, 0.12, 0.24, 0, Math.PI), '#2c1a12', [0, 0, 0])
  still.add(g, box(2 * R + 0.5, 0.36, 0.3), '#2c1a12', [0, 0.06, -0.05])
  still.add(g, half(R + 0.1, 0.8), '#3b2216', [0, -0.5, 0])
  still.add(g, cyl(0.9, 1.3, -FLOOR - 0.9, 20), '#1d120b', [0, (FLOOR - 0.9) / 2, 0.8])
  // The dealer's chip tray and cards.
  still.add(g, box(2.2, 0.08, 0.6), '#151515', [0, 0.04, 0.55])
  for (const [i, c] of ['#b8232b', '#1d7446', '#202227', '#e9e4da', '#2d4a78'].entries()) {
    still.add(g, box(0.36, 0.1, 0.5), c, [(i - 2) * 0.42, 0.1, 0.55])
  }
  still.add(g, box(0.6, 0.03, 0.85), '#efe6d2', [0.2, 0.015, 1.4], [0, 0.2, 0])
  for (const deg of [25, 62, 98, 135, 165]) {
    const a = (deg * Math.PI) / 180
    const px = Math.cos(a) * (R + 1.3)
    const pz = Math.sin(a) * (R + 1.3)
    if (rand() < 0.25) continue
    const fig = still.group(g, [px, -0.35, pz], Math.atan2(-px, -pz), FIG)
    seatedFigure(still, fig, randomLook(rand), -0.35, RAIL_HANDS)
    still.add(g, box(0.5, 0.02, 0.7), '#efe6d2', [px * 0.62, 0.012, pz * 0.62], [0, a, 0])
  }
  dealer(still, still.group(g, [0, FLOOR, -0.75], 0, FIG), randomLook(rand))
  // Over the middle of the felt, which lies on the table's +z side.
  const mx = x + 1.2 * Math.sin(yaw)
  const mz = z + 1.2 * Math.cos(yaw)
  pendant(still, glow, mx, mz, 7.5, 4.4, 1.8)
  pools.push({ x: mx, z: mz, y: 0.02, sx: R * 2.2, sz: R * 2.2, yaw }, { x: mx, z: mz, y: FLOOR + 0.02, sx: R * 3.6, sz: R * 3.6, yaw })
}

const SLOT_THEMES = [
  { body: '#5a1220', light: '#ff4a6b' },
  { body: '#16244f', light: '#4ad2ff' },
  { body: '#3a1a55', light: '#c47bff' },
  { body: '#4a3510', light: '#ffc93b' },
]

/**
 * A slot machine facing +z: cabinet, a lit screen (on the screen batch, using
 * one quarter of the reel artwork), a lit topper and trim, and a stool.
 */
function slotMachine(still: Batch, glow: Batch, screens: Batch, g: THREE.Group, theme: number) {
  const t = SLOT_THEMES[theme]
  still.add(g, box(2.1, 2.9, 1.9), '#121214', [0, FLOOR + 1.45, 0])
  still.add(g, box(2.0, 0.2, 0.8), '#1d1d22', [0, FLOOR + 2.98, 0.6], [0.28, 0, 0])
  still.add(g, box(2.1, 2.5, 1.2), t.body, [0, FLOOR + 4.15, -0.35], [-0.1, 0, 0])
  // Buttons along the deck.
  for (let i = 0; i < 4; i += 1) glow.add(g, box(0.26, 0.06, 0.18), i === 3 ? '#ff5a3b' : '#ffe7a0', [(i - 1.5) * 0.42, FLOOR + 3.08, 0.66], [0.28, 0, 0])
  glow.add(g, box(2.16, 0.55, 1.1), t.light, [0, FLOOR + 5.7, -0.4])
  for (const s of [-1, 1]) glow.add(g, box(0.06, 2.4, 0.06), t.light, [s * 1.04, FLOOR + 4.15, 0.27], [-0.1, 0, 0])
  // The screen: a plane on the cabinet's front, mapped to its quarter of the art.
  const plane = new THREE.PlaneGeometry(1.7, 1.5)
  const uv = plane.getAttribute('uv')
  const u0 = (theme % 2) * 0.5
  const v0 = theme < 2 ? 0.5 : 0
  for (let i = 0; i < uv.count; i += 1) uv.setXY(i, u0 + uv.getX(i) * 0.5, v0 + uv.getY(i) * 0.5)
  screens.add(g, plane, '#ffffff', [0, FLOOR + 4.15, 0.265], [-0.1, 0, 0])
  // The stool in front.
  still.add(g, cyl(0.42, 0.42, 0.12, 18), '#3a1418', [0, FLOOR + 2.3, 1.75])
  still.add(g, cyl(0.05, 0.06, 2.2, 10), '#1c130d', [0, FLOOR + 1.15, 1.75])
  still.add(g, cyl(0.3, 0.34, 0.05, 18), '#1c130d', [0, FLOOR + 0.03, 1.75])
}

/** Reel artwork for four kinds of slot machine, one per quarter. */
function slotScreenTexture(): THREE.CanvasTexture {
  const S = 512
  const c = document.createElement('canvas')
  c.width = c.height = S
  const ctx = c.getContext('2d')!
  const themes = [
    { bg: ['#2a0710', '#7e1428'], ink: '#ffd25a', title: 'LUCKY 7' },
    { bg: ['#061a3a', '#0f4f8a'], ink: '#8ff0ff', title: 'DIAMONDS' },
    { bg: ['#1d0a33', '#5b2391'], ink: '#ffd25a', title: 'JACKPOT' },
    { bg: ['#2b1d05', '#8a5b0c'], ink: '#fff2b0', title: 'GOLD RUSH' },
  ]
  const symbol = (kind: number, x: number, y: number) => {
    ctx.save()
    ctx.translate(x, y)
    if (kind === 0) {
      ctx.fillStyle = '#d4202f'
      ctx.font = '900 40px "Mulish Variable", system-ui, sans-serif'
      ctx.fillText('7', 0, 2)
    } else if (kind === 1) {
      ctx.strokeStyle = '#2f8a3a'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(-8, 4)
      ctx.quadraticCurveTo(0, -18, 10, -16)
      ctx.moveTo(8, 6)
      ctx.quadraticCurveTo(6, -10, 10, -16)
      ctx.stroke()
      ctx.fillStyle = '#d4202f'
      for (const [cx, cy] of [[-8, 8], [8, 10]]) {
        ctx.beginPath()
        ctx.arc(cx, cy, 8, 0, Math.PI * 2)
        ctx.fill()
      }
    } else if (kind === 2) {
      ctx.fillStyle = '#111'
      ctx.fillRect(-24, -11, 48, 22)
      ctx.fillStyle = '#fff'
      ctx.font = '900 15px "Mulish Variable", system-ui, sans-serif'
      ctx.fillText('BAR', 0, 1)
    } else {
      ctx.fillStyle = '#2a8cff'
      ctx.beginPath()
      ctx.moveTo(0, -16)
      ctx.lineTo(15, -2)
      ctx.lineTo(0, 17)
      ctx.lineTo(-15, -2)
      ctx.closePath()
      ctx.fill()
    }
    ctx.restore()
  }
  themes.forEach((t, q) => {
    const x0 = (q % 2) * 256
    // Quarters 0 and 1 are the top of the canvas, which maps to v 0.5..1.
    const y0 = q < 2 ? 0 : 256
    const bg = ctx.createLinearGradient(0, y0, 0, y0 + 256)
    bg.addColorStop(0, t.bg[0])
    bg.addColorStop(1, t.bg[1])
    ctx.fillStyle = bg
    ctx.fillRect(x0, y0, 256, 256)
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = t.ink
    ctx.font = '900 30px "Mulish Variable", system-ui, sans-serif'
    ctx.fillText(t.title, x0 + 128, y0 + 34)
    for (let r = 0; r < 3; r += 1) {
      const rx = x0 + 22 + r * 74
      const reel = ctx.createLinearGradient(0, y0 + 64, 0, y0 + 196)
      reel.addColorStop(0, '#b9b4aa')
      reel.addColorStop(0.5, '#fbf8f0')
      reel.addColorStop(1, '#b9b4aa')
      ctx.fillStyle = reel
      ctx.fillRect(rx, y0 + 64, 64, 132)
      for (let k = 0; k < 3; k += 1) symbol((q + r * 2 + k) % 4, rx + 32, y0 + 88 + k * 42)
    }
    ctx.fillStyle = t.ink
    ctx.fillRect(x0 + 14, y0 + 128, 228, 4)
    ctx.font = '800 22px "Mulish Variable", system-ui, sans-serif'
    ctx.fillText('CREDITS 2500', x0 + 128, y0 + 224)
  })
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  return tex
}

/** A soft round fall-off, white in the middle: the shape of a pool of lamplight. */
function poolTexture(): THREE.CanvasTexture {
  const S = 128
  const c = document.createElement('canvas')
  c.width = c.height = S
  const ctx = c.getContext('2d')!
  const grad = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2)
  grad.addColorStop(0, 'rgba(255,255,255,1)')
  grad.addColorStop(0.45, 'rgba(255,255,255,0.55)')
  grad.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, S, S)
  return new THREE.CanvasTexture(c)
}

function buildRoom() {
  const rand = seeded(29)
  const root = new THREE.Group()
  const still = new Batch(root)
  const glow = new Batch(root)
  const screens = new Batch(root)
  const pools: Pool[] = []

  // Two banks of slot machines behind the far players, facing the table, with
  // a few people playing them. The gap between the banks stays dark, so the
  // player in the middle seat stands out against it.
  for (let i = 0; i < 6; i += 1) {
    const side = i < 3 ? -1 : 1
    const g = still.group(still.root, [side * (3.3 + (i % 3) * 2.45), 0, -13.4])
    slotMachine(still, glow, screens, g, i % SLOT_THEMES.length)
    // A stool's player sits facing the machine (-z), reaching for the deck.
    if (i === 1 || i === 3 || i === 5) {
      const seatY = FLOOR + 2.36
      const fig = still.group(g, [0, seatY, 1.8], Math.PI, FIG)
      seatedFigure(still, fig, randomLook(rand), seatY, [(FLOOR + 3.05 - seatY) / FIG, 0.55], false)
    }
  }
  for (const side of [-1, 1]) pools.push({ x: side * 5.75, z: -11.2, y: FLOOR + 0.02, sx: 9, sz: 5, yaw: 0 })

  pokerTable(still, glow, pools, rand, -20, -1, Math.PI / 2, '#1a5a8a')
  pokerTable(still, glow, pools, rand, 20, -1, -Math.PI / 2, '#16653f')
  blackjackTable(still, glow, pools, rand, -16.5, -15, 0, '#16653f')
  blackjackTable(still, glow, pools, rand, 16.5, -15, 0, '#7a1f2b')

  // Pools of light along the aisle, between the tables.
  for (const [x, z] of [[-11.5, -4], [11.5, -4], [-6, -9], [6, -9], [-11.5, 6], [11.5, 6]]) {
    pools.push({ x, z, y: FLOOR + 0.02, sx: 7, sz: 7, yaw: 0 })
  }

  const poolBatch = new Batch()
  for (const p of pools) {
    poolBatch.add(poolBatch.root, new THREE.PlaneGeometry(1, 1), '#ffffff', [p.x, p.y, p.z], [-Math.PI / 2, 0, p.yaw], [p.sx, p.sz, 1])
  }

  return { still: still.build(), glow: glow.build(), screens: screens.build(true), pools: poolBatch.build(true) }
}

/* ------------------------------------------------------------------------ */
/* Walkers                                                                   */
/* ------------------------------------------------------------------------ */

/** The aisle: a rounded rectangle round the table and its players. */
const AISLE = { halfX: 11.5, back: -8.6, front: 10.5, corner: 3.5 }
/** Two lanes either side of the aisle's middle, walked in opposite directions. */
const LANES = [
  { offset: -0.7, dir: 1, speed: 2.5 },
  { offset: 0.7, dir: -1, speed: 2.8 },
]
const WALKERS_PER_LANE = 4
/** Walkers' parts are built about 2.5 tall, in the seated players' units. */
const WALKER_SCALE = 1.95
/** World distance covered by one full stride (a step with each foot). */
const STRIDE = 4.2
const HIP: Vec3 = [0.13, 1.18, 0]
const SHOULDER: Vec3 = [0.31, 1.93, 0]

interface Lane {
  points: THREE.Vector2[]
  lengths: number[]
  total: number
}

/** The aisle's centre line pushed out by `offset`, as a closed polyline with arc lengths. */
function laneAt(offset: number): Lane {
  const { halfX, back, front, corner } = AISLE
  const r = corner + offset
  const cx = halfX - corner
  const corners: [number, number, number][] = [
    [cx, front - corner, 0],
    [-cx, front - corner, Math.PI / 2],
    [-cx, back + corner, Math.PI],
    [cx, back + corner, Math.PI * 1.5],
  ]
  const points: THREE.Vector2[] = []
  for (const [x, z, a0] of corners) {
    for (let i = 0; i <= 12; i += 1) {
      const a = a0 + (i / 12) * (Math.PI / 2)
      points.push(new THREE.Vector2(x + r * Math.cos(a), z + r * Math.sin(a)))
    }
  }
  points.push(points[0].clone())
  const lengths = [0]
  for (let i = 1; i < points.length; i += 1) lengths.push(lengths[i - 1] + points[i].distanceTo(points[i - 1]))
  return { points, lengths, total: lengths[lengths.length - 1] }
}

const _p = new THREE.Vector2()
/** Position and travel direction (a unit vector) at distance s along a lane. */
function along(lane: Lane, s: number, out: THREE.Vector2): THREE.Vector2 {
  const d = ((s % lane.total) + lane.total) % lane.total
  let i = 1
  while (lane.lengths[i] < d) i += 1
  const a = lane.points[i - 1]
  const b = lane.points[i]
  const t = (d - lane.lengths[i - 1]) / (lane.lengths[i] - lane.lengths[i - 1] || 1)
  out.subVectors(b, a).normalize()
  _p.copy(a).lerp(b, t)
  return _p
}

/** The body parts, each in walker units with its joint at the origin. */
function walkerGeometries() {
  const leg = new Batch()
  leg.add(leg.root, capsule(0.1, 1.0), '#ffffff', [0, -0.58, 0])
  leg.add(leg.root, box(0.15, 0.09, 0.28), '#262222', [0, -1.135, 0.05])
  const torso = new Batch()
  const profile: [number, number][] = [
    [0.001, 1.06], [0.24, 1.06], [0.25, 1.2], [0.24, 1.42], [0.27, 1.66],
    [0.28, 1.82], [0.25, 1.93], [0.16, 2.0], [0.08, 2.03], [0.001, 2.04],
  ]
  torso.add(torso.root, new THREE.LatheGeometry(profile.map(([x, y]) => new THREE.Vector2(x, y)), 16), '#ffffff', [0, 0, 0], undefined, [1.2, 1, 0.78])
  const head = new Batch()
  head.add(head.root, cyl(0.075, 0.085, 0.2, 10), '#ffffff', [0, 2.1, 0.01])
  head.add(head.root, sphere(0.19, 14, 12), '#ffffff', [0, 2.3, 0.03], undefined, [0.95, 1.1, 1])
  const hair = new Batch()
  hair.add(hair.root, cap(0.2), '#ffffff', [0, 2.33, 0], [-0.3, 0, 0], [1, 1.05, 1.08])
  const arm = new Batch()
  arm.add(arm.root, capsule(0.08, 0.72), '#ffffff', [0, -0.4, 0])
  const hand = new Batch()
  hand.add(hand.root, sphere(0.075, 10, 8), '#ffffff', [0, -0.86, 0.01], undefined, [0.9, 1.2, 0.9])
  return {
    leg: leg.build(),
    torso: torso.build(),
    head: head.build(),
    hair: hair.build(),
    arm: arm.build(),
    hand: hand.build(),
  }
}

type Part = 'leg' | 'torso' | 'head' | 'hair' | 'arm' | 'hand'
/** Each body part, and how many of it a walker has. */
const PARTS: [Part, number][] = [
  ['leg', 2],
  ['torso', 1],
  ['head', 1],
  ['hair', 1],
  ['arm', 2],
  ['hand', 2],
]

interface Walker {
  lane: number
  s0: number
  look: Look
}

const _m = new THREE.Matrix4()
const _base = new THREE.Matrix4()
const _joint = new THREE.Matrix4()
const _rot = new THREE.Matrix4()
const _dir = new THREE.Vector2()

/**
 * People strolling the aisle, two lanes in opposite directions. Each body part
 * is one instanced mesh for everyone, coloured per person; the limbs swing as
 * they walk. `still` holds them where they are (motion turned off).
 */
function Walkers({ still }: { still: boolean }) {
  const lanes = useMemo(() => LANES.map((l) => laneAt(l.offset)), [])
  const walkers = useMemo(() => {
    const rand = seeded(5)
    const out: Walker[] = []
    LANES.forEach((_, li) => {
      for (let k = 0; k < WALKERS_PER_LANE; k += 1) {
        // Spread round the lane, a little unevenly, so they don't march in step.
        out.push({ lane: li, s0: ((k + rand() * 0.4) / WALKERS_PER_LANE) * lanes[li].total, look: randomLook(rand) })
      }
    })
    return out
  }, [lanes])
  const geo = useMemo(() => walkerGeometries(), [])
  const meshes = useRef<Partial<Record<Part, THREE.InstancedMesh>>>({})
  const time = useRef(0)

  // Colours are set once: shirts, trousers, skin and hair per person.
  useLayoutEffect(() => {
    const m = meshes.current
    const c = new THREE.Color()
    walkers.forEach((w, i) => {
      for (const side of [0, 1]) {
        m.leg?.setColorAt(i * 2 + side, c.set(w.look.pants))
        m.arm?.setColorAt(i * 2 + side, c.set(w.look.shirt))
        m.hand?.setColorAt(i * 2 + side, c.set(w.look.skin))
      }
      m.torso?.setColorAt(i, c.set(w.look.shirt))
      m.head?.setColorAt(i, c.set(w.look.skin))
      m.hair?.setColorAt(i, c.set(w.look.hair))
    })
    for (const mesh of Object.values(m)) if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }, [walkers])

  useFrame((_, delta) => {
    const m = meshes.current
    if (!still) time.current += frameStep(delta)
    const t = time.current
    walkers.forEach((w, i) => {
      const lane = LANES[w.lane]
      const travelled = lane.speed * t
      const pos = along(lanes[w.lane], w.s0 + lane.dir * travelled, _dir)
      const yaw = Math.atan2(_dir.x * lane.dir, _dir.y * lane.dir)
      const phase = ((travelled + w.s0) / STRIDE) * Math.PI * 2
      const swing = Math.sin(phase) * 0.42
      const bob = 0.05 * Math.cos(phase * 2)
      _base.makeRotationY(yaw).setPosition(pos.x, FLOOR + bob, pos.y)
      _base.multiply(_m.makeScale(WALKER_SCALE, WALKER_SCALE, WALKER_SCALE))
      m.torso?.setMatrixAt(i, _base)
      m.head?.setMatrixAt(i, _base)
      m.hair?.setMatrixAt(i, _base)
      for (const side of [0, 1]) {
        const sx = side ? 1 : -1
        const legSwing = side ? swing : -swing
        _joint.copy(_base).multiply(_m.makeTranslation(sx * HIP[0], HIP[1], HIP[2])).multiply(_rot.makeRotationX(legSwing))
        m.leg?.setMatrixAt(i * 2 + side, _joint)
        // Arms swing against the legs, held a little out from the body.
        _joint
          .copy(_base)
          .multiply(_m.makeTranslation(sx * SHOULDER[0], SHOULDER[1], SHOULDER[2]))
          .multiply(_rot.makeRotationX(-legSwing * 0.7))
          .multiply(_m.makeRotationZ(sx * 0.06))
        m.arm?.setMatrixAt(i * 2 + side, _joint)
        m.hand?.setMatrixAt(i * 2 + side, _joint)
      }
    })
    for (const mesh of Object.values(m)) mesh.instanceMatrix.needsUpdate = true
  })

  const n = walkers.length
  return (
    <>
      {PARTS.map(([part, perWalker]) => (
        // Not frustum-culled: they move, which would leave a cached bounding
        // sphere stale.
        <instancedMesh
          key={part}
          ref={(mesh) => {
            if (mesh) meshes.current[part] = mesh
            else delete meshes.current[part]
          }}
          args={[geo[part], undefined, n * perWalker]}
          frustumCulled={false}
        >
          {/* Only the legs' vertex colours matter: their shoes are dark. */}
          <meshStandardMaterial color={ROOM_TINT} vertexColors={part === 'leg'} roughness={0.8} />
        </instancedMesh>
      ))}
    </>
  )
}

/* ------------------------------------------------------------------------ */

/**
 * The room round the table. While `animate` is on, frames are drawn at a
 * steady 30 a second so the walkers keep walking, a lifted card or not; it is
 * switched off while a dialog covers the table, which then costs nothing to
 * show. The walkers stand still altogether when motion is off.
 */
export function Casino({ animate, still }: { animate: boolean; still: boolean }) {
  const room = useMemo(() => buildRoom(), [])
  const screenTex = useMemo(() => slotScreenTexture(), [])
  const poolTex = useMemo(() => poolTexture(), [])
  const invalidate = useThree((s) => s.invalidate)

  useEffect(() => {
    if (!animate || still) return
    const id = window.setInterval(() => invalidate(), 1000 / 30)
    return () => window.clearInterval(id)
  }, [animate, still, invalidate])

  return (
    <>
      <mesh geometry={room.still}>
        <meshStandardMaterial color={ROOM_TINT} vertexColors roughness={0.75} />
      </mesh>
      <mesh geometry={room.glow}>
        <meshBasicMaterial vertexColors />
      </mesh>
      <mesh geometry={room.screens}>
        <meshBasicMaterial map={screenTex} />
      </mesh>
      <mesh geometry={room.pools} renderOrder={-1}>
        <meshBasicMaterial map={poolTex} color="#ffcf8f" transparent opacity={0.22} depthWrite={false} />
      </mesh>
      <Walkers still={still} />
    </>
  )
}
