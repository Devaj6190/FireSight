import { useRef, useState } from 'react'
import type { Brief, BriefLine, Building } from '../../../../shared/building.ts'
import { fetchBrief, strike, type Dropped, type Source } from '../../../../shared/client.ts'
import { sourceTail } from './sources.ts'
import './brief.css'

type Props = {
  building: Building // send the building with dispatch/crew/department pins already added
  onSend?: (approved: BriefLine[]) => void // Lane D's "Send to crew" radio card
  onSelectPins?: (pinIds: string[]) => void // e.g. store.highlight({ floors: [], pinIds })
}

const CLAIM_LABEL = { verified: 'VERIFIED', unverifiable: 'UNVERIFIABLE', conflict: 'CONFLICT' } as const

export function BriefSheet({ building, onSend, onSelectPins }: Props) {
  const [brief, setBrief] = useState<Brief>()
  const [source, setSource] = useState<Source>()
  const [dropped, setDropped] = useState<Dropped[]>([])
  const [status, setStatus] = useState<Record<string, BriefLine['status']>>({})
  const [saved, setSaved] = useState<Record<string, 'saved' | 'local'>>({})
  const [loading, setLoading] = useState(false)
  const [upgrading, setUpgrading] = useState(false)
  const [error, setError] = useState<string>()
  const touched = useRef(false)

  function show(res: { brief: Brief; dropped: Dropped[]; source: Source }) {
    setBrief(res.brief)
    setSource(res.source)
    setDropped(res.dropped)
    setStatus(Object.fromEntries(res.brief.lines.map((l) => [l.id, l.status])))
    setSaved({})
  }

  // The saved brief shows at once; the model brief replaces it when it arrives, unless the officer has started reviewing.
  async function generate() {
    setError(undefined)
    touched.current = false
    const saved = building.fallback?.brief
    if (saved) {
      show({ brief: saved, dropped: [], source: 'fallback' })
      setUpgrading(true)
    } else setLoading(true)
    try {
      const res = await fetchBrief(building)
      if (res.source === 'model' || !saved) {
        if (!touched.current) show(res)
      }
    } catch {
      if (!saved) setError('No connection and no saved brief for this building.')
    } finally {
      setLoading(false)
      setUpgrading(false)
    }
  }

  function setLine(line: BriefLine, next: BriefLine['status']) {
    touched.current = true
    const value = status[line.id] === next ? 'pending' : next
    setStatus((s) => ({ ...s, [line.id]: value }))
    if (value === 'struck') {
      // Every struck line becomes a regression case; the UI does not wait on the network.
      strike(building, { ...line, status: 'struck' }).then((ok) => setSaved((s) => ({ ...s, [line.id]: ok ? 'saved' : 'local' })))
    }
  }

  const lines = brief?.lines ?? []
  const approved = lines.filter((l) => status[l.id] === 'approved').map((l) => ({ ...l, status: 'approved' as const }))
  const count = (c: BriefLine['claim']) => lines.filter((l) => l.claim === c).length

  return (
    <section className="fsb" aria-label="Size-up brief">
      <div className="fsb-eyebrow">
        <span>Size-up brief</span>
        {source === 'fallback' && <span className="fsb-tag offline">{upgrading ? 'SAVED BRIEF · CHECKING FOR NEWER…' : 'SAVED BRIEF'}</span>}
        {source === 'records' && <span className="fsb-tag offline">FROM RECORDS · NO AI</span>}
        {brief && source === 'model' && <span className="fsb-tag">{lines.length} LINES · CHECKED</span>}
      </div>

      {!brief && !loading && (
        <button className="fsb-primary" onClick={generate}>
          Write brief
        </button>
      )}
      {loading && (
        <div aria-live="polite">
          <p className="fsb-msg">Writing from {building.pins.length} cited records…</p>
          <div className="fsb-skel" />
        </div>
      )}
      {error && <p className="fsb-msg err">{error}</p>}

      {brief && (
        <>
          <ol className="fsb-lines">
            {lines.map((l) => (
              <li key={l.id} className={`fsb-line ${status[l.id] ?? 'pending'}`}>
                <div className="fsb-body" onClick={() => onSelectPins?.(l.pinIds)}>
                  <span className="fsb-text">{l.text}</span>
                  <span className="fsb-meta">
                    <span className={`fsb-claim ${l.claim}`}>{CLAIM_LABEL[l.claim]}</span>
                    <span>{sourceTail(building, l.pinIds) || 'no public record'}</span>
                    {saved[l.id] === 'saved' && <span className="fsb-saved">→ TEST CASE SAVED</span>}
                    {saved[l.id] === 'local' && <span className="fsb-saved">STRUCK (OFFLINE)</span>}
                  </span>
                </div>
                <div className="fsb-actions">
                  <button
                    className={`fsb-btn ok ${status[l.id] === 'approved' ? 'on' : ''}`}
                    aria-label={`Approve: ${l.text}`}
                    aria-pressed={status[l.id] === 'approved'}
                    onClick={() => setLine(l, 'approved')}
                  >
                    ✓
                  </button>
                  <button
                    className={`fsb-btn no ${status[l.id] === 'struck' ? 'on' : ''}`}
                    aria-label={`Strike: ${l.text}`}
                    aria-pressed={status[l.id] === 'struck'}
                    onClick={() => setLine(l, 'struck')}
                  >
                    ✕
                  </button>
                </div>
              </li>
            ))}
          </ol>
          {brief.unknowns.length > 0 && <p className="fsb-msg">Unverifiable, no public record: {brief.unknowns.join(', ')}.</p>}
          <p className="fsb-counts">
            {count('verified')} verified · {count('unverifiable')} unverifiable · {count('conflict')} conflict
            {source === 'model' && ` · ${dropped.length} dropped by the citation check`}
          </p>
          <button className="fsb-primary" disabled={!approved.length} onClick={() => onSend?.(approved)}>
            Send to crew ({approved.length})
          </button>
        </>
      )}
    </section>
  )
}
