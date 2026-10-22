// Second explode level: the focused floor opens into an ESTIMATED architectural plan (archPlan.ts): columns from the
// structural system, a core with elevators and two stairs, a corridor ring, offices out to the facade, and the hazard
// rooms a public record names. Same motion language as explode.ts: one gsap timeline, the camera lands last.
// Nothing here is surveyed; the overlay says so on screen whenever the plan is showing.
import { Html } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { archPlan, type Rect, type Seg } from './archPlan.ts'
import { FIRE } from './Fire.tsx'
import { fadeFor, near, reduce, t, type Ctx } from './explode'
import { type Pin, type Reveal } from './Pins'
import { planFloor } from './roomPlan.ts'
import { useStore, type Phase } from './store'
import type { Building } from '../../shared/building'
import './rooms.css'

const DEG = Math.PI / 180
const PITCH = 34 * DEG // camera off vertical: a plan you can still read as 3D
const OTHER = 0 // other floors while the plan shows: gone
const SLAB = 0.3
const WALL_H = 1.2
const HAZ = { danger: '#ff453a', caution: '#ff9f0a' }

type Level = { fade: { a: number }; top: THREE.Material; side: THREE.Material; edge: THREE.Material }
type Play = (run: (c: Ctx) => void, next?: Phase) => () => void

// rotation -90 deg on x as the slabs: plan x -> x, y (north) -> -z
const segProps = ([[ax, ay], [bx, by]]: Seg, y: number, h: number, th: number) => ({
  position: [(ax + bx) / 2, y + h / 2, -(ay + by) / 2] as [number, number, number],
  rotation: [0, Math.atan2(by - ay, bx - ax), 0] as [number, number, number],
  scale: [Math.hypot(bx - ax, by - ay) + th, h, th] as [number, number, number],
})
const rectProps = (r: Rect, y: number, h: number) => ({
  position: [r.c[0], y + h / 2, -r.c[1]] as [number, number, number],
  rotation: [0, r.angle, 0] as [number, number, number],
  scale: [r.w, h, r.d] as [number, number, number],
})

