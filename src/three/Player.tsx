import { useMemo } from 'react'
import * as THREE from 'three'
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { playerSpots } from './layout'

const SKINS = ['#e8b48c', '#c98e63', '#a9714a', '#d9a173', '#8d5a3a']
const SHIRTS = ['#2f6f57', '#2d4a78', '#7a3340', '#5c4a86', '#b07a2e']
const HAIRS = ['#241710', '#14110d', '#3a2418', '#0e0c0a', '#4a2f1c']
const PANTS = ['#2a2e35', '#1f2933', '#33302c', '#222428', '#2c2620']
const EYES = '#1b130e'
const CHAIR_LEATHER = '#45191f'
const CHAIR_FRAME = '#22150d'

const pick = (arr: string[], v: number) => arr[Math.round(v * (arr.length - 1))]

/**
 * Parts are merged by surface, not by player: the torso, lap and chair
 * cushions catch shadows, the rest of the clothing and hair only cast them,
 * skin is a little glossier, and the chair's leather and wooden frame each get
 * their own finish. Each part keeps its own colour as a vertex colour.
 */
type Surface = 'body' | 'cloth' | 'skin' | 'leather' | 'frame'
const SURFACES: Surface[] = ['body', 'cloth', 'skin', 'leather', 'frame']

type Vec3 = [number, number, number]

/** The floor (y = -3.7) in a figure's local units (placed at y -0.35, scaled 1.95). */
const FLOOR_Y = (-3.7 + 0.35) / 1.95

/**
 * All five seated players and their chairs, built as plain three.js parts and
 * merged into one mesh per surface -- five draws for the whole lot.
 */
