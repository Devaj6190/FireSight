import type { Building, Pin } from '../../../../shared/building.ts'

// "DataSF SFFD Fire Violations" -> "fire violations"; the sheet shows source + year, never the model's words.
export function shortSource(source: string): string {
  return source.replace(/^DataSF\s+/, '').replace(/^(SFFD|DBI)\s+/, '').replace(/\s*\(.*\)$/, '').toLowerCase()
}

export function sourceTail(b: Building, pinIds: string[]): string {
  const byId = new Map(b.pins.map((p) => [p.id, p]))
  const parts: string[] = []
  for (const id of pinIds) {
    const p: Pin | undefined = byId.get(id)
    const e = p?.evidence[0]
    if (p && e) parts.push(`${shortSource(e.source)} ${e.asOf.slice(0, 4)}`)
    else if (p && p.origin !== 'public') parts.push(p.origin)
  }
  return [...new Set(parts)].slice(0, 2).join(' · ')
}
