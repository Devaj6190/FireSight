// Builds the "Inside floor N" AR model (GLB + hotspot JSON) for a cached building. It mirrors the app's rooms view:
// the plan comes from src/archPlan.ts (imported, not copied), so outline, columns, core, corridor, partitions and
// hazard rooms are the same estimated schematic the app shows. Stairs are never drawn (their position is not public);
// one small neutral marker at the core carries the hotspot "Stairs: not on public record · verify on arrival".
// Scale 1:100, so the L-shaped plate is about 65 cm across on a table. Wall, column and slab sizes are exaggerated
// a little so they read at that scale. Nothing here is surveyed.
// Usage (from web/): node --import ../api/node_modules/tsx/dist/loader.mjs scripts/ar-floor.mts sf-3722080 22
import { readFileSync, writeFileSync } from 'node:fs'
import * as THREE from 'three'
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js'
import type { Building } from '../../shared/building.ts'
import { archPlan, type Rect, type Seg } from '../src/archPlan.ts'

// GLTFExporter reads blobs with FileReader, which Node lacks.
class NodeFileReader {
  result: ArrayBuffer | string | null = null
  onloadend: (() => void) | null = null
  readAsArrayBuffer(b: Blob) { void b.arrayBuffer().then((r) => { this.result = r; this.onloadend?.() }) }
  readAsDataURL(b: Blob) { void b.arrayBuffer().then((r) => { this.result = `data:${b.type};base64,${Buffer.from(r).toString('base64')}`; this.onloadend?.() }) }
}
;(globalThis as unknown as { FileReader: unknown }).FileReader = NodeFileReader

const [id = 'sf-3722080', floorArg = '22'] = process.argv.slice(2)
const floor = Number(floorArg)
const b: Building = JSON.parse(readFileSync(new URL(`../public/buildings/${id}.json`, import.meta.url), 'utf8'))
const pins = b.pins.filter((p) => p.anchor.kind === 'floor' && Math.min(p.anchor.floor, b.floors) === floor)
const arch = archPlan(b, floor, pins)
const facts = b.floorFacts?.find((f) => f.floor === floor)

const SCALE = 1 / 100
const SLAB = 0.6
const WALL_H = 1.6
const WALL_T = 0.3
const COL = 0.9

const mat = (color: string, emissive = '#000000') => new THREE.MeshStandardMaterial({ color, emissive, emissiveIntensity: 1, roughness: 0.7, metalness: 0.05 })
const M = {
  slab: mat('#e9e7e2'), corridor: mat('#cfd3d8'), wall: mat('#f7f7f5'), facade: mat('#dfe3e8'), coreWall: mat('#b9bdc3'),
  column: mat('#3a3f47'), shaft: mat('#2b3038'), marker: mat('#7d838c'), ground: mat('#2a2f37'),
  danger: mat('#ff4a1c', '#b32a0a'), caution: mat('#ff9f1c', '#6b3f08'),
}
const box = new THREE.BoxGeometry(1, 1, 1)
const root = new THREE.Group()
root.name = `FireSight ${b.address} floor ${floor}`
// plan x -> x, plan y (north) -> -z, as ar-model.mts
const seg = ([[ax, ay], [bx, by]]: Seg, y: number, h: number, th: number, m: THREE.Material, name: string) => {
  const mesh = new THREE.Mesh(box, m)
  mesh.name = name
  mesh.position.set((ax + bx) / 2, y + h / 2, -(ay + by) / 2)
  mesh.rotation.y = Math.atan2(by - ay, bx - ax)
  mesh.scale.set(Math.hypot(bx - ax, by - ay) + th, h, th)
  root.add(mesh)
}
const rect = (r: Rect, y: number, h: number, m: THREE.Material, name: string) => {
  const mesh = new THREE.Mesh(box, m)
  mesh.name = name
  mesh.position.set(r.c[0], y + h / 2, -r.c[1])
  mesh.rotation.y = r.angle
  mesh.scale.set(r.w, h, r.d)
  root.add(mesh)
}

