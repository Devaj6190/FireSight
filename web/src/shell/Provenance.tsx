import type { Building, Pin } from '../../../shared/building.ts'
import { floorLabel, sourceUrl } from './model.ts'
import { displayLabel } from './Floors.tsx'

export function Provenance({ pin }: { pin: Pin }) {
  return <section className="phone-card" aria-label="Pin provenance">
    <div className="phone-eyebrow">{floorLabel(pin)} · {pin.origin} record</div>
    <h2>{displayLabel(pin.label)}</h2>
    <div className="phone-tags"><span className={`phone-claim ${pin.claim}`}>{pin.claim.toUpperCase()}</span>{pin.stale && <span className="phone-stale">STALE · current presence unverified</span>}</div>
    <p>{pin.detail}</p>
    {pin.origin !== 'public' && <p className="phone-muted">User supplied {pin.origin} information; not independently verified against city records.</p>}
    {pin.evidence.length ? pin.evidence.map((e, i) => <div className="phone-evidence" key={`${e.datasetId}-${e.recordId}-${i}`}>
      <strong>{e.source}</strong>
      <dl><dt>Dataset</dt><dd>{e.datasetId}</dd><dt>Record</dt><dd>{e.recordId}</dd><dt>As of</dt><dd>{e.asOf}</dd><dt>Placement rule</dt><dd>{e.rule}</dd></dl>
      {sourceUrl(e.url) && <a href={sourceUrl(e.url)} target="_blank" rel="noopener noreferrer">Open source record ↗</a>}
    </div>) : <p className="phone-muted">No public source. Officer verification required.</p>}
  </section>
}

export function ResolutionView({ building, onSelectPin }: { building: Building; onSelectPin: (pin: Pin) => void }) {
  const names = new Map(building.layers.map(l => [l.datasetId, l.source ?? l.layer]))
  return <section className="phone-card" aria-label="Address resolution">
    <div className="phone-eyebrow">Many records · one building</div><h2>How the city records join</h2>
    <div className="phone-parcel"><strong>{building.address}</strong><span>Parcel {building.resolution.apn} · EAS {building.resolution.easBaseId ?? 'unverifiable'}</span></div>
    <div className="phone-tags">{building.resolution.aliases.map(a => <span className="phone-alias" key={a}>{a}</span>)}</div>
    {building.conflicts.map(c => <div className="phone-conflict" key={c.id}><strong>CONFLICT · {c.field}</strong><p>{c.summary}</p>{[...new Set([...(c.pinIds ?? []), c.publicPinId, c.departmentPinId])].filter(Boolean).map(id => { const pin = building.pins.find(p => p.id === id); return pin && <button key={id} className="phone-secondary" onClick={() => onSelectPin(pin)}>{displayLabel(pin.label)} ↗</button> })}</div>)}
    {!building.conflicts.length && <p className="phone-muted">No conflict supplied in this building snapshot. This does not establish agreement across all city records.</p>}
    <ul className="phone-records">{building.resolution.links.map((l, i) => <li key={`${l.datasetId}-${i}`}><div className="phone-row"><strong>{names.get(l.datasetId) ?? l.datasetId}</strong><span className="phone-mono">{l.confidence.toUpperCase()}</span></div><p>{l.method.replaceAll('_', ' ')} · {l.key}</p><span className="phone-muted">{l.datasetId} · {l.records} records · source wrote “{l.example}”</span></li>)}</ul>
  </section>
}
