import { useMemo } from 'react'
import * as THREE from 'three'
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { playerSpots } from './layout'

const SKINS = ['#e8b48c', '#c98e63', '#a9714a', '#d9a173', '#8d5a3a']
const SHIRTS = ['#2f6f57', '#2d4a78', '#7a3340', '#5c4a86', '#b07a2e']
const HAIRS = ['#241710', '#14110d', '#3a2418', '#0e0c0a', '#4a2f1c']
const PANTS = ['#2a2e35', '#1f2933', '#33302c', '#222428', '#2c2620']
const SHOES = '#1a1512'
const INK = '#1b130e' // eyes, frames
const LIPS = '#5a2a22'
const CHAIR_LEATHER = '#45191f'
const CHAIR_FRAME = '#22150d'

const pick = (arr: string[], v: number) => arr[Math.round(v * (arr.length - 1))]

/** Mix a colour toward black (amt < 0) or white (amt > 0). */
function shade(hex: string, amt: number): string {
  const target = new THREE.Color(amt < 0 ? 0x000000 : 0xffffff)
  return `#${new THREE.Color(hex).lerp(target, Math.abs(amt)).getHexString()}`
}

type Outfit = 'hoodie' | 'blazer' | 'sweater' | 'jacket' | 'polo'
type Hair = 'crop' | 'fringe' | 'curls' | 'bun' | 'long'
type Accessory = 'headphones' | 'glasses' | 'visor' | 'sunglasses' | 'cap'

/** One look per seat, in table order (About, Experience, Projects, Skills, Education). */
const LOOKS: { outfit: Outfit; hair: Hair; accessory: Accessory }[] = [
  { outfit: 'hoodie', hair: 'crop', accessory: 'headphones' },
  { outfit: 'blazer', hair: 'fringe', accessory: 'glasses' },
  { outfit: 'sweater', hair: 'curls', accessory: 'visor' },
  { outfit: 'jacket', hair: 'bun', accessory: 'sunglasses' },
  { outfit: 'polo', hair: 'long', accessory: 'cap' },
]

/**
 * Parts are merged by surface, not by player: clothing on the body catches
 * shadows, the rest of the clothing and hair only cast them, skin is a little
 * glossier, small hard details (eyes, lenses, shoes, zips) are glossy, and the
 * chair's leather and frame each get their own finish. Every part keeps its
 * own colour as a vertex colour.
 */
type Surface = 'body' | 'cloth' | 'skin' | 'gloss' | 'leather' | 'frame'
const SURFACES: Surface[] = ['body', 'cloth', 'skin', 'gloss', 'leather', 'frame']

type Vec3 = [number, number, number]

/** The floor (y = -3.7) in a figure's local units (placed at y -0.35, scaled 1.95). */
const FLOOR_Y = (-3.7 + 0.35) / 1.95

/** Torso silhouette (radius, height) revolved into one smooth piece: hips → waist → chest → shoulders → neck. */
const TORSO_PROFILE: [number, number][] = [
  [0.001, 0.3],
  [0.25, 0.3],
  [0.262, 0.4],
  [0.255, 0.55],
  [0.265, 0.72],
  [0.29, 0.9],
  [0.3, 1.02],
  [0.286, 1.1],
  [0.24, 1.17],
  [0.17, 1.22],
  [0.1, 1.25],
  [0.001, 1.26],
]
/** The torso is an oval: wider than it is deep. */
const TORSO_SCALE: Vec3 = [1.22, 1, 0.78]

/** Depth of the torso's front surface at height y, for placing details on it. */
function chestZ(y: number): number {
  for (let i = 1; i < TORSO_PROFILE.length; i += 1) {
    const [r0, y0] = TORSO_PROFILE[i - 1]
    const [r1, y1] = TORSO_PROFILE[i]
    if (y <= y1) return (r0 + ((y - y0) / (y1 - y0)) * (r1 - r0)) * TORSO_SCALE[2]
  }
  return 0
}

/**
 * All five seated players and their chairs, built as plain three.js parts and
 * merged into one mesh per surface -- six draws for the whole lot.
 */