const slabGeo = new THREE.ExtrudeGeometry(new THREE.Shape(b.footprint.map(([x, y]) => new THREE.Vector2(x, y))), { depth: SLAB, bevelEnabled: false })
slabGeo.rotateX(-Math.PI / 2)
const slab = new THREE.Mesh(slabGeo, M.slab)
slab.name = `Floor ${floor} slab`
root.add(slab)
rect(arch.corridor, SLAB, 0.05, M.corridor, 'Corridor')
arch.facade.forEach((s, i) => seg(s, SLAB, WALL_H * 0.7, WALL_T, M.facade, `Facade ${i}`))
arch.walls.forEach((s, i) => seg(s, SLAB, WALL_H, WALL_T * 0.7, M.wall, `Partition ${i}`))
arch.coreWalls.forEach((s, i) => seg(s, SLAB, WALL_H + 0.4, WALL_T, M.coreWall, `Core wall ${i}`))
arch.shafts.forEach((r, i) => rect(r, SLAB, WALL_H + 0.6, M.shaft, `Elevator ${i}`))
// columns only where the record gives a structural system (as the app)
if (b.structure) arch.columns.forEach(([x, y], i) => {
  const c = new THREE.Mesh(box, M.column)
  c.name = `Column ${i}`
  c.position.set(x, SLAB + 1.4, -y)
  c.rotation.y = arch.angle
  c.scale.set(COL, 2.8, COL)
  root.add(c)
})
// hazard rooms: a glowing floor patch plus a low block so they stand out on a table
const HAZ_COLOR = { danger: M.danger, caution: M.caution }
arch.rooms.forEach((r) => {
  r.polys.forEach((poly, k) => {
    const g = new THREE.ShapeGeometry(new THREE.Shape(poly.map(([x, y]) => new THREE.Vector2(x, y))))
    g.rotateX(-Math.PI / 2)
    const m = new THREE.Mesh(g, HAZ_COLOR[r.tone])
    m.name = `${r.name} ${k}`
    m.position.y = SLAB + 0.15
    root.add(m)
  })
})
// stairs: one small flat neutral marker at the middle of the core, no stair shape, no implied position
const marker = new THREE.Mesh(box, M.marker)
marker.name = 'Stairs: not on public record'
marker.position.set(arch.core.c[0], SLAB + 0.12, -arch.core.c[1])
marker.scale.set(2.2, 0.24, 2.2)
root.add(marker)

const xs = b.footprint.map((p) => p[0]), ys = b.footprint.map((p) => p[1])
const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)]
const [cx, cy] = [(minX + maxX) / 2, (minY + maxY) / 2]
const ground = new THREE.Mesh(box, M.ground)
ground.name = 'Ground plate'
ground.scale.set(maxX - minX + 12, 0.6, maxY - minY + 12)
ground.position.set(cx, -0.3, -cy)
root.add(ground)
// centre the plate on the model's origin, ground top at y = 0
const off = new THREE.Vector3(-cx * SCALE, 0, cy * SCALE)
root.scale.setScalar(SCALE)
root.position.copy(off)

// hotspots, in the exported model's coordinates (metres). Every text is from a cited record; hazard rooms say the spot is estimated.
type Hot = { id: string; text: string; tone: 'danger' | 'caution' | 'unknown'; position: string; normal: string; source?: string }
const at = (x: number, y: number, up = SLAB + WALL_H + 1.2) => `${(x * SCALE + off.x).toFixed(4)} ${(up * SCALE).toFixed(4)} ${(-y * SCALE + off.z).toFixed(4)}`
const hot: Hot[] = []
const cafeteria = (facts?.occupants ?? []).find((o) => /cook|kitchen|food|cafeteria|restaurant/i.test(`${o.kind} ${o.hazard ?? ''}`))
for (const r of arch.rooms) {
  const text = r.name === 'Kitchen' ? `${cafeteria ? 'Cafeteria (cooking)' : 'Kitchen'} · spot estimated` : `${r.name} · spot estimated`
  const source = r.pin ? r.pin.id : r.name === 'Kitchen' && cafeteria ? `${cafeteria.datasetId}:${cafeteria.recordId}` : facts?.rooms?.length ? `floorFacts.rooms floor ${floor}` : undefined
  hot.push({ id: r.name.toLowerCase().replace(/\W+/g, '-'), text, tone: r.tone, position: at(r.c[0], r.c[1]), normal: '0 1 0', source })
}
hot.push({ id: 'stairs', text: 'Stairs: not on public record · verify on arrival', tone: 'unknown', position: at(arch.core.c[0], arch.core.c[1], SLAB + 1.2), normal: '0 1 0', source: 'floorFacts.notOnRecord' })

const scene = new THREE.Scene()
scene.add(root)
const glb = (await new GLTFExporter().parseAsync(scene, { binary: true })) as ArrayBuffer
const out = new URL(`../public/ar/${id}-f${floor}.glb`, import.meta.url)
writeFileSync(out, Buffer.from(glb))
const banner = `Schematic layout · no public floor plan${b.structure ? ' · columns follow the structural system (SF Tall Building Inventory)' : ''}`
writeFileSync(new URL(`../public/ar/${id}-f${floor}.json`, import.meta.url), JSON.stringify({ id: `${id}-f${floor}`, address: b.address, view: 'floor', floor, scale: SCALE, banner, hotspots: hot }, null, 1) + '\n')
console.log(`${id} floor ${floor}: ${arch.walls.length} walls, ${b.structure ? arch.columns.length : 0} columns, ${arch.rooms.length} hazard rooms, plate ${((maxX - minX) * SCALE * 100).toFixed(0)} x ${((maxY - minY) * SCALE * 100).toFixed(0)} cm, ${(glb.byteLength / 1024).toFixed(0)} KB`)
console.log(`hotspots: ${hot.map((x) => x.text).join(' | ')}`)
