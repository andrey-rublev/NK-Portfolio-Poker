import * as THREE from 'three'
import { CARD } from './layout'

/** Centered rounded-rectangle outline in the XY plane. */
function roundedRectShape(w: number, h: number, r: number): THREE.Shape {
  const s = new THREE.Shape()
  const x = -w / 2
  const y = -h / 2
  s.moveTo(x + r, y)
  s.lineTo(x + w - r, y)
  s.quadraticCurveTo(x + w, y, x + w, y + r)
  s.lineTo(x + w, y + h - r)
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  s.lineTo(x + r, y + h)
  s.quadraticCurveTo(x, y + h, x, y + h - r)
  s.lineTo(x, y + r)
  s.quadraticCurveTo(x, y, x + r, y)
  return s
}

/**
 * A real-playing-card geometry: a rounded rectangle extruded to the card's
 * thickness, with three material groups so each side can be textured:
 *   group 0 = front face (+Z)   group 1 = back face (-Z)   group 2 = rounded rim
 * Front/back face UVs are remapped to 0..1 so the card textures map upright.
 */
function makeCardGeometry(w: number, h: number, depth: number, radius: number): THREE.BufferGeometry {
  const shape = roundedRectShape(w, h, radius)
  const src = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: false,
    curveSegments: 8,
    steps: 1,
  })
  src.translate(0, 0, -depth / 2)
  src.computeVertexNormals()

  const pos = src.getAttribute('position') as THREE.BufferAttribute
  const nrm = src.getAttribute('normal') as THREE.BufferAttribute
  const triCount = pos.count / 3
  const half = depth / 2
  const eps = 1e-4

  // Classify each (non-indexed) triangle as front cap, back cap, or rim.
  const FRONT = 0
  const BACK = 1
  const SIDE = 2
  const buckets: number[][] = [[], [], []]
  for (let t = 0; t < triCount; t += 1) {
    const z0 = pos.getZ(t * 3)
    const z1 = pos.getZ(t * 3 + 1)
    const z2 = pos.getZ(t * 3 + 2)
    let cls = SIDE
    if (z0 > half - eps && z1 > half - eps && z2 > half - eps) cls = FRONT
    else if (z0 < -half + eps && z1 < -half + eps && z2 < -half + eps) cls = BACK
    buckets[cls].push(t)
  }

  const order = [...buckets[FRONT], ...buckets[BACK], ...buckets[SIDE]]
  const newPos = new Float32Array(triCount * 9)
  const newNrm = new Float32Array(triCount * 9)
  const newUv = new Float32Array(triCount * 6)
  for (let i = 0; i < order.length; i += 1) {
    const t = order[i]
    for (let v = 0; v < 3; v += 1) {
      const s = t * 3 + v
      const d = i * 3 + v
      newPos[d * 3] = pos.getX(s)
      newPos[d * 3 + 1] = pos.getY(s)
      newPos[d * 3 + 2] = pos.getZ(s)
      newNrm[d * 3] = nrm.getX(s)
      newNrm[d * 3 + 1] = nrm.getY(s)
      newNrm[d * 3 + 2] = nrm.getZ(s)
      newUv[d * 2] = (pos.getX(s) + w / 2) / w
      newUv[d * 2 + 1] = (pos.getY(s) + h / 2) / h
    }
  }

  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(newPos, 3))
  g.setAttribute('normal', new THREE.BufferAttribute(newNrm, 3))
  g.setAttribute('uv', new THREE.BufferAttribute(newUv, 2))
  const fc = buckets[FRONT].length * 3
  const bc = buckets[BACK].length * 3
  const sc = buckets[SIDE].length * 3
  g.addGroup(0, fc, 0)
  g.addGroup(fc, bc, 1)
  g.addGroup(fc + bc, sc, 2)
  src.dispose()
  return g
}

let shared: THREE.BufferGeometry | null = null

/** Shared rounded-card geometry (all cards are the same size). */
export function getCardGeometry(): THREE.BufferGeometry {
  if (!shared) shared = makeCardGeometry(CARD.w, CARD.h, CARD.thickness, 0.06)
  return shared
}
