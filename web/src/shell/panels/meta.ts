import type { Building, LayerStatus } from '../../../../shared/building.ts'

// building.meta is written by Lane B's builder and is not in the frozen contract, so read it defensively.
export type BuildingMeta = {
  footprintAsOf?: string
  heightSource?: string
  sourcesQueried?: number
  sourcesWithRecords?: number
  sourcesFailed?: number
  refreshedAt?: string
  refreshIntervalMin?: number
}

export function metaOf(b: Building): BuildingMeta {
  return ((b as Building & { meta?: BuildingMeta }).meta ?? {}) as BuildingMeta
}

// Datasets the city publishes late or only once. A layer's asOf is the fetch date, so the real lag is stated here.
// ageYear: shown as an AGE tag and sorted to the bottom of the sources drawer.
export const LAG: Record<string, { note: string; ageYear?: number }> = {
  fire_incidents: { note: 'about 4 weeks behind' },
  fire_calls: { note: 'about 8 hours behind' },
  police_calls: { note: 'about 8 hours behind' },
  footprint: { note: 'outlines 2023-09, heights from 2010 LiDAR' },
  esf4_stations: { note: '2018 snapshot', ageYear: 2018 },
  esf4_cisterns: { note: '2018 snapshot', ageYear: 2018 },
  esf4_hydrants_hp: { note: '2018 snapshot', ageYear: 2018 },
  esf4_hydrants_lp: { note: '2018 snapshot', ageYear: 2018 },
  esf4_callboxes: { note: '2018 snapshot', ageYear: 2018 },
  esf4_first_run: { note: '2018 snapshot', ageYear: 2018 },
  esf4_battalion: { note: '2018 snapshot', ageYear: 2018 },
  burn_1906: { note: 'historic map, 1906', ageYear: 1906 },
  sanborn: { note: 'historic maps', ageYear: 1950 },
  sro_cmtl: { note: 'counts from 2016', ageYear: 2016 },
  sro_all: { note: 'list from 2020', ageYear: 2020 },
}

export function isStale(l: LayerStatus): boolean {
  return LAG[l.layer]?.ageYear !== undefined
}

export function shortTime(iso?: string): string {
  if (!iso) return ''
  const m = /T(\d\d:\d\d)/.exec(iso)
  return m ? m[1] : iso.slice(0, 10)
}
