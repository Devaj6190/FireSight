// Pure helpers for the site card: what an arriving crew can read about the street side of a building.
// Everything here is derived from Building.site and the water / wind pins; nothing locates a stair or a route.
import type { Building, Pin } from '../../../shared/building.ts'

type Site = NonNullable<Building['site']>

const WORDS_16 = [
  'north', 'north-northeast', 'northeast', 'east-northeast', 'east', 'east-southeast', 'southeast', 'south-southeast',
  'south', 'south-southwest', 'southwest', 'west-southwest', 'west', 'west-northwest', 'northwest', 'north-northwest',
]
const WORDS_8 = ['north', 'northeast', 'east', 'southeast', 'south', 'southwest', 'west', 'northwest']
const ABBR: Record<string, string> = Object.fromEntries(
  ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'].map((a, i) => [a, WORDS_16[i]]),
)

const norm = (deg: number) => ((deg % 360) + 360) % 360

/** Compass word for a bearing in degrees (0 = north, clockwise). 8 points for faces, 16 for hydrants and wind. */
export function compassWord(deg: number, points: 8 | 16 = 16): string {
  return points === 8 ? WORDS_8[Math.round(norm(deg) / 45) % 8] : WORDS_16[Math.round(norm(deg) / 22.5) % 16]
}

/** "SW" or "WSW" to "southwest"; undefined when the token is not a compass abbreviation. */
export const expandCompass = (abbr: string): string | undefined => ABBR[abbr.toUpperCase()]

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/** "Haight Street" -> "Haight St"; keeps it short for a phone. */
export function shortStreet(s: string): string {
  return s
    .replace(/\bStreet\b/g, 'St').replace(/\bAvenue\b/g, 'Ave').replace(/\bBoulevard\b/g, 'Blvd')
    .replace(/\bRoad\b/g, 'Rd').replace(/\bDrive\b/g, 'Dr').replace(/\bPlace\b/g, 'Pl').replace(/\bCourt\b/g, 'Ct')
}

// ---- Approach ----

export interface Face { side: string; streets: string[] }

/** Street per compass side (8 points, north first), from the outward bearing of each footprint edge. */
export function faces(site: Site): Face[] {
  const bySide = new Map<number, string[]>()
  for (const s of site.sides) {
    const i = Math.round(norm(s.bearingDeg) / 45) % 8
    const list = bySide.get(i) ?? []
    if (!list.includes(s.street)) list.push(s.street)
    bySide.set(i, list)
  }
  return [...bySide.entries()].sort((a, b) => a[0] - b[0]).map(([i, streets]) => ({ side: cap(WORDS_8[i]), streets }))
}

const distToSegment = (px: number, py: number, a: [number, number], b: [number, number]) => {
  const dx = b[0] - a[0], dy = b[1] - a[1]
  const len2 = dx * dx + dy * dy
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - a[0]) * dx + (py - a[1]) * dy) / len2))
  return Math.hypot(px - (a[0] + t * dx), py - (a[1] + t * dy))
}

const GENERIC_KIND = /^(|entrance|entry|yes|main|door)$/i

export interface EntranceLine { text: string; count: number; url: string }

/** One line per distinct entrance description, e.g. "Parking entrance on Minna St". Street comes from the nearest
 *  footprint edge that has a street; with no street data it falls back to the compass side of the building. */
export function entrances(b: Pick<Building, 'footprint'> & { site?: Building['site'] }): EntranceLine[] {
  const site = b.site
  if (!site) return []
  const n = b.footprint.length
  const out = new Map<string, EntranceLine>()
  for (const e of site.entrances) {
    let place = ''
    let best = Infinity
    for (const s of site.sides) {
      if (n < 2) break
      const d = distToSegment(e.x, e.y, b.footprint[s.edge % n], b.footprint[(s.edge + 1) % n])
      if (d < best) { best = d; place = `on ${shortStreet(s.street)}` }
    }
    if (!place) place = `on the ${compassWord((Math.atan2(e.x, e.y) * 180) / Math.PI, 8)} side`
    const kind = GENERIC_KIND.test(e.kind.trim()) ? 'Entrance' : cap(e.kind.trim())
    const text = `${kind} ${place}`
    const prev = out.get(text)
    if (prev) prev.count += 1
    else out.set(text, { text, count: 1, url: e.url })
  }
  return [...out.values()]
}

// ---- Water and wind ----

export interface Hydrant { highPressure: boolean; distanceM: number; dir: string; source: string; year: string | null; stale: boolean; url: string }

/** Parses a water pin into a hydrant, or null for cisterns, call boxes and everything else. */
export function hydrantOf(p: Pin): Hydrant | null {
  if (p.layer !== 'water' || !/\bHYDRANT\b/i.test(p.label)) return null
  const m = p.label.match(/(\d+(?:\.\d+)?)\s*M\s+([NSEW]{1,3})\s*$/i)
  const distanceM = p.anchor.kind === 'ground' ? p.anchor.distanceM : m ? Number(m[1]) : NaN
  const dir = p.anchor.kind === 'ground' ? compassWord(p.anchor.bearingDeg) : m ? expandCompass(m[2]) : undefined
  if (!Number.isFinite(distanceM) || !dir) return null
  const ev = p.evidence[0]
  return {
    highPressure: /HIGH-PRESSURE/i.test(p.label),
    distanceM: Math.round(distanceM),
    dir,
    source: ev?.source ?? 'source not recorded',
    year: ev?.asOf?.slice(0, 4) ?? null,
    stale: p.stale,
    url: ev?.url ?? '',
  }
}

/** Nearest hydrant of any kind and nearest high-pressure one (the same hydrant can be both). */
export function nearestHydrants(pins: Pin[]): { nearest: Hydrant | null; highPressure: Hydrant | null } {
  const hs = pins.map(hydrantOf).filter((h): h is Hydrant => h !== null).sort((a, b) => a.distanceM - b.distanceM)
  return { nearest: hs[0] ?? null, highPressure: hs.find((h) => h.highPressure) ?? null }
}

export interface Wind { mph: number; from: string; to: string; source: string; url: string }

/** "WIND 3 MPH FROM SW, SMOKE TO NE" -> { mph: 3, from: "southwest", to: "northeast" }. */
export function windOf(p: Pin | undefined): Wind | null {
  if (!p || p.layer !== 'wind') return null
  const m = p.label.match(/WIND\s+(\d+(?:\.\d+)?)\s*MPH\s+FROM\s+([NSEW]{1,3}),\s*SMOKE\s+TO\s+([NSEW]{1,3})/i)
  if (!m) return null
  const from = expandCompass(m[2]), to = expandCompass(m[3])
  if (!from || !to) return null
  const ev = p.evidence[0]
  return { mph: Number(m[1]), from, to, source: ev?.source ?? 'Open-Meteo', url: ev?.url ?? '' }
}

// ---- This floor ----

export const SQFT_PER_M2 = 10.7639
export const sqft = (m2: number) => Math.round(m2 * SQFT_PER_M2)
export const isOffice = (use: string | null | undefined) => /\boffice\b/i.test(use ?? '')

/** CBC Table 1004.5 business use: one person per 150 gross sq ft. A ceiling from floor area, not a count. */
export const officeCeiling = (m2: number) => Math.round(sqft(m2) / 150)

export const fmtInt = (n: number) => n.toLocaleString('en-US')
export const ftFromM = (m: number) => Math.round(m * 3.28084)
