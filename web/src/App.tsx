import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import gsap from 'gsap'
import { useEffect, useMemo, useRef, useState, type ComponentRef } from 'react'
import * as THREE from 'three'
import { collapse, explode, reduce, type Pose } from './explode'
import { Declutter, PinMarker, SEVERITY_ORDER } from './Pins'
import { fs } from './tokens'

import type { Building } from '../../shared/building'
type Phase = 'assembled' | 'exploding' | 'exploded' | 'collapsing' // plan.md s4

const GAP = 0.15 // between slabs, plan.md s3

function spanOf(b: Building) {
  const xs = b.footprint.map((p) => p[0])
  const ys = b.footprint.map((p) => p[1])
  return Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys))
}

function Slabs({ b, phase, setPhase }: { b: Building; phase: Phase; setPhase: (p: Phase) => void }) {
  const slabs = useRef<THREE.Group[]>([])
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null)
  const home = useRef<Pose>(null)
  const camera = useThree((s) => s.camera)

  const geo = useMemo(() => {
    const shape = new THREE.Shape(b.footprint.map(([x, y]) => new THREE.Vector2(x, y)))
    return new THREE.ExtrudeGeometry(shape, { depth: b.floorHeightM - GAP, bevelEnabled: false })
  }, [b])
  const edges = useMemo(() => new THREE.EdgesGeometry(geo, 15), [geo])
  const edgeMat = useMemo(() => new THREE.LineBasicMaterial({ color: fs.line }), [])
  const pins = useMemo(() => [...b.pins].sort((p, q) => SEVERITY_ORDER[p.severity] - SEVERITY_ORDER[q.severity]), [b])
  const reveals = useMemo(() => pins.map(() => ({ v: 0 })), [pins])
  // ponytail: no in-floor position in the data yet, so pins sit on the floor's east or west edge, alternating by floor;
  // building pins and the basement (floor 0) go on the ground floor
  const [east, west] = useMemo(() => {
    const byX = [...b.footprint].sort((p, q) => p[0] - q[0])
    return [byX.at(-1)!, byX[0]]
  }, [b])
  useEffect(() => () => (geo.dispose(), edges.dispose()), [geo, edges])

  useEffect(() => {
    if (phase !== 'exploding' && phase !== 'collapsing') return
    const c = controls.current!
    const s = new THREE.Spherical().setFromVector3(camera.position.clone().sub(c.target))
    const pose: Pose = { r: s.radius, phi: s.phi, theta: s.theta, tx: c.target.x, ty: c.target.y, tz: c.target.z }
    if (phase === 'exploding') {
      home.current = { ...pose }
      navigator.vibrate?.(30)
    }
    c.enabled = false
    const tl = gsap.timeline({
      onUpdate: () => {
        c.target.set(pose.tx, pose.ty, pose.tz)
        camera.position.setFromSpherical(new THREE.Spherical(pose.r, pose.phi, pose.theta)).add(c.target)
        c.update()
      },
      onComplete: () => {
        c.enabled = true
        if (phase === 'collapsing') navigator.vibrate?.(20)
        setPhase(phase === 'exploding' ? 'exploded' : 'assembled')
      },
    })
    const ctx = { tl, slabs: slabs.current, edge: edgeMat.color, pose, home: home.current!, floorH: b.floorHeightM, heightM: b.heightM, floors: b.floors, span: spanOf(b), pins: reveals }
    ;(phase === 'exploding' ? explode : collapse)(ctx)
    return () => {
      tl.kill()
      c.enabled = true
    }
  }, [phase]) // eslint-disable-line react-hooks/exhaustive-deps

  // rotation -90 deg on x: shape x -> x, shape y (north) -> -z, extrusion -> +y
  return (
    <>
      {Array.from({ length: b.floors }, (_, i) => (
        <group key={i} ref={(g) => void (slabs.current[i] = g!)} position-y={i * b.floorHeightM}>
          <mesh geometry={geo} rotation-x={-Math.PI / 2}>
            <meshStandardMaterial attach="material-0" color={fs.slabTop} roughness={0.9} />
            <meshStandardMaterial attach="material-1" color={fs.slab} roughness={0.9} />
            <lineSegments geometry={edges} material={edgeMat} />
          </mesh>
          {pins
            .map((p, k) => ({ p, k }))
            .filter(({ p }) => (p.anchor.kind === 'floor' ? Math.max(p.anchor.floor - 1, 0) : 0) === i)
            .map(({ p, k }) => {
              const [x, y] = i % 2 ? west : east
              return <PinMarker key={p.id} pin={p} at={[x, b.floorHeightM - GAP, -y]} reveal={reveals[k]} />
            })}
        </group>
      ))}
      <Declutter />
      <OrbitControls
        ref={controls}
        target={[0, b.heightM / 2, 0]}
        maxPolarAngle={Math.PI / 2 - 0.05}
        enableDamping
        dampingFactor={0.05}
        autoRotate={!reduce && (phase === 'assembled' || phase === 'exploded')}
        autoRotateSpeed={0.35}
      />
    </>
  )
}

export default function App() {
  const [b, setB] = useState<Building>()
  const [phase, setPhase] = useState<Phase>('assembled')
  useEffect(() => {
    const id = new URLSearchParams(location.search).get('building') ?? 'sf-3722080' // 140 New Montgomery St
    fetch(`${import.meta.env.BASE_URL}buildings/${id}.json`).then((r) => r.json()).then(setB)
  }, [])
  if (!b) return null

  const span = spanOf(b)
  const d = 2.2 * Math.max(b.heightM, span) // design.md s4
  const mid = b.heightM / 2
  const busy = phase === 'exploding' || phase === 'collapsing'
  const out = phase === 'exploded' || phase === 'collapsing'

  return (
    <>
      <div className="stage">
        {/* ponytail: frameloop always (design.md says demand) for the idle drift and damping; demand again if battery bites */}
        <Canvas dpr={[1, 2]} camera={{ fov: 40, position: [d * 0.6, mid + d * 0.45, d * 0.65] }}>
          <color attach="background" args={[fs.bg]} />
          <fog attach="fog" args={[fs.bg, d * 1.2, d * 5]} />
          <hemisphereLight args={[fs.ink, fs.ground, 0.7]} />
          <directionalLight position={[60, 90, 40]} intensity={1.4} />
          <Slabs b={b} phase={phase} setPhase={setPhase} />
          <mesh rotation-x={-Math.PI / 2} position-y={-0.01}>
            <circleGeometry args={[1.4 * span, 64]} />
            <meshStandardMaterial color={fs.ground} />
          </mesh>
        </Canvas>
        <div className="status">
          {b.address} · {phase}
        </div>
      </div>
      <div className="bar">
        <button type="button" className="action" disabled={busy} onClick={() => setPhase(out ? 'collapsing' : 'exploding')}>
          {out ? 'Collapse' : 'Explode'}
        </button>
      </div>
    </>
  )
}
