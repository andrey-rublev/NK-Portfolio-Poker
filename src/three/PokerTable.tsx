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

export function PokerTable() {
  const felt = useMemo(() => createFeltTexture(), [])
  const railGeometry = useMemo(() => {
    const curve = new EllipseCurve3D(
      TABLE.rx + TABLE.railTube * 0.35,
      TABLE.rz + TABLE.railTube * 0.35,
      TABLE.topY + TABLE.railTube * 0.15,
    )
    return new THREE.TubeGeometry(curve, 220, TABLE.railTube, 24, true)
  }, [])

  const trimGeometry = useMemo(() => {
    const curve = new EllipseCurve3D(
      TABLE.rx - 0.5,
      TABLE.rz - 0.5,
      TABLE.topY + 0.012,
    )
    return new THREE.TubeGeometry(curve, 200, 0.018, 12, true)
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

      {/* Subtle gold accent ring ("betting line") */}
      <mesh geometry={trimGeometry}>
        <meshStandardMaterial
          color="#e9c877"
          emissive="#3a2c10"
          roughness={0.5}
          metalness={0.4}
        />
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

      {/* Padded leather rail */}
      <mesh geometry={railGeometry} castShadow receiveShadow>
        <meshStandardMaterial color="#5a3a22" roughness={0.45} metalness={0.1} />
      </mesh>

      {/* Pedestal base */}
      <mesh position-y={TABLE.topY - TABLE.skirt - 1.4} castShadow>
        <cylinderGeometry args={[1.6, 2.2, 2.8, 48]} />
        <meshStandardMaterial color="#241309" roughness={0.7} metalness={0.1} />
      </mesh>

      {/* Floor to catch shadows */}
      <mesh
        rotation-x={-Math.PI / 2}
        position-y={TABLE.topY - TABLE.skirt - 2.8}
        receiveShadow
      >
        <circleGeometry args={[26, 64]} />
        <meshStandardMaterial color="#06140e" roughness={1} metalness={0} />
      </mesh>
    </group>
  )
}
