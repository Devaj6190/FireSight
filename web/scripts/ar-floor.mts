// Builds the "Inside floor N" AR models (GLB + hotspot JSON), one per floor, for a cached building. They mirror the app's
// floor view: the plate comes from src/archPlan.ts and src/floorViz.ts (imported, not copied), so outline, columns, core,
// corridor, partitions, hazard rooms, unit cells, occupants and the crowd match the estimated schematic the app shows.
// Site context (street names, OSM entrances, nearest hydrants, wind) comes from Building.site and the water / wind pins
// through src/shell/siteCard.ts. Stairs, exits and routes are never drawn: one small neutral marker at the core carries the
// hotspot "Stairs: not on public record · verify on arrival". No business names. Scale 1:100 (about 65 cm across).
// Usage (from web/): node --import ../api/node_modules/tsx/dist/loader.mjs scripts/ar-floor.mts sf-3722080 [floor ...]
// With no floors given it writes every floor, and records them in <id>.json as "insideFloors".
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import * as THREE from 'three'
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js'
import type { Building, Pin } from '../../shared/building.ts'
import { archPlan, type Rect, type Seg } from '../src/archPlan.ts'
import { floorViz, scatter, WORK } from '../src/floorViz.ts'
import { planFloor } from '../src/roomPlan.ts'
import { hydrantOf, shortStreet, windOf } from '../src/shell/siteCard.ts'

// GLTFExporter reads blobs with FileReader, which Node lacks.
class NodeFileReader {
  result: ArrayBuffer | string | null = null
  onloadend: (() => void) | null = null
  readAsArrayBuffer(b: Blob) { void b.arrayBuffer().then((r) => { this.result = r; this.onloadend?.() }) }
  readAsDataURL(b: Blob) { void b.arrayBuffer().then((r) => { this.result = `data:${b.type};base64,${Buffer.from(r).toString('base64')}`; this.onloadend?.() }) }
}
;(globalThis as unknown as { FileReader: unknown }).FileReader = NodeFileReader

const [id = 'sf-3722080', ...floorArgs] = process.argv.slice(2)
const b: Building = JSON.parse(readFileSync(new URL(`../public/buildings/${id}.json`, import.meta.url), 'utf8'))
const hasB1 = b.floorFacts?.some((f) => f.floor === 0) || b.pins.some((p) => p.anchor.kind === 'floor' && p.anchor.floor === 0)
const all = [...(hasB1 ? [0] : []), ...Array.from({ length: b.floors }, (_, i) => i + 1)]
const todo = floorArgs.length ? floorArgs.map(Number) : all

const SCALE = 1 / 100
const SLAB = 0.6, WALL_H = 1.6, WALL_T = 0.3, COL = 0.9
const mat = (color: string, emissive = '#000000') => new THREE.MeshStandardMaterial({ color, emissive, emissiveIntensity: 1, roughness: 0.7, metalness: 0.05 })
// Night Glass palette (docs/handoff/design-v2.md): cool grey plate, light walls; danger #ff4d4f, caution #ffb020, info cyan #5ee1ff
const M = {
  slab: [mat('#3a4658'), mat('#2a3442')], corridor: mat('#242d3a'), wall: mat('#c9d2dd'), facade: mat('#8b95a3'), coreWall: mat('#6b7686'),
  column: mat('#eef2f6'), shaft: mat('#0c1118'), marker: mat('#8b95a3'), ground: mat('#141b24'),
  danger: mat('#ff4d4f', '#a3282a'), caution: mat('#ffb020', '#7a4f08'), info: mat('#5ee1ff', '#1b6a7a'),
  unit: mat('#4b5a70'),
}
const ABBR = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW']
const abbr = (deg: number) => ABBR[Math.round((((deg % 360) + 360) % 360) / 22.5) % 16]!
const dirOf = (deg: number) => ({ x: Math.sin((deg * Math.PI) / 180), y: Math.cos((deg * Math.PI) / 180) }) // plan coords, 0 = north

