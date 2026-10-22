// Floor -> rooms. There is no public floor plan, so the layout is SCHEMATIC: a seeded grid laid along the footprint's
// main axis, clipped to the footprint, with a core near the middle (stairs/elevators: UNVERIFIABLE). The only rooms with
// a name are the ones a public record names (a permit's "computer room", "fire pump room"...); their pins sit in them,
// but where that room is on the floor is still schematic. Same building + floor always gives the same plan.
import type { Building, Claim, Pin } from '../../shared/building'

type P = [number, number]
export type Room = {
  id: string
  kind: 'core' | 'named' | 'space'
  poly: P[] // footprint coords (m, x east, y north)
  c: P // where pins and the label sit
  area: number
  name?: string
  cite?: string // "FIRE PERMIT 76784"
  claim?: Claim
  pins: Pin[]
}
export type Plan = {
  rooms: Room[]
  center: P // footprint centroid
  long: number // extent along the long axis, m
  short: number
  longAngle: number // radians, footprint coords: direction of the long axis
}

// rooms a record names. Only public, verified, cited pins can name a room; dispatch and crew notes never do.
export const NAMED: { re: RegExp; name: string; big?: boolean }[] = [
  { re: /computer room/i, name: 'COMPUTER ROOM' },
  { re: /server room/i, name: 'SERVER ROOM' },
  { re: /fire pump|generator room/i, name: 'FIRE PUMP / GENERATOR RM' },
  { re: /place-of-assembly|assembly/i, name: 'ASSEMBLY SPACE', big: true },
]
const SOURCE: Record<string, string> = { '893e-xam6': 'FIRE PERMIT', 'i98e-djp9': 'PERMIT' }

export function nameFor(p: Pin) {
  if (p.origin !== 'public' || p.claim !== 'verified' || !p.evidence.length) return null
  return NAMED.find((n) => n.re.test(p.detail)) ?? null
}

// FNV-1a + mulberry32: small, stable across browsers
export function hash(s: string) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return h >>> 0
}
function rng(seed: number) {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function area(poly: P[]) {
  let s = 0
  for (let i = 0; i < poly.length; i++) {
    const [x0, y0] = poly[i]
    const [x1, y1] = poly[(i + 1) % poly.length]
    s += x0 * y1 - x1 * y0
  }
  return s / 2
}
function centroid(poly: P[]): P {
  let cx = 0
  let cy = 0
  let a = 0
  for (let i = 0; i < poly.length; i++) {
    const [x0, y0] = poly[i]
    const [x1, y1] = poly[(i + 1) % poly.length]
    const k = x0 * y1 - x1 * y0
    a += k
    cx += (x0 + x1) * k
    cy += (y0 + y1) * k
  }
  return Math.abs(a) < 1e-9 ? poly[0] : [cx / (3 * a), cy / (3 * a)]
}
export function inside([x, y]: P, poly: P[]) {
  let hit = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i]
    const [xj, yj] = poly[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit
  }
  return hit
}

// Sutherland-Hodgman against an axis-aligned box. A concave footprint can leave a zero-width bridge along the box
// edge where a room straddles a notch; it triangulates to nothing and reads as a wall.
function clip(poly: P[], u0: number, v0: number, u1: number, v1: number) {
  const side = (out: P[], keep: (p: P) => boolean, cut: (a: P, b: P) => P) => {
    const r: P[] = []
    for (let i = 0; i < out.length; i++) {
      const a = out[(i + out.length - 1) % out.length]
      const b = out[i]
      if (keep(b)) {
        if (!keep(a)) r.push(cut(a, b))
        r.push(b)
      } else if (keep(a)) r.push(cut(a, b))
    }
    return r
  }
  const atU = (u: number) => (a: P, b: P): P => [u, a[1] + ((b[1] - a[1]) * (u - a[0])) / (b[0] - a[0])]
  const atV = (v: number) => (a: P, b: P): P => [a[0] + ((b[0] - a[0]) * (v - a[1])) / (b[1] - a[1]), v]
  let out = poly
  out = side(out, (p) => p[0] >= u0, atU(u0))
  if (out.length) out = side(out, (p) => p[0] <= u1, atU(u1))
  if (out.length) out = side(out, (p) => p[1] >= v0, atV(v0))
  if (out.length) out = side(out, (p) => p[1] <= v1, atV(v1))
  return out
}

// the footprint's main axis: length-weighted mean of edge directions, mod 90 degrees
function mainAxis(fp: P[]) {
  let c = 0
  let s = 0
  for (let i = 0; i < fp.length; i++) {
    const [x0, y0] = fp[i]
    const [x1, y1] = fp[(i + 1) % fp.length]
    const len = Math.hypot(x1 - x0, y1 - y0)
    const t = 4 * Math.atan2(y1 - y0, x1 - x0)
    c += len * Math.cos(t)
    s += len * Math.sin(t)
  }
  return Math.atan2(s, c) / 4
}