export function Rooms({ b, floor, height, level, chips, play, onSelectPin }: {
  b: Building
  floor: number // contract numbering, 0 = B1
  height: number // slab thickness
  level: Level
  chips: Reveal[] // every chip on the stacked view; hidden while the plan shows
  play: Play
  onSelectPin: (pin: Pin) => void
}) {
  const rooms = useStore((s) => s.rooms)
  const setRooms = useStore((s) => s.setRooms)
  const toggle = useStore((s) => s.toggleRooms)
  const root = useRef<THREE.Group>(null)
  const rise = useRef<THREE.Group>(null)
  const labels = useRef<(HTMLDivElement | null)[]>([])
  const saved = useRef<Ctx['pose']>(null)
  const fire = useStore((s) => (s.fire?.floor === floor ? s.fire : null))

  const pins = useMemo(() => b.pins.filter((p) => p.anchor.kind === 'floor' && Math.min(p.anchor.floor, b.floors) === floor), [b, floor])
  const plan = useMemo(() => planFloor(b, floor, pins), [b, floor, pins]) // framing only: centre, extents, long axis
  const arch = useMemo(() => archPlan(b, floor, pins, fire?.dir), [b, floor, pins, fire])
  const colH = Math.max(1.5, height - SLAB)

  const res = useMemo(() => {
    const opaque = { transparent: true, opacity: 0 }
    const m = {
      slab: new THREE.MeshStandardMaterial({ color: '#e9e7e2', roughness: 0.95, ...opaque }),
      corridor: new THREE.MeshStandardMaterial({ color: '#cfd3d8', roughness: 0.95, ...opaque, polygonOffset: true, polygonOffsetFactor: -1 }),
      wall: new THREE.MeshStandardMaterial({ color: '#f7f7f5', roughness: 0.85, ...opaque }),
      facade: new THREE.MeshStandardMaterial({ color: '#dfe3e8', roughness: 0.4, metalness: 0.1, ...opaque }),
      coreWall: new THREE.MeshStandardMaterial({ color: '#b9bdc3', roughness: 0.8, ...opaque }),
      column: new THREE.MeshStandardMaterial({ color: '#3a3f47', roughness: 0.6, ...opaque }),
      shaft: new THREE.MeshStandardMaterial({ color: '#2b3038', roughness: 0.35, metalness: 0.7, ...opaque }),
      stair: new THREE.MeshStandardMaterial({ color: '#c8ccd2', roughness: 0.8, ...opaque }),
      tread: new THREE.LineBasicMaterial({ color: '#7d838c', ...opaque }),
    }
    const box = new THREE.BoxGeometry(1, 1, 1)
    const slab = new THREE.ExtrudeGeometry(new THREE.Shape(b.footprint.map(([x, y]) => new THREE.Vector2(x, y))), { depth: SLAB, bevelEnabled: false })
    const treads = new THREE.BufferGeometry().setFromPoints(
      arch.stairs.flatMap((s) => s.treads.flatMap(([[ax, ay], [bx, by]]) => [new THREE.Vector3(ax, SLAB + 0.62, -ay), new THREE.Vector3(bx, SLAB + 0.62, -by)])),
    )
    const haz = arch.rooms.map((r) => {
      const c = HAZ[r.tone]
      return {
        geo: r.polys.map((p) => new THREE.ShapeGeometry(new THREE.Shape(p.map(([x, y]) => new THREE.Vector2(x, y))))),
        floor: new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.35, roughness: 0.7, transparent: true, opacity: 0, polygonOffset: true, polygonOffsetFactor: -2 }),
        glow: new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0, depthWrite: false, toneMapped: false }),
      }
    })
    // the fire area burns over everything on the plan: per cell, a floor wash at its heat and a bright outline
    const burn = (arch.fire?.cells ?? []).map((c) => {
      const pts = c.poly.map(([x, y]) => new THREE.Vector2(x, y))
      return {
        heat: c.heat,
        geo: new THREE.ShapeGeometry(new THREE.Shape(pts)),
        ring: new THREE.BufferGeometry().setFromPoints(pts.map((p) => new THREE.Vector3(p.x, SLAB + 0.08, -p.y))),
        floor: new THREE.MeshBasicMaterial({ color: FIRE, transparent: true, opacity: 0, depthWrite: false, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -3 }),
        line: new THREE.LineBasicMaterial({ color: '#ffb199', transparent: true, opacity: 0, toneMapped: false }),
      }
    })
    return { m, box, slab, treads, haz, burn }
  }, [b.footprint, arch])
  useEffect(
    () => () => {
      Object.values(res.m).forEach((x) => x.dispose())
      ;[res.box, res.slab, res.treads].forEach((g) => g.dispose())
      res.haz.forEach((h) => [...h.geo, h.floor, h.glow].forEach((x) => x.dispose()))
      res.burn.forEach((f) => [f.geo, f.ring, f.floor, f.line].forEach((x) => x.dispose()))
    },
    [res],
  )
  const colRef = useRef<THREE.InstancedMesh>(null)
  useEffect(() => {
    const im = colRef.current
    if (!im) return
    const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), arch.angle)
    const mtx = new THREE.Matrix4()
    arch.columns.forEach(([x, y], i) => im.setMatrixAt(i, mtx.compose(new THREE.Vector3(x, SLAB + colH / 2, -y), q, new THREE.Vector3(0.6, colH, 0.6))))
    im.instanceMatrix.needsUpdate = true
  }, [arch, colH])

  const shown = useMemo(() => ({ v: 0 }), [])
  const grow = useMemo(() => ({ v: 0 }), [])
  const setSlab = (v: boolean) => void (level.top.visible = level.side.visible = level.edge.visible = v)
  // a snap-off (another floor focused, an answer lit) unmounts mid-way: put the stacked floor back as it was
  useEffect(
    () => () => {
      setSlab(true)
      if (useStore.getState().phase === 'exploded') chips.forEach((c) => (c.v = 1))
    },
    [], // eslint-disable-line react-hooks/exhaustive-deps
  )

  useFrame(({ clock }) => {
    const v = shown.v
    const m = res.m
    m.slab.opacity = v
    m.corridor.opacity = v
    m.wall.opacity = 0.9 * v
    m.facade.opacity = 0.45 * v
    m.coreWall.opacity = 0.95 * v
    m.column.opacity = v
    m.shaft.opacity = v
    m.stair.opacity = v
    m.tread.opacity = v
    ;[m.slab, m.corridor, m.column, m.shaft, m.stair].forEach((x) => (x.transparent = v < 0.999))
    if (rise.current) rise.current.scale.y = Math.max(0.001, grow.v)
    const pulse = reduce ? 0.5 : 0.5 + 0.5 * Math.sin(clock.elapsedTime * 2.2)
    for (const h of res.haz) {
      h.floor.opacity = 0.55 * v
      h.floor.emissiveIntensity = 0.25 + 0.3 * pulse
      h.glow.opacity = v * (0.12 + 0.12 * pulse)
    }
    const flame = reduce ? 0.6 : 0.6 + 0.25 * Math.sin(clock.elapsedTime * 5.3) + 0.15 * Math.sin(clock.elapsedTime * 8.9 + 1.3)
    for (const f of res.burn) {
      f.floor.opacity = v * Math.min(1, f.heat * (0.7 + 0.3 * flame)) // origin near solid, spread about half
      f.line.opacity = v * f.heat
    }
    labels.current.forEach((d) => d && (d.style.opacity = String(v)))
  })

  const open = (c: Ctx) => {
    saved.current ??= { ...c.pose }
    const w = root.current!.getWorldPosition(new THREE.Vector3())
    // the plan's long axis along the canvas's long side
    const tall = c.aspect < 1
    const A = plan.longAngle + (tall ? 0 : Math.PI / 2)
    const th = Math.atan2(-Math.cos(A), Math.sin(A))
    const theta = [th, th + Math.PI].map((x) => near(c.pose.theta, x)).reduce((m, x) => (Math.abs(x - c.pose.theta) < Math.abs(m - c.pose.theta) ? x : m))
    const [up, across] = tall ? [plan.long, plan.short] : [plan.short, plan.long]
    const fov = 2 * Math.tan(20 * DEG) // camera fov is 40 (App.tsx)
    let r = 1.45 * Math.max((up * Math.cos(PITCH)) / fov, across / (fov * c.aspect))
    // reached from the fire: land on the fire area, closer in, with the rest of the plate around it
    const at = useStore.getState().roomsAt === 'fire' && arch.fire ? arch.fire.c : null
    const [cx, cy] = at ? [plan.center[0] + 0.7 * (at[0] - plan.center[0]), plan.center[1] + 0.7 * (at[1] - plan.center[1])] : plan.center
    if (at) r *= 0.8
    const lift = (0.05 * fov * r) / Math.cos(PITCH)
    c.tl
      .to(chips, { v: 0, duration: t(0.3), ease: 'power2.in' }, 0)
      .to(c.fades, { a: (f: number) => (f === floor ? 1 : OTHER), duration: t(0.8), ease: 'sine.inOut' }, 0)
      .to(shown, { v: 1, duration: t(0.7), ease: 'power2.out' }, t(0.3))
      .call(() => setSlab(false), [], t(0.95))
      .to(grow, { v: 1, duration: t(1.1), ease: 'power3.out' }, t(0.7))
      .to(c.pose, { phi: PITCH, theta, r, tx: w.x + cx + lift * Math.sin(theta), ty: w.y + SLAB, tz: w.z - cy + lift * Math.cos(theta), duration: t(1.9), ease: 'sine.inOut' }, 0)
      .call(() => setRooms('on'))
  }
  const close = (c: Ctx) => {
    const next = useStore.getState().collapseAfterRooms // the floors collapse right after: don't bring this floor's chip back
    c.tl
      .to(grow, { v: 0, duration: t(0.6), ease: 'power2.in' }, 0)
      .call(() => setSlab(true), [], t(0.5))
      .to(shown, { v: 0, duration: t(0.5), ease: 'power2.in' }, t(0.5))
    if (saved.current) c.tl.to(c.pose, { ...saved.current, duration: t(1.5), ease: 'sine.inOut' }, 0)
    if (!next) c.tl.to(chips, { v: 1, duration: t(0.6), ease: 'power2.out' }, t(1.1)).to(c.fades, { a: (f: number) => fadeFor(f, c), duration: t(0.8), ease: 'sine.inOut' }, t(0.6))
    c.tl.call(() => setRooms('off'))
  }

  useEffect(() => {
    if (rooms === 'opening') {
      navigator.vibrate?.(20)
      return play(open)
    }
    if (rooms === 'closing') return play(close)
  }, [rooms]) // eslint-disable-line react-hooks/exhaustive-deps

  const elev = arch.shafts.length ? arch.shafts.reduce((s, r) => [s[0] + r.c[0] / arch.shafts.length, s[1] + r.c[1] / arch.shafts.length], [0, 0]) : arch.core.c
  const tags: { key: string; at: [number, number]; text: string; cls: string; pin?: Pin }[] = [
    { key: 'elev', at: [elev[0], elev[1]], text: arch.elevators > 1 ? 'Elevators' : 'Elevator', cls: 'arch' },
    // stairs: never drawn or placed. One plain note at the core, no position implied
    { key: 'stairs', at: [arch.core.c[0], arch.core.c[1] - arch.core.d / 2 - 2.5], text: 'Stairs: not on public record · verify on arrival', cls: 'arch unknown' },
    ...arch.rooms.map((r) => ({ key: r.name, at: r.c, text: `${r.name} · spot estimated`, cls: `arch hz ${r.tone}`, pin: r.pin })),
  ]
  const dispatchPin = pins.find((p) => p.origin === 'dispatch')
  if (fire && arch.fire) tags.push({ key: 'fire', at: arch.fire.c, text: `FIRE · ${fire.side.toUpperCase()}`, cls: 'arch fire', pin: dispatchPin })
  return (
    <group ref={root}>
      <mesh geometry={res.slab} material={res.m.slab} rotation-x={-Math.PI / 2} onClick={(e) => (e.stopPropagation(), toggle())} />
      <mesh geometry={res.box} material={res.m.corridor} {...rectProps(arch.corridor, SLAB, 0.02)} />
      {res.haz.map((h, i) =>
        h.geo.map((g, k) => (
          <group key={`${i}-${k}`}>
            <mesh geometry={g} material={h.floor} rotation-x={-Math.PI / 2} position-y={SLAB + 0.03} />
            <mesh geometry={g} material={h.glow} rotation-x={-Math.PI / 2} position-y={SLAB + 0.05} />
          </group>
        )),
      )}
      {res.burn.map((f, i) => (
        <group key={`fire${i}`}>
          <mesh geometry={f.geo} material={f.floor} rotation-x={-Math.PI / 2} position-y={SLAB + 0.07} renderOrder={3} />
          <lineLoop geometry={f.ring} material={f.line} renderOrder={3} />
        </group>
      ))}
      <group ref={rise} scale-y={0.001}>
        {arch.facade.map((s, i) => <mesh key={`f${i}`} geometry={res.box} material={res.m.facade} {...segProps(s, SLAB, WALL_H * 0.8, 0.18)} />)}
        {arch.walls.map((s, i) => <mesh key={`w${i}`} geometry={res.box} material={res.m.wall} {...segProps(s, SLAB, WALL_H, 0.14)} />)}
        {arch.coreWalls.map((s, i) => <mesh key={`c${i}`} geometry={res.box} material={res.m.coreWall} {...segProps(s, SLAB, WALL_H + 0.3, 0.3)} />)}
        {arch.shafts.map((r, i) => <mesh key={`e${i}`} geometry={res.box} material={res.m.shaft} {...rectProps(r, SLAB - 0.25, WALL_H + 0.45)} />)}
        {b.structure && <instancedMesh key={arch.columns.length} ref={colRef} args={[res.box, res.m.column, arch.columns.length]} frustumCulled={false} />}
      </group>
      {tags.map((g, i) => (
        <Html key={g.key} center position={[g.at[0], SLAB + WALL_H + 0.6, -g.at[1]]} zIndexRange={[g.pin ? 6 : 4, 0]} style={{ pointerEvents: g.pin ? 'auto' : 'none' }}>
          <div ref={(d) => void (labels.current[i] = d)} className={`room-label ${g.cls}`} style={{ opacity: 0, cursor: g.pin ? 'pointer' : undefined }} onClick={g.pin ? () => onSelectPin(g.pin!) : undefined}>
            {g.text}
            {g.key === 'fire' && <small>simulated · from dispatch</small>}
          </div>
        </Html>
      ))}
    </group>
  )
}

// DOM over the stage: while the plan shows, the estimate note (never off while the plan is up). The Rooms toggle lives in the shell dock
export function RoomsOverlay() {
  const { phase, target, rooms } = useStore()
  if (phase !== 'exploded' || target === null || rooms === 'off') return null
  return (
    <p className="rooms-banner" role="note" title="No public floor plan exists. Column spacing follows the structural system recorded in the SF Tall Building Inventory (5kya-mfst). Corridor and room grid are schematic. Stairs are not drawn: their location is not public. Hazard rooms are named in cited records; their spot on the floor is estimated.">
      {useStore.getState().building?.structure ? 'Columns: structural system per SF Tall Building Inventory · ' : ''}Corridor and rooms schematic · stairs not drawn
    </p>
  )
}
