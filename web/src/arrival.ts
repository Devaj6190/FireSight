// Arrival view of one floor: only what the public record says, placed where the record puts it.
// Footprint outline (DataSF), street faces and entrances (OpenStreetMap, via building.site), water within reach
// (ground pins), and the floor's people / hazards / ceiling height / code as text. No walls, rooms, cores or stairs:
// none of those are on public record, and a guessed stair can send a crew the wrong way.
// Pure and deterministic: same building + floor always gives the same view.
import type { Building, Pin } from '../../shared/building'
import { area } from './roomPlan.ts'

export type P = [number, number]
export type StreetLabel = { street: string; at: P; out: P } // at: edge midpoint; out: outward unit vector (x east, y north)
export type WaterMark = { pin: Pin; at: P; text: string }
export type EntranceMark = { at: P[]; text: string; url: string }
export type Line = { text: string; sub?: string; tone?: 'danger' | 'caution'; pin?: Pin }
export type Arrival = {
  bbox: [number, number, number, number] // minX, maxX, minY, maxY of the plate
  streets: StreetLabel[]
  span: { a: P; b: P; m: number; text: string }
  areaText: string
  entrances: EntranceMark[]
  water: WaterMark[]
  people: Line[]
  hazards: Line[]
  ceiling: Line
  level: string // where the floor is: "Street level", "Floor level about 279 ft (85 m) above street"
  code: Line[]
}

export const WATER_RANGE_M = 120
const FT = 3.28084
const DEG = Math.PI / 180
const fmt = (n: number) => Math.round(n).toLocaleString('en-US')

