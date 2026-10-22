import type { Building, Pin } from '../../../shared/building.ts'
import { parseDispatch, parseDispatchText } from '../../../shared/dispatch.ts'

export const BUILDINGS = [
  { id: 'sf-3722080', address: '140 New Montgomery St', aliases: ['138 New Montgomery', '140 New Montgomery', 'Pac Bell Building'] },
  { id: 'sf-0874003', address: '400 Duboce Ave', aliases: ['400 Duboce', '50 Church St'] },
  { id: 'sf-3703081', address: '1018 Mission St', aliases: ['1018 Mission', '1024 Mission'] },
  { id: 'sf-1244030', address: '1433 Haight St', aliases: ['1433 Haight'] },
] as const
export const HERO_DISPATCH = 'Structure fire, 140 New Montgomery St, smoke reported 22nd floor.'
const normalize = (s: string) => s.toLowerCase().replace(/\b(street|avenue)\b/g, m => m === 'street' ? 'st' : 'ave').replace(/[^a-z0-9]/g, '')

export function dispatchBuilding(text: string): string | null {
  const address = parseDispatchText(text).address
  if (!address) return null
  const value = normalize(address)
  return BUILDINGS.find(b => [b.address, ...b.aliases].some(a => value === normalize(a) || value === normalize(a + ' St')))?.id ?? ''
}

export function dispatchPin(text: string, building: Building): Pin {
  // The shared parser supports "floor 22" and "22nd floor"; normalize the CAD abbreviation locally.
  const pin = parseDispatch(text.replace(/\bfl\.?\s+(\d{1,2})\b/gi, 'floor $1'), building)
  return { ...pin, claim: 'unverifiable', evidence: pin.evidence.map(e => ({ ...e, source: 'Simulated dispatch input' })) }
}

export function floorLabel(pin: Pin): string {
  const a = pin.anchor
  return a.kind === 'floor' ? a.floor === 0 ? 'B1' : `Floor ${a.floor}` : a.kind === 'ground' ? 'Nearby' : a.kind === 'roof' ? 'Roof' : 'Building'
}

export function sourceUrl(url: string): string | undefined {
  try { const u = new URL(url); return ['https:', 'http:'].includes(u.protocol) ? u.href : undefined } catch { return undefined }
}

export function localTime(iso: string): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? 'unknown' : d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Los_Angeles' }) + ' PT'
}

export type RefreshRun = {
  at: string; buildingId: string; sourcesQueried: number; sourcesFailed: number
  added: { pinId: string; label: string }[]; removed: { pinId: string; label: string }[]; changed: { pinId: string; label: string }[]; note: string
}
