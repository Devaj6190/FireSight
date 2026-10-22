// In-floor data layer for the rooms level. Every number here comes from building.floorFacts / pins; where cells sit
// is still the schematic plan from roomPlan.ts. Missing fields (unitWork, openPermits...) just draw nothing.
import type { Building, FloorFacts, Pin } from '../../shared/building'
import { hash, inside, type Plan, type Room } from './roomPlan.ts'

type P = [number, number]

// three calm blues for work; red / orange stay reserved for hazards
export const WORK = {
  fire: { label: 'Fire alarm / sprinkler work', color: '#0a84ff' },
  systems: { label: 'Electrical, mechanical, plumbing', color: '#64d2ff' },
  buildout: { label: 'Remodel, structural, other', color: '#7d7aff' },
} as const
export type WorkCat = keyof typeof WORK

const catOf = (kind: string): WorkCat =>
  /fire (alarm|sprinkler)/i.test(kind) ? 'fire' : /electric|mechanic|plumb|elevator|restroom|server|data room/i.test(kind) ? 'systems' : 'buildout'

export type UnitCell = { unit: string; work?: WorkCat; workDate?: string; workKind?: string; open: boolean; cite?: string }
export type Occupant = NonNullable<FloorFacts['occupants']>[number]
export type FloorViz = {
  facts?: FloorFacts
  occupants: Map<string, Occupant[]> // room id -> occupants placed there (schematic spot)
  cells: Map<string, UnitCell> // room id -> unit on it
  unplaced: string[] // units with no cell left on the schematic plate
  cats: WorkCat[] // work categories drawn on this floor
  anyOpen: boolean
  people: number // occupant load, 0 when none on record
  fire: { year: string | null; count: number } | null
  sprinklerUnknown: boolean
}

const unitKey = (u: string) => {
  const n = parseInt(u, 10)
  return Number.isNaN(n) ? Infinity : n
}

export function floorViz(b: Pick<Building, 'pins' | 'floorFacts' | 'fetchedAt'>, floor: number, plan: Plan): FloorViz {
  const facts = b.floorFacts?.find((f) => f.floor === floor)
  const ref = Date.parse(b.fetchedAt) || Date.now()
  const recent = (d: string) => ref - Date.parse(d) <= 2 * 365.25 * 864e5

  // units -> perimeter cells: generic spaces farthest from the plate centre, then walked clockwise from north
  const units = [...new Set(facts?.units ?? [])].sort((a, c) => unitKey(a) - unitKey(c) || a.localeCompare(c))
  const [cx, cy] = plan.center
  const spaces = plan.rooms
    .filter((r) => r.kind === 'space')
    .sort((p, q) => Math.hypot(q.c[0] - cx, q.c[1] - cy) - Math.hypot(p.c[0] - cx, p.c[1] - cy) || p.id.localeCompare(q.id))
  const ring = spaces.slice(0, units.length).sort((p, q) => clock(p, cx, cy) - clock(q, cx, cy))
  const cells = new Map<string, UnitCell>()
  const work = facts?.unitWork ?? []
  const cats = new Set<WorkCat>()
  let anyOpen = false
  ring.forEach((r, k) => {
    const unit = units[k]
    const rows = work.filter((w) => w.unit === unit) // newest first per contract
    const latest = rows.find((w) => recent(w.date))
    const open = rows.find((w) => w.open)
    const cell: UnitCell = { unit, open: !!open }
    if (latest) {
      const parts = latest.kind.split(' · ')
      const cat = (['fire', 'systems', 'buildout'] as WorkCat[]).find((c) => parts.some((p) => catOf(p) === c))!
      Object.assign(cell, { work: cat, workDate: latest.date, workKind: latest.kind, cite: `${latest.datasetId} ${latest.recordId}` })
      cats.add(cat)
    }
    if (open) {
      anyOpen = true
      cell.cite ??= `${open.datasetId} ${open.recordId}`
    }
    cells.set(r.id, cell)
  })

  // occupants (by type only): onto their unit's cell when it is labelled, else the next free perimeter cell
  const occupants = new Map<string, Occupant[]>()
  const free = spaces.filter((r) => !cells.has(r.id))
  for (const o of facts?.occupants ?? []) {
    const own = o.unit ? [...cells].find(([, c]) => c.unit === o.unit)?.[0] : undefined
    const id = own ?? free.find((r) => !occupants.has(r.id))?.id ?? free[0]?.id ?? ring[0]?.id
    if (!id) continue
    occupants.set(id, [...(occupants.get(id) ?? []), o])
  }

  const pins = b.pins.filter((p) => p.anchor.kind === 'floor' && p.anchor.floor === floor)
  const firePin = pins.find((p: Pin) => p.layer === 'incident' && p.evidence.length)
  const incidents = facts?.incidents ?? 0
  const sprinklerUnknown =
    !!facts?.notOnRecord.some((s) => /unsprinkler/i.test(s)) ||
    b.pins.some((p) => p.anchor.kind === 'building' && /unsprinklered/i.test(p.detail))

  return {
    facts,
    cells,
    occupants,
    unplaced: units.slice(ring.length),
    cats: (['fire', 'systems', 'buildout'] as WorkCat[]).filter((c) => cats.has(c)),
    anyOpen,
    people: facts?.occupantLoad && facts.occupantLoad > 0 ? Math.round(facts.occupantLoad) : 0,
    fire: incidents > 0 ? { count: incidents, year: firePin?.evidence[0].asOf.slice(0, 4) ?? null } : null,
    sprinklerUnknown,
  }
}

// clockwise angle from north (footprint coords: y north)
const clock = (r: Room, cx: number, cy: number) => {
  const a = Math.atan2(r.c[0] - cx, r.c[1] - cy)
  return a < 0 ? a + 2 * Math.PI : a
}

// seeded dots, one per person, spread over the non-core rooms by area; coords relative to each room's c
export function scatter(plan: Plan, n: number, seed: string): Map<string, P[]> {
  const out = new Map<string, P[]>()
  const rooms = plan.rooms.filter((r) => r.kind !== 'core')
  const total = rooms.reduce((s, r) => s + r.area, 0)
  if (!n || !total) return out
  // largest remainder so the dots add up to exactly n
  const share = rooms.map((r) => (n * r.area) / total)
  const counts = share.map(Math.floor)
  let left = n - counts.reduce((s, c) => s + c, 0)
  ;[...share.keys()].sort((i, j) => share[j] - counts[j] - (share[i] - counts[i])).forEach((i) => left-- > 0 && counts[i]++)
  let a = hash(seed)
  const rand = () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  rooms.forEach((r, i) => {
    const xs = r.poly.map((p) => p[0])
    const ys = r.poly.map((p) => p[1])
    const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)]
    // keep dots off the walls: sample in the room shrunk toward its anchor
    const shrink = (p: P): P => [r.c[0] + (p[0] - r.c[0]) * 0.82, r.c[1] + (p[1] - r.c[1]) * 0.82]
    const inner = r.poly.map(shrink)
    const pts: P[] = []
    for (let tries = 0; pts.length < counts[i] && tries < counts[i] * 60; tries++) {
      const p: P = [x0 + rand() * (x1 - x0), y0 + rand() * (y1 - y0)]
      if (inside(p, inner)) pts.push([p[0] - r.c[0], p[1] - r.c[1]])
    }
    while (pts.length < counts[i]) pts.push([(rand() - 0.5) * 0.5, (rand() - 0.5) * 0.5]) // degenerate room: cluster at c
    if (pts.length) out.set(r.id, pts)
  })
  return out
}