function buildPlayers(): Record<Surface, THREE.BufferGeometry> {
  const parts: Record<Surface, THREE.BufferGeometry[]> = {
    body: [],
    cloth: [],
    skin: [],
    gloss: [],
    leather: [],
    frame: [],
  }
  const root = new THREE.Group()
  const meshes: { mesh: THREE.Mesh; surface: Surface; color: THREE.Color }[] = []

  const group = (parent: THREE.Object3D, position: Vec3, rotation: Vec3 = [0, 0, 0]) => {
    const g = new THREE.Group()
    g.position.set(...position)
    g.rotation.set(...rotation)
    parent.add(g)
    return g
  }
  const part = (
    parent: THREE.Object3D,
    geometry: THREE.BufferGeometry,
    color: string,
    surface: Surface,
    position: Vec3,
    rotation: Vec3 = [0, 0, 0],
    scale: Vec3 = [1, 1, 1],
  ) => {
    const mesh = new THREE.Mesh(geometry)
    mesh.position.set(...position)
    mesh.rotation.set(...rotation)
    mesh.scale.set(...scale)
    parent.add(mesh)
    meshes.push({ mesh, surface, color: new THREE.Color(color) })
  }
  const box = (w: number, h: number, d: number, r: number) => new RoundedBoxGeometry(w, h, d, 2, r)
  const sphere = (r: number, w = 16, h = 12) => new THREE.SphereGeometry(r, w, h)
  const capsule = (r: number, l: number) => new THREE.CapsuleGeometry(r, l, 6, 12)
  /** A half disc pointing +z: brims of caps and visors. */
  const brim = (r: number) => new THREE.CylinderGeometry(r, r, 0.014, 24, 1, false, -Math.PI / 2, Math.PI)

  playerSpots.forEach((spot, index) => {
    const look = LOOKS[index % LOOKS.length]
    const skin = pick(SKINS, spot.variant)
    const shirt = pick(SHIRTS, spot.variant)
    const hair = pick(HAIRS, spot.variant)
    const pants = pick(PANTS, spot.variant)
    const longSleeves = look.outfit !== 'polo'

    const fig = group(root, [spot.x, -0.35, spot.z], [0, spot.faceYaw, 0])
    fig.scale.setScalar(1.95)

    // --- Chair: a high-top casino chair (the table stands well above the
    // floor) -- padded seat and back, one post down to a round base, and a
    // footrest ring ---
    part(fig, box(0.74, 0.1, 0.64, 0.045), CHAIR_LEATHER, 'leather', [0, -0.01, 0])
    part(fig, box(0.8, 0.52, 0.11, 0.05), CHAIR_LEATHER, 'leather', [0, 0.44, -0.37], [-0.12, 0, 0])
    part(fig, box(0.78, 0.06, 0.66, 0.025), CHAIR_FRAME, 'frame', [0, -0.08, 0])
    for (const sx of [-1, 1]) {
      part(fig, new THREE.CylinderGeometry(0.022, 0.026, 0.34, 10), CHAIR_FRAME, 'frame', [sx * 0.31, 0.12, -0.35], [-0.12, 0, 0])
    }
    const postH = -0.1 - FLOOR_Y
    part(fig, new THREE.CylinderGeometry(0.045, 0.055, postH, 14), CHAIR_FRAME, 'frame', [0, -0.1 - postH / 2, 0])
    part(fig, new THREE.TorusGeometry(0.24, 0.02, 8, 32), CHAIR_FRAME, 'frame', [0, -0.78, 0], [Math.PI / 2, 0, 0])
    part(fig, new THREE.CylinderGeometry(0.3, 0.34, 0.05, 32), CHAIR_FRAME, 'frame', [0, FLOOR_Y + 0.025, 0])

    // --- Legs: hips and thighs on the seat, shins down to shoes on the footrest ---
    part(fig, new THREE.CylinderGeometry(0.3, 0.27, 0.32, 24), pants, 'body', [0, 0.2, -0.05], undefined, [1.18, 1, 0.82])
    for (const s of [-1, 1]) {
      part(fig, capsule(0.125, 0.42), pants, 'body', [s * 0.16, 0.12, 0.28], [Math.PI / 2.05, 0, 0])
      part(fig, capsule(0.1, 0.62), pants, 'body', [s * 0.155, -0.28, 0.38], [0.27, 0, 0])
      part(fig, box(0.14, 0.09, 0.26, 0.04), SHOES, 'gloss', [s * 0.15, -0.73, 0.32])
    }

    // --- Torso ---
    const torso = new THREE.LatheGeometry(
      TORSO_PROFILE.map(([r, y]) => new THREE.Vector2(r, y)),
      32,
    )
    part(fig, torso, shirt, 'body', [0, 0, 0], undefined, TORSO_SCALE)
    // Rounded shoulders where the arms meet the body.
    for (const s of [-1, 1]) part(fig, sphere(0.11), shirt, 'body', [s * 0.285, 1.07, 0.02])

    const z = (y: number, lift = 0.006) => chestZ(y) + lift
    switch (look.outfit) {
      case 'hoodie': {
        // Hood bunched behind the neck, drawstrings, and a kangaroo pocket.
        part(fig, sphere(0.2, 20, 12), shirt, 'body', [0, 1.2, -0.17], undefined, [1.15, 0.6, 0.7])
        for (const s of [-1, 1]) {
          part(fig, new THREE.CylinderGeometry(0.011, 0.011, 0.2, 6), '#ece6da', 'cloth', [s * 0.055, 1.07, z(1.07, 0.012)], [0.15, 0, 0])
        }
        part(fig, box(0.32, 0.14, 0.03, 0.012), shade(shirt, -0.18), 'body', [0, 0.56, z(0.56, 0.01)])
        part(fig, new THREE.TorusGeometry(0.115, 0.04, 10, 20), shirt, 'cloth', [0, 1.25, 0.05], [Math.PI / 2, 0, 0])
        break
      }
      case 'blazer': {
        // White shirt and tie in the V of the lapels, two buttons.
        part(fig, new THREE.CylinderGeometry(0.1, 0.1, 0.01, 3), '#f1ede4', 'body', [0, 1.06, z(1.06, 0.004)], [Math.PI / 2, 0, 0])
        part(fig, box(0.04, 0.24, 0.012, 0.006), '#7a1f2b', 'body', [0, 0.85, z(0.85, 0.008)])
        for (const s of [-1, 1]) {
          part(fig, box(0.04, 0.3, 0.014, 0.006), shade(shirt, -0.35), 'body', [s * 0.065, 1.0, z(1.0, 0.01)], [0, 0, s * 0.38])
        }
        for (const y of [0.74, 0.62]) part(fig, sphere(0.014, 8, 6), INK, 'gloss', [0, y, z(y, 0.012)])
        break
      }
      case 'sweater': {
        // Ribbed crew collar and a contrasting band knitted across the chest.
        part(fig, new THREE.TorusGeometry(0.12, 0.035, 10, 24), shade(shirt, -0.2), 'cloth', [0, 1.245, 0.04], [Math.PI / 2, 0, 0])
        part(fig, new THREE.CylinderGeometry(0.3, 0.3, 0.07, 40, 1, true), shade(shirt, 0.5), 'body', [0, 0.95, 0], undefined, TORSO_SCALE)
        break
      }
      case 'jacket': {
        // Stand-up collar and a zip down the front.
        part(fig, new THREE.CylinderGeometry(0.14, 0.16, 0.1, 24, 1, true), shade(shirt, -0.15), 'cloth', [0, 1.25, 0.03], undefined, [1.1, 1, 1])
        part(fig, box(0.014, 0.66, 0.01, 0.004), '#c9ccd1', 'gloss', [0, 0.72, z(0.72, 0.01)], [0.05, 0, 0])
        break
      }
      case 'polo': {
        // Collar flaps and a buttoned placket.
        for (const s of [-1, 1]) {
          part(fig, box(0.1, 0.05, 0.016, 0.008), shade(shirt, 0.25), 'cloth', [s * 0.06, 1.235, 0.16], [-0.35, 0, s * 0.5])
        }
        part(fig, box(0.04, 0.14, 0.01, 0.004), shade(shirt, -0.12), 'body', [0, 1.1, z(1.1, 0.006)])
        for (const y of [1.13, 1.07]) part(fig, sphere(0.011, 8, 6), '#ece6da', 'gloss', [0, y, z(y, 0.014)])
        part(fig, new THREE.TorusGeometry(0.115, 0.03, 10, 20), shirt, 'cloth', [0, 1.25, 0.05], [Math.PI / 2, 0, 0])
        break
      }
    }

    // --- Head ---
    part(fig, new THREE.CylinderGeometry(0.082, 0.1, 0.17, 16), skin, 'skin', [0, 1.31, 0.03])
    part(fig, new THREE.SphereGeometry(0.2, 32, 28), skin, 'skin', [0, 1.52, 0.05], undefined, [0.94, 1.12, 1])
    for (const s of [-1, 1]) {
      part(fig, sphere(0.05, 12, 10), skin, 'skin', [s * 0.19, 1.52, 0.03], undefined, [0.55, 1, 0.7])
    }
    // Face: eyes, brows, nose, and a small smile.
    for (const s of [-1, 1]) {
      part(fig, sphere(0.021, 10, 8), INK, 'gloss', [s * 0.068, 1.535, 0.235], undefined, [1, 1.25, 0.6])
      part(fig, capsule(0.011, 0.05), hair, 'cloth', [s * 0.07, 1.585, 0.226], [0, 0, Math.PI / 2 - s * 0.12])
    }
    part(fig, sphere(0.03, 12, 10), shade(skin, -0.05), 'skin', [0, 1.495, 0.252], undefined, [0.8, 1.1, 1])
    part(fig, new THREE.TorusGeometry(0.032, 0.008, 6, 12, Math.PI), LIPS, 'gloss', [0, 1.455, 0.232], [0, 0, Math.PI])

    // --- Hair: a cap set back off the forehead, plus a style per player ---
    part(
      fig,
      new THREE.SphereGeometry(0.21, 26, 20, 0, Math.PI * 2, 0, Math.PI * 0.56),
      hair,
      'cloth',
      [0, 1.565, 0.02],
      [-0.34, 0, 0],
      [1.03, 1.06, 1.1],
    )
    switch (look.hair) {
      case 'fringe':
        part(fig, sphere(0.1), hair, 'cloth', [0.05, 1.68, 0.14], [0.3, 0, -0.25], [1.5, 0.55, 0.85])
        break
      case 'bun':
        part(fig, sphere(0.085), hair, 'cloth', [0, 1.74, -0.13])
        break
      case 'long':
        part(fig, sphere(0.2, 22, 16), hair, 'cloth', [0, 1.47, -0.07], undefined, [1.06, 1.05, 0.88])
        break
      case 'curls':
        for (let i = 0; i < 6; i += 1) {
          const a = (i / 6) * Math.PI * 2
          part(fig, sphere(0.07, 12, 10), hair, 'cloth', [Math.cos(a) * 0.12, 1.72, Math.sin(a) * 0.1 - 0.02])
        }
        break
      case 'crop':
        break
    }

    // --- Accessory ---
    switch (look.accessory) {
      case 'headphones':
        part(fig, new THREE.TorusGeometry(0.215, 0.02, 8, 24, Math.PI), '#1d2026', 'gloss', [0, 1.53, 0.04], undefined, [1, 1.12, 1])
        for (const s of [-1, 1]) {
          part(fig, new THREE.CylinderGeometry(0.07, 0.07, 0.06, 20), '#1d2026', 'gloss', [s * 0.205, 1.52, 0.04], [0, 0, Math.PI / 2])
        }
        break
      case 'glasses':
      case 'sunglasses':
        for (const s of [-1, 1]) {
          if (look.accessory === 'glasses') {
            part(fig, new THREE.TorusGeometry(0.042, 0.008, 6, 20), INK, 'gloss', [s * 0.07, 1.538, 0.243])
          } else {
            part(fig, box(0.08, 0.052, 0.016, 0.014), '#0d0f12', 'gloss', [s * 0.07, 1.535, 0.244])
          }
          part(fig, new THREE.CylinderGeometry(0.006, 0.006, 0.17, 6), INK, 'gloss', [s * 0.125, 1.545, 0.16], [Math.PI / 2, 0, 0])
        }
        part(fig, new THREE.CylinderGeometry(0.007, 0.007, 0.05, 6), INK, 'gloss', [0, 1.548, 0.252], [0, 0, Math.PI / 2])
        break
      case 'visor':
        // The classic green dealer's visor: a headband and a brim.
        part(fig, new THREE.TorusGeometry(0.2, 0.016, 8, 32), '#1f5c3d', 'cloth', [0, 1.63, 0.04], [Math.PI / 2, 0, 0], [0.97, 1.05, 1])
        part(fig, brim(0.17), '#2f8a5a', 'cloth', [0, 1.63, 0.2], [0.28, 0, 0])
        break
      case 'cap':
        part(fig, new THREE.SphereGeometry(0.215, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), '#25344d', 'cloth', [0, 1.56, 0.04], undefined, [0.98, 0.95, 1.04])
        part(fig, brim(0.15), '#1c283c', 'cloth', [0, 1.585, 0.2], [0.12, 0, 0], [1, 1, 1.25])
        part(fig, sphere(0.02, 8, 6), '#1c283c', 'cloth', [0, 1.765, 0.04])
        break
    }

    // --- Arms: shoulder → (bent elbow) → forearm → hand resting on the table edge ---
    const forearmColor = longSleeves ? shirt : skin
    for (const side of [-1, 1]) {
      const arm = group(fig, [side * 0.3, 1.05, 0.04], [-0.5, 0, side * 0.12])
      part(arm, capsule(0.088, 0.34), shirt, 'cloth', [0, -0.22, 0])
      // the forearm bends further forward and down to the felt
      const fore = group(arm, [0, -0.45, 0], [-0.32, 0, 0])
      part(fore, sphere(0.085), shirt, 'cloth', [0, 0, 0])
      part(fore, capsule(0.075, 0.36), forearmColor, longSleeves ? 'cloth' : 'skin', [0, -0.2, 0])
      if (longSleeves) {
        part(fore, new THREE.TorusGeometry(0.072, 0.022, 8, 18), shade(shirt, -0.2), 'cloth', [0, -0.38, 0], [Math.PI / 2, 0, 0])
      }
      // the hand rests palm-down, fingers forward, thumb tucked inward
      part(fore, sphere(0.1, 16, 14), skin, 'skin', [0, -0.47, 0.06], [0.5, 0, 0], [1.05, 0.5, 1.5])
      part(fore, capsule(0.026, 0.06), skin, 'skin', [-side * 0.085, -0.45, 0.07], [0.5, 0, side * 0.7])
    }
  })

  root.updateMatrixWorld(true)
  for (const { mesh, surface, color } of meshes) {
    // Merging needs every part indexed; RoundedBoxGeometry comes without one.
    const g = (mesh.geometry.index ? mesh.geometry : mergeVertices(mesh.geometry)).applyMatrix4(mesh.matrixWorld)
    const colors = new Float32Array(g.getAttribute('position').count * 3)
    for (let i = 0; i < colors.length; i += 3) color.toArray(colors, i)
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    parts[surface].push(g)
  }

  const merged = {} as Record<Surface, THREE.BufferGeometry>
  for (const surface of SURFACES) {
    merged[surface] = mergeGeometries(parts[surface])
    parts[surface].forEach((g) => g.dispose())
  }
  return merged
}

/** One seated player in a chair just outside the rail behind each seat, facing the table. */
export function Players() {
  // Built once; the table is never unmounted, so it is kept for the page's life.
  const geometry = useMemo(() => buildPlayers(), [])

  return (
    <>
      <mesh geometry={geometry.body} castShadow receiveShadow>
        <meshStandardMaterial vertexColors roughness={0.86} />
      </mesh>
      <mesh geometry={geometry.cloth} castShadow>
        <meshStandardMaterial vertexColors roughness={0.82} />
      </mesh>
      <mesh geometry={geometry.skin} castShadow>
        <meshStandardMaterial vertexColors roughness={0.55} />
      </mesh>
      <mesh geometry={geometry.gloss} castShadow>
        <meshStandardMaterial vertexColors roughness={0.3} metalness={0.15} />
      </mesh>
      <mesh geometry={geometry.leather} castShadow receiveShadow>
        <meshStandardMaterial vertexColors roughness={0.42} />
      </mesh>
      <mesh geometry={geometry.frame} castShadow>
        <meshStandardMaterial vertexColors roughness={0.5} metalness={0.15} />
      </mesh>
    </>
  )
}
