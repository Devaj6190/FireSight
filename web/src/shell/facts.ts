// Derived, glanceable facts for the field shell: header strip, hazard counts, floor panel, water cards.
// Everything here reads the building contract only; nothing is guessed beyond what a label or field says.
import type { Building, Pin, Severity } from '../../../shared/building.ts'

export const RANK: Record<Severity, number> = { danger: 0, caution: 1, info: 2 }
export const bySeverity = (a: Pin, b: Pin) => RANK[a.severity] - RANK[b.severity]

const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V']
const COMPASS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW']
export const compass = (deg: number) => COMPASS[Math.round((((deg % 360) + 360) % 360) / 22.5) % 16]

export type Fact = { id: string; text: string; tone?: 'danger' | 'caution' | 'unknown' }

// "1 (permits, constr type 1)" -> Type I; "5 (permits, wood frame (5)); D (assessor)" -> Type V wood
export function constructionFact(raw: string | null): Fact {
  const n = Number(raw?.match(/^\s*(\d)\b/)?.[1])
  if (!n || n > 5) return { id: 'type', text: 'Type ?', tone: 'unknown' }
  return n === 5 ? { id: 'type', text: 'Type V wood', tone: 'danger' } : { id: 'type', text: `Type ${ROMAN[n]}`, tone: n >= 3 ? 'caution' : undefined }
}

export const hasBasement = (b: Building) => b.pins.some(p => p.anchor.kind === 'floor' && p.anchor.floor === 0)
export const dispatchOf = (b: Building) => b.pins.find(p => p.origin === 'dispatch')
export const dispatchFloor = (b: Building) => { const a = dispatchOf(b)?.anchor; return a?.kind === 'floor' ? a.floor : null }
export const floorName = (f: number) => (f === 0 ? 'B1' : String(f))

export function keyFacts(b: Building): Fact[] {
  const facts: Fact[] = [{ id: 'floors', text: `${b.floors} fl` }, constructionFact(b.constructionType)]
  const sprinkler = b.pins.map(p => p.label.match(/(\d+%)\s+SPRINKLERED/)?.[1]).find(Boolean)
  if (sprinkler) facts.push({ id: 'sprinkler', text: `${sprinkler} sprinklered`, tone: sprinkler === '100%' ? undefined : 'caution' })
  facts.push({ id: 'height', text: `${Math.round(b.heightM)} m` })
  if (b.yearBuilt) facts.push({ id: 'year', text: `Built ${b.yearBuilt}` })
  if (hasBasement(b)) facts.push({ id: 'b1', text: 'B1' })
  if (b.units) facts.push({ id: 'units', text: `${b.units} units` })
  return facts
}

// "Commercial Office (assessor); occupancy B,M,S-2 (permits)" -> "Commercial Office"
export const occupancyOf = (b: Building) => b.use?.split(/\s*[(;]/)[0].trim() || null

export function counts(b: Building) {
  const c = { danger: 0, caution: 0, info: 0, stale: 0, conflict: 0, unknown: b.unknowns.length, total: b.pins.length }
  for (const p of b.pins) { c[p.severity]++; if (p.stale) c.stale++; if (p.claim === 'conflict') c.conflict++ }
  return c
}

export type FloorSummary = { floor: number; pins: Pin[]; danger: number; caution: number }
// top floor first, like an elevator panel; B1 only when a record says basement
export function floorSummaries(b: Building): FloorSummary[] {
  const rows: FloorSummary[] = []
  for (let f = b.floors; f >= (hasBasement(b) ? 0 : 1); f--) {
    const pins = b.pins.filter(p => p.anchor.kind === 'floor' && Math.min(p.anchor.floor, b.floors) === f).sort(bySeverity)
    rows.push({ floor: f, pins, danger: pins.filter(p => p.severity === 'danger').length, caution: pins.filter(p => p.severity === 'caution').length })
  }
  return rows
}
export const roofPins = (b: Building) => b.pins.filter(p => p.anchor.kind === 'roof').sort(bySeverity)

export type SiteItem = { pin: Pin; title: string; distanceM: number; bearingDeg: number; dir: string }
const site = (p: Pin): SiteItem | null => {
  if (p.anchor.kind !== 'ground') return null
  const title = p.layer === 'water' && /^FIRE ALARM$/.test(p.label) ? 'FIRE ALARM BOX' : p.label.replace(/,?\s+\d+(\.\d+)?\s*M(\s+[NSEW]{1,3})?$/, '')
  return { pin: p, title, distanceM: p.anchor.distanceM, bearingDeg: p.anchor.bearingDeg, dir: compass(p.anchor.bearingDeg) }
}
const near = (ps: Pin[]) => ps.map(site).filter((s): s is SiteItem => !!s).sort((a, c) => a.distanceM - c.distanceM)

export function siteOf(b: Building) {
  const water = near(b.pins.filter(p => p.layer === 'water'))
  const wind = near(b.pins.filter(p => p.layer === 'wind'))[0]
  const station = near(b.pins.filter(p => p.layer === 'station'))[0]
  // located exposures only: a 0 m entry is an area fact (zone, AQI), not something on the street
  const around = near(b.pins.filter(p => p.severity !== 'info' && !['water', 'wind', 'station'].includes(p.layer))).filter(s => s.distanceM > 0)
  const missing = b.unknowns.filter(u => /standpipe|fdc|hydrant|water|knox|shutoff|access/i.test(u))
  return { water, wind, station, around, missing }
}