function buildPlayers(): Record<Surface, THREE.BufferGeometry> {
  const parts: Record<Surface, THREE.BufferGeometry[]> = { body: [], cloth: [], skin: [], leather: [], frame: [] }
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

  playerSpots.forEach((spot, index) => {
    const skin = pick(SKINS, spot.variant)
    const shirt = pick(SHIRTS, spot.variant)
    const hair = pick(HAIRS, spot.variant)
    const pants = pick(PANTS, spot.variant)

    const fig = group(root, [spot.x, -0.35, spot.z], [0, spot.faceYaw, 0])
    fig.scale.setScalar(1.95)

    // --- Chair: a high-top casino chair (the table stands well above the
    // floor) -- padded seat and back, one post down to a round base, and a
    // footrest ring ---
    part(fig, new RoundedBoxGeometry(0.74, 0.1, 0.64, 3, 0.045), CHAIR_LEATHER, 'leather', [0, -0.01, 0.0])
    part(fig, new RoundedBoxGeometry(0.8, 0.52, 0.11, 3, 0.05), CHAIR_LEATHER, 'leather', [0, 0.44, -0.37], [-0.12, 0, 0])
    part(fig, new RoundedBoxGeometry(0.78, 0.06, 0.66, 2, 0.025), CHAIR_FRAME, 'frame', [0, -0.08, 0.0])
    for (const sx of [-1, 1]) {
      // back posts, from the seat frame up into the backrest
      part(fig, new THREE.CylinderGeometry(0.022, 0.026, 0.34, 10), CHAIR_FRAME, 'frame', [sx * 0.31, 0.12, -0.35], [-0.12, 0, 0])
    }
    const postH = -0.1 - FLOOR_Y
    part(fig, new THREE.CylinderGeometry(0.045, 0.055, postH, 14), CHAIR_FRAME, 'frame', [0, -0.1 - postH / 2, 0])
    part(fig, new THREE.TorusGeometry(0.24, 0.02, 8, 32), CHAIR_FRAME, 'frame', [0, -0.78, 0], [Math.PI / 2, 0, 0])
    part(fig, new THREE.CylinderGeometry(0.3, 0.34, 0.05, 32), CHAIR_FRAME, 'frame', [0, FLOOR_Y + 0.025, 0])

    // --- Body ---
    // Seat / hips (also an oval)
    part(fig, new THREE.CylinderGeometry(0.3, 0.27, 0.32, 24), pants, 'body', [0, 0.2, -0.05], undefined, [1.18, 1, 0.82])
    // Thighs reaching forward under the table (the seated lap)
    for (const s of [-1, 1]) {
      part(fig, new THREE.CapsuleGeometry(0.125, 0.42, 6, 12), pants, 'body', [s * 0.16, 0.12, 0.28], [Math.PI / 2.05, 0, 0])
    }
    // Torso as an OVAL cylinder (wider than deep): waist → chest
    part(fig, new THREE.CylinderGeometry(0.27, 0.25, 0.42, 28), shirt, 'body', [0, 0.52, -0.01], undefined, [1.22, 1, 0.78])
    part(fig, new THREE.CylinderGeometry(0.3, 0.27, 0.42, 28), shirt, 'body', [0, 0.9, 0.01], [0.06, 0, 0], [1.22, 1, 0.78])
    // Sloped shoulders + collar
    part(fig, new THREE.CapsuleGeometry(0.14, 0.46, 6, 16), shirt, 'cloth', [0, 1.16, 0.02], [0, 0, Math.PI / 2])
    part(fig, new THREE.TorusGeometry(0.115, 0.034, 10, 20), shirt, 'cloth', [0, 1.25, 0.05], [Math.PI / 2, 0, 0])
    // Neck and head
    part(fig, new THREE.CylinderGeometry(0.082, 0.1, 0.17, 16), skin, 'skin', [0, 1.31, 0.03])
    part(fig, new THREE.SphereGeometry(0.2, 30, 30), skin, 'skin', [0, 1.52, 0.05], undefined, [0.94, 1.12, 1])
    // Ears
    for (const s of [-1, 1]) {
      part(fig, new THREE.SphereGeometry(0.05, 12, 12), skin, 'skin', [s * 0.19, 1.52, 0.03], undefined, [0.55, 1, 0.7])
    }
    // Eyes: two small dots, enough to give each face a direction.
    for (const s of [-1, 1]) {
      part(fig, new THREE.SphereGeometry(0.021, 10, 8), EYES, 'cloth', [s * 0.068, 1.535, 0.235], undefined, [1, 1.25, 0.6])
    }

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
    switch (index % 5) {
      case 0: // swept fringe
        part(fig, new THREE.SphereGeometry(0.1, 16, 12), hair, 'cloth', [0.05, 1.68, 0.14], [0.3, 0, -0.25], [1.5, 0.55, 0.85])
        break
      case 1: // bun
        part(fig, new THREE.SphereGeometry(0.085, 16, 12), hair, 'cloth', [0, 1.74, -0.13])
        break
      case 2: // longer at the back
        part(fig, new THREE.SphereGeometry(0.2, 22, 16), hair, 'cloth', [0, 1.47, -0.07], undefined, [1.06, 1.05, 0.88])
        break
      case 3: // curls
        for (let i = 0; i < 6; i += 1) {
          const a = (i / 6) * Math.PI * 2
          part(fig, new THREE.SphereGeometry(0.07, 12, 10), hair, 'cloth', [Math.cos(a) * 0.12, 1.72, Math.sin(a) * 0.1 - 0.02])
        }
        break
      default: // close crop: the cap alone
        break
    }

    // --- Arms: shoulder → (bent elbow) → forearm → hand resting on the table edge ---
    for (const side of [-1, 1]) {
      const arm = group(fig, [side * 0.3, 1.05, 0.04], [-0.5, 0, side * 0.12])
      part(arm, new THREE.CapsuleGeometry(0.088, 0.34, 8, 14), shirt, 'cloth', [0, -0.22, 0])
      // the forearm bends further forward and down to the felt
      const fore = group(arm, [0, -0.45, 0], [-0.32, 0, 0])
      part(fore, new THREE.CapsuleGeometry(0.072, 0.4, 8, 14), skin, 'skin', [0, -0.23, 0])
      // the hand rests palm-down, fingers forward
      part(fore, new THREE.SphereGeometry(0.1, 16, 14), skin, 'skin', [0, -0.47, 0.06], [0.5, 0, 0], [1.05, 0.5, 1.5])
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
        <meshStandardMaterial vertexColors roughness={0.87} />
      </mesh>
      <mesh geometry={geometry.cloth} castShadow>
        <meshStandardMaterial vertexColors roughness={0.86} />
      </mesh>
      <mesh geometry={geometry.skin} castShadow>
        <meshStandardMaterial vertexColors roughness={0.62} />
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
