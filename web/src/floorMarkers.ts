import type { Building, Pin } from '../../shared/building'
import { sentence } from './arrival.ts'
import { inside } from './roomPlan.ts'

type P = [number, number]
export type FloorMarker = { id: string; kind: 'hazard' | 'system' | 'occupancy'; title: string; detail: string; pin?: Pin; url?: string; at: P }
const SYSTEM = /sprinkler|standpipe|fire pump|alarm|generator|electrical|elevator|riser|server|computer room/i

export function floorMarkers(b: Building, floor: number): FloorMarker[] {
  const rows: Omit<FloorMarker, 'at'>[] = b.pins
    .filter(p => p.origin === 'public' && p.anchor.kind === 'floor' && p.anchor.floor === floor && (p.severity !== 'info' || SYSTEM.test(`${p.label} ${p.detail}`)))
    .sort((a, z) => ({ danger: 0, caution: 1, info: 2 }[a.severity] - { danger: 0, caution: 1, info: 2 }[z.severity]))
    .map(p => ({ id: p.id, kind: p.severity === 'danger' ? 'hazard' as const : SYSTEM.test(`${p.label} ${p.detail}`) ? 'system' as const : 'hazard' as const, title: sentence(p.label, floor), detail: `${p.evidence[0]?.source ?? 'Public record'}${p.stale ? ' · older record' : ''}`, pin: p }))
  const facts = b.floorFacts?.find(f => f.floor === floor)
  for (const o of facts?.occupants ?? []) {
    if (rows.some(r => r.title.toLowerCase() === o.kind.toLowerCase())) continue
    rows.push({ id: `occupancy-${o.kind}`, kind: 'occupancy', title: o.kind, detail: o.hazard ? `Recorded activity: ${o.hazard}` : 'Recorded use, not a live headcount', url: o.url })
  }
  // Annotation anchors, not coordinates from records. Find separated points inside even
  // concave footprints; every rendered label explicitly says its position is unverified.
  const xs = b.footprint.map(p => p[0]), ys = b.footprint.map(p => p[1])
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)]
  const candidates: P[] = []
  for (let ix = 1; ix < 20; ix++) for (let iy = 1; iy < 20; iy++) {
    const p: P = [x0 + (x1 - x0) * ix / 20, y0 + (y1 - y0) * iy / 20]
    const pad = Math.min(4.5, Math.min(x1 - x0, y1 - y0) * 0.12)
    if ([p, ...Array.from({ length: 8 }, (_, k) => [p[0] + Math.cos(k * Math.PI / 4) * pad, p[1] + Math.sin(k * Math.PI / 4) * pad])].every(q => inside(q as P, b.footprint))) candidates.push(p)
  }
  if (!candidates.length) return []
  const placed: P[] = []
  return rows.slice(0, 6).map((r, i) => {
    const target: P = [x0 + (x1 - x0) * (i % 2 ? .72 : .28), y0 + (y1 - y0) * (i % 2 ? .32 : .68)]
    const score = (p: P) => placed.length ? Math.min(...placed.map(q => Math.hypot(p[0] - q[0], p[1] - q[1]))) : -Math.hypot(p[0] - target[0], p[1] - target[1])
    const at = candidates.reduce((best, p) => score(p) > score(best) ? p : best)
    placed.push(at)
    return { ...r, at }
  })
}
