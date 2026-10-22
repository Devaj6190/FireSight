import { Html } from '@react-three/drei'
// A selected floor presented as an architectural section. The footprint is recorded;
// the facade treatment is illustrative. Unlocated records stay in the evidence panel.
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { arrival, sentence } from './arrival'
import { floorIncident } from './floorIncident'
import { floorMarkers } from './floorMarkers'
import { EquipmentAsset } from './EquipmentAsset'
import { cutawayGeometry } from './cutawayGeometry'
import { fadeFor, near, t, type Ctx } from './explode'
import { type Pin, type Reveal } from './Pins'
import { useStore, type Phase } from './store'
import type { Building } from '../../shared/building'
import './rooms.css'

type Level = { fade: { a: number }; top: THREE.Material; side: THREE.Material; edge: THREE.Material }
type Play = (run: (c: Ctx) => void, next?: Phase) => () => void
export const compass: { el: HTMLElement | null } = { el: null }
const DEG = Math.PI / 180
const noRaycast = () => null

export function Rooms({ b, floor, level, chips, play, onSelectPin }: {
  b: Building; floor: number; height: number; level: Level; chips: Reveal[]; play: Play; onSelectPin: (pin: Pin) => void
}) {
  const rooms = useStore(s => s.rooms)
  const size = useThree(s => s.size)
  const framedSize = useRef('')
  const setRooms = useStore(s => s.setRooms)
  const root = useRef<THREE.Group>(null)
  const reveal = useRef<THREE.Group>(null)
  const saved = useRef<Ctx['pose']>(null)
  const model = useMemo(() => cutawayGeometry(b.footprint, b.floorHeightM), [b.footprint, b.floorHeightM])
  const shown = useMemo(() => ({ v: 0 }), [])
  const incident = useMemo(() => floorIncident(b, floor), [b, floor])
  const markers = useMemo(() => floorMarkers(b, floor), [b, floor])
  const mat = useMemo(() => {
    const base = { transparent: true, opacity: 0, toneMapped: false }
    return {
      paper: new THREE.MeshBasicMaterial({ ...base, color: '#eeeee9', depthWrite: false, depthTest: false }),
      slab: new THREE.MeshBasicMaterial({ ...base, color: '#fafbf7' }),
      wall: new THREE.MeshStandardMaterial({ ...base, color: '#fafbf6', roughness: 0.85, metalness: 0 }),
      glass: new THREE.MeshBasicMaterial({ ...base, color: '#8eabb5', depthWrite: false }),
      line: new THREE.LineBasicMaterial({ ...base, color: '#384343', depthWrite: false }),
      ghost: new THREE.LineBasicMaterial({ ...base, color: '#7f8c8a', depthWrite: false }),
      grid: new THREE.LineBasicMaterial({ ...base, color: '#b4bfba', depthWrite: false }),
      lower: new THREE.MeshBasicMaterial({ ...base, color: '#cbd0cb', depthWrite: false }),
    }
  }, [])
  const screen = useMemo(() => new THREE.PlaneGeometry(12000, 12000), [])
  useEffect(() => () => {
    Object.values(mat).forEach(m => m.dispose())
    Object.values(model).forEach(g => { if (g instanceof THREE.BufferGeometry) g.dispose() })
    screen.dispose()
  }, [mat, model, screen])
  const setSlab = (visible: boolean) => { level.top.visible = level.side.visible = level.edge.visible = visible }
  useEffect(() => () => {
    setSlab(true)
    if (useStore.getState().phase === 'exploded') chips.forEach(c => { c.v = 1 })
  }, [])
  useFrame(({ camera }) => {
    const v = shown.v
    mat.paper.opacity = v
    mat.slab.color.set(incident.here.length ? '#fff0e8' : '#fafbf7')
    mat.line.color.set(incident.here.length ? '#b14b31' : '#384343')
    mat.slab.opacity = v
    mat.wall.opacity = v
    mat.glass.opacity = 0.19 * v
    mat.line.opacity = 0.8 * v
    mat.ghost.opacity = 0.4 * v
    mat.grid.opacity = 0.23 * v
    mat.lower.opacity = 0.16 * v
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
    const span = Math.hypot(x1 - x0, y1 - y0)
    // Frame ONLY this floor. Hydrants belong at street level, not floating on floor 22.
    const r = span * Math.max(1.32, 1.32 / (size.width / size.height))
    c.tl
      .to(chips, { v: 0, duration: t(0.25) }, 0)
      .to(c.fades, { a: (f: number) => f === floor ? 1 : 0, duration: t(0.7) }, 0)
      .call(() => setSlab(false), [], t(0.3))
      .to(shown, { v: 1, duration: t(1.1), ease: 'power2.inOut' }, t(0.25))
      .to(c.pose, { phi: 53 * DEG, theta: near(c.pose.theta, 18 * DEG), r, tx: w.x + (x0 + x1) / 2, ty: w.y - 10, tz: w.z - (y0 + y1) / 2, duration: t(1.6), ease: 'power3.inOut' }, 0)
      .call(() => setRooms('on'))
  }
  const close = (c: Ctx) => {
    const next = useStore.getState().collapseAfterRooms
    c.tl.call(() => setSlab(true), [], t(0.5)).to(shown, { v: 0, duration: t(0.65), ease: 'power2.in' }, 0)
    if (saved.current) c.tl.to(c.pose, { ...saved.current, duration: t(1.3), ease: 'power3.inOut' }, 0)
    if (!next) c.tl.to(chips, { v: 1, duration: t(0.4) }, t(0.9)).to(c.fades, { a: (f: number) => fadeFor(f, c), duration: t(0.7) }, t(0.6))
    c.tl.call(() => setRooms('off'))
  }
  useEffect(() => {
    const key = `${size.width}:${size.height}`
    if (rooms === 'opening' || (rooms === 'on' && (shown.v === 0 || framedSize.current !== key))) {
      framedSize.current = key
      return play(open)
    }
    if (rooms === 'on') setSlab(false)
    if (rooms === 'closing') return play(close)
  }, [rooms, size.width, size.height])
  return <group ref={root}>
    <mesh geometry={screen} material={mat.paper} rotation-x={-Math.PI / 2} position-y={-2.5} renderOrder={1} raycast={noRaycast} />
    <mesh geometry={model.plate} material={mat.lower} position-y={-1.6} renderOrder={2} raycast={noRaycast} />
    <lineSegments geometry={model.plateEdges} material={mat.ghost} position-y={-1.6} renderOrder={3} raycast={noRaycast} />
    <mesh geometry={model.plate} material={mat.slab} renderOrder={4} raycast={noRaycast} />
    <lineSegments geometry={model.plateEdges} material={mat.line} renderOrder={5} raycast={noRaycast} />
    <lineSegments geometry={model.grid} material={mat.grid} renderOrder={5} raycast={noRaycast} />
    <group ref={reveal}>
      <mesh geometry={model.walls} material={mat.wall} renderOrder={6} raycast={noRaycast} />
      <mesh geometry={model.windows} material={mat.glass} renderOrder={7} raycast={noRaycast} />
      <lineSegments geometry={model.ink} material={mat.line} renderOrder={8} raycast={noRaycast} />
    </group>
    {rooms === 'on' && markers.map((m, i) => <group key={m.id} position={[m.at[0], 0.35, -m.at[1]]}>
      <EquipmentAsset marker={m} onSelect={() => m.pin && onSelectPin(m.pin)} />
      <Html position={[0, 8, 0]} center zIndexRange={[11, 7]}>
        <button className={`floor-map-marker ${m.kind}`} onClick={() => m.pin && onSelectPin(m.pin)} disabled={!m.pin} aria-label={`${m.title}. Position unverified.${m.pin ? ' Open source record.' : ''}`}>
          <span className="floor-marker-number">{String(i + 1).padStart(2, '0')}</span>
          <span><strong>{m.title}</strong><small>Position unverified{m.pin?.stale ? ' · stale' : ''}</small></span>
        </button>
      </Html>
    </group>)}
  </group>
}

export function RoomsOverlay({ onSelectPin }: { onSelectPin?: (pin: Pin) => void }) {
  const { phase, target, rooms, toggleRooms, building, setBuilding } = useStore()
  const a = useMemo(() => building && target !== null ? arrival(building, target) : null, [building, target])
  const incident = useMemo(() => building && target !== null ? floorIncident(building, target) : null, [building, target])
  if (phase !== 'exploded' || target === null) return null
  const busy = rooms === 'opening' || rooms === 'closing'
  const active = rooms !== 'off'
  const name = target === 0 ? 'B1' : String(target).padStart(2, '0')
  const markFire = () => {
    if (!building) return
    const pin: Pin = { id: `crew-fire-${target}`, layer: 'crew_note', origin: 'crew', severity: 'danger', label: `Reported fire, ${target === 0 ? 'basement' : `floor ${target}`}`, detail: 'User marked fire on this floor in the prototype. Exact position is unknown. Not independently verified.', anchor: { kind: 'floor', floor: target }, claim: 'unverifiable', evidence: [], stale: false }
    setBuilding({ ...building, pins: [...building.pins.filter(p => p.id !== pin.id), pin] })
  }
  return <>
    {active && a && incident && <>
      <header className="cutaway-heading">
        <span className="cutaway-eyebrow">Selected floor / hazard & systems map</span>
        <h2><span>Floor</span> {name}</h2>
        <p>{a.level}</p>
      </header>
      <aside className={`cutaway-incident ${incident.here.length ? 'reported' : ''}`} aria-label="Incident location" aria-live="polite">
        <span className="incident-kicker">{incident.here.length ? 'Reported incident' : 'Incident location'}</span>
        <strong>{incident.here.length ? `Fire / smoke reported · ${target === 0 ? 'B1' : `floor ${target}`}` : incident.fires.length ? 'Fire reported elsewhere' : 'Fire location not reported'}</strong>
        <p>{incident.here.length ? 'Floor-level report. Exact position unknown.' : incident.fires.length ? incident.fires.map(p => p.anchor.kind === 'floor' ? `Floor ${p.anchor.floor === 0 ? 'B1' : p.anchor.floor}` : p.anchor.kind === 'roof' ? 'Roof' : 'Floor unspecified').join(' · ') : 'Selecting a floor does not locate the fire.'}</p>
        {incident.here.length ? <small>{incident.here.map(p => p.origin === 'dispatch' ? 'Dispatch report' : 'Crew report').filter((v, i, all) => all.indexOf(v) === i).join(' · ')} · unverified</small> : <button onClick={markFire}>Report fire on this floor</button>}
        {building?.pins.some(p => p.id === `crew-fire-${target}`) && <button onClick={() => setBuilding({ ...building, pins: building.pins.filter(p => p.id !== `crew-fire-${target}`) })}>Clear my report</button>}
      </aside>
      <div className="cutaway-orientation"><div ref={d => { compass.el = d }}><b>N</b><span>↑</span></div></div>
      <div className="cutaway-caption"><span className="cutaway-caption-line" /><p>Recorded footprint · illustrative facade<small>Illustrative 3D assets · positions, dimensions, and counts unverified.</small></p></div>
      <section className="cutaway-mission" aria-label="Floor incident brief">
        <article><h3>People</h3><strong>{incident.people.length ? 'People reported on this floor' : 'Current headcount unknown'}</strong><p>{incident.people[0]?.label ?? a.people[0]?.text}</p><small>{incident.people.length ? 'Unverified report' : 'Occupancy records are not a live count'}</small></article>
        <article><h3>Hazards on this floor</h3>{incident.hazards[0] ? <button onClick={() => onSelectPin?.(incident.hazards[0])}>{sentence(incident.hazards[0].label, target)} ↗</button> : <strong>No hazards recorded</strong>}<p>{incident.hazards[0]?.stale ? 'Older record · verify current conditions' : 'Exact positions not recorded'}</p><small>{incident.hazards.length > 1 ? `${incident.hazards.length} hazard records` : 'Tap a record for its source'}</small></article>
        <article><h3>Floor above · {target < (building?.floors ?? 0) ? target + 1 : 'roof'}</h3>{incident.above[0] ? <button onClick={() => onSelectPin?.(incident.above[0])}>{sentence(incident.above[0].label)} ↗</button> : <strong>{target === building?.floors ? 'Top occupied floor' : 'No hazards recorded'}</strong>}<p>{incident.protection ? sentence(incident.protection.label) : 'Suppression coverage unknown'}</p><small>Building records · verify on arrival</small></article>
        <article><h3>Water & access</h3>{incident.water ? <button onClick={() => onSelectPin?.(incident.water!)}>{incident.water.anchor.kind === 'ground' ? `Hydrant · ${Math.round(incident.water.anchor.distanceM)} m` : 'Hydrant on record'} ↗</button> : <strong>No hydrant recorded</strong>}<p>At street level · stairs and standpipe locations unknown</p><small>{incident.water?.evidence[0]?.asOf ? `Water record: ${incident.water.evidence[0].asOf}` : 'Verify access on arrival'}</small></article>
      </section>
      <div className="cutaway-stats"><strong>{a.areaText}</strong><span>Drag to orbit · scroll to zoom</span></div>
    </>}
    <button className={`rooms-toggle ${active ? 'cutaway-back' : ''}`} disabled={busy} aria-pressed={active} onClick={toggleRooms}>
      {active ? (busy ? 'Changing view…' : '← All floors') : `Explore floor ${target === 0 ? 'B1' : target} ↗`}
    </button>
  </>
}
