import { useEffect, useState } from 'react'
import type { Building } from '../../../shared/building.ts'
import { localTime, type RefreshRun } from './model.ts'

export function useRefreshRuns() {
  const [runs, setRuns] = useState<RefreshRun[]>([])
  const [unavailable, setUnavailable] = useState(false)
  useEffect(() => {
    const controller = new AbortController()
    fetch(`${import.meta.env.BASE_URL}refresh/log.json`, { signal: controller.signal })
      .then(r => { if (!r.ok) throw Error(); return r.json() })
      .then(value => { if (!Array.isArray(value)) throw Error(); setRuns(value) })
      .catch(() => { if (!controller.signal.aborted) setUnavailable(true) })
    return () => controller.abort()
  }, [])
  return { runs, unavailable }
}

export function Freshness({ building, runs, unavailable }: { building: Building; runs: RefreshRun[]; unavailable: boolean }) {
  const own = runs.filter(r => r.buildingId === building.id).sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
  return <section className="phone-card" aria-label="Refresh changes"><div className="phone-eyebrow">Refresh history</div><h2>What changed?</h2>
    <p>Building snapshot: {localTime(building.fetchedAt)} · {building.fetchedAt.slice(0, 10)}</p>
    <p className="phone-muted">Refreshed from data.sf.gov every 30 minutes. Record dates remain independent of fetch time.</p>
    {unavailable && <p role="status">Refresh history unavailable. Showing the building snapshot time above.</p>}
    {!own.length && !unavailable && <p className="phone-muted">No refresh log for this building yet.</p>}
    <ul className="phone-records">{own.slice(0, 6).map((r, i) => <li key={`${r.at}-${i}`}><div className="phone-row"><strong>{localTime(r.at)}</strong><span className="phone-mono">{r.note.startsWith('error:') ? 'FAILED ATTEMPT' : r.sourcesFailed ? 'PARTIAL' : 'CHECKED'}</span></div>
      <p>{r.note.startsWith('error:') ? 'Rebuild failed. The previous building snapshot is retained.' : r.note}</p>
      <span className="phone-muted">{r.sourcesQueried} sources queried · {r.sourcesFailed} failed</span>
      {(['added', 'changed', 'removed'] as const).map(kind => r[kind]?.length > 0 && <p key={kind}>{kind.toUpperCase()}: {r[kind].map(p => p.label).join('; ')}</p>)}
    </li>)}</ul>
  </section>
}
