import { useState } from 'react'
import type { Building, ComplianceRow } from '../../../../shared/building.ts'
import { compliance } from '../../../../shared/client.ts'
import './panels.css'
import { displayLabel } from '../Floors.tsx'

type Props = {
  building: Building
  onSelectPins?: (pinIds: string[]) => void // e.g. store.highlight({ floors: [], pinIds })
}

const RESULT_LABEL = { pass: 'PASS', fail: 'FAIL', unknown: 'UNKNOWN', partial: 'PARTIAL' } as const

// Allowed wording only (SETUP.md s7): "Meets" / "Rule logic meets" appear only when the result is pass.
export function wordingFor(r: ComplianceRow): string {
  if (r.wording === 'meets') return r.result === 'pass' ? `Meets ${r.citation}` : `Checked against ${r.citation}`
  if (r.wording === 'rule logic meets') return r.result === 'pass' ? `Rule logic meets ${r.citation}` : `Checked against ${r.citation}`
  return `Maps to ${r.citation}`
}

export function ComplianceStrip({ building, onSelectPins }: Props) {
  const rows = compliance(building)
  const [open, setOpen] = useState<string>()
  const pins = new Map(building.pins.map((p) => [p.id, p]))

  return (
    <section className="fsp" aria-label="Compliance">
      <div className="fsp-eyebrow">
        <span>Compliance</span>
        <span className="fsp-tag">FROM CITY RECORDS</span>
      </div>
      <ul className="fsp-list">
        {rows.map((r) => {
          const isOpen = open === r.id
          return (
            <li key={r.id} className={`fsp-row ${r.result}`}>
              <button
                className="fsp-tap"
                aria-expanded={isOpen}
                onClick={() => {
                  setOpen(isOpen ? undefined : r.id)
                  if (!isOpen) onSelectPins?.(r.pinIds)
                }}
              >
                <div className="fsp-head">
                  <span className="fsp-name">{r.rule}</span>
                  <span className={`fsp-result ${r.result}`}>{RESULT_LABEL[r.result]}</span>
                </div>
                <span className="fsp-gap">{r.summary}</span>
                <span className="fsp-asof">{wordingFor(r)}</span>
              </button>
              {isOpen && (
                <ul className="fsp-evidence">
                  {r.pinIds.length === 0 && <li>No evidence records.</li>}
                  {r.pinIds.map((id) => {
                    const p = pins.get(id)
                    const e = p?.evidence[0]
                    return (
                      <li key={id}>
                        <span>{p ? displayLabel(p.label) : id}</span>
                        {e && <span className="fsp-asof">{e.source} · {e.recordId} · {e.asOf.slice(0, 10)}</span>}
                      </li>
                    )
                  })}
                </ul>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
