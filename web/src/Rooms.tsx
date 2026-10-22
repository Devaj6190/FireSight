// Second explode level: the focused floor splits into rooms that drift apart in plan, like an exploded floor plan.
// Same motion language as explode.ts: one gsap timeline, long overlapping eases, the camera lands last.
// The layout is schematic (rooms.ts); the overlay says so on screen whenever the rooms are showing.
import { Html } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { fadeFor, near, t, type Ctx } from './explode'
import { PinMarker, SEVERITY_ORDER, type Pin, type Reveal } from './Pins'
import { planFloor, type Room } from './rooms'
import { useStore, type Phase } from './store'
import { fs } from './tokens'
import type { Building } from '../../shared/building'
import './rooms.css'

const DEG = Math.PI / 180
const SPREAD = 0.3 // rooms move out by this share of their distance from the plate centre
const WALL = 0.4 // walls end at this share of the slab: the plan is cut, so you see into the rooms
const INSET = 0.94
const PITCH = 32 * DEG // camera off vertical: a plan you can still read as 3D
const OTHER = 0 // other floors while the rooms show: gone, so neither the floor above nor its chips cover the plan

type Level = { fade: { a: number }; top: THREE.Material; side: THREE.Material; edge: THREE.Material }
type Play = (run: (c: Ctx) => void, next?: Phase) => () => void

const lineColor = (r: Room) =>
  r.kind === 'core' ? fs.muted : r.kind === 'named' ? (r.pins.some((p) => p.severity === 'danger') ? fs.danger : fs.action) : fs.muted

