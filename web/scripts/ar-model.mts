// Builds the AR model (GLB) for a cached building: the tower split into floors at 1:300, so it stands about
// two thirds of a metre tall on a table. Fire floor red, floors above it amber (exposure), floors with recorded
// people blue, the rest light grey. Opened by Android's Scene Viewer from the app's "View in AR" button.
// Usage (from web/): node --import ../api/node_modules/tsx/dist/loader.mjs scripts/ar-model.mts sf-3722080 22
import { readFileSync, writeFileSync } from 'node:fs'
import * as THREE from 'three'
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js'
import type { Building } from '../../shared/building.ts'

// GLTFExporter reads blobs with FileReader, which Node lacks.
class NodeFileReader {
  result: ArrayBuffer | string | null = null
  onloadend: (() => void) | null = null
  readAsArrayBuffer(b: Blob) { void b.arrayBuffer().then((r) => { this.result = r; this.onloadend?.() }) }
  readAsDataURL(b: Blob) { void b.arrayBuffer().then((r) => { this.result = `data:${b.type};base64,${Buffer.from(r).toString('base64')}`; this.onloadend?.() }) }
}
;(globalThis as unknown as { FileReader: unknown }).FileReader = NodeFileReader

const [id = 'sf-3722080', fireArg] = process.argv.slice(2)
const b: Building = JSON.parse(readFileSync(new URL(`../public/buildings/${id}.json`, import.meta.url), 'utf8'))
const fire = fireArg ? Number(fireArg) : null
const SCALE = 1 / 300
const h = b.floorHeightM
const slab = h * 0.82
const gap = h * 0.7 // exploded spacing
const people = new Set(b.pins.filter((p) => /\b(people|occupants|units)\b/i.test(p.label) && p.anchor.kind === 'floor').map((p) => (p.anchor as { floor: number }).floor))
const hasB1 = b.floorFacts?.some((f) => f.floor === 0) || b.pins.some((p) => p.anchor.kind === 'floor' && p.anchor.floor === 0)

// emissiveIntensity stays 1 so the exporter adds no optional glTF extension (some AR viewers reject them)
const mat = (color: string, emissive = '#000000') => new THREE.MeshStandardMaterial({ color, emissive, emissiveIntensity: 1, roughness: 0.6, metalness: 0.05 })
const M = { fire: mat('#e5261f', '#8a1612'), exposure: mat('#ff9f1c', '#33200a'), people: mat('#3b82f6', '#0c1a33'), floor: mat('#d9dce1'), base: mat('#2a2f37') }

const shape = new THREE.Shape(b.footprint.map(([x, y]) => new THREE.Vector2(x, y)))
const plate = new THREE.ExtrudeGeometry(shape, { depth: slab, bevelEnabled: false })
plate.rotateX(-Math.PI / 2) // extrude along +y; footprint north becomes -z

const root = new THREE.Group()
root.name = `FireSight ${b.address}`
const floors = [...(hasB1 ? [0] : []), ...Array.from({ length: b.floors }, (_, i) => i + 1)]
const base = hasB1 ? 1 : 0
floors.forEach((f, i) => {
  const m = f === fire ? M.fire : fire !== null && f > fire ? M.exposure : people.has(f) ? M.people : M.floor
  const mesh = new THREE.Mesh(plate, m)
  mesh.name = f === 0 ? 'B1' : `Floor ${f}`
  mesh.position.y = (i - base) * (h + gap)
  root.add(mesh)
})
// a dark ground plate under the tower, a little larger than the footprint
const xs = b.footprint.map((p) => p[0]), ys = b.footprint.map((p) => p[1])
const ground = new THREE.Mesh(new THREE.BoxGeometry(Math.max(...xs) - Math.min(...xs) + 16, 0.6, Math.max(...ys) - Math.min(...ys) + 16), M.base)
ground.position.set((Math.max(...xs) + Math.min(...xs)) / 2, -0.3 - (hasB1 ? h + gap : 0), -(Math.max(...ys) + Math.min(...ys)) / 2)
root.add(ground)
root.scale.setScalar(SCALE)
// lift so the ground plate sits at y = 0 in the AR scene
root.position.y = (0.6 + (hasB1 ? h + gap : 0)) * SCALE

// Hotspot labels for ar.html (model-viewer), in the exported model's own coordinates (metres, after SCALE and the lift).
// Every text comes from a building JSON pin; the fire floor comes from the CLI argument.
const floorY = (f: number) => ((floors.indexOf(f) - base) * (h + gap) + slab / 2) * SCALE + root.position.y
const pt = (side: 'left' | 'right', f: number, y = floorY(f)) => {
  const v = b.footprint.reduce((a, c) => ((side === 'right' ? c[0] > a[0] : c[0] < a[0]) ? c : a))
  const x = (v[0] + (side === 'right' ? 0.5 : -0.5)) * SCALE
  return { position: `${x.toFixed(4)} ${y.toFixed(4)} ${(-v[1] * SCALE).toFixed(4)}`, normal: side === 'right' ? '0.7 0 0.7' : '-0.7 0 0.7' }
}
type Hot = { id: string; text: string; tone: 'fire' | 'battery' | 'people'; position: string; normal: string; floor: number }
const hot: Hot[] = []
if (fire !== null) hot.push({ id: 'fire', text: `Fire · floor ${fire}`, tone: 'fire', ...pt('left', fire), floor: fire })
const battery = b.pins.filter((p) => /battery room/i.test(p.label) && p.anchor.kind === 'floor').map((p) => (p.anchor as { floor: number }).floor).sort((a, c) => a - c)
if (battery.length) {
  const lo = battery[0]!, hi = battery[battery.length - 1]!
  hot.push({ id: 'battery', text: lo === hi ? `Battery room · ${lo}` : `Battery rooms · ${lo}–${hi}`, tone: 'battery', ...pt('right', lo, (floorY(lo) + floorY(hi)) / 2), floor: lo })
}
const peoplePins = b.pins.flatMap((p) => {
  const m = p.anchor.kind === 'floor' ? /(\d[\d,]*)\s+(people|occupants|units)/i.exec(p.label) : null
  return m ? [{ n: m[1]!, kind: m[2]!.toLowerCase() === 'units' ? 'units' : 'people', floor: (p.anchor as { floor: number }).floor }] : []
}).sort((a, c) => a.floor - c.floor)
peoplePins.forEach((p, i) => hot.push({ id: `people-${p.floor}`, text: `${p.n} ${p.n === '1' && p.kind === 'units' ? 'unit' : p.kind} · floor ${p.floor}`, tone: 'people', ...pt(i % 2 === 0 ? 'right' : 'left', p.floor), floor: p.floor }))

const scene = new THREE.Scene()
scene.add(root)
const glb = await new GLTFExporter().parseAsync(scene, { binary: true })
const out = new URL(`../public/ar/${id}.glb`, import.meta.url)
writeFileSync(out, Buffer.from(glb as ArrayBuffer))
console.log(`${id}: ${floors.length} floors, fire ${fire ?? 'none'}, ${(Buffer.from(glb as ArrayBuffer).length / 1024).toFixed(0)} KB -> ${out.pathname}`)
writeFileSync(new URL(`../public/ar/${id}.json`, import.meta.url), JSON.stringify({ id, address: b.address, fireFloor: fire, scale: SCALE, hotspots: hot }, null, 1) + '\n')
console.log(`hotspots: ${hot.map((x) => x.text).join(' | ')}`)
