// ESTIMATED architectural plan for one floor. Nothing here is surveyed: the footprint outline is exact, the column grid
// follows the structural system's typical bay (steel frame ~9.1 m / 30 ft, else ~6 m), and the core, corridor and rooms
// follow common high-rise practice (core near the plate's middle, two stairs, offices out to the facade).
// Pure and deterministic: same building + floor always gives the same plan.
import type { Building, Pin } from '../../shared/building'
import { area, inside, nameFor } from './roomPlan.ts'

export type P = [number, number]
export type Seg = [P, P]
export type Rect = { c: P; w: number; d: number; angle: number } // plan coords (m, x east, y north); w along angle
export type Tone = 'danger' | 'caution'
export type ArchRoom = { name: string; tone: Tone; polys: P[][]; c: P; pin?: Pin }
export type Arch = {
  angle: number
  bay: number
  columns: P[]
  core: Rect
  corridor: Rect
  shafts: Rect[]
  stairs: { name: string; rect: Rect; treads: Seg[] }[]
  walls: Seg[] // partitions + corridor walls
  coreWalls: Seg[]
  facade: Seg[]
  rooms: ArchRoom[]
  elevators: number
}

const CORRIDOR = 1.8
const SHAFT = 2.6
const STAIR_L = 3.2
const CORE_D = 6.2

// the footprint's main axis: length-weighted mean of edge directions, mod 90 degrees (as roomPlan.ts)
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

function segDist([px, py]: P, [ax, ay]: P, [bx, by]: P) {
  const dx = bx - ax
  const dy = by - ay
  const l = dx * dx + dy * dy
  const t = l ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l)) : 0
  return Math.hypot(px - ax - t * dx, py - ay - t * dy)
}
const edgeDist = (p: P, poly: P[]) => Math.min(...poly.map((a, i) => segDist(p, a, poly[(i + 1) % poly.length])))

