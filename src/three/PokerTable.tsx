import { useMemo } from 'react'
import * as THREE from 'three'
import { TABLE } from './layout'
import { createFeltTexture } from './feltTexture'

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
      uvs.push(t * 8, j / (P - 1))
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

export function PokerTable() {
  const felt = useMemo(() => createFeltTexture(), [])
  const railGeometry = useMemo(
    () =>
      makeRoundedRailGeometry(
        TABLE.rx + 0.12,
        TABLE.rz + 0.12,
        TABLE.topY + 0.16,
        0.42,
        0.3,
        0.14,
        200,
        5,
      ),
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

      {/* Gold accent ring near the rail */}
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
        <meshStandardMaterial color="#3a2113" roughness={0.6} metalness={0.15} />
      </mesh>

      {/* Padded leather rail — rounded-rectangle cross-section */}
      <mesh geometry={railGeometry} castShadow receiveShadow>
        <meshStandardMaterial
          color="#5a3a22"
          roughness={0.45}
          metalness={0.1}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Pedestal base */}
      <mesh position-y={TABLE.topY - TABLE.skirt - 1.4} castShadow>
        <cylinderGeometry args={[1.6, 2.2, 2.8, 48]} />
        <meshStandardMaterial color="#241309" roughness={0.7} metalness={0.1} />
      </mesh>
    </group>
  )
}
