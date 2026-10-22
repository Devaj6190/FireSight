import type { Building } from '../../../../shared/building.ts'
import { metaOf } from './meta.ts'
import './panels.css'

type Row = { id: string; layer: string; asOf: string; gap: string; tag?: 'conflict' | 'unverifiable' }

type Props = { building: Building }

export function LimitsPanel({ building }: Props) {
  const meta = metaOf(building)
  const fp = meta.footprintAsOf ?? 'unknown date'
  const hasLayer = (id: string) => building.layers.some((l) => l.layer === id && l.status !== 'fetch_failed')
  const hasWater = building.layers.some((l) => l.layer.startsWith('esf4_hydrants'))

  const rows: Row[] = [
    { id: 'heights', layer: 'Building heights', asOf: '2010 LiDAR', gap: `Heights come from 2010 laser scans; outlines as of ${fp}. Newer construction is not reflected.` },
  ]
  if (hasWater) rows.push({ id: 'water', layer: 'Hydrants and cisterns', asOf: '2018 snapshot', gap: 'SF DEM snapshot from 2018. Positions may have changed.' })
  if (hasLayer('fire_incidents')) rows.push({ id: 'incidents', layer: 'Fire incidents', asOf: 'about 4 weeks behind', gap: 'Published about 4 weeks late. A fire last week will not appear.' })
  if (hasLayer('fire_calls')) rows.push({ id: 'calls', layer: 'Calls for service', asOf: 'about 8 hours behind', gap: 'Published about 8 hours late. Recent calls may be missing.' })
  rows.push(
    { id: 'units', layer: 'Units per floor', asOf: 'permit text', gap: 'Only unit numbers named in permits. A lower bound, not a count.' },
    { id: 'plans', layer: 'Floor plans', asOf: 'none public', gap: 'No floor plans. Stairs and standpipe locations are UNVERIFIABLE.', tag: 'unverifiable' },
  )
  for (const c of building.conflicts) {
    rows.push({ id: `c-${c.id}`, layer: `Sources disagree: ${c.field.replace(/_/g, ' ')}`, asOf: 'public records', gap: c.summary, tag: 'conflict' })
  }
  rows.push(
    { id: 'inspect', layer: 'Inspection to statute', asOf: 'our inference', gap: 'Linking SFFD inspection types to the California law is our own inference.' },
    { id: 'nfpa', layer: 'NFPA 1660', asOf: 'text mapping', gap: 'Mapped from the earlier 1620 text. NFPA 1660 itself is paywalled.' },
    { id: 'license', layer: 'City map layers', asOf: 'no license stated', gap: 'These layers state no license, so each pin carries its source and date.' },
  )
  // Unknowns the builder found for this building (no public record).
  const unknowns = building.unknowns

  return (
    <section className="fsp" aria-label="What we don't know">
      <div className="fsp-eyebrow">
        <span>What we don't know</span>
        <span className="fsp-tag">{rows.length + unknowns.length} LIMITS</span>
      </div>
      <ul className="fsp-list">
        {rows.map((r) => (
          <li key={r.id} className={`fsp-row ${r.tag ?? ''}`}>
            <div className="fsp-head">
              <span className="fsp-name">{r.layer}</span>
              {r.tag && <span className={`fsp-claim ${r.tag}`}>{r.tag === 'conflict' ? 'CONFLICT' : 'UNVERIFIABLE'}</span>}
            </div>
            <span className="fsp-asof">{r.asOf}</span>
            <span className="fsp-gap">{r.gap}</span>
          </li>
        ))}
        {unknowns.map((u) => {
          const [what, ...rest] = u.split(': ')
          return (
            <li key={u} className="fsp-row unverifiable">
              <div className="fsp-head">
                <span className="fsp-name">{what}</span>
                <span className="fsp-claim unverifiable">UNVERIFIABLE</span>
              </div>
              <span className="fsp-asof">no public record</span>
              {rest.length > 0 && <span className="fsp-gap">{rest.join(': ')}</span>}
            </li>
          )
        })}
      </ul>
      <p className="fsp-note">Missing facts stay unknown. We do not guess.</p>
    </section>
  )
}
