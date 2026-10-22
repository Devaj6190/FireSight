// Builds the AR models (GLB + label JSON) for a cached building: the tower split into floors at 1:300, so it stands
// about two thirds of a metre tall on a table. Two variants: <id>.glb (floors exploded apart) and <id>-assembled.glb
// (no gaps). Every floor slab has its own material named "Floor N" / "B1", so ar.html can pick and highlight a floor
// through model-viewer's scene graph. Fire floor red, floors above it amber (exposure), floors with recorded people
// cyan, the rest cool grey (Night Glass: blue is reserved for interaction).
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
const people = new Set(b.pins.filter((p) => /\b(people|occupants|units)\b/i.test(p.label) && p.anchor.kind === 'floor').map((p) => (p.anchor as { floor: number }).floor))
const hasB1 = b.floorFacts?.some((f) => f.floor === 0) || b.pins.some((p) => p.anchor.kind === 'floor' && p.anchor.floor === 0)
const floors = [...(hasB1 ? [0] : []), ...Array.from({ length: b.floors }, (_, i) => i + 1)]
const base = hasB1 ? 1 : 0
type Kind = 'fire' | 'exposure' | 'people' | 'plain'
const kindOf = (f: number): Kind => (f === fire ? 'fire' : fire !== null && f > fire ? 'exposure' : people.has(f) ? 'people' : 'plain')
const nameOf = (f: number) => (f === 0 ? 'B1' : `Floor ${f}`)

// emissiveIntensity stays 1 so the exporter adds no optional glTF extension (some AR viewers reject them)
const mat = (name: string, color: string, emissive = '#000000') => {
  const m = new THREE.MeshStandardMaterial({ color, emissive, emissiveIntensity: 1, roughness: 0.6, metalness: 0.05 })
  m.name = name
  return m
}
const PAL: Record<Kind, [string, string]> = {
  fire: ['#ff4d4f', '#7a1f20'], exposure: ['#ffb020', '#3d2a08'], people: ['#5ee1ff', '#0f3a45'], plain: ['#3f4c60', '#000000'],
}

const shape = new THREE.Shape(b.footprint.map(([x, y]) => new THREE.Vector2(x, y)))
const xs = b.footprint.map((p) => p[0]), ys = b.footprint.map((p) => p[1])
type Hot = { id: string; text: string; tone: 'fire' | 'battery' | 'people'; position: string; normal: string; floor: number }

async function build(assembled: boolean) {
  const slab = assembled ? h : h * 0.82
  const gap = assembled ? 0 : h * 0.7 // exploded spacing
  const plate = new THREE.ExtrudeGeometry(shape, { depth: slab, bevelEnabled: false })
  plate.rotateX(-Math.PI / 2) // extrude along +y; footprint north becomes -z
  const root = new THREE.Group()
  root.name = `FireSight ${b.address}`
  floors.forEach((f, i) => {
    const [c, e] = PAL[kindOf(f)]
    const mesh = new THREE.Mesh(plate, mat(nameOf(f), c, e))
    mesh.name = nameOf(f)
    mesh.position.y = (i - base) * (h + gap)
    root.add(mesh)
  })
  // a dark ground plate under the tower, a little larger than the footprint
  const ground = new THREE.Mesh(new THREE.BoxGeometry(Math.max(...xs) - Math.min(...xs) + 16, 0.6, Math.max(...ys) - Math.min(...ys) + 16), mat('Ground', '#141b24'))
  ground.name = 'Ground'
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
  const glb = (await new GLTFExporter().parseAsync(scene, { binary: true })) as ArrayBuffer
  const out = new URL(`../public/ar/${id}${assembled ? '-assembled' : ''}.glb`, import.meta.url)
  writeFileSync(out, Buffer.from(glb))
  console.log(`${id}${assembled ? ' assembled' : ''}: ${floors.length} floors, fire ${fire ?? 'none'}, ${(glb.byteLength / 1024).toFixed(0)} KB`)
  return hot
}

const hotspots = await build(false)
const assembledHotspots = await build(true)
writeFileSync(
  new URL(`../public/ar/${id}.json`, import.meta.url),
  JSON.stringify({ id, address: b.address, fireFloor: fire, scale: SCALE, floors: floors.map((n) => ({ n, kind: kindOf(n) })), hotspots, assembledHotspots }, null, 1) + '\n',
)
console.log(`hotspots: ${hotspots.map((x) => x.text).join(' | ')}`)
