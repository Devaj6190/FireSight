import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import gsap from 'gsap'
import { useEffect, useMemo, useRef, useState, type ComponentRef } from 'react'
import * as THREE from 'three'
import { collapse, explode, focus, frame, near, reduce, t, type Ctx, type Pose } from './explode'
import { Declutter, PinMarker, SEVERITY_ORDER, type Pin } from './Pins'
import { Rooms, RoomsOverlay } from './Rooms.tsx'
import { useStore, type Inset, type Phase } from './store'
import { City } from './City'
import { facade } from './cityMesh'
import { fs } from './tokens'
import type { Building } from '../../shared/building'
import { PhoneShell } from './shell/PhoneShell'
import { BUILDINGS, dispatchBuilding, dispatchPin } from './shell/model'

const GAP = 0.15 // between slabs, plan.md s3
const INTRO = 4.2 // s, the opening fly-in from over the city
const SOLID = { a: 1 }
const FOV = 40 // deg, vertical, over the uncovered part of the canvas

// The canvas never resizes (resizing it during a panel animation reallocated the GL buffers every frame). Instead the
// projection is shifted and widened so the area the shell's chrome leaves uncovered sees exactly what a canvas of
// that size would: setViewOffset moves the optical centre into it, and the fov grows so it still spans FOV.
// The inset eases to its new value at about the sheet's pace.
function FrameInset() {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera
  const size = useThree((s) => s.size)
  const cur = useRef<Inset | null>(null)
  const last = useRef('')
  useFrame((_, dt) => {
    const to = useStore.getState().inset
    const c = (cur.current ??= { ...to })
    const k = reduce ? 1 : 1 - Math.exp(-Math.min(dt, 0.1) * 10)
    for (const side of ['top', 'right', 'bottom', 'left'] as const) c[side] = Math.abs(to[side] - c[side]) < 0.5 ? to[side] : c[side] + (to[side] - c[side]) * k
    const key = `${size.width},${size.height},${c.top},${c.right},${c.bottom},${c.left}`
    if (key === last.current) return
    last.current = key
    const { width: w, height: h } = size
    const vh = Math.max(1, h - c.top - c.bottom)
    camera.fov = (2 * Math.atan((Math.tan((FOV * Math.PI) / 360) * h) / vh) * 180) / Math.PI
    camera.setViewOffset(w, h, (c.right - c.left) / 2, (c.bottom - c.top) / 2, w, h)
    camera.updateProjectionMatrix()
  })
  return null
}

function spanOf(b: Building) {
  const xs = b.footprint.map((p) => p[0])
  const ys = b.footprint.map((p) => p[1])
  return Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys))
}

// floor in contract numbering (0 = B1), clamped to the model; building-wide pins cluster on the roof, site pins at grade
const groupKey = (p: Pin, floors: number) => (p.anchor.kind === 'floor' ? Math.min(p.anchor.floor, floors) : p.anchor.kind === 'ground' ? 'site' : 'roof')

