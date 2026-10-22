// Test scenario: a SIMULATED fire on floor 22 of 140 New Montgomery St, for the demo (docs/demo-fire-22.md).
// A dispatch line can name where on the floor the fire is ("east wing", "northwest corner"). That side picks the
// cells of the estimated plan (archPlan.ts) at that end of the floor; nothing about the fire is a public record.
// ?scenario=fire22 runs it after the intro; the Respond page has a button for it.
type P = [number, number]

export const FIRE_TEST = {
  id: 'fire22',
  buildingId: 'sf-3722080',
  floor: 22,
  dispatch: 'Structure fire, 140 New Montgomery St, smoke and flames reported 22nd floor, east wing.',
} as const

export type Fire = { floor: number; side: string; dir: P } // dir: unit vector, plan coords (x east, y north)

const S = Math.SQRT1_2
const SIDES: Record<string, P> = {
  north: [0, 1], south: [0, -1], east: [1, 0], west: [-1, 0],
  northeast: [S, S], northwest: [-S, S], southeast: [S, -S], southwest: [-S, -S],
}
const SIDE_RE = /\b(north|south)?[\s-]?(east|west)?(?:ern)?\s+(?:side|wing|corner|end)\b/gi

// "east wing" -> east; "north-east corner", "northeast side" -> northeast. No side named -> null (no fire area drawn)
export function fireSide(text: string): { side: string; dir: P } | null {
  const m = [...text.matchAll(SIDE_RE)].find((x) => x[1] || x[2]) // "back side" matches the pattern with no compass word
  if (!m) return null
  const side = `${m[1] ?? ''}${m[2] ?? ''}`.toLowerCase()
  return { side, dir: SIDES[side] }
}

export function fireFor(text: string, floor: number | null): Fire | null {
  const s = floor === null ? null : fireSide(text)
  return s && floor !== null ? { floor, ...s } : null
}