// v-intervals where the vertical line u = const is inside the polygon (local frame)
function cutLine(poly: P[], u: number): [number, number][] {
  const vs: number[] = []
  for (let i = 0; i < poly.length; i++) {
    const [u0, v0] = poly[i]
    const [u1, v1] = poly[(i + 1) % poly.length]
    if (u0 > u !== u1 > u) vs.push(v0 + ((u - u0) * (v1 - v0)) / (u1 - u0))
  }
  vs.sort((a, b) => a - b)
  const out: [number, number][] = []
  for (let i = 0; i + 1 < vs.length; i += 2) out.push([vs[i], vs[i + 1]])
  return out
}
const swap = (poly: P[]): P[] => poly.map(([u, v]) => [v, u])
function minus(iv: [number, number][], lo: number, hi: number) {
  return iv.flatMap(([a, b]): [number, number][] => (hi <= a || lo >= b ? [[a, b]] : [...(a < lo ? [[a, lo] as [number, number]] : []), ...(b > hi ? [[hi, b] as [number, number]] : [])]))
}
function clipBox(poly: P[], u0: number, v0: number, u1: number, v1: number) {
  const side = (pts: P[], keep: (p: P) => boolean, cut: (a: P, b: P) => P) => {
    const r: P[] = []
    for (let i = 0; i < pts.length; i++) {
      const a = pts[(i + pts.length - 1) % pts.length]
      const b = pts[i]
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

// named hazard rooms: from cited pins (roomPlan.nameFor) and floorFacts.rooms
const HAZ: { re: RegExp; name: string; tone: Tone; big?: boolean }[] = [
  { re: /battery|computer/i, name: 'Battery room', tone: 'danger' },
  { re: /server/i, name: 'Server room', tone: 'caution' },
  { re: /fire pump|generator/i, name: 'Fire pump room', tone: 'caution' },
  { re: /assembly/i, name: 'Assembly', tone: 'caution', big: true },
]

export function archPlan(b: Pick<Building, 'id' | 'footprint' | 'structure' | 'floorFacts'>, floor: number, pins: Pin[]): Arch {
  const a = mainAxis(b.footprint)
  const [ca, sa] = [Math.cos(a), Math.sin(a)]
  const toLocal = ([x, y]: P): P => [x * ca + y * sa, -x * sa + y * ca]
  const toPlan = ([u, v]: P): P => [u * ca - v * sa, u * sa + v * ca]
  const fp = b.footprint.map(toLocal)
  if (area(fp) < 0) fp.reverse()
  const total = area(fp)
  const us = fp.map((p) => p[0])
  const vs = fp.map((p) => p[1])
  const [u0, u1, v0, v1] = [Math.min(...us), Math.max(...us), Math.min(...vs), Math.max(...vs)]
  const steel = !!b.structure?.system && /steel|concrete|frame/i.test(`${b.structure.system} ${b.structure.material ?? ''}`)
  const bay = steel ? 9.1 : 6
  const elevators = !b.structure && total < 600 ? 1 : Math.min(6, Math.max(2, Math.round(total / 1000)))

  // core: two stairs at the ends, a row of shafts between, a lobby strip alongside
  const fits = (cu: number, cv: number, L: number, D: number) => {
    const hl = L / 2 + CORRIDOR + 0.6
    const hd = D / 2 + CORRIDOR + 0.6
    for (const [x, y] of fp) if (Math.abs(x - cu) < hl && Math.abs(y - cv) < hd) return false
    const n = 8
    for (let k = 0; k <= n; k++) {
      const s = -1 + (2 * k) / n
      for (const p of [[cu + s * hl, cv - hd], [cu + s * hl, cv + hd], [cu - hl, cv + s * hd], [cu + hl, cv + s * hd]] as P[]) if (!inside(p, fp)) return false
    }
    return true
  }
  let mid = [0, 0] as P
  {
    let cx = 0
    let cy = 0
    let s = 0
    for (let i = 0; i < fp.length; i++) {
      const [x0, y0] = fp[i]
      const [x1, y1] = fp[(i + 1) % fp.length]
      const k = x0 * y1 - x1 * y0
      s += k
      cx += (x0 + x1) * k
      cy += (y0 + y1) * k
    }
    if (Math.abs(s) > 1e-9) mid = [cx / (3 * s), cy / (3 * s)]
  }
  const cands: P[] = []
  for (let u = u0; u <= u1; u += 1) for (let v = v0; v <= v1; v += 1) if (inside([u, v], fp)) cands.push([u, v])
  cands.sort((p, q) => Math.hypot(p[0] - mid[0], p[1] - mid[1]) - Math.hypot(q[0] - mid[0], q[1] - mid[1]))
  let scale = 0.4
  let cc: P = cands[0] ?? mid
  search: for (const k of [1, 0.8, 0.62, 0.48]) {
    const L = (elevators * SHAFT + 2 * STAIR_L + 1) * k
    const D = CORE_D * k
    for (const p of cands) if (fits(p[0], p[1], L, D)) {
      cc = p
      scale = k
      break search
    }
  }
  const L = (elevators * SHAFT + 2 * STAIR_L + 1) * scale
  const D = CORE_D * scale
  const rect = (u: number, v: number, w: number, d: number): Rect => ({ c: toPlan([u, v]), w, d, angle: a })
  const core = rect(cc[0], cc[1], L, D)
  const corridor = rect(cc[0], cc[1], L + 2 * CORRIDOR, D + 2 * CORRIDOR)
  const sl = STAIR_L * scale
  const sh = SHAFT * scale
  const stairs = (['Stair A', 'Stair B'] as const).map((name, i) => {
    const su = cc[0] + (i ? 1 : -1) * (L / 2 - sl / 2)
    const n = Math.max(4, Math.round((D - 0.4) / 0.6))
    const treads: Seg[] = Array.from({ length: n - 1 }, (_, k) => {
      const v = cc[1] - D / 2 + 0.2 + ((k + 1) * (D - 0.4)) / n
      return [toPlan([su - sl / 2 + 0.25, v]), toPlan([su + sl / 2 - 0.25, v])]
    })
    return { name, rect: rect(su, cc[1], sl, D), treads }
  })
  const shaftV = cc[1] + D / 2 - sh / 2 - 0.15 * scale
  const shafts = Array.from({ length: elevators }, (_, k) => rect(cc[0] - (elevators * sh) / 2 + sh * (k + 0.5), shaftV, sh * 0.92, sh * 0.92))

  // columns: perimeter every ~bay along each edge, interior on the bay grid anchored on the core
  const cuL = [cc[0] - L / 2 - CORRIDOR, cc[0] + L / 2 + CORRIDOR]
  const cvL = [cc[1] - D / 2 - CORRIDOR, cc[1] + D / 2 + CORRIDOR]
  const inCorr = ([u, v]: P, m = 0) => u > cuL[0] - m && u < cuL[1] + m && v > cvL[0] - m && v < cvL[1] + m
  const columns: P[] = []
  const near = (p: P, d: number) => columns.some((q) => Math.hypot(p[0] - q[0], p[1] - q[1]) < d)
  for (let i = 0; i < fp.length; i++) {
    const [ax, ay] = fp[i]
    const [bx, by] = fp[(i + 1) % fp.length]
    const len = Math.hypot(bx - ax, by - ay)
    if (len < 1) continue
    const nx = -(by - ay) / len
    const ny = (bx - ax) / len
    const n = Math.max(1, Math.round(len / bay))
    for (let k = 0; k < n; k++) {
      const t = k / n
      const p: P = [ax + t * (bx - ax) + nx * 0.45, ay + t * (by - ay) + ny * 0.45]
      if (inside(p, fp) && !near(p, bay * 0.45)) columns.push(p)
    }
  }
  for (let u = cc[0] + Math.ceil((u0 - cc[0]) / bay) * bay; u <= u1; u += bay)
    for (let v = cc[1] + Math.ceil((v0 - cc[1]) / bay) * bay; v <= v1; v += bay) {
      const p: P = [u, v]
      if (inside(p, fp) && edgeDist(p, fp) > 2 && !inCorr(p, 0.5) && !near(p, bay * 0.5)) columns.push(p)
    }
  for (const du of [-1, 1]) for (const dv of [-1, 1]) columns.push([cc[0] + (du * L) / 2, cc[1] + (dv * D) / 2])

  // walls: corridor ring, then partitions on a ~1.5-bay grid from the corridor out to the facade
  const box = (u: number, v: number, w: number, d: number): Seg[] => {
    const c: P[] = [[u - w / 2, v - d / 2], [u + w / 2, v - d / 2], [u + w / 2, v + d / 2], [u - w / 2, v + d / 2]]
    return c.map((p, i) => [toPlan(p), toPlan(c[(i + 1) % 4])])
  }
  const coreWalls = box(cc[0], cc[1], L, D)
  // no stair enclosures: stair positions are not public and must never be drawn (product rule, 14:58)
  const step = Math.max(6, 1.5 * bay)
  const gu: number[] = []
  const gv: number[] = []
  for (let u = cuL[0] - Math.floor((cuL[0] - u0) / step) * step; u <= u1 + 1e-6; u += step) gu.push(u)
  for (let u = cuL[1]; u <= u1; u += step) if (!gu.some((g) => Math.abs(g - u) < step * 0.4)) gu.push(u)
  for (let v = cvL[0] - Math.floor((cvL[0] - v0) / step) * step; v <= v1 + 1e-6; v += step) gv.push(v)
  for (let v = cvL[1]; v <= v1; v += step) if (!gv.some((g) => Math.abs(g - v) < step * 0.4)) gv.push(v)
  gu.sort((p, q) => p - q)
  gv.sort((p, q) => p - q)
  const bu = [u0, ...gu.filter((u) => u > u0 + 2 && u < u1 - 2), u1]
  const bv = [v0, ...gv.filter((v) => v > v0 + 2 && v < v1 - 2), v1]

  // cells between grid lines, clipped to the plate; the ones touching the corridor are corridor-side space
  type Cell = { i: number; j: number; poly: P[]; ar: number; room: number }
  const cells = new Map<string, Cell>()
  for (let i = 0; i + 1 < bu.length; i++)
    for (let j = 0; j + 1 < bv.length; j++) {
      const poly = clipBox(fp, bu[i], bv[j], bu[i + 1], bv[j + 1])
      const ar = poly.length > 2 ? area(poly) : 0
      if (ar < 4) continue
      cells.set(`${i},${j}`, { i, j, poly, ar, room: cells.size })
    }
  const touches = (c: Cell) => bu[c.i] < cuL[1] && bu[c.i + 1] > cuL[0] && bv[c.j] < cvL[1] && bv[c.j + 1] > cvL[0]
  const cmid = (c: Cell): P => [(bu[c.i] + bu[c.i + 1]) / 2, (bv[c.j] + bv[c.j + 1]) / 2]
  const free = [...cells.values()].filter((c) => !touches(c) && c.ar > 12)
  const byCore = [...free].sort((p, q) => Math.hypot(...(cmid(p).map((x, k) => x - cc[k]) as P)) - Math.hypot(...(cmid(q).map((x, k) => x - cc[k]) as P)))

  // hazard rooms named on this floor
  const facts = b.floorFacts?.find((f) => f.floor === floor)
  const wanted: { h: (typeof HAZ)[number]; pin?: Pin }[] = []
  for (const p of pins) {
    const n = nameFor(p)
    const h = n && HAZ.find((x) => x.re.test(n.name))
    if (h && !wanted.some((w) => w.h === h)) wanted.push({ h, pin: p })
  }
  for (const r of facts?.rooms ?? []) {
    const h = HAZ.find((x) => x.re.test(r))
    if (h && !wanted.some((w) => w.h === h)) wanted.push({ h })
  }
  const cooking = (facts?.occupants ?? []).some((o) => /cook|kitchen|food|cafeteria|restaurant/i.test(`${o.kind} ${o.hazard ?? ''}`))
  const used = new Set<Cell>()
  const rooms: ArchRoom[] = []
  const merged = new Set<string>() // grid edges with no wall (inside one big room)
  const center = (cs: Cell[]): P => {
    const big = cs.reduce((m, c) => (c.ar > m.ar ? c : m))
    const m = cmid(big)
    const p: P = inside(m, big.poly) ? m : [big.poly.reduce((s, q) => s + q[0], 0) / big.poly.length, big.poly.reduce((s, q) => s + q[1], 0) / big.poly.length]
    return toPlan(p)
  }
  const take = (name: string, tone: Tone, pin: Pin | undefined, big: boolean) => {
    const pool = byCore.filter((c) => !used.has(c))
    if (!pool.length) return
    let cs: Cell[]
    if (big) {
      const seed = [...pool].sort((p, q) => q.ar - p.ar)[0]
      cs = [seed, ...[[1, 0], [0, 1], [1, 1]].map(([di, dj]) => cells.get(`${seed.i + di},${seed.j + dj}`)).filter((c): c is Cell => !!c && pool.includes(c))]
      for (const c of cs) for (const d of cs) if (c !== d) merged.add(c.i === d.i ? `h${c.i},${Math.max(c.j, d.j)}` : c.j === d.j ? `v${Math.max(c.i, d.i)},${c.j}` : '')
    } else cs = [pool[0]]
    cs.forEach((c) => used.add(c))
    rooms.push({ name, tone, polys: cs.map((c) => c.poly.map(toPlan)), c: center(cs), pin })
  }
  for (const w of wanted) take(w.h.name, w.pin?.severity === 'danger' ? 'danger' : w.h.tone, w.pin, !!w.h.big && floor >= 1 && floor <= 2)
  if (cooking) take('Kitchen', 'caution', undefined, false)

  const walls: Seg[] = box(cc[0], cc[1], L + 2 * CORRIDOR, D + 2 * CORRIDOR)
  // vertical partitions u = bu[i], between rows bv[j]..bv[j+1]
  for (let i = 1; i + 1 < bu.length; i++) {
    for (const [s, e] of cutLine(fp, bu[i])) {
      for (let j = 0; j + 1 < bv.length; j++) {
        if (merged.has(`v${i},${j}`)) continue
        let iv: [number, number][] = [[Math.max(s, bv[j]), Math.min(e, bv[j + 1])]]
        if (bu[i] > cuL[0] && bu[i] < cuL[1]) iv = minus(iv, cvL[0], cvL[1])
        for (const [p, q] of iv) if (q - p > 0.8) walls.push([toPlan([bu[i], p]), toPlan([bu[i], q])])
      }
    }
  }
  const fpT = swap(fp)
  for (let j = 1; j + 1 < bv.length; j++) {
    for (const [s, e] of cutLine(fpT, bv[j])) {
      for (let i = 0; i + 1 < bu.length; i++) {
        if (merged.has(`h${i},${j}`)) continue
        let iv: [number, number][] = [[Math.max(s, bu[i]), Math.min(e, bu[i + 1])]]
        if (bv[j] > cvL[0] && bv[j] < cvL[1]) iv = minus(iv, cuL[0], cuL[1])
        for (const [p, q] of iv) if (q - p > 0.8) walls.push([toPlan([p, bv[j]]), toPlan([q, bv[j]])])
      }
    }
  }
  const facade: Seg[] = b.footprint.map((p, i) => [p, b.footprint[(i + 1) % b.footprint.length]])

  return { angle: a, bay, columns: columns.map(toPlan), core, corridor, shafts, stairs, walls, coreWalls, facade, rooms, elevators }
}