export function planFloor(b: Pick<Building, 'id' | 'footprint'>, floor: number, pins: Pin[]): Plan {
  const rand = rng(hash(`${b.id}:${floor}`))
  const a = mainAxis(b.footprint)
  const [ca, sa] = [Math.cos(a), Math.sin(a)]
  const toLocal = ([x, y]: P): P => [x * ca + y * sa, -x * sa + y * ca]
  const toPlan = ([u, v]: P): P => [u * ca - v * sa, u * sa + v * ca]
  const fp = b.footprint.map(toLocal)
  if (area(fp) < 0) fp.reverse()
  const us = fp.map((p) => p[0])
  const vs = fp.map((p) => p[1])
  const [u0, u1, v0, v1] = [Math.min(...us), Math.max(...us), Math.min(...vs), Math.max(...vs)]
  const total = area(fp)

  // cells about 8 m on a side for a 1300 m2 plate; jittered cut lines so floors differ
  const cell = Math.min(12, Math.max(6, Math.sqrt(total) / 4.5))
  const cuts = (lo: number, hi: number) => {
    const n = Math.max(2, Math.min(9, Math.round((hi - lo) / cell)))
    const w = (hi - lo) / n
    return Array.from({ length: n + 1 }, (_, i) => (i === 0 ? lo : i === n ? hi : lo + i * w + (rand() - 0.5) * 0.4 * w))
  }
  const cu = cuts(u0, u1)
  const cv = cuts(v0, v1)
  type Cell = { i: number; j: number; poly: P[]; area: number; full: boolean; taken: boolean }
  const grid = new Map<string, Cell>()
  for (let i = 0; i < cu.length - 1; i++)
    for (let j = 0; j < cv.length - 1; j++) {
      const poly = clip(fp, cu[i], cv[j], cu[i + 1], cv[j + 1])
      const ar = poly.length > 2 ? area(poly) : 0
      if (ar < 6) continue // slivers along the facade
      grid.set(`${i},${j}`, { i, j, poly, area: ar, full: ar > 0.97 * (cu[i + 1] - cu[i]) * (cv[j + 1] - cv[j]), taken: false })
    }
  const at = (i: number, j: number) => grid.get(`${i},${j}`)
  const box = (i0: number, j0: number, i1: number, j1: number) => clip(fp, cu[i0], cv[j0], cu[i1 + 1], cv[j1 + 1])
  const raw: { kind: Room['kind']; poly: P[] }[] = []

  // core: the interior cell nearest the plate's centroid, doubled on a big plate. Where it really is: UNVERIFIABLE.
  const mid = centroid(fp)
  const cells = [...grid.values()]
  const pool = cells.some((c) => c.full) ? cells.filter((c) => c.full) : cells
  const dist = (c: Cell) => Math.hypot((cu[c.i] + cu[c.i + 1]) / 2 - mid[0], (cv[c.j] + cv[c.j + 1]) / 2 - mid[1])
  const core = pool.reduce((m, c) => (dist(c) < dist(m) ? c : m))
  core.taken = true
  const mates = [at(core.i + 1, core.j), at(core.i, core.j + 1)].filter((c) => c?.full)
  const mate = total > 600 && mates.length ? mates[Math.floor(rand() * mates.length)] : undefined
  if (mate) mate.taken = true
  raw.push({ kind: 'core', poly: mate ? box(core.i, core.j, mate.i, mate.j) : core.poly })

  // the rest: cells, some merged with a neighbour into a bigger room
  for (const c of cells) {
    if (c.taken) continue
    c.taken = true
    const r = rand()
    const right = at(c.i + 1, c.j)
    const up = at(c.i, c.j + 1)
    if (r < 0.4 && right && !right.taken) {
      right.taken = true
      raw.push({ kind: 'space', poly: box(c.i, c.j, c.i + 1, c.j) })
    } else if (r < 0.6 && up && !up.taken) {
      up.taken = true
      raw.push({ kind: 'space', poly: box(c.i, c.j, c.i, c.j + 1) })
    } else raw.push({ kind: 'space', poly: c.poly })
  }

  const rooms: Room[] = raw.map((r, k) => {
    const poly = r.poly.map(toPlan)
    let c = centroid(poly)
    // an L-shaped room's centroid can fall outside it: use the vertex mean, then any vertex nudged inward
    if (!inside(c, poly)) {
      const m: P = [poly.reduce((s, p) => s + p[0], 0) / poly.length, poly.reduce((s, p) => s + p[1], 0) / poly.length]
      c = inside(m, poly) ? m : [poly[0][0] * 0.8 + c[0] * 0.2, poly[0][1] * 0.8 + c[1] * 0.2]
    }
    return { id: `r${k}`, kind: r.kind, poly, c, area: Math.abs(area(poly)), pins: [] }
  })

  // named rooms from records; a second pin naming the same room joins it
  const open = () => rooms.filter((r) => r.kind === 'space').sort((p, q) => q.area - p.area)
  const rest: Pin[] = []
  for (const p of pins) {
    const n = nameFor(p)
    if (!n) {
      rest.push(p)
      continue
    }
    let room = rooms.find((r) => r.name === n.name)
    if (!room) {
      const free = open()
      if (!free.length) {
        rest.push(p)
        continue
      }
      // big rooms (assembly) take the largest space; the rest a seeded pick from the larger half
      room = n.big ? free[0] : free[Math.floor(rand() * Math.ceil(free.length / 2))]
      const ev = p.evidence[0]
      Object.assign(room, { kind: 'named', name: n.name, claim: p.claim, cite: `${SOURCE[ev.datasetId] ?? ev.source.toUpperCase()} ${ev.recordId}` })
    }
    room.pins.push(p)
  }
  // everything else: no position in the record, so a seeded generic space (never the core, never a named room)
  const generic = rooms.filter((r) => r.kind === 'space')
  const any = rooms.filter((r) => r.kind !== 'core')
  for (const p of rest) {
    const from = generic.length ? generic : any
    from[hash(p.id) % from.length].pins.push(p)
  }

  const long = u1 - u0 >= v1 - v0
  return {
    rooms,
    center: toPlan(mid),
    long: Math.max(u1 - u0, v1 - v0),
    short: Math.min(u1 - u0, v1 - v0),
    longAngle: long ? a : a + Math.PI / 2,
  }
}
