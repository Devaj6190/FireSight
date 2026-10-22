// Second explode level: the focused floor opens into an isolated architectural cutaway (cutawayGeometry.ts) with
// mesh equipment symbols for the records anchored to it (EquipmentAsset.tsx, floorMarkers.ts). The footprint is
// recorded; the facade treatment, the assets and their spots on the floor are illustrative, and the overlay says so.
// Same motion language as explode.ts: one gsap timeline, the camera lands last.
import { Html } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { archPlan } from './archPlan.ts'
import { arrival } from './arrival.ts'
import { FIRE } from './Fire.tsx'
import { cutawayGeometry } from './cutawayGeometry.ts'
import { EquipmentAsset } from './EquipmentAsset.tsx'
import { fadeFor, near, reduce, t, type Ctx } from './explode'
import { floorIncident } from './floorIncident.ts'
import { floorMarkers } from './floorMarkers.ts'
import { type Pin, type Reveal } from './Pins'
import { useStore, type Phase } from './store'
import { fs } from './tokens'
import type { Building } from '../../shared/building'
import './rooms.css'

type Level = { fade: { a: number }; top: THREE.Material; side: THREE.Material; edge: THREE.Material }
type Play = (run: (c: Ctx) => void, next?: Phase) => () => void
export const compass: { el: HTMLElement | null } = { el: null }
const DEG = Math.PI / 180
const noRaycast = () => null
// Night Glass: a dark drafting sheet under the glass chrome; ?night=0 keeps the pale paper of the daytime map
const ink = fs.night
  ? { paper: '#080c12', slab: '#1b222c', fireSlab: '#2c1517', wall: '#232b36', glass: fs.action, line: '#c4cfdc', fireLine: fs.danger, ghost: '#5b6573', grid: '#3a4656', lower: '#3a4656' }
  : { paper: '#eeeee9', slab: '#fafbf7', fireSlab: '#fff0e8', wall: '#fafbf6', glass: '#8eabb5', line: '#384343', fireLine: '#b14b31', ghost: '#7f8c8a', grid: '#b4bfba', lower: '#cbd0cb' }

