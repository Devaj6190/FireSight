import { useState } from 'react'
import type { Building, LayerStatus } from '../../../../shared/building.ts'
import { LAG, isStale, metaOf, shortTime } from './meta.ts'
import './panels.css'

type Props = {
  building: Building
  defaultOpen?: boolean
}

const STATUS_LABEL = { ok: 'OK', no_records: 'NO RECORDS', fetch_failed: 'FETCH FAILED' } as const
const rank = (l: LayerStatus) => (isStale(l) ? 3 : l.status === 'ok' ? 0 : l.status === 'no_records' ? 1 : 2)

function attributions(b: Building): string[] {
  const has = (id: string) => b.layers.some((l) => l.layer === id || l.datasetId === id)
  const out = ['Building data: DataSF (data.sf.gov)']
  if (has('osm')) out.push('© OpenStreetMap contributors')
  if (has('weather') || has('air_quality')) out.push('Weather: Open-Meteo')
  if (b.layers.some((l) => l.layer.startsWith('esf4_'))) out.push('Fire stations, hydrants, cisterns: SF Department of Emergency Management, 2018 snapshot')
  if (has('earthquakes')) out.push('Earthquakes: USGS')
  if (has('nws_alerts')) out.push('Alerts: National Weather Service')
  if (has('epa_frs')) out.push('Facilities: US EPA')
  if (has('sanborn')) out.push('Sanborn maps: Library of Congress')
  return out
}

export function SourcesDrawer({ building, defaultOpen = false }: Props) {
  const [open, setOpen] = useState(defaultOpen)
  const meta = metaOf(building)
  const queried = meta.sourcesQueried ?? building.layers.length
  const withRecords = meta.sourcesWithRecords ?? building.layers.filter((l) => l.status === 'ok').length
  const refreshed = shortTime(meta.refreshedAt ?? building.fetchedAt)
  const layers = [...building.layers].sort((a, b) => rank(a) - rank(b))
  const nameOf = new Map(building.layers.map((l) => [l.datasetId, l.source ?? l.layer]))

  return (
    <section className="fsp" aria-label="Sources">
      <button className="fsp-toggle" aria-expanded={open} onClick={() => setOpen(!open)}>
        <span className="fsp-eyebrow-text">Sources</span>
        <span className="fsp-toggle-sum">{withRecords} of {queried} with records</span>
        <span aria-hidden="true">{open ? '−' : '+'}</span>
      </button>
      <p className="fsp-note">
        Refreshed from data.sf.gov every {meta.refreshIntervalMin ?? 30} minutes{refreshed ? `, last at ${refreshed}` : ''}. Each source is as fresh as the city publishes it.
      </p>

      {open && (
        <>
          <ul className="fsp-attr">
            {attributions(building).map((a) => <li key={a}>{a}</li>)}
          </ul>

          <div className="fsp-eyebrow"><span>Datasets</span><span className="fsp-tag">{layers.length}</span></div>
          <ul className="fsp-list">
            {layers.map((l) => {
              const lag = LAG[l.layer]
              return (
                <li key={l.layer} className={`fsp-row ${l.status}`}>
                  <div className="fsp-head">
                    <span className="fsp-name">{l.source ?? l.layer}</span>
                    <span className={`fsp-result ${l.status}`}>{l.records ?? 0} · {STATUS_LABEL[l.status]}</span>
                  </div>
                  <span className="fsp-asof">
                    {l.datasetId ?? l.layer} · {l.status === 'fetch_failed'
                      ? (l.lastGoodAt
                        ? `did not answer at the last refresh${l.fetchedAt ? ` (${l.fetchedAt})` : ''}; showing the last good copy from ${l.lastGoodAt}, records to ${l.asOf ?? 'unknown'}`
                        : 'did not answer and no earlier copy exists: this layer is missing')
                      : `newest record ${l.asOf ?? 'unknown'}${l.fetchedAt ? ` · fetched ${l.fetchedAt}` : ''}`}
                    {lag ? ` · ${lag.note}` : ''}
                    {lag?.ageYear ? <span className="fsp-age"> AGE {lag.ageYear}</span> : null}
                  </span>
                </li>
              )
            })}
          </ul>

          <div className="fsp-eyebrow"><span>How each dataset joined this building</span><span className="fsp-tag">{building.resolution.links.length}</span></div>
          <ul className="fsp-list">
            {building.resolution.links.map((k) => (
              <li key={`${k.datasetId}-${k.method}-${k.key}`} className="fsp-row">
                <div className="fsp-head">
                  <span className="fsp-name">{nameOf.get(k.datasetId) ?? k.datasetId}</span>
                  <span className={`fsp-conf ${k.confidence}`}>{k.confidence.toUpperCase()}</span>
                </div>
                <span className="fsp-asof">{k.method.replace('_', ' ')} · {k.key} · {k.records} records</span>
                <span className="fsp-gap">Source wrote: {k.example}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}