type Hot = { id: string; text: string; tone: 'danger' | 'caution' | 'unknown' | 'info' | 'people' | 'unit'; position: string; normal: string; source?: string }
const xs = b.footprint.map((p) => p[0]), ys = b.footprint.map((p) => p[1])
const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)]
const [cx, cy] = [(minX + maxX) / 2, (minY + maxY) / 2]
const MARGIN = 3
const half = { x: (maxX - minX) / 2 + MARGIN, y: (maxY - minY) / 2 + MARGIN } // the ground plate around the footprint

// where a ray from the plate centre in direction d meets the ground plate edge (never outside it)
const edgePoint = (d: { x: number; y: number }, inset = 1.2): [number, number] => {
  const t = Math.min(d.x ? (half.x - inset) / Math.abs(d.x) : Infinity, d.y ? (half.y - inset) / Math.abs(d.y) : Infinity)
  return [cx + d.x * t, cy + d.y * t]
}

async function buildFloor(floor: number) {
  const pins = b.pins.filter((p) => p.anchor.kind === 'floor' && Math.min(p.anchor.floor, b.floors) === floor)
  const arch = archPlan(b, floor, pins)
  const plan = planFloor(b, floor, pins)
  const viz = floorViz(b, floor, plan)
  const facts = viz.facts
  const box = new THREE.BoxGeometry(1, 1, 1)
  const root = new THREE.Group()
  root.name = `FireSight ${b.address} ${floor === 0 ? 'B1' : 'floor ' + floor}`
  // plan x -> x, plan y (north) -> -z, as ar-model.mts
  const seg = ([[ax, ay], [bx, by]]: Seg, y: number, h: number, th: number, m: THREE.Material) => {
    const mesh = new THREE.Mesh(box, m)
    mesh.position.set((ax + bx) / 2, y + h / 2, -(ay + by) / 2)
    mesh.rotation.y = Math.atan2(by - ay, bx - ax)
    mesh.scale.set(Math.hypot(bx - ax, by - ay) + th, h, th)
    root.add(mesh)
  }
  const rect = (r: Rect, y: number, h: number, m: THREE.Material) => {
    const mesh = new THREE.Mesh(box, m)
    mesh.position.set(r.c[0], y + h / 2, -r.c[1])
    mesh.rotation.y = r.angle
    mesh.scale.set(r.w, h, r.d)
    root.add(mesh)
  }
  const patch = (poly: [number, number][], m: THREE.Material, y: number) => {
    const g = new THREE.ShapeGeometry(new THREE.Shape(poly.map(([x, yy]) => new THREE.Vector2(x, yy))))
    g.rotateX(-Math.PI / 2)
    const mesh = new THREE.Mesh(g, m)
    mesh.position.y = y
    root.add(mesh)
  }
  const slabGeo = new THREE.ExtrudeGeometry(new THREE.Shape(b.footprint.map(([x, y]) => new THREE.Vector2(x, y))), { depth: SLAB, bevelEnabled: false })
  slabGeo.rotateX(-Math.PI / 2)
  root.add(new THREE.Mesh(slabGeo, M.slab))
  rect(arch.corridor, SLAB, 0.05, M.corridor)
  arch.facade.forEach((s) => seg(s, SLAB, WALL_H * 0.7, WALL_T, M.facade))
  arch.walls.forEach((s) => seg(s, SLAB, WALL_H, WALL_T * 0.7, M.wall))
  arch.coreWalls.forEach((s) => seg(s, SLAB, WALL_H + 0.4, WALL_T, M.coreWall))
  arch.shafts.forEach((r) => rect(r, SLAB, WALL_H + 0.6, M.shaft))
  // columns only where the record gives a structural system (as the app)
  if (b.structure) arch.columns.forEach(([x, y]) => {
    const c = new THREE.Mesh(box, M.column)
    c.position.set(x, SLAB + 1.4, -y)
    c.rotation.y = arch.angle
    c.scale.set(COL, 2.8, COL)
    root.add(c)
  })
  // unit cells (real unit numbers from permits), tinted by recent work: blue family for work, caution for an open permit
  const workMat = new Map<string, THREE.Material>()
  const tint = (hex: string) => workMat.get(hex) ?? (workMat.set(hex, mat(hex)), workMat.get(hex)!)
  for (const [roomId, cell] of viz.cells) {
    const room = plan.rooms.find((r) => r.id === roomId)
    if (!room) continue
    patch(room.poly, cell.open ? M.caution : cell.work ? tint(WORK[cell.work].color) : M.unit, SLAB + 0.1)
  }
  // hazard rooms from archPlan: glowing patches
  arch.rooms.forEach((r) => r.polys.forEach((poly) => patch(poly, r.tone === 'danger' ? M.danger : M.caution, SLAB + 0.2)))
  // crowd: one dot per person, only where an assembly permit gives a load for this floor
  if (viz.people > 0) {
    const dots = scatter(plan, viz.people, `${b.id}:${floor}`)
    const pos: number[] = [], nor: number[] = [], idx: number[] = []
    const D = 0.55
    for (const [rid, pts] of dots) {
      const room = plan.rooms.find((r) => r.id === rid)!
      for (const [dx, dy] of pts) {
        const [x, y] = [room.c[0] + dx, room.c[1] + dy]
        const k = pos.length / 3
        for (const [ox, oz] of [[-D, D], [D, D], [D, -D], [-D, -D]]) { pos.push(x + ox, SLAB + 0.3, -y + oz!); nor.push(0, 1, 0) }
        idx.push(k, k + 1, k + 2, k, k + 2, k + 3)
      }
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3))
    g.setIndex(idx)
    root.add(new THREE.Mesh(g, M.info))
  }
  // stairs: one small flat neutral marker at the middle of the core, no stair shape, no implied position
  const marker = new THREE.Mesh(box, M.marker)
  marker.position.set(arch.core.c[0], SLAB + 0.12, -arch.core.c[1])
  marker.scale.set(2.2, 0.24, 2.2)
  root.add(marker)

  // ---- site context: entrances, hydrants, wind (all from Building.site and the pins; nothing locates a stair or route) ----
  const hot: Hot[] = []
  const dotMesh = (x: number, y: number, s: number, m: THREE.Material, h = 0.5) => {
    const d = new THREE.Mesh(box, m)
    d.position.set(x, SLAB + h / 2, -y)
    d.scale.set(s, h, s)
    root.add(d)
  }
  const ground = new THREE.Mesh(box, M.ground)
  ground.scale.set(half.x * 2, 0.6, half.y * 2)
  ground.position.set(cx, -0.3, -cy)
  root.add(ground)
  const gy = 0 // ground top
  for (const e of b.site?.entrances ?? []) {
    const d = new THREE.Mesh(box, M.info)
    d.position.set(e.x, SLAB + 0.2, -e.y)
    d.scale.set(1.6, 0.4, 1.6)
    root.add(d)
  }
  const at = (x: number, y: number, up: number) => `${(((x - cx) * SCALE)).toFixed(4)} ${(up * SCALE).toFixed(4)} ${((-(y - cy)) * SCALE).toFixed(4)}`
  let lvl = 0
  const next = () => 4 + (lvl++ % 6) * 9 // staggered label heights so neighbours do not overlap
  const entrances = b.site?.entrances ?? []
  if (entrances.length) {
    const e = entrances[0]!
    hot.push({ id: 'entrance', text: `Entrance${entrances.length > 1 ? 's' : ''} · OSM${entrances.length > 1 ? ` (${entrances.length})` : ''}`, tone: 'info', position: at(e.x, e.y, SLAB + 3), normal: '0 1 0', source: e.url })
  }
  // street names just outside each face
  const seen = new Set<string>()
  for (const s of b.site?.sides ?? []) {
    const key = `${s.street}|${Math.round(s.bearingDeg / 45) % 8}`
    if (seen.has(key)) continue
    seen.add(key)
    const [x, y] = edgePoint(dirOf(s.bearingDeg), 0.4)
    hot.push({ id: `street-${seen.size}`, text: shortStreet(s.street), tone: 'unknown', position: at(x, y, 3), normal: '0 1 0', source: 'OpenStreetMap' })
  }
  // nearest hydrant of any kind, and nearest high-pressure one, at their real bearing and distance; clamped to the plate edge when far
  const hyd = pins.length >= 0 ? b.pins.flatMap((p) => { const h = hydrantOf(p); return h && p.anchor.kind === 'ground' ? [{ h, bearing: p.anchor.bearingDeg, p }] : [] }).sort((p, q) => p.h.distanceM - q.h.distanceM) : []
  const picks = [hyd[0], hyd.find((x) => x.h.highPressure)].filter((x, i, a) => x && a.indexOf(x) === i) as typeof hyd
  for (const { h, bearing, p } of picks) {
    const d = dirOf(bearing)
    let [x, y] = [d.x * h.distanceM, d.y * h.distanceM]
    if (Math.abs(x - cx) > half.x - 1.5 || Math.abs(y - cy) > half.y - 1.5) [x, y] = edgePoint(d, 1.5)
    dotMesh(x, y, 2.6, M.info, 1.2)
    hot.push({ id: `hydrant-${p.id}`, text: `${h.highPressure ? 'High-pressure h' : 'H'}ydrant ${h.distanceM} m ${abbr(bearing)}`, tone: 'info', position: at(x, y, SLAB + next()), normal: '0 1 0', source: p.evidence[0]?.url })
  }
  // wind: an arrow pointing the way the smoke goes, upwind of the plate, with its label
  const windPin = b.pins.find((p) => p.layer === 'wind')
  const wind = windOf(windPin)
  if (windPin && wind && windPin.anchor.kind === 'ground') {
    const to = windPin.anchor.bearingDeg
    const d = dirOf(to)
    const [wx, wy] = edgePoint({ x: -d.x, y: -d.y }, 3)
    const shaft = new THREE.Mesh(box, M.caution)
    shaft.position.set(wx + d.x * 3, SLAB + 0.3, -(wy + d.y * 3))
    shaft.rotation.y = Math.atan2(d.y, d.x)
    shaft.scale.set(7, 0.5, 1.2)
    root.add(shaft)
    const head = new THREE.Mesh(new THREE.ConeGeometry(1.8, 3, 4), M.caution)
    head.rotation.set(0, 0, -Math.PI / 2)
    head.rotation.order = 'YXZ'
    head.position.set(wx + d.x * 7.5, SLAB + 0.3, -(wy + d.y * 7.5))
    head.rotation.y = Math.atan2(d.y, d.x)
    root.add(head)
    const from = /FROM\s+([NSEW]{1,3})/i.exec(windPin.label)?.[1]?.toUpperCase() ?? abbr((to + 180) % 360)
    hot.push({ id: 'wind', text: `Wind ${Math.round(wind.mph)} mph from ${from} · forecast`, tone: 'caution', position: at(wx, wy, SLAB + next()), normal: '0 1 0', source: wind.url })
  }

  // ---- hotspots on the plate ----
  const cite = (p?: Pin) => p?.evidence[0]?.url
  arch.rooms.forEach((r, i) => {
    const kitchen = r.name === 'Kitchen'
    const oc = (facts?.occupants ?? []).find((o) => /cook|kitchen|food|cafeteria|restaurant/i.test(`${o.kind} ${o.hazard ?? ''}`))
    hot.push({ id: `room-${i}`, text: `${kitchen ? (oc ? oc.kind : 'Kitchen') : r.name} · spot estimated`, tone: r.tone, position: at(r.c[0], r.c[1], SLAB + WALL_H + next()), normal: '0 1 0', source: cite(r.pin) ?? oc?.url })
  })
  let n = 0
  for (const [roomId, cell] of viz.cells) {
    const room = plan.rooms.find((r) => r.id === roomId)
    if (!room || n++ >= 10) continue
    const work = cell.workKind ? ` · ${cell.workKind.split(' · ')[0]!.toLowerCase()}${cell.workDate ? ' ' + cell.workDate.slice(0, 4) : ''}` : ''
    hot.push({ id: `unit-${n}`, text: `Unit ${cell.unit}${work}${cell.open ? ' · open permit' : ''}`, tone: cell.open ? 'caution' : 'unit', position: at(room.c[0], room.c[1], SLAB + 2 + next()), normal: '0 1 0', source: cell.cite })
  }
  if (viz.people > 0) hot.push({ id: 'crowd', text: `${viz.people} people`, tone: 'people', position: at(plan.center[0], plan.center[1], SLAB + WALL_H + next()), normal: '0 1 0', source: 'SFFD assembly permit' })
  if (viz.fire) hot.push({ id: 'fire', text: `${viz.fire.count} fire${viz.fire.count === 1 ? '' : 's'} here${viz.fire.year ? ' · ' + viz.fire.year : ''}`, tone: 'danger', position: at(plan.center[0], plan.center[1], SLAB + WALL_H + next()), normal: '0 1 0', source: 'SFFD incidents' })
  if (viz.anyOpen) hot.push({ id: 'open', text: 'Open permits', tone: 'caution', position: at(arch.core.c[0], arch.core.c[1], SLAB + WALL_H + next()), normal: '0 1 0', source: facts?.permits.last?.url })
  for (const [roomId, occs] of viz.occupants) {
    const room = plan.rooms.find((r) => r.id === roomId)
    const o = occs[0]
    if (room && o) hot.push({ id: `occ-${roomId}`, text: `${o.kind}${o.hazard ? ' · ' + o.hazard.toLowerCase() : ''} · est.`, tone: 'unknown', position: at(room.c[0], room.c[1], SLAB + 2 + next()), normal: '0 1 0', source: o.url })
  }
  hot.push({ id: 'stairs', text: 'Stairs: not on public record · verify on arrival', tone: 'unknown', position: at(arch.core.c[0], arch.core.c[1], SLAB + WALL_H + 24), normal: '0 1 0', source: 'floorFacts.notOnRecord' })

  // centre the plate on the model's origin, ground top at y = 0
  root.scale.setScalar(SCALE)
  root.position.set(-cx * SCALE, 0, cy * SCALE)
  const scene = new THREE.Scene()
  scene.add(root)
  const glb = (await new GLTFExporter().parseAsync(scene, { binary: true })) as ArrayBuffer
  void gy
  const key = `${id}-f${floor}`
  writeFileSync(new URL(`../public/ar/${key}.glb`, import.meta.url), Buffer.from(glb))
  const banner = `Schematic layout · no public floor plan${b.structure ? ' · columns follow the structural system (SF Tall Building Inventory)' : ''}`
  writeFileSync(new URL(`../public/ar/${key}.json`, import.meta.url), JSON.stringify({ id: key, address: b.address, view: 'floor', floor, scale: SCALE, banner, hotspots: hot }, null, 1) + '\n')
  console.log(`${key}: ${(glb.byteLength / 1024).toFixed(0)} KB, ${hot.length} labels${viz.people ? `, crowd ${viz.people}` : ''}`)
}

for (const f of todo) await buildFloor(f)
// record which floors have an inside model, so ar.html can offer "Inside floor N" for any of them
const towerPath = new URL(`../public/ar/${id}.json`, import.meta.url)
if (existsSync(towerPath)) {
  const t = JSON.parse(readFileSync(towerPath, 'utf8'))
  t.insideFloors = [...new Set([...(floorArgs.length ? t.insideFloors ?? [] : []), ...todo])].sort((p: number, q: number) => p - q)
  writeFileSync(towerPath, JSON.stringify(t, null, 1) + '\n')
}