export function Rooms({ b, floor, level, chips, play, onSelectPin }: {
  b: Building
  floor: number // contract numbering, 0 = B1
  height: number // slab thickness
  level: Level
  chips: Reveal[] // every chip on the stacked view; hidden while the cutaway shows
  play: Play
  onSelectPin: (pin: Pin) => void
}) {
  const rooms = useStore((s) => s.rooms)
  const setRooms = useStore((s) => s.setRooms)
  const size = useThree((s) => s.size)
  const framedSize = useRef('')
  const root = useRef<THREE.Group>(null)
  const reveal = useRef<THREE.Group>(null)
  const saved = useRef<Ctx['pose']>(null)
  const model = useMemo(() => cutawayGeometry(b.footprint, b.floorHeightM), [b.footprint, b.floorHeightM])
  const shown = useMemo(() => ({ v: 0 }), [])
  const incident = useMemo(() => floorIncident(b, floor), [b, floor])
  const markers = useMemo(() => floorMarkers(b, floor), [b, floor])
  // the fire area a dispatch side named (scenario.ts), on the same estimated cells the stacked view burns (App.tsx)
  const fire = useStore((s) => (s.fire?.floor === floor ? s.fire : null))
  const fireArea = useMemo(() => {
    if (!fire) return undefined
    const on = b.pins.filter((p) => p.anchor.kind === 'floor' && Math.min(p.anchor.floor, b.floors) === floor)
    return archPlan(b, floor, on, fire.dir).fire
  }, [b, floor, fire])
  const burn = useMemo(
    () =>
      (fireArea?.cells ?? []).map((c) => {
        const pts = c.poly.map(([x, y]) => new THREE.Vector2(x, y))
        return {
          heat: c.heat,
          geo: new THREE.ShapeGeometry(new THREE.Shape(pts)),
          ring: new THREE.BufferGeometry().setFromPoints(pts.map((p) => new THREE.Vector3(p.x, 0.36, -p.y))),
          floor: new THREE.MeshBasicMaterial({ color: FIRE, transparent: true, opacity: 0, depthWrite: false, toneMapped: false }),
          line: new THREE.LineBasicMaterial({ color: '#ffb199', transparent: true, opacity: 0, toneMapped: false }),
        }
      }),
    [fireArea],
  )
  useEffect(() => () => burn.forEach((f) => [f.geo, f.ring, f.floor, f.line].forEach((x) => x.dispose())), [burn])
  const mat = useMemo(() => {
    const base = { transparent: true, opacity: 0, toneMapped: false }
    return {
      paper: new THREE.MeshBasicMaterial({ ...base, color: ink.paper, depthWrite: false, depthTest: false }),
      slab: new THREE.MeshBasicMaterial({ ...base, color: ink.slab }),
      wall: new THREE.MeshStandardMaterial({ ...base, color: ink.wall, roughness: 0.85, metalness: 0 }),
      glass: new THREE.MeshBasicMaterial({ ...base, color: ink.glass, depthWrite: false }),
      line: new THREE.LineBasicMaterial({ ...base, color: ink.line, depthWrite: false }),
      ghost: new THREE.LineBasicMaterial({ ...base, color: ink.ghost, depthWrite: false }),
      grid: new THREE.LineBasicMaterial({ ...base, color: ink.grid, depthWrite: false }),
      lower: new THREE.MeshBasicMaterial({ ...base, color: ink.lower, depthWrite: false }),
    }
  }, [])
  const screen = useMemo(() => new THREE.PlaneGeometry(12000, 12000), [])
  useEffect(() => () => {
    Object.values(mat).forEach((m) => m.dispose())
    Object.values(model).forEach((g) => g instanceof THREE.BufferGeometry && g.dispose())
    screen.dispose()
  }, [mat, model, screen])
  const setSlab = (v: boolean) => void (level.top.visible = level.side.visible = level.edge.visible = v)
  // a snap-off (another floor focused, an answer lit) unmounts mid-way: put the stacked floor back as it was
  useEffect(
    () => () => {
      setSlab(true)
      if (useStore.getState().phase === 'exploded') chips.forEach((c) => (c.v = 1))
    },
    [], // eslint-disable-line react-hooks/exhaustive-deps
  )

  useFrame(({ camera, clock }) => {
    const v = shown.v
    const flame = reduce ? 0.6 : 0.6 + 0.25 * Math.sin(clock.elapsedTime * 5.3) + 0.15 * Math.sin(clock.elapsedTime * 8.9 + 1.3)
    for (const f of burn) {
      f.floor.opacity = v * Math.min(1, f.heat * (0.7 + 0.3 * flame)) // origin near solid, spread about half
      f.line.opacity = v * f.heat
    }
    const fire = incident.here.length > 0 // a dispatch or crew report on this floor, never a historical record
    mat.paper.opacity = v
    mat.slab.color.set(fire ? ink.fireSlab : ink.slab)
    mat.line.color.set(fire ? ink.fireLine : ink.line)
    mat.slab.opacity = v
    mat.wall.opacity = v
    mat.glass.opacity = (fs.night ? 0.14 : 0.19) * v
    mat.line.opacity = 0.8 * v
    mat.ghost.opacity = 0.4 * v
    mat.grid.opacity = (fs.night ? 0.35 : 0.23) * v
    mat.lower.opacity = (fs.night ? 0.3 : 0.16) * v
    if (reveal.current) reveal.current.scale.y = Math.max(0.001, v)
    if (compass.el) {
      const dir = camera.getWorldDirection(new THREE.Vector3())
      compass.el.style.transform = `rotate(${Math.atan2(-dir.x, -dir.z)}rad)`
    }
  })

  const open = (c: Ctx) => {
    saved.current ??= { ...c.pose }
    const w = root.current!.getWorldPosition(new THREE.Vector3())
    const [x0, x1, y0, y1] = model.bounds
    // frame ONLY this floor: hydrants belong at street level, not floating on floor 22
    let r = Math.hypot(x1 - x0, y1 - y0) * Math.max(1.32, 1.32 / c.aspect)
    // reached from the fire: land on the fire area, closer in, with the rest of the floor around it
    const at = useStore.getState().roomsAt === 'fire' && fireArea ? fireArea.c : null
    const [mx, my] = [(x0 + x1) / 2, (y0 + y1) / 2]
    const [cx, cy] = at ? [mx + 0.7 * (at[0] - mx), my + 0.7 * (at[1] - my)] : [mx, my]
    if (at) r *= 0.8
    c.tl
      .to(chips, { v: 0, duration: t(0.25), ease: 'power2.in' }, 0)
      .to(c.fades, { a: (f: number) => (f === floor ? 1 : 0), duration: t(0.7), ease: 'sine.inOut' }, 0)
      .call(() => setSlab(false), [], t(0.3))
      .to(shown, { v: 1, duration: t(1.1), ease: 'power2.inOut' }, t(0.25))
      .to(c.pose, { phi: 53 * DEG, theta: near(c.pose.theta, 18 * DEG), r, tx: w.x + cx, ty: w.y, tz: w.z - cy, duration: t(1.6), ease: 'power3.inOut' }, 0)
      .call(() => setRooms('on'))
  }
  const close = (c: Ctx) => {
    const next = useStore.getState().collapseAfterRooms // the floors collapse right after: don't bring this floor's chip back
    c.tl.call(() => setSlab(true), [], t(0.5)).to(shown, { v: 0, duration: t(0.65), ease: 'power2.in' }, 0)
    if (saved.current) c.tl.to(c.pose, { ...saved.current, duration: t(1.3), ease: 'power3.inOut' }, 0)
    if (!next) c.tl.to(chips, { v: 1, duration: t(0.4), ease: 'power2.out' }, t(0.9)).to(c.fades, { a: (f: number) => fadeFor(f, c), duration: t(0.7), ease: 'sine.inOut' }, t(0.6))
    c.tl.call(() => setRooms('off'))
  }

  // refit when the canvas changes size (a phone rotating, a window resized) so the floor stays framed
  useEffect(() => {
    const key = `${size.width}:${size.height}`
    if (rooms === 'opening' || (rooms === 'on' && (shown.v === 0 || framedSize.current !== key))) {
      if (rooms === 'opening') navigator.vibrate?.(20)
      framedSize.current = key
      return play(open)
    }
    if (rooms === 'on') setSlab(false)
    if (rooms === 'closing') return play(close)
  }, [rooms, size.width, size.height]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <group ref={root}>
      <mesh geometry={screen} material={mat.paper} rotation-x={-Math.PI / 2} position-y={-2.5} renderOrder={1} raycast={noRaycast} />
      <mesh geometry={model.plate} material={mat.lower} position-y={-1.6} renderOrder={2} raycast={noRaycast} />
      <lineSegments geometry={model.plateEdges} material={mat.ghost} position-y={-1.6} renderOrder={3} raycast={noRaycast} />
      <mesh geometry={model.plate} material={mat.slab} renderOrder={4} raycast={noRaycast} />
      <lineSegments geometry={model.plateEdges} material={mat.line} renderOrder={5} raycast={noRaycast} />
      <lineSegments geometry={model.grid} material={mat.grid} renderOrder={5} raycast={noRaycast} />
      {burn.map((f, i) => (
        <group key={`fire${i}`}>
          <mesh geometry={f.geo} material={f.floor} rotation-x={-Math.PI / 2} position-y={0.34} renderOrder={5} raycast={noRaycast} />
          <lineLoop geometry={f.ring} material={f.line} renderOrder={5} raycast={noRaycast} />
        </group>
      ))}
      {rooms === 'on' && fire && fireArea && (
        <Html position={[fireArea.c[0], 6, -fireArea.c[1]]} center zIndexRange={[12, 8]}>
          <button className="fire-tag" onClick={() => { const p = b.pins.find((q) => q.origin === 'dispatch' && q.anchor.kind === 'floor' && q.anchor.floor === floor); if (p) onSelectPin(p) }} aria-label={`Fire area, ${fire.side}, simulated. Open the dispatch record`}>
            <i aria-hidden />FIRE · {fire.side.toUpperCase()}<small>simulated · from dispatch</small>
          </button>
        </Html>
      )}
      <group ref={reveal}>
        <mesh geometry={model.walls} material={mat.wall} renderOrder={6} raycast={noRaycast} />
        <mesh geometry={model.windows} material={mat.glass} renderOrder={7} raycast={noRaycast} />
        <lineSegments geometry={model.ink} material={mat.line} renderOrder={8} raycast={noRaycast} />
      </group>
      {rooms === 'on' && markers.map((m, i) => (
        <group key={m.id} position={[m.at[0], 0.35, -m.at[1]]}>
          <EquipmentAsset marker={m} onSelect={() => m.pin && onSelectPin(m.pin)} />
          <Html position={[0, 8, 0]} center zIndexRange={[11, 7]}>
            <button className={`floor-map-marker ${m.kind}`} onClick={() => m.pin && onSelectPin(m.pin)} disabled={!m.pin} aria-label={`${m.title}. Position unverified.${m.pin ? ' Open source record.' : ''}`}>
              <span className="floor-marker-number">{String(i + 1).padStart(2, '0')}</span>
              <span><strong>{m.title}</strong><small>Position unverified{m.pin?.stale ? ' · stale' : ''}</small></span>
            </button>
          </Html>
        </group>
      ))}
    </group>
  )
}

