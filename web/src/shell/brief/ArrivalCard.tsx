// The arrival brief on screen: the same cited beats the voice speaks, life first. Tapping a line lights its floors.
import type { Building } from '../../../../shared/building.ts'
import { spokenBeats, type Section } from '../../../../shared/voice.ts'
import './brief.css'

const TITLE: Record<Section, string> = {
  call: 'Call',
  people: 'People',
  fire: 'Fire floor',
  bring: 'Bring and check',
  access: 'Water and access',
  verify: 'Verify on arrival',
}

type Props = { building: Building; onSelect: (floors: number[], pinIds: string[]) => void }

export function ArrivalCard({ building, onSelect }: Props) {
  const beats = spokenBeats(building)
  return (
    <section className="fsb fsa" aria-label="Arrival brief">
      <div className="fsb-eyebrow">
        <span>Arrival brief</span>
        <span className="fsb-tag">FROM CITED RECORDS · NO AI</span>
      </div>
      <ol className="fsa-list">
        {beats.map((x, i) => (
          <li key={i} className={`fsa-row ${x.section ?? 'call'}`}>
            <button onClick={() => onSelect(x.floors, x.pinIds)} disabled={!x.floors.length && !x.pinIds.length}>
              <span className="fsa-sec">{x.section === 'people' ? (x.text.startsWith('People on record') ? 'People · whole building' : x.text.startsWith('Dispatch reports') ? 'People · reported' : 'People · fire floor and above') : TITLE[x.section ?? 'call']}</span>
              <span className="fsa-text">{x.text.replace(/^(Bring and check|Water and access|No public record, verify on arrival|People on record): /, '')}</span>
            </button>
          </li>
        ))}
      </ol>
      <p className="fsb-msg">Not for operational use. Facts from public records with their source and year; the officer decides.</p>
    </section>
  )
}
