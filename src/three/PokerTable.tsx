import { useMemo } from 'react'
import * as THREE from 'three'
import { RAIL, TABLE } from './layout'
import { createFeltTexture } from './feltTexture'
import { getLeatherTexture, getWoodTexture } from './tableTextures'

/** A closed 3D curve tracing the table's ellipse in the XZ plane. */
class EllipseCurve3D extends THREE.Curve<THREE.Vector3> {
  radiusX: number
  radiusZ: number
  y: number

  constructor(radiusX: number, radiusZ: number, y: number) {
    super()
    this.radiusX = radiusX
    this.radiusZ = radiusZ
    this.y = y
  }

  getPoint(t: number, target = new THREE.Vector3()) {
    const a = t * Math.PI * 2
    return target.set(
      this.radiusX * Math.cos(a),
      this.y,
      this.radiusZ * Math.sin(a),
    )
  }
}

/** Points (+ outward normals) of a rounded-rectangle cross-section profile. */
function roundedRectProfile(halfW: number, halfH: number, r: number, cs: number) {
  const pts: { u: number; v: number; nu: number; nv: number }[] = []
  const corner = (cu: number, cv: number, a0: number, a1: number) => {
    for (let k = 0; k <= cs; k += 1) {
      const a = a0 + (a1 - a0) * (k / cs)
      const nu = Math.cos(a)
      const nv = Math.sin(a)
      pts.push({ u: cu + r * nu, v: cv + r * nv, nu, nv })
    }
  }
  corner(halfW - r, -(halfH - r), -Math.PI / 2, 0) // bottom-right
  corner(halfW - r, halfH - r, 0, Math.PI / 2) // top-right
  corner(-(halfW - r), halfH - r, Math.PI / 2, Math.PI) // top-left
  corner(-(halfW - r), -(halfH - r), Math.PI, Math.PI * 1.5) // bottom-left
  return pts
}

/**
 * Sweep a rounded-rectangle profile around the table ellipse so the rail's
 * cross-section is a rounded rectangle (flat-ish top and sides), not an oval.
 * The profile stays upright (its horizontal axis is the radial, vertical is +Y).
 */