function Slabs({ b, onSelectPin }: { b: Building; onSelectPin: (pin: Pin) => void }) {
  const { phase, target, lit, rooms, view, setPhase, explode: openBuilding, openFloor } = useStore()
  const slabs = useRef<THREE.Group[]>([])
  const basement = useRef<THREE.Group>(null)
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null)
  const home = useRef<Pose>(null)
  const start = useRef<Pose>(null) // the hero framing the intro lands on: where Reset view returns an assembled building
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
      Array.from({ length: b.floors + 1 }, (_, f) => {
        const side = new THREE.MeshStandardMaterial({ roughness: 0.8, transparent: true })
        facade(side, f, b.floorHeightM - GAP)
        return {
          fade: { a: 1 },
          top: new THREE.MeshStandardMaterial({ color: fs.slabTop, roughness: 0.9, transparent: true }),
          side,
          edge: new THREE.LineBasicMaterial({ color: fs.line, transparent: true }),
        }
      }),
    [b.floors, b.floorHeightM],
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
      .map(([key, ps]) => ({ key, pins: ps, reveal: { v: phase === 'exploded' && rooms === 'off' ? 1 : 0 } })) // a pin added under the cutaway stays hidden
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
    const id = setTimeout(() => useStore.getState().focus(Number(f)), reduce ? 600 : INTRO * 1000 + 300)
    return () => clearTimeout(id)
  }, [])

  // open over the city and fly down to the hero; any explode or dispatch takes the camera over from wherever it is
  const intro = useRef<{ tl: gsap.core.Tween; end: Pose } | null>(null)
  useEffect(() => {
    const c = controls.current
    if (!c) return
    const s = new THREE.Spherical().setFromVector3(camera.position.clone().sub(c.target))
    const end: Pose = { r: s.radius, phi: s.phi, theta: s.theta, tx: c.target.x, ty: c.target.y, tz: c.target.z }
    start.current = end
    if (reduce) return
    const pose = { ...end, r: Math.max(6 * end.r, 1400), phi: 0.42, theta: end.theta - 1.1, ty: 0 }
    const apply = () => {
      c.target.set(pose.tx, pose.ty, pose.tz)
      camera.position.setFromSpherical(new THREE.Spherical(pose.r, pose.phi, pose.theta)).add(c.target)
      c.update()
    }
    apply()
    c.enabled = false
    const tl = gsap.to(pose, { ...end, duration: INTRO, ease: 'power2.inOut', onUpdate: apply, onComplete: () => void ((c.enabled = true), (intro.current = null)) })
    intro.current = { tl, end }
    return () => { // StrictMode re-runs this: put the camera back so the second run reads the same end pose
      if (!intro.current) return
      tl.kill()
      Object.assign(pose, end)
      apply()
      c.enabled = true
      intro.current = null
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useFrame(() => {
    for (const l of levels) l.top.opacity = l.side.opacity = l.edge.opacity = l.fade.a
  })

  const visibleAspect = () => {
    const i = useStore.getState().inset
    return Math.max(1, size.width - i.left - i.right) / Math.max(1, size.height - i.top - i.bottom)
  }
  const play = (run: (c: Ctx) => void, next?: Phase) => {
    const c = controls.current!
    const s = new THREE.Spherical().setFromVector3(camera.position.clone().sub(c.target))
    const pose: Pose = { r: s.radius, phi: s.phi, theta: s.theta, tx: c.target.x, ty: c.target.y, tz: c.target.z }
    if (next === 'exploded') home.current = { ...(intro.current?.end ?? pose) } // collapse lands on the hero, not mid-flight
    intro.current?.tl.kill()
    intro.current = null
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
      tl, pose, home: home.current!, target, lit, hot,
      slabs: slabs.current, basement: hasB1 ? basement.current : null,
      edges: levels.map((l) => l.edge.color), fades: levels.map((l) => l.fade), pins: groups.map((g) => g.reveal),
      floorH: b.floorHeightM, heightM: b.heightM, floors: b.floors, span: spanOf(b), aspect: visibleAspect(),
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
      if (useStore.getState().rooms !== 'off') return // a tapped floor opens straight into its cutaway: Rooms.tsx moves the camera
      if (target !== null || lit.length) navigator.vibrate?.(20)
      return play(focus)
    }
  }, [phase, target, lit]) // eslint-disable-line react-hooks/exhaustive-deps

  // Reset view: back to the framing for the current phase, from wherever the officer dragged the camera
  useEffect(() => {
    if (!view || rooms !== 'off') return
    if (phase === 'exploded') return play(target !== null || lit.length ? focus : frame)
    const end = start.current
    if (phase === 'assembled' && end) return play((c) => void c.tl.to(c.pose, { ...end, theta: near(c.pose.theta, end.theta), duration: t(1.1), ease: 'power3.inOut' }, 0))
  }, [view]) // eslint-disable-line react-hooks/exhaustive-deps

  // exploded, the fan stays clear: every pin is a dot (danger glows), and only the focused floor and the floors an
  // answer names carry their chip. Roof records ride the top floor, site records the ground floor
  const shown = target === null ? lit : [target, ...lit]
  const labelled = (key: number | string) => shown.includes(key === 'roof' ? b.floors : key === 'site' ? 1 : (key as number))
  const marker = (g: (typeof groups)[number], at: [number, number, number]) => (
    <group key={g.key} onClick={e => { e.stopPropagation(); onSelectPin(g.pins[0]) }}><PinMarker pin={g.pins[0]} more={g.pins.length - 1} at={at} reveal={g.reveal} fade={typeof g.key === 'number' ? levels[g.key].fade : SOLID} labelled={labelled(g.key)} /></group>
  )
  const top = b.floorHeightM - GAP
  const onSlab = (f: number, s: number) =>
    groups.filter((g) => g.key === f).map((g) => {
      const [x, y] = s % 2 ? west : east
      return marker(g, [x, top, -y])
    })

  // the model is the control: tap the building to explode it, then tap any floor to open its cutaway.
  // Not while it moves or a cutaway is open, and a drag to orbit (pointer moved more than a few px) is not a tap
  const tappable = rooms === 'off' && (phase === 'assembled' || phase === 'exploded')
  const tapFloor = (f: number) => (e: ThreeEvent<MouseEvent>) => {
    if (!tappable || e.delta > 6) return
    e.stopPropagation()
    if (phase === 'assembled') openBuilding()
    else openFloor(f)
  }
  const hover = (on: boolean) => (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    document.body.style.cursor = on && tappable ? 'pointer' : ''
  }
  useEffect(() => void (document.body.style.cursor = ''), [tappable])

  // rotation -90 deg on x: shape x -> x, shape y (north) -> -z, extrusion -> +y
  const slab = (f: number) => (
    <mesh geometry={geo} rotation-x={-Math.PI / 2} material={[levels[f].top, levels[f].side]} onClick={tapFloor(f)} onPointerOver={hover(true)} onPointerOut={hover(false)}>
      <lineSegments geometry={edges} material={levels[f].edge} />
    </mesh>
  )
  // the cutaway hides every other floor outright: faded to zero they still wrote depth and occluded it
  const shows = (f: number) => rooms === 'off' || rooms === 'closing' || f === target
  const roomsOf = (f: number) =>
    f === target && rooms !== 'off' && (
      <Rooms b={b} floor={f} height={top} level={levels[f]} chips={groups.map((g) => g.reveal)} play={play} onSelectPin={onSelectPin} />
    )
  return (
    <>
      {hasB1 && (
        <group ref={basement} position-y={-b.floorHeightM} visible={shows(0)}>
          {slab(0)}
          {onSlab(0, 1)}
          {roomsOf(0)}
        </group>
      )}
      {Array.from({ length: b.floors }, (_, i) => (
        <group key={i} ref={(g) => void (slabs.current[i] = g!)} position-y={i * b.floorHeightM} visible={shows(i + 1)}>
          {slab(i + 1)}
          {onSlab(i + 1, i)}
          {roomsOf(i + 1)}
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
        autoRotate={!reduce && (phase === 'assembled' || phase === 'exploded') && rooms === 'off'}
        autoRotateSpeed={0.35}
      />
    </>
  )
}

export default function App() {
  const { building: b, phase, setBuilding: setB, setPhase, focus, highlight, explode, collapse } = useStore()
  const [buildingId, setBuildingId] = useState(() => {
    const id = new URLSearchParams(location.search).get('building')
    return BUILDINGS.some(v => v.id === id) ? id! : 'sf-3722080'
  })
  const [selectedPin, setSelectedPin] = useState<Pin>()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const loadSequence = useRef(0)
  const queuedDispatch = useRef<string | null>(null)
  const [retry, setRetry] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    const sequence = ++loadSequence.current
    setLoading(true); setError(''); setSelectedPin(undefined); useStore.setState({ target: null, phase: 'assembled' })
    fetch(`${import.meta.env.BASE_URL}buildings/${buildingId}.json`, { signal: controller.signal })
      .then(r => { if (!r.ok) throw Error('Building snapshot is unavailable.'); return r.json() })
      .then((building: Building) => {
        if (sequence !== loadSequence.current) return
        if (!Array.isArray(building.footprint) || !building.footprint.length || !Array.isArray(building.pins)) throw Error('Building snapshot is incomplete.')
        if (queuedDispatch.current) {
          const pin = dispatchPin(queuedDispatch.current, building)
          building = { ...building, pins: [...building.pins, pin] }
          focus(pin.anchor.kind === 'floor' ? pin.anchor.floor : null)
          queuedDispatch.current = null
          setPhase('exploding')
        }
        setB(building); setLoading(false)
      })
      .catch(e => { if (!controller.signal.aborted) { setError(e.message); setLoading(false); queuedDispatch.current = null } })
    return () => controller.abort()
  }, [buildingId, retry])

  function changeBuilding(id: string) {
    queuedDispatch.current = null
    const url = new URL(location.href); url.searchParams.set('building', id); history.replaceState(null, '', url)
    setBuildingId(id)
  }

  async function handleDispatch(text: string) {
    if (!b) return
    if (phase === 'exploding' || phase === 'collapsing') throw Error('Let the model finish moving before resolving another dispatch.')
    const target = dispatchBuilding(text)
    if (target === '') throw Error('That address is not cached. Choose one of the available buildings.')
    if (target && target !== b.id) {
      changeBuilding(target); queuedDispatch.current = text
      return
    }
    const pin = dispatchPin(text, b)
    setB({ ...b, pins: [...b.pins.filter(p => p.origin !== 'dispatch'), pin] })
    setSelectedPin(undefined)
    focus(pin.anchor.kind === 'floor' ? pin.anchor.floor : null)
    if (phase === 'assembled') setPhase('exploding')
  }

  if (loading || !b || error) return <div className="phone-loading"><strong>FIRESIGHT</strong><p role="status">{error || 'Loading cited building snapshot…'}</p>{error && <button onClick={() => setRetry(v => v + 1)}>Retry building</button>}</div>
  const span = spanOf(b)
  const d = 2.2 * Math.max(b.heightM, span)
  const mid = b.heightM / 2

  return <PhoneShell key={b.id} building={b} phase={phase} selectedPin={selectedPin}
    onBuilding={changeBuilding} onDispatch={handleDispatch} onFocusFloor={focus}
    onToggle={() => { if (phase === 'exploded') collapse(); else explode() }}
    onSelectPin={setSelectedPin}
    onHighlight={(floors, pinIds) => (floors.length || pinIds.length ? highlight({ floors, pinIds }) : focus(null))}
    onAddPin={pin => setB({ ...b, pins: [...b.pins, pin] })}>
    <Canvas key={b.id} dpr={[1, 2]} camera={{ fov: 40, far: 8000, position: [d * 0.6, mid + d * 0.45, d * 0.65] }}>
      <color attach="background" args={[fs.sky]} />
      <fog attach="fog" args={[fs.sky, d * 1.2, d * 5]} />
      <hemisphereLight args={['#ffffff', fs.sidewalk, fs.night ? 0.6 : 1.1]} />
      <directionalLight position={[80, 140, 60]} intensity={fs.night ? 1.5 : 1.7} />
      {fs.night && <directionalLight position={[-90, 60, -120]} color="#6fa8ff" intensity={0.6} />}
      <FrameInset />
      <City id={b.id} />
      <Slabs b={b} onSelectPin={setSelectedPin} />
      <mesh rotation-x={-Math.PI / 2} position-y={-0.01}>
        <circleGeometry args={[1.4 * span, 64]} />
        <meshStandardMaterial color={fs.sidewalk} transparent opacity={0.75} depthWrite={false} />
      </mesh>
    </Canvas>
    <RoomsOverlay />
  </PhoneShell>
}