export function Rooms({ b, floor, height, level, chips, play, onSelectPin }: {
  b: Building
  floor: number // contract numbering, 0 = B1
  height: number // slab thickness
  level: Level
  chips: Reveal[] // every chip on the stacked view; hidden while this floor's pins sit in its rooms
  play: Play
  onSelectPin: (pin: Pin) => void
}) {
  const rooms = useStore((s) => s.rooms)
  const setRooms = useStore((s) => s.setRooms)
  const toggle = useStore((s) => s.toggleRooms)
  const root = useRef<THREE.Group>(null)
  const outer = useRef<THREE.Group[]>([])
  const inner = useRef<THREE.Group[]>([])
  const labels = useRef<(HTMLDivElement | null)[]>([])
  const saved = useRef<Ctx['pose']>(null)

  const plan = useMemo(
    () => planFloor(b, floor, b.pins.filter((p) => p.anchor.kind === 'floor' && Math.min(p.anchor.floor, b.floors) === floor)),
    [b, floor],
  )
  const parts = useMemo(
    () =>
      plan.rooms.map((r) => {
        const shape = new THREE.Shape(r.poly.map(([x, y]) => new THREE.Vector2(x - r.c[0], y - r.c[1])))
        const geo = new THREE.ExtrudeGeometry(shape, { depth: height, bevelEnabled: false })
        const core = r.kind === 'core'
        return {
          geo,
          edges: new THREE.EdgesGeometry(geo, 15),
          top: new THREE.MeshStandardMaterial({ color: core ? fs.surface : fs.slabTop, roughness: 0.9 }),
          side: new THREE.MeshStandardMaterial({ color: core ? fs.bg : fs.slab, roughness: 0.9 }),
          line: new THREE.LineBasicMaterial({ color: lineColor(r) }),
          // pins in a room, danger first; clones get their own id so the stacked chip keeps its declutter slot
          pins: [...r.pins].sort((p, q) => SEVERITY_ORDER[p.severity] - SEVERITY_ORDER[q.severity]).map((p) => ({ pin: { ...p, id: `${p.id}#room` }, src: p, reveal: { v: 0 } })),
          away: [(r.c[0] - plan.center[0]) * SPREAD, (r.c[1] - plan.center[1]) * SPREAD] as const,
        }
      }),
    [plan, height],
  )
  useEffect(() => () => parts.forEach((p) => [p.geo, p.edges, p.top, p.side, p.line].forEach((o) => o.dispose())), [parts])
  const shown = useMemo(() => ({ v: 0 }), [])

  const setSlab = (v: boolean) => void (level.top.visible = level.side.visible = level.edge.visible = v)
  // a snap-off (another floor focused, an answer lit) unmounts mid-way: put the stacked floor back as it was
  useEffect(
    () => () => {
      setSlab(true)
      if (useStore.getState().phase === 'exploded') chips.forEach((c) => (c.v = 1))
    },
    [], // eslint-disable-line react-hooks/exhaustive-deps
  )

  useFrame(() => {
    labels.current.forEach((d) => d && (d.style.opacity = String(shown.v)))
  })

  const reveals = () => parts.flatMap((p) => p.pins.map((q) => q.reveal))
  const open = (c: Ctx) => {
    saved.current ??= { ...c.pose }
    const w = root.current!.getWorldPosition(new THREE.Vector3())
    // the plan's long axis along the canvas's long side; the camera looks along the screen-up axis A
    const tall = c.aspect < 1
    const A = plan.longAngle + (tall ? 0 : Math.PI / 2)
    const th = Math.atan2(-Math.cos(A), Math.sin(A))
    const theta = [th, th + Math.PI].map((x) => near(c.pose.theta, x)).reduce((m, x) => (Math.abs(x - c.pose.theta) < Math.abs(m - c.pose.theta) ? x : m))
    const [up, across] = tall ? [plan.long, plan.short] : [plan.short, plan.long]
    const fov = 2 * Math.tan(20 * DEG) // camera fov is 40 (App.tsx)
    // headroom for the chips above their stems
    const r = 1.6 * (1 + SPREAD) * Math.max((up * Math.cos(PITCH)) / fov, across / (fov * c.aspect))
    // aim a little toward the camera so the plan sits above the stage's bottom buttons
    const lift = (0.08 * fov * r) / Math.cos(PITCH)
    const order = [...parts.keys()].sort((i, j) => Math.hypot(...parts[i].away) - Math.hypot(...parts[j].away)) // core first, edges last
    const pos = order.map((i) => outer.current[i].position)
    const scl = order.map((i) => inner.current[i].scale)
    c.tl
      .call(() => setSlab(false), [], 0) // rooms tile the slab exactly, so the swap is invisible
      .to(chips, { v: 0, duration: t(0.3), ease: 'power2.in' }, 0)
      .to(c.fades, { a: (f: number) => (f === floor ? 1 : OTHER), duration: t(0.8), ease: 'sine.inOut' }, 0)
      .to(pos, { x: (k) => plan.rooms[order[k]].c[0] + parts[order[k]].away[0], z: (k) => -(plan.rooms[order[k]].c[1] + parts[order[k]].away[1]), duration: t(1.2), ease: 'power3.inOut', stagger: { amount: t(0.3) } }, t(0.15))
      .to(scl, { x: INSET, z: INSET, y: WALL, duration: t(1.2), ease: 'power3.inOut', stagger: { amount: t(0.3) } }, t(0.15))
      .to(shown, { v: 1, duration: t(0.6), ease: 'power2.out' }, t(1.2))
      .to(reveals(), { v: 1, duration: t(0.7), ease: 'power2.out', stagger: { amount: t(0.3) } }, t(1.3))
      .to(c.pose, { phi: PITCH, theta, r, tx: w.x + plan.center[0] + lift * Math.sin(theta), ty: w.y + height * WALL, tz: w.z - plan.center[1] + lift * Math.cos(theta), duration: t(1.9), ease: 'sine.inOut' }, 0)
      .call(() => setRooms('on'))
  }
  const close = (c: Ctx) => {
    const next = useStore.getState().collapseAfterRooms // the floors collapse right after: don't bring this floor's chip back
    const order = [...parts.keys()].sort((i, j) => Math.hypot(...parts[j].away) - Math.hypot(...parts[i].away))
    c.tl
      .to([shown, ...reveals()], { v: 0, duration: t(0.3), ease: 'power2.in' }, 0)
      .to(order.map((i) => outer.current[i].position), { x: (k) => plan.rooms[order[k]].c[0], z: (k) => -plan.rooms[order[k]].c[1], duration: t(1.0), ease: 'power3.inOut', stagger: { amount: t(0.25) } }, t(0.15))
      .to(order.map((i) => inner.current[i].scale), { x: 1, y: 1, z: 1, duration: t(1.0), ease: 'power3.inOut', stagger: { amount: t(0.25) } }, t(0.15))
    if (saved.current) c.tl.to(c.pose, { ...saved.current, duration: t(1.5), ease: 'sine.inOut' }, 0)
    c.tl.call(() => setSlab(true), [], t(1.4))
    if (!next) c.tl.to(chips, { v: 1, duration: t(0.6), ease: 'power2.out' }, t(1.3)).to(c.fades, { a: (f: number) => fadeFor(f, c), duration: t(0.8), ease: 'sine.inOut' }, t(0.6))
    c.tl.call(() => setRooms('off'))
  }

  useEffect(() => {
    if (rooms === 'opening') {
      navigator.vibrate?.(20)
      return play(open)
    }
    if (rooms === 'closing') return play(close)
  }, [rooms]) // eslint-disable-line react-hooks/exhaustive-deps

  // rotation -90 deg on x, as the slabs: footprint x -> x, y (north) -> -z, extrusion -> +y
  return (
    <group ref={root}>
      {plan.rooms.map((r, i) => {
        const p = parts[i]
        return (
          <group key={r.id} ref={(g) => void (outer.current[i] = g!)} position={[r.c[0], 0, -r.c[1]]}>
            <group ref={(g) => void (inner.current[i] = g!)}>
              <mesh geometry={p.geo} rotation-x={-Math.PI / 2} material={[p.top, p.side]} onClick={(e) => (e.stopPropagation(), toggle())}>
                <lineSegments geometry={p.edges} material={p.line} />
              </mesh>
            </group>
            {p.pins.map((q, k) => (
              <group key={q.pin.id} onClick={(e) => (e.stopPropagation(), onSelectPin(q.src))}>
                <PinMarker pin={q.pin} at={[(k - (p.pins.length - 1) / 2) * 3, height * WALL, 0]} reveal={q.reveal} fade={level.fade} />
              </group>
            ))}
            {r.kind !== 'space' && (
              <Html center position-y={height * WALL + 0.3} zIndexRange={[4, 0]} style={{ pointerEvents: 'none' }}>
                <div ref={(d) => void (labels.current[i] = d)} className={`room-label ${r.kind}`} style={{ opacity: 0 }}>
                  {r.kind === 'core' ? (
                    <b>CORE? · UNVERIFIABLE</b>
                  ) : (
                    <>
                      <b>{r.name}</b>
                      <span>{`${r.claim!.toUpperCase()} · ${r.cite}`}</span>
                      <span>SPOT ON FLOOR: SCHEMATIC</span>
                    </>
                  )}
                </div>
              </Html>
            )}
          </group>
        )
      })}
    </group>
  )
}

// DOM over the stage: while rooms show, the schematic disclaimer (never off while rooms are up). The toggle lives in the shell's dock.
export function RoomsOverlay() {
  const { phase, target, rooms } = useStore()
  if (phase !== 'exploded' || target === null || rooms === 'off') return null
  return (
    <p className="rooms-banner" role="note" title="Room shapes and the core are generated, not surveyed. Named rooms come from cited records; where they sit on the floor is not public.">
      SCHEMATIC LAYOUT: NO PUBLIC FLOOR PLAN
    </p>
  )
}
