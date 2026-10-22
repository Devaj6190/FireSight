import type { Building, Pin } from '../../shared/building'

// Incident reports are supplied by dispatch/the crew. Public historical incidents
// must never become an active fire just because they mention fire on this floor.
export function floorIncident(b: Building, floor: number) {
  const onFloor = (p: Pin, f: number) => p.anchor.kind === 'floor' && p.anchor.floor === f
  const reports = b.pins.filter(p => p.origin === 'dispatch' || p.origin === 'crew')
  const fires = reports.filter(p => /\b(fire|smoke|flames?)\b/i.test(`${p.label} ${p.detail}`) && !/\b(no|not|without)\s+(?:active\s+)?(fire|smoke|flames?)\b|\b(extinguished|false alarm)\b/i.test(`${p.label} ${p.detail}`))
  const here = fires.filter(p => onFloor(p, floor))
  const people = reports.filter(p => onFloor(p, floor) && /\b(people|persons?|victims?|trapped|occupants?|child|children)\b/i.test(`${p.label} ${p.detail}`))
  const hazards = (f: number) => b.pins.filter(p => p.origin === 'public' && onFloor(p, f) && p.severity !== 'info')
  const water = b.pins.filter(p => p.layer === 'water' && p.anchor.kind === 'ground' && /hydrant/i.test(`${p.label} ${p.detail}`)).sort((a, z) => (a.anchor.kind === 'ground' ? a.anchor.distanceM : Infinity) - (z.anchor.kind === 'ground' ? z.anchor.distanceM : Infinity))[0]
  const protection = b.pins.find(p => p.origin === 'public' && /sprinkler/i.test(p.label) && /%|percent|coverage/i.test(`${p.label} ${p.detail}`))
  return { fires, here, people, hazards: hazards(floor), above: floor < b.floors ? hazards(floor + 1) : [], water, protection }
}