function makeRoundedRailGeometry(
  rx: number,
  rz: number,
  yc: number,
  halfW: number,
  halfH: number,
  r: number,
  segs: number,
  cs: number,
): THREE.BufferGeometry {
  const profile = roundedRectProfile(halfW, halfH, r, cs)
  const P = profile.length
  // v runs along the profile by arc length (not by point index), so a texture
  // row maps to a fixed place on the cross-section -- the leather's stitching
  // lines up along the top of the rail.
  const vs: number[] = [0]
  for (let j = 1; j < P; j += 1) {
    const a = profile[j - 1]
    const b = profile[j]
    vs.push(vs[j - 1] + Math.hypot(b.u - a.u, b.v - a.v))
  }
  const perimeter = vs[P - 1] + Math.hypot(profile[0].u - profile[P - 1].u, profile[0].v - profile[P - 1].v)
  const positions: number[] = []
  const normals: number[] = []
  const uvs: number[] = []
  for (let i = 0; i < segs; i += 1) {
    const t = i / segs
    const ang = t * Math.PI * 2
    const cxp = rx * Math.cos(ang)
    const czp = rz * Math.sin(ang)
    const tx = -rx * Math.sin(ang)
    const tz = rz * Math.cos(ang)
    const tl = Math.hypot(tx, tz) || 1
    // Outward horizontal normal (tangent rotated +90° in the XZ plane).
    const nx = tz / tl
    const nz = -tx / tl
    for (let j = 0; j < P; j += 1) {
      const { u, v, nu, nv } = profile[j]
      positions.push(cxp + nx * u, yc + v, czp + nz * u)
      normals.push(nx * nu, nv, nz * nu)
      uvs.push(t * 8, vs[j] / perimeter)
    }
  }
  const indices: number[] = []
  for (let i = 0; i < segs; i += 1) {
    const i2 = (i + 1) % segs
    for (let j = 0; j < P; j += 1) {
      const j2 = (j + 1) % P
      const a = i * P + j
      const b = i2 * P + j
      const cc = i2 * P + j2
      const d = i * P + j2
      indices.push(a, b, d, b, cc, d)
    }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  g.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  g.setIndex(indices)
  return g
}

/**
 * A flat elliptical band: the wooden racetrack between the felt and the rail.
 * u runs along the band in tiles of roughly `tile` world units (a whole number
 * of them, so the grain has no seam); v runs across it.
 */
function makeEllipseBand(
  rxIn: number,
  rzIn: number,
  rxOut: number,
  rzOut: number,
  y: number,
  segs: number,
  tile: number,
): THREE.BufferGeometry {
  const mid = (t: number) =>
    new THREE.Vector2(((rxIn + rxOut) / 2) * Math.cos(t), ((rzIn + rzOut) / 2) * Math.sin(t))
  const lengths = [0]
  for (let i = 1; i <= segs; i += 1) {
    lengths.push(lengths[i - 1] + mid((i / segs) * Math.PI * 2).distanceTo(mid(((i - 1) / segs) * Math.PI * 2)))
  }
  const tiles = Math.max(1, Math.round(lengths[segs] / tile))

  const positions: number[] = []
  const uvs: number[] = []
  const indices: number[] = []
  for (let i = 0; i <= segs; i += 1) {
    const t = (i / segs) * Math.PI * 2
    const u = (lengths[i] / lengths[segs]) * tiles
    positions.push(rxIn * Math.cos(t), y, rzIn * Math.sin(t), rxOut * Math.cos(t), y, rzOut * Math.sin(t))
    uvs.push(u, 0, u, 1)
    if (i < segs) {
      const a = i * 2
      indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3)
    }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  g.setIndex(indices)
  g.computeVertexNormals()
  return g
}

export function PokerTable() {
  const felt = useMemo(() => createFeltTexture(), [])
  const railGeometry = useMemo(
    () => makeRoundedRailGeometry(RAIL.rx, RAIL.rz, RAIL.y, RAIL.halfW, RAIL.halfH, RAIL.corner, 200, 5),
    [],
  )

  const trimGeometry = useMemo(() => {
    const curve = new EllipseCurve3D(
      TABLE.rx - 0.5,
      TABLE.rz - 0.5,
      TABLE.topY + 0.012,
    )
    return new THREE.TubeGeometry(curve, 200, 0.018, 12, true)
  }, [])

  // Lacquered wood racetrack from the gold trim out to under the rail.
  const racetrackGeometry = useMemo(
    () => makeEllipseBand(TABLE.rx - 0.5, TABLE.rz - 0.5, TABLE.rx - 0.2, TABLE.rz - 0.2, TABLE.topY + 0.006, 256, 2.4),
    [],
  )
  const wood = useMemo(() => getWoodTexture(), [])
  const skirtWood = useMemo(() => {
    const t = wood.clone()
    t.repeat.set(10, 1)
    return t
  }, [wood])
  const leather = useMemo(() => getLeatherTexture(), [])

  // White betting line — chips pushed across it are "in the pot".
  const bettingLineGeometry = useMemo(() => {
    const curve = new EllipseCurve3D(
      TABLE.rx * 0.46,
      TABLE.rz * 0.46,
      TABLE.topY + 0.013,
    )
    return new THREE.TubeGeometry(curve, 200, 0.02, 10, true)
  }, [])

  return (
    <group>
      {/* Felt playing surface */}
      <mesh
        rotation-x={-Math.PI / 2}
        scale={[TABLE.rx, TABLE.rz, 1]}
        position-y={TABLE.topY}
        receiveShadow
      >
        <circleGeometry args={[1, 96]} />
        <meshStandardMaterial map={felt} roughness={0.95} metalness={0.02} />
      </mesh>

      {/* Wooden racetrack between the felt and the rail */}
      <mesh geometry={racetrackGeometry} receiveShadow>
        <meshPhysicalMaterial map={wood} roughness={0.42} clearcoat={0.65} clearcoatRoughness={0.22} />
      </mesh>

      {/* Gold accent ring where the felt meets the racetrack */}
      <mesh geometry={trimGeometry}>
        <meshStandardMaterial
          color="#e9c877"
          emissive="#3a2c10"
          roughness={0.5}
          metalness={0.4}
        />
      </mesh>

      {/* White betting line */}
      <mesh geometry={bettingLineGeometry}>
        <meshStandardMaterial color="#f3efe6" emissive="#2a2a26" roughness={0.6} />
      </mesh>

      {/* Wooden skirt below the felt (top dropped below the felt to avoid z-fighting) */}
      <mesh
        position-y={TABLE.topY - TABLE.skirt / 2 - 0.05}
        scale={[TABLE.rx, 1, TABLE.rz]}
        castShadow
        receiveShadow
      >
        <cylinderGeometry args={[1, 0.92, TABLE.skirt, 96]} />
        <meshStandardMaterial map={skirtWood} color="#8a6a58" roughness={0.5} />
      </mesh>

      {/* Padded leather rail — rounded-rectangle cross-section, stitched
          along its top. */}
      <mesh geometry={railGeometry} castShadow receiveShadow>
        <meshStandardMaterial map={leather} roughness={0.58} side={THREE.DoubleSide} />
      </mesh>

      {/* Pedestal base */}
      <mesh position-y={TABLE.topY - TABLE.skirt - 1.4} castShadow>
        <cylinderGeometry args={[1.6, 2.2, 2.8, 48]} />
        <meshStandardMaterial color="#241309" roughness={0.7} metalness={0.1} />
      </mesh>
    </group>
  )
}
