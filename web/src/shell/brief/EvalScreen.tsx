import { useEffect, useState } from 'react'
import './brief.css'

type EvalRun = {
  model: string
  ranAt: string
  seconds: number
  totals: {
    buildings: number; briefs: number; lines: number; verified: number; unverifiable: number; conflict: number
    dropped: number; answers: number; answersUnverifiable: number; answersDropped: number; strikeCases: number; strikesRepeated: number
  }
  dropReasons: Record<string, number>
  perBuilding: { buildingId: string; address: string; lines: number; dropped: number }[]
}

// Grounding eval results from `npm run eval` (api/src/eval.ts), served at /eval/last-run.json.
export function EvalScreen() {
  const [run, setRun] = useState<EvalRun | null>()
  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}eval/last-run.json`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setRun)
      .catch(() => setRun(null))
  }, [])

  if (run === undefined) return <section className="fsb"><p className="fsb-msg">Loading eval…</p></section>
  if (run === null) return <section className="fsb"><p className="fsb-msg">Eval not run yet.</p></section>

  const t = run.totals
  const stats: [string, number, 'good' | 'bad' | ''][] = [
    ['lines kept, all cited', t.lines, 'good'],
    ['uncited lines dropped', t.dropped, ''],
    ['answers', t.answers, ''],
    ['answered "no public record"', t.answersUnverifiable, ''],
    ['struck lines saved as tests', t.strikeCases, ''],
    ['struck lines repeated', t.strikesRepeated, t.strikesRepeated ? 'bad' : 'good'],
  ]
  return (
    <section className="fsb" aria-label="Grounding test">
      <div className="fsb-eyebrow">
        <span>Grounding test</span>
        <span className="fsb-tag">{new Date(run.ranAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {run.seconds}s</span>
      </div>
      <div className="fse-grid">
        {stats.map(([label, n, tone]) => (
          <div className="fse-stat" key={label}>
            <span className={`fse-num ${tone}`}>{n}</span>
            <span className="fse-label">{label}</span>
          </div>
        ))}
      </div>
      <p className="fsb-counts">
        {t.buildings} buildings · {t.verified} verified · {t.unverifiable} unverifiable · {t.conflict} conflict · {run.model}
      </p>
      <ul className="fse-rows">
        {run.perBuilding.map((b) => (
          <li key={b.buildingId}>{b.address}: {b.lines} lines, {b.dropped} dropped</li>
        ))}
      </ul>
    </section>
  )
}