// DOM over the stage while the cutaway shows: which floor, the incident state, the compass and the illustrative note
// (never off while the cutaway is up). The toggle lives in the shell dock and the floor panel; the floor's people,
// hazards, floor above and water stay in the sheet's floor panel
export function RoomsOverlay() {
  const { phase, target, rooms, building, setBuilding } = useStore()
  const a = useMemo(() => (building && target !== null ? arrival(building, target) : null), [building, target])
  const incident = useMemo(() => (building && target !== null ? floorIncident(building, target) : null), [building, target])
  if (phase !== 'exploded' || target === null || rooms === 'off' || !building || !a || !incident) return null
  const name = target === 0 ? 'B1' : String(target).padStart(2, '0')
  const where = target === 0 ? 'B1' : `floor ${target}`
  const mine = `crew-fire-${target}`
  // reports live only in the in-memory building: nothing is saved or transmitted, a reload clears them
  const markFire = () => {
    const pin: Pin = { id: mine, layer: 'crew_note', origin: 'crew', severity: 'danger', label: `Reported fire, ${target === 0 ? 'basement' : `floor ${target}`}`, detail: 'User marked fire on this floor in the prototype. Exact position is unknown. Not independently verified.', anchor: { kind: 'floor', floor: target }, claim: 'unverifiable', evidence: [], stale: false }
    setBuilding({ ...building, pins: [...building.pins.filter((p) => p.id !== mine), pin] })
  }
  const here = incident.here.length > 0
  return (
    <div className="cutaway-overlay">
      <div className="cutaway-orientation" aria-hidden="true"><div ref={(d) => void (compass.el = d)}><b>N</b><span>↑</span></div></div>
      <div className="cutaway-column">
        <header className="cutaway-heading">
          <span className="cutaway-eyebrow">Floor cutaway · hazards & systems</span>
          <h2><span>Floor</span> {name}</h2>
          <p>{a.level} · {a.areaText}</p>
        </header>
        <aside className={`cutaway-incident${here ? ' reported' : ''}`} aria-label="Incident location" aria-live="polite">
          <span className="incident-kicker">{here ? 'Reported incident' : 'Incident location'}</span>
          <strong>{here ? `Fire / smoke reported · ${where}` : incident.fires.length ? 'Fire reported elsewhere' : 'Fire location not reported'}</strong>
          <p>{here ? 'Floor-level report. Exact position unknown.' : incident.fires.length ? incident.fires.map((p) => (p.anchor.kind === 'floor' ? `Floor ${p.anchor.floor === 0 ? 'B1' : p.anchor.floor}` : p.anchor.kind === 'roof' ? 'Roof' : 'Floor unspecified')).join(' · ') : 'Selecting a floor does not locate the fire.'}</p>
          {here ? <small>{[...new Set(incident.here.map((p) => (p.origin === 'dispatch' ? 'Dispatch report' : 'Crew report')))].join(' · ')} · unverified</small> : <button type="button" onClick={markFire}>Report fire on this floor</button>}
          {building.pins.some((p) => p.id === mine) && <button type="button" onClick={() => setBuilding({ ...building, pins: building.pins.filter((p) => p.id !== mine) })}>Clear my report</button>}
        </aside>
        <p className="cutaway-caption" role="note">Recorded footprint · illustrative facade<small>Illustrative 3D assets · positions, dimensions and counts unverified</small></p>
      </div>
    </div>
  )
}
