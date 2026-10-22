// Second explode level: the focused floor splits into rooms that drift apart in plan, like an exploded floor plan.
// Same motion language as explode.ts: one gsap timeline, long overlapping eases, the camera lands last.
// The layout is schematic (roomPlan.ts); the overlay says so on screen whenever the rooms are showing.
import { Html } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useEffect, useLayoutEffect, useMemo, useRef, type CSSProperties, type ReactNode } from 'react'
import * as THREE from 'three'
import { fadeFor, near, reduce, t, type Ctx } from './explode'
import { floorViz, scatter, WORK, type FloorViz, type Occupant, type UnitCell } from './floorViz.ts'
import { PinMarker, SEVERITY_ORDER, type Pin, type Reveal } from './Pins'
import { planFloor, type Room } from './roomPlan.ts'
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

// hazards only in red / orange; work only in blues (floorViz.WORK); everything else stays neutral
export const HAZ = { danger: '#ff453a', caution: '#ff9f0a' }
const hazardOf = (r: Room) => (r.kind !== 'named' ? null : r.pins.some((p) => p.severity === 'danger') ? HAZ.danger : HAZ.caution)
const NEUTRAL_OPEN = '#66707c'
const mix = (a: string, b: string, k: number) => '#' + new THREE.Color(a).lerp(new THREE.Color(b), k).getHexString()
export const cellBase = (c?: UnitCell) => (c?.work ? mix(fs.slabTop, WORK[c.work].color, 0.62) : NEUTRAL_OPEN)
export const sentence = (s: string) => (s.charAt(0) + s.slice(1).toLowerCase()).replace(/ rm$/, ' room')
export const occText = (o: Occupant) => (o.hazard ? `${o.kind} · ${o.hazard.toLowerCase()}` : o.kind)

// diagonal stripes = open permit, walls or ceilings may be open. Cap UVs are metres, so the stripes keep their scale
const hatches = new Map<string, THREE.CanvasTexture>()
function hatch(base: string) {
  let tex = hatches.get(base)
  if (tex) return tex
  const c = document.createElement('canvas')
  c.width = c.height = 64
  const g = c.getContext('2d')!
  g.fillStyle = base
  g.fillRect(0, 0, 64, 64)
  g.strokeStyle = 'rgba(255,255,255,0.5)'
  g.lineWidth = 9
  for (let k = -64; k <= 64; k += 32) {
    g.beginPath()
    g.moveTo(k, 0)
    g.lineTo(k + 64, 64)
    g.stroke()
  }
  tex = new THREE.CanvasTexture(c)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(0.4, 0.4)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  hatches.set(base, tex)
  return tex
}

const svg = (d: ReactNode) => (
  <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    {d}
  </svg>
)
export const ICON = {
  battery: svg(<><rect x="2" y="4.5" width="10.5" height="7" rx="1.5" /><path d="M14 7v2M7.8 5.8 6 8.2h2.4L6.6 10.6" /></>),
  server: svg(<><rect x="3" y="2.5" width="10" height="4.5" rx="1" /><rect x="3" y="9" width="10" height="4.5" rx="1" /><path d="M5.5 4.75h.01M5.5 11.25h.01" /></>),
  pump: svg(<><circle cx="8" cy="8" r="5.5" /><path d="M8 8l3-2.5M8 2.5v1.5" /></>),
  people: svg(<><circle cx="6" cy="5.5" r="2" /><circle cx="11" cy="6.5" r="1.6" /><path d="M2.5 13c.4-2.4 1.8-3.6 3.5-3.6s3.1 1.2 3.5 3.6M9.8 13c.2-1.6 1-2.6 2.2-2.6s2 .9 2.3 2.6" /></>),
  flame: svg(<path d="M8 14c-2.6 0-4.3-1.8-4.3-4.1C3.7 7 6.4 5.9 7 2.2c2 1.4 5.3 4.2 5.3 7.7 0 2.3-1.7 4.1-4.3 4.1Zm0 0c-1.1 0-1.8-.8-1.8-1.8 0-1.3 1.1-1.9 1.8-3.2.7 1.3 1.8 1.9 1.8 3.2 0 1-.7 1.8-1.8 1.8Z" />),
  kitchen: svg(<><path d="M4 2.5v4a2 2 0 0 0 2 2v5M6 2.5v3M8 2.5v4a2 2 0 0 1-2 2" /><path d="M11.5 13.5v-11c1.4.8 2 2.6 2 4.5s-.9 2.5-2 2.5" /></>),
  shop: svg(<><path d="M2.5 6.5h11l-1-3.5h-9Z" /><path d="M3.5 6.5v7h9v-7M6.5 13.5v-4h3v4" /></>),
}
export const iconFor = (name = '') => (/computer|battery/i.test(name) ? ICON.battery : /server/i.test(name) ? ICON.server : /pump|generator/i.test(name) ? ICON.pump : ICON.people)
export const occIcon = (o: Occupant) => (/cook|kitchen|food|restaurant|cafe|cafeteria/i.test(`${o.kind} ${o.hazard ?? ''}`) ? ICON.kitchen : ICON.shop)