// "BATTERY ROOM FLOOR 22, 33.6 GAL ELECTROLYTE" -> "Battery room · 33.6 gal electrolyte"
const KEEP = new Set(['SFFD', 'AWSS', 'EV', 'PG&E', 'HVAC', 'MEP', 'AQI', 'EPA', 'SF', 'LPG', 'CO2'])
export function sentence(label: string, floor?: number) {
  let s = label
  if (floor !== undefined) s = s.replace(new RegExp(`,?\\s*\\b(FLOOR|FL)\\s*${floor}\\b`, 'gi'), '')
  s = s
    .split(/(\s+)/)
    .map((w) => (KEEP.has(w.replace(/[^A-Z&0-9]/gi, '').toUpperCase()) || /^[A-Z]\d+\b/i.test(w) ? w.toUpperCase() : w.toLowerCase()))
    .join('')
    .replace(/\s*,\s*/g, ' · ')
    .replace(/\s+/g, ' ')
    .trim()
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function farthest(fp: P[]) {
  let best: [P, P, number] = [fp[0], fp[0], 0]
  for (let i = 0; i < fp.length; i++)
    for (let j = i + 1; j < fp.length; j++) {
      const d = Math.hypot(fp[i][0] - fp[j][0], fp[i][1] - fp[j][1])
      if (d > best[2]) best = [fp[i], fp[j], d]
    }
  return best
}

// one label per street: the face (bearing group) with the most edge length on that street, at its longest edge
function streetLabels(b: Pick<Building, 'footprint' | 'site'>): StreetLabel[] {
  const fp = b.footprint
  type Face = { street: string; bearing: number; len: number; best: { edge: number; len: number } }
  const groups = new Map<string, Face>()
  for (const s of b.site?.sides ?? []) {
    const a = fp[s.edge]
    const c = fp[(s.edge + 1) % fp.length]
    if (!a || !c) continue
    const len = Math.hypot(c[0] - a[0], c[1] - a[1])
    const key = `${s.street}|${Math.round((((s.bearingDeg % 360) + 360) % 360) / 45) % 8}`
    const g = groups.get(key) ?? { street: s.street, bearing: s.bearingDeg, len: 0, best: { edge: s.edge, len: 0 } }
    g.len += len
    if (len > g.best.len) g.best = { edge: s.edge, len }
    groups.set(key, g)
  }
  const per = new Map<string, Face>()
  for (const g of groups.values()) if (!per.has(g.street) || per.get(g.street)!.len < g.len) per.set(g.street, g)
  return [...per.values()].map((g) => {
    const a = fp[g.best.edge]
    const c = fp[(g.best.edge + 1) % fp.length]
    return { street: g.street.replace(/\bStreet\b/, 'St').replace(/\bAvenue\b/, 'Ave'), at: [(a[0] + c[0]) / 2, (a[1] + c[1]) / 2], out: [Math.sin(g.bearing * DEG), Math.cos(g.bearing * DEG)] }
  })
}

function waterLabel(p: Pin) {
  const t = `${p.label} ${p.detail}`
  const what = /cistern/i.test(t) ? 'Cistern' : /awss|high-pressure/i.test(t) ? 'High-pressure hydrant' : 'Hydrant'
  return `${what} ${Math.round((p.anchor as { distanceM: number }).distanceM)} m`
}

const HAZ_LAYERS = new Set(['fire_permit', 'hazmat', 'incident', 'construction', 'softstory', 'violation', 'nov'])

export function arrival(b: Building, floor: number): Arrival {
  const fp = b.footprint as P[]
  const xs = fp.map((p) => p[0])
  const ys = fp.map((p) => p[1])
  const [a, c, d] = farthest(fp)
  const m = b.site?.maxSpanM ?? d
  const areaM2 = b.site?.floorAreaM2 ?? Math.abs(area(fp))
  const facts = b.floorFacts?.find((f) => f.floor === floor)
  const onFloor = b.pins.filter((p) => p.anchor.kind === 'floor' && Math.min(p.anchor.floor, b.floors) === floor)

  // entrances: ground floor only; same-kind entrances within 8 m share one label
  const entrances: EntranceMark[] = []
  if (floor === 1)
    for (const e of b.site?.entrances ?? []) {
      const g = entrances.find((x) => x.text.startsWith(e.kind) && x.at.some(([ex, ey]) => Math.hypot(ex - e.x, ey - e.y) < 8))
      if (g) g.at.push([e.x, e.y])
      else entrances.push({ at: [[e.x, e.y]], text: e.kind, url: e.url })
    }
  for (const e of entrances) if (e.at.length > 1) e.text = `${e.text} ×${e.at.length}`

  const water: WaterMark[] = b.pins
    .filter((p) => p.layer === 'water' && p.anchor.kind === 'ground' && p.anchor.distanceM > 0 && p.anchor.distanceM <= WATER_RANGE_M && /hydrant|cistern/i.test(`${p.label} ${p.detail}`))
    .map((p) => {
      const g = p.anchor as { bearingDeg: number; distanceM: number }
      return { pin: p, at: [g.distanceM * Math.sin(g.bearingDeg * DEG), g.distanceM * Math.cos(g.bearingDeg * DEG)] as P, text: waterLabel(p) }
    })

  // people: occupant load (assembly permit), who is usually here (by type), unit numbers
  const people: Line[] = []
  if (facts?.occupantLoad) people.push({ text: `Recorded assembly capacity: ${fmt(facts.occupantLoad)}`, sub: 'Permit capacity, not a current headcount' })
  const kinds = [...new Map((facts?.occupants ?? []).map((o) => [o.kind, o])).values()]
  if (kinds.length) people.push({ text: kinds.map((o) => (!o.hazard ? o.kind : o.kind.includes('(') ? `${o.kind}, ${o.hazard.toLowerCase()}` : `${o.kind} (${o.hazard.toLowerCase()})`)).join(' · '), sub: 'Usually here, by type · business licenses, OSM' })
  if (facts?.units.length) people.push({ text: `Units ${facts.units.slice(0, 4).join(', ')}${facts.units.length > 4 ? ` +${facts.units.length - 4}` : ''}`, sub: 'Named in permits' })
  if (!people.length) people.push({ text: 'No occupancy on record for this floor' })

  // hazards: danger / caution pins on this floor, then named rooms no pin already covers
  const hzPins = onFloor
    .filter((p) => p.severity !== 'info' && (p.severity === 'danger' || HAZ_LAYERS.has(p.layer) || /room|tank|battery|fuel|hazmat/i.test(p.label)))
    .sort((p, q) => (p.severity === q.severity ? 0 : p.severity === 'danger' ? -1 : 1))
  const hazards: Line[] = hzPins.map((p) => ({ text: sentence(p.label, floor), tone: p.severity as 'danger' | 'caution', pin: p }))
  const said = hzPins.map((p) => p.label.toLowerCase()).join(' ')
  for (const r of facts?.rooms ?? []) if (!said.includes(r.toLowerCase().split(/[\s/]+/)[0])) hazards.push({ text: r, tone: 'caution', sub: 'Named in records' })

  const st = b.structure
  const ft = floor === 1 ? (st?.firstStoryFt ?? st?.typicalStoryFt) : st?.typicalStoryFt
  const ceiling: Line = ft
    ? { text: `${ft} ft (${(ft / FT).toFixed(1)} m) floor to floor`, sub: 'Tall Building Inventory' }
    : { text: `About ${b.floorHeightM.toFixed(1)} m floor to floor`, sub: 'Average: building height ÷ floors' }

  // floor level above the street: first story + typical stories below this floor (Tall Building Inventory), else average
  const up = st?.typicalStoryFt ? ((st.firstStoryFt ?? st.typicalStoryFt) + Math.max(0, floor - 2) * st.typicalStoryFt) / FT : (floor - 1) * b.floorHeightM
  const level = floor === 0 ? 'Basement · below street' : floor === 1 ? 'Street level' : `Floor level about ${Math.round(up * FT)} ft (${Math.round(up)} m) above street`

  return {
    level,
    bbox: [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)],
    streets: streetLabels(b),
    span: { a, b: c, m, text: `${m < 100 ? m.toFixed(1).replace(/\.0$/, '') : Math.round(m)} m / ${Math.round(m * FT)} ft across` },
    areaText: `${fmt(areaM2)} m² · ${fmt(Math.round((areaM2 * FT * FT) / 10) * 10)} ft² per floor`,
    entrances,
    water,
    people,
    hazards,
    ceiling,
    code: (b.site?.code ?? []).map((x) => ({ text: x.text, sub: x.citation.replace(/\s*\(.*\)\s*$/, '') })),
  }
}
