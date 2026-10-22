import { Canvas } from '@react-three/fiber'
import { Edges, OrbitControls } from '@react-three/drei'
import { useEffect, useMemo, useState } from 'react'
import * as THREE from 'three'
import { fs } from './tokens'

// ponytail: local slice of the Building contract until Lane B lands shared/building.ts
type Building = {
  id: string
  address: string
  footprint: [number, number][] // meters, x east, y north, CCW, origin at centroid
  heightM: number
  floors: number
  floorHeightM: number
}

const GAP = 0.15 // between slabs, plan.md s3

function Slabs({ b }: { b: Building }) {
  const geo = useMemo(() => {
    const shape = new THREE.Shape(b.footprint.map(([x, y]) => new THREE.Vector2(x, y)))
    return new THREE.ExtrudeGeometry(shape, { depth: b.floorHeightM - GAP, bevelEnabled: false })
  }, [b])
  useEffect(() => () => geo.dispose(), [geo])

  // rotation -90 deg on x: shape x -> x, shape y (north) -> -z, extrusion -> +y
  return Array.from({ length: b.floors }, (_, i) => (
    <mesh key={i} geometry={geo} rotation-x={-Math.PI / 2} position-y={i * b.floorHeightM}>
      <meshStandardMaterial attach="material-0" color={fs.slabTop} roughness={0.9} />
      <meshStandardMaterial attach="material-1" color={fs.slab} roughness={0.9} />
      <Edges color={fs.line} />
    </mesh>
  ))
}

export default function App() {
  const [b, setB] = useState<Building>()
  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}buildings/sf-0874003.json`).then((r) => r.json()).then(setB)
  }, [])
  if (!b) return null

  const xs = b.footprint.map((p) => p[0])
  const ys = b.footprint.map((p) => p[1])
  const span = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys))
  const d = 2.2 * Math.max(b.heightM, span) // design.md s4
  const mid = b.heightM / 2

  return (
    <Canvas dpr={[1, 2]} frameloop="demand" camera={{ fov: 40, position: [d * 0.6, mid + d * 0.45, d * 0.65] }}>
      <color attach="background" args={[fs.bg]} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[40, 80, 30]} intensity={1.6} />
      <Slabs b={b} />
      <mesh rotation-x={-Math.PI / 2} position-y={-0.01}>
        <circleGeometry args={[1.4 * span, 64]} />
        <meshStandardMaterial color={fs.ground} />
      </mesh>
      <OrbitControls target={[0, mid, 0]} maxPolarAngle={Math.PI / 2 - 0.05} />
    </Canvas>
  )
}
