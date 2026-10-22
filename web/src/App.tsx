import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import gsap from 'gsap'
import { useEffect, useMemo, useRef, type ComponentRef } from 'react'
import * as THREE from 'three'
import { collapse, explode, focus, reduce, type Ctx, type Pose } from './explode'
import { Declutter, PinMarker, SEVERITY_ORDER, type Pin } from './Pins'
import { useStore, type Phase } from './store'
import { fs } from './tokens'
import type { Building } from '../../shared/building'

const GAP = 0.15 // between slabs, plan.md s3
const SOLID = { a: 1 }

function spanOf(b: Building) {
  const xs = b.footprint.map((p) => p[0])
  const ys = b.footprint.map((p) => p[1])
  return Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys))
}

// floor in contract numbering (0 = B1), clamped to the model; building-wide pins cluster on the roof, site pins at grade
const groupKey = (p: Pin, floors: number) => (p.anchor.kind === 'floor' ? Math.min(p.anchor.floor, floors) : p.anchor.kind === 'ground' ? 'site' : 'roof')

function Slabs({ b }: { b: Building }) {
  const { phase, target, setPhase } = useStore()
  const slabs = useRef<THREE.Group[]>([])
  const basement = useRef<THREE.Group>(null)
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null)
  const home = useRef<Pose>(null)
  const camera = useThree((s) => s.camera)
  const size = useThree((s) => s.size)

  const geo = useMemo(() => {
    const shape = new THREE.Shape(b.footprint.map(([x, y]) => new THREE.Vector2(x, y)))
    return new THREE.ExtrudeGeometry(shape, { depth: b.floorHeightM - GAP, bevelEnabled: false })
  }, [b])
  const edges = useMemo(() => new THREE.EdgesGeometry(geo, 15), [geo])
  const pins = useMemo(() => [...b.pins].sort((p, q) => SEVERITY_ORDER[p.severity] - SEVERITY_ORDER[q.severity]), [b])
  // contract: floor 0 exists only if a record says basement
  const hasB1 = useMemo(() => pins.some((p) => p.anchor.kind === 'floor' && p.anchor.floor === 0), [pins])
  const hot = useMemo(() => new Set(pins.flatMap((p) => (p.severity === 'danger' && p.anchor.kind === 'floor' ? [p.anchor.floor] : []))), [pins])
  // per floor (index = contract floor number): its own materials, so focus can fade it
  const levels = useMemo(
    () =>
      Array.from({ length: b.floors + 1 }, () => ({
        fade: { a: 1 },
        top: new THREE.MeshStandardMaterial({ color: fs.slabTop, roughness: 0.9, transparent: true }),
        side: new THREE.MeshStandardMaterial({ color: fs.slab, roughness: 0.9, transparent: true }),
        edge: new THREE.LineBasicMaterial({ color: fs.line, transparent: true }),
      })),
    [b.floors],
  )
  // ponytail: at most one chip per floor (the most severe pin, "+N" for the rest); expand on tap comes with selectPin
  const groups = useMemo(() => {
    const m = new Map<number | string, Pin[]>()
    for (const p of pins) {
      const k = groupKey(p, b.floors)
      if (!m.has(k)) m.set(k, [])
      m.get(k)!.push(p)
    }
    return [...m]
      .map(([key, ps]) => ({ key, pins: ps, reveal: { v: 0 } }))
      .sort((g, h) => SEVERITY_ORDER[g.pins[0].severity] - SEVERITY_ORDER[h.pins[0].severity])
  }, [pins, b.floors])
  // ponytail: no in-floor position in the data yet, so pins sit on the floor's east or west edge, alternating by floor
  const [east, west] = useMemo(() => {
    const byX = [...b.footprint].sort((p, q) => p[0] - q[0])
    return [byX.at(-1)!, byX[0]]
  }, [b])
  useEffect(() => () => (geo.dispose(), edges.dispose()), [geo, edges])
  // ?focus=22 stands in for the dispatch box until Lane D wires parseDispatch to focus(); here, not at fetch time,
  // because the chip fonts suspend this subtree and the timeline needs the slabs mounted
  useEffect(() => {
    const f = new URLSearchParams(location.search).get('focus')
    if (f === null) return
    const id = setTimeout(() => useStore.getState().focus(Number(f)), 600)
    return () => clearTimeout(id)
  }, [])

  useFrame(() => {
    for (const l of levels) l.top.opacity = l.side.opacity = l.edge.opacity = l.fade.a
  })

  const play = (run: (c: Ctx) => void, next?: Phase) => {
    const c = controls.current!
    const s = new THREE.Spherical().setFromVector3(camera.position.clone().sub(c.target))
    const pose: Pose = { r: s.radius, phi: s.phi, theta: s.theta, tx: c.target.x, ty: c.target.y, tz: c.target.z }
    if (next === 'exploded') home.current = { ...pose }
    c.enabled = false
    const tl = gsap.timeline({
      onUpdate: () => {
        c.target.set(pose.tx, pose.ty, pose.tz)
        camera.position.setFromSpherical(new THREE.Spherical(pose.r, pose.phi, pose.theta)).add(c.target)
        c.update()
      },
      onComplete: () => {
        c.enabled = true
        if (next) setPhase(next)
      },
    })
    run({
      tl, pose, home: home.current!, target, hot,
      slabs: slabs.current, basement: hasB1 ? basement.current : null,
      edges: levels.map((l) => l.edge.color), fades: levels.map((l) => l.fade), pins: groups.map((g) => g.reveal),
      floorH: b.floorHeightM, heightM: b.heightM, floors: b.floors, span: spanOf(b), aspect: size.width / size.height,
    })
    return () => {
      tl.kill()
      c.enabled = true
    }
  }

  useEffect(() => {
    if (phase === 'exploding') {
      navigator.vibrate?.(30)
      return play(explode, 'exploded')
    }
    if (phase === 'collapsing') return play(collapse, 'assembled')
    if (phase === 'exploded') {
      if (target !== null) navigator.vibrate?.(20)
      return play(focus)
    }
  }, [phase, target]) // eslint-disable-line react-hooks/exhaustive-deps

  const marker = (g: (typeof groups)[number], at: [number, number, number]) => (
    <PinMarker key={g.key} pin={g.pins[0]} more={g.pins.length - 1} at={at} reveal={g.reveal} fade={typeof g.key === 'number' ? levels[g.key].fade : SOLID} />
  )
  const top = b.floorHeightM - GAP
  const onSlab = (f: number, s: number) =>
    groups.filter((g) => g.key === f).map((g) => {
      const [x, y] = s % 2 ? west : east
      return marker(g, [x, top, -y])
    })

  // rotation -90 deg on x: shape x -> x, shape y (north) -> -z, extrusion -> +y
  const slab = (f: number) => (
    <mesh geometry={geo} rotation-x={-Math.PI / 2} material={[levels[f].top, levels[f].side]}>
      <lineSegments geometry={edges} material={levels[f].edge} />
    </mesh>
  )
  return (
    <>
      {hasB1 && (
        <group ref={basement} position-y={-b.floorHeightM}>
          {slab(0)}
          {onSlab(0, 1)}
        </group>
      )}
      {Array.from({ length: b.floors }, (_, i) => (
        <group key={i} ref={(g) => void (slabs.current[i] = g!)} position-y={i * b.floorHeightM}>
          {slab(i + 1)}
          {onSlab(i + 1, i)}
          {i === 0 && groups.filter((g) => g.key === 'site').map((g) => marker(g, [west[0], top, -west[1]]))}
          {i === b.floors - 1 && groups.filter((g) => g.key === 'roof').map((g) => marker(g, [0, top, 0]))}
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
  const { building: b, phase, target, setBuilding, explode, collapse } = useStore()
  useEffect(() => {
    const q = new URLSearchParams(location.search)
    const id = q.get('building') ?? 'sf-3722080' // 140 New Montgomery St
    fetch(`${import.meta.env.BASE_URL}buildings/${id}.json`)
      .then((r) => r.json())
      .then(setBuilding)
  }, [setBuilding])
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
          <Slabs b={b} />
          {/* translucent grade so B1 reads as below ground */}
          <mesh rotation-x={-Math.PI / 2} position-y={-0.01}>
            <circleGeometry args={[1.4 * span, 64]} />
            <meshStandardMaterial color={fs.ground} transparent opacity={0.75} depthWrite={false} />
          </mesh>
        </Canvas>
        <div className="status">
          {b.address} · {phase}
          {target !== null && ` · ${target === 0 ? 'B1' : `FL ${target}`}`}
        </div>
      </div>
      <div className="bar">
        <button type="button" className="action" disabled={busy} onClick={out ? collapse : explode}>
          {out ? 'Collapse' : 'Explode'}
        </button>
      </div>
    </>
  )
}