// one instanced mesh per room: a dot per person on the occupant-load permit, seeded, not real positions
function Crowd({ pts, y, geo, mat }: { pts: [number, number][]; y: number; geo: THREE.BufferGeometry; mat: THREE.Material }) {
  const ref = useRef<THREE.InstancedMesh>(null)
  useLayoutEffect(() => {
    const m = new THREE.Matrix4()
    pts.forEach(([x, z], i) => ref.current!.setMatrixAt(i, m.makeTranslation(x * INSET, y, -z * INSET)))
    ref.current!.instanceMatrix.needsUpdate = true
  }, [pts, y])
  return <instancedMesh ref={ref} args={[geo, mat, pts.length]} frustumCulled={false} />
}

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
  const viz = useMemo(() => floorViz(b, floor, plan), [b, floor, plan])
  const crowd = useMemo(() => scatter(plan, viz.people, `${b.id}:${floor}:people`), [plan, viz.people, b.id, floor])
  const busiest = useMemo(() => [...crowd].sort((p, q) => q[1].length - p[1].length)[0]?.[0], [crowd])
  const fx = useMemo(
    () => ({
      dot: new THREE.SphereGeometry(0.32, 10, 8),
      dotMat: new THREE.MeshBasicMaterial({ color: '#f5f5f7', transparent: true, opacity: 0 }),
      wash: new THREE.MeshBasicMaterial({ color: '#8e8e93', transparent: true, opacity: 0, depthWrite: false }),
    }),
    [],
  )
  const washGeo = useMemo(() => {
    const k = 1 + SPREAD + 0.08 // still under the rooms once they have drifted apart
    const [cx, cy] = plan.center
    return new THREE.ShapeGeometry(new THREE.Shape(b.footprint.map(([x, y]) => new THREE.Vector2(cx + (x - cx) * k, cy + (y - cy) * k))))
  }, [b.footprint, plan.center])
  useEffect(() => () => [fx.dot, fx.dotMat, fx.wash, washGeo].forEach((o) => o.dispose()), [fx, washGeo])
  const parts = useMemo(
    () =>
      plan.rooms.map((r) => {
        const shape = new THREE.Shape(r.poly.map(([x, y]) => new THREE.Vector2(x - r.c[0], y - r.c[1])))
        const geo = new THREE.ExtrudeGeometry(shape, { depth: height, bevelEnabled: false })
        const core = r.kind === 'core'
        const cell = viz.cells.get(r.id)
        const occ = viz.occupants.get(r.id) ?? []
        const hz = hazardOf(r) ?? (occ.some((o) => o.hazard) ? HAZ.caution : null)
        const top = hz
          ? new THREE.MeshStandardMaterial({ color: mix(fs.slabTop, hz, 0.45), emissive: hz, emissiveIntensity: 0.55, roughness: 0.6 })
          : cell?.open
            ? new THREE.MeshStandardMaterial({ color: '#ffffff', map: hatch(cellBase(cell)), roughness: 0.75 })
            : cell?.work
              ? new THREE.MeshStandardMaterial({ color: cellBase(cell), emissive: WORK[cell.work].color, emissiveIntensity: 0.12, roughness: 0.75 })
              : new THREE.MeshStandardMaterial({ color: core ? fs.surface : fs.slabTop, roughness: 0.9 })
        return {
          geo,
          edges: new THREE.EdgesGeometry(geo, 15),
          top,
          side: new THREE.MeshStandardMaterial({ color: core ? fs.bg : fs.slab, roughness: 0.9, ...(hz && { emissive: hz, emissiveIntensity: 0.3 }) }),
          line: new THREE.LineBasicMaterial({ color: hz ?? (cell?.work ? WORK[cell.work].color : fs.muted) }),
          hz,
          cell,
          occ,
          // a soft glow under a hazard room, larger than the room so it shows past the walls
          halo: hz ? { geo: new THREE.ShapeGeometry(shape), mat: new THREE.MeshBasicMaterial({ color: hz, transparent: true, opacity: 0, depthWrite: false, toneMapped: false }) } : null,
          // pins in a room, danger first; clones get their own id so the stacked chip keeps its declutter slot
          pins: [...r.pins].sort((p, q) => SEVERITY_ORDER[p.severity] - SEVERITY_ORDER[q.severity]).map((p) => ({ pin: { ...p, id: `${p.id}#room` }, src: p, reveal: { v: 0 } })),
          away: [(r.c[0] - plan.center[0]) * SPREAD, (r.c[1] - plan.center[1]) * SPREAD] as const,
        }
      }),
    [plan, height, viz],
  )
  useEffect(() => () => parts.forEach((p) => [p.geo, p.edges, p.top, p.side, p.line, p.halo?.geo, p.halo?.mat].forEach((o) => o?.dispose())), [parts])
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

  const extras = useRef<(HTMLDivElement | null)[]>([])
  useFrame(({ clock }) => {
    labels.current.forEach((d) => d && (d.style.opacity = String(shown.v)))
    extras.current.forEach((d) => d && (d.style.opacity = String(shown.v)))
    const pulse = reduce ? 0.5 : 0.5 + 0.5 * Math.sin(clock.elapsedTime * 2.2)
    for (const p of parts) {
      if (!p.halo) continue
      p.halo.mat.opacity = shown.v * (0.2 + 0.2 * pulse)
      ;(p.top as THREE.MeshStandardMaterial).emissiveIntensity = 0.4 + 0.35 * pulse * shown.v
    }
    fx.dotMat.opacity = 0.92 * shown.v
    fx.wash.opacity = viz.sprinklerUnknown ? 0.14 * shown.v : 0
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
    // and a little to screen-right of the plan, so the plan sits left of the legend and the floor rail (desktop)
    const side = c.aspect > 1 ? 0.1 * fov * c.aspect * r : 0
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
      .to(c.pose, { phi: PITCH, theta, r, tx: w.x + plan.center[0] + lift * Math.sin(theta) + side * Math.cos(theta), ty: w.y + height * WALL, tz: w.z - plan.center[1] + lift * Math.cos(theta) - side * Math.sin(theta), duration: t(1.9), ease: 'sine.inOut' }, 0)
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
  const capY = height * WALL
  const cls = (r: Room, p: (typeof parts)[number]) =>
    ['room-label', r.kind, p.hz === HAZ.danger ? 'danger' : p.hz ? 'caution' : '', p.cell || p.occ.length ? 'unit' : '', p.cell?.work ? `w-${p.cell.work}` : '', p.cell?.open ? 'open' : '']
      .filter(Boolean)
      .join(' ')
  return (
    <group ref={root}>
      {viz.sprinklerUnknown && <mesh geometry={washGeo} material={fx.wash} rotation-x={-Math.PI / 2} position-y={0.02} renderOrder={-1} />}
      {plan.rooms.map((r, i) => {
        const p = parts[i]
        const dots = crowd.get(r.id)
        return (
          <group key={r.id} ref={(g) => void (outer.current[i] = g!)} position={[r.c[0], 0, -r.c[1]]}>
            <group ref={(g) => void (inner.current[i] = g!)}>
              <mesh geometry={p.geo} rotation-x={-Math.PI / 2} material={[p.top, p.side]} onClick={(e) => (e.stopPropagation(), toggle())}>
                <lineSegments geometry={p.edges} material={p.line} />
              </mesh>
            </group>
            {p.halo && <mesh geometry={p.halo.geo} material={p.halo.mat} rotation-x={-Math.PI / 2} position-y={0.04} scale={1.16} />}
            {dots && <Crowd pts={dots} y={capY + 0.32} geo={fx.dot} mat={fx.dotMat} />}
            {p.pins.map((q, k) => (
              <group key={q.pin.id} onClick={(e) => (e.stopPropagation(), onSelectPin(q.src))}>
                <PinMarker pin={q.pin} at={[(k - (p.pins.length - 1) / 2) * 3, capY, 0]} reveal={q.reveal} fade={level.fade} />
              </group>
            ))}
            {(r.kind !== 'space' || p.cell || p.occ.length > 0) && (
              <Html center position-y={capY + 0.3} zIndexRange={[r.kind === 'named' ? 6 : 4, 0]} style={{ pointerEvents: 'none' }}>
                <div ref={(d) => void (labels.current[i] = d)} className={cls(r, p)} style={{ opacity: 0 }}>
                  {r.kind === 'core' ? (
                    <>
                      <b>Core? · unverifiable</b>
                      {viz.fire && (
                        <span className="floor-badge fire">
                          {ICON.flame}
                          {fireText(viz)}
                        </span>
                      )}
                    </>
                  ) : r.kind === 'named' ? (
                    <>
                      <i className="hz-icon">{iconFor(r.name)}</i>
                      <span className="hz-text">
                        <b>{sentence(r.name!)}</b>
                        <span>{`${sentence(r.claim!)} · ${r.cite}`}</span>
                        <span>Spot on floor: schematic</span>
                      </span>
                    </>
                  ) : (
                    <>
                      {p.cell && <b>{p.cell.unit}</b>}
                      {p.occ.map((o) => (
                        <span key={o.recordId + o.kind} className={`occ${o.hazard ? ' hz' : ''}`}>
                          {occIcon(o)}
                          {occText(o)}
                        </span>
                      ))}
                    </>
                  )}
                </div>
              </Html>
            )}
            {r.id === busiest && (
              <Html center position-y={capY + 0.3} zIndexRange={[5, 0]} style={{ pointerEvents: 'none' }}>
                <div ref={(d) => void (extras.current[0] = d)} className="floor-badge people" style={{ opacity: 0 }}>
                  {ICON.people}
                  {`Up to ${viz.people} people (assembly permit)`}
                </div>
              </Html>
            )}
          </group>
        )
      })}
    </group>
  )
}

export const fireText = (v: FloorViz) =>
  v.fire!.count > 1
    ? `${v.fire!.count} fire origins on this floor${v.fire!.year ? ` · newest ${v.fire!.year}` : ''}`
    : `Fire origin${v.fire!.year ? ` ${v.fire!.year}` : ' on record'} · this floor`

// DOM over the stage: the Rooms toggle and, while rooms show, the schematic disclaimer (never off while rooms are up)
export function RoomsOverlay() {
  const { phase, target, rooms, toggleRooms, building } = useStore()
  if (phase !== 'exploded' || target === null) return null
  const busy = rooms === 'opening' || rooms === 'closing'
  return (
    <>
      {rooms !== 'off' && (
        <p className="rooms-banner" role="note" title="Room shapes and the core are generated, not surveyed. Named rooms come from cited records; where they sit on the floor is not public.">
          Schematic layout · no public floor plan
        </p>
      )}
      {rooms !== 'off' && building && <Legend b={building} floor={target} />}
      <button className="rooms-toggle" disabled={busy} aria-pressed={rooms === 'on'} onClick={toggleRooms}>
        {rooms === 'off' ? `Rooms · floor ${target === 0 ? 'B1' : target}` : busy ? '…' : 'Back to floors'}
      </button>
    </>
  )
}

// what each encoding means, only rows this floor actually draws; every number from floorFacts
function Legend({ b, floor }: { b: Building; floor: number }) {
  const { plan, viz } = useMemo(() => {
    const plan = planFloor(b, floor, b.pins.filter((p) => p.anchor.kind === 'floor' && Math.min(p.anchor.floor, b.floors) === floor))
    return { plan, viz: floorViz(b, floor, plan) }
  }, [b, floor])
  const named = plan.rooms.filter((r) => r.kind === 'named')
  const occ = [...viz.occupants.values()].flat()
  const f = viz.facts
  const units = f?.units.length ?? 0
  const row = (key: string, swatch: ReactNode, text: ReactNode, sub?: string) => (
    <li key={key}>
      {swatch}
      <span>
        {text}
        {sub && <small>{sub}</small>}
      </span>
    </li>
  )
  const sw = (style: CSSProperties, cls = '') => <i className={`lg-sw ${cls}`} style={style} />
  return (
    <aside className="rooms-legend" aria-label="Floor legend">
      <h4>{f?.label ?? (floor === 0 ? 'B1' : `Floor ${floor}`)} · from public records</h4>
      <ul>
        {named.map((r) => {
          const c = hazardOf(r)!
          return row(r.id, <i className="lg-icon" style={{ color: c }}>{iconFor(r.name)}</i>, sentence(r.name!), r.cite)
        })}
        {occ.map((o) =>
          row(
            `o${o.recordId}${o.kind}`,
            <i className="lg-icon" style={{ color: o.hazard ? HAZ.caution : 'var(--lg-ink2)' }}>{occIcon(o)}</i>,
            occText(o),
            `${o.source}${o.unit ? ` · unit ${o.unit}` : ''}`,
          ),
        )}
        {viz.cats.map((c) => row(c, sw({ background: cellBase({ unit: '', work: c, open: false }), boxShadow: `inset 0 0 0 1px ${WORK[c].color}` }), WORK[c].label, 'Permit on the unit, last 2 years'))}
        {viz.anyOpen &&
          row('open', sw({}, 'hatch'), 'Open permit on the unit', `Walls may be open${f?.openPermits ? ` · ${f.openPermits} open on this floor` : ''}`)}
        {units > 0 &&
          row('units', sw({}, 'unit'), `${units} unit${units > 1 ? 's' : ''} named in permits`, viz.unplaced.length ? `Lower bound · ${viz.unplaced.length} not drawn` : 'Lower bound · cells schematic')}
        {viz.people > 0 && row('people', <i className="lg-dot" />, `Up to ${viz.people} people (assembly permit)`, 'One dot per person · spread is schematic')}
        {viz.fire && row('fire', <i className="lg-icon" style={{ color: HAZ.caution }}>{ICON.flame}</i>, fireText(viz), 'SFFD incident, floor of origin')}
        {viz.sprinklerUnknown && row('spr', sw({}, 'wash'), 'Sprinkler coverage on this floor: not on record', 'No public record of which areas are covered')}
      </ul>
      <p>Schematic layout · no public floor plan</p>
    </aside>
  )
}
