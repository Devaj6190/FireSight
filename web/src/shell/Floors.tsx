// Floor rail and floor panel: what the public record says about each floor.
// Works with and without building.floorFacts (older snapshots derive everything from pins alone).
// Nothing here is a floor plan; empty sections stay hidden and an empty floor says so.
import { useEffect, useRef } from 'react'
import type { Building, FloorFacts, Pin, Severity } from '../../../shared/building.ts'
import { useStore } from '../store.ts'
import { sourceUrl } from './model.ts'
import './floor.css'

const RANK: Record<Severity, number> = { danger: 0, caution: 1, info: 2 }
const ACRONYMS = new Set(['AWSS', 'SFFD', 'DBI', 'EV', 'ESS', 'PV', 'B1', 'R2', 'NFPA', 'SRO', 'TI', 'HVAC', 'N', 'S', 'E', 'W', 'NE', 'NW', 'SE', 'SW', 'UPS'])

export const floorName = (f: number) => (f === 0 ? 'B1' : `Floor ${f}`)

// sentence case for upper-case record labels, keeping acronyms
export function displayLabel(s: string): string {
  if (s !== s.toUpperCase()) return s
  const words = s.split(/(\s+)/).map((w) => {
    const core = w.replace(/[^A-Z0-9]/g, '')
    if (ACRONYMS.has(core)) return w
    return w.toLowerCase()
  })
  const out = words.join('')
  return out.replace(/^(\W*)(\w)/, (_, p, c) => p + c.toUpperCase())
}

export type FloorInfo = { floor: number; pins: Pin[]; facts?: FloorFacts; severity: Severity | null }

export function floorList(b: Building): number[] {
  const top = Array.from({ length: b.floors }, (_, i) => b.floors - i)
  const hasB1 = b.floorFacts?.some((f) => f.floor === 0) || b.pins.some((p) => p.anchor.kind === 'floor' && p.anchor.floor === 0)
  return hasB1 ? [...top, 0] : top
}

export function floorInfo(b: Building, floor: number): FloorInfo {
  const facts = b.floorFacts?.find((f) => f.floor === floor)
  const ids = new Set(facts?.pinIds ?? [])
  const pins = b.pins
    .filter((p) => ids.has(p.id) || (p.anchor.kind === 'floor' && Math.min(p.anchor.floor, b.floors) === floor))
    .sort((p, q) => RANK[p.severity] - RANK[q.severity])
  const severity = pins[0]?.severity ?? facts?.severity ?? null
  return { floor, pins, facts, severity }
}

function summary({ pins, facts }: FloorInfo): string {
  const parts: string[] = []
  const danger = pins.filter((p) => p.severity === 'danger').length
  if (danger) parts.push(`${danger} hazard${danger > 1 ? 's' : ''}`)
  if (pins.length) parts.push(`${pins.length} record${pins.length > 1 ? 's' : ''} pinned`)
  if (facts?.permits.count) parts.push(`${facts.permits.count} permit${facts.permits.count > 1 ? 's' : ''}`)
  if (facts?.incidents) parts.push(`${facts.incidents} fire incident${facts.incidents > 1 ? 's' : ''}`)
  if (facts?.units.length) parts.push(`${facts.units.length}+ unit${facts.units.length > 1 ? 's' : ''} known`)
  return parts.length ? parts.join(' · ') : 'No floor-specific public records'
}

const severityText = (s: Severity | null) => (s === 'danger' ? 'hazard on record' : s === 'caution' ? 'caution on record' : s === 'info' ? 'records' : 'no pinned records')

export function FloorRail({ building: b, target, variant, onSelect }: { building: Building; target: number | null; variant: 'float' | 'strip'; onSelect?: (floor: number) => void }) {
  const floors = floorList(b)
  const nav = useRef<HTMLElement>(null)
  // keep the focused floor in view inside the rail (scrolls only the rail, never the page)
  useEffect(() => {
    const el = nav.current, btn = el?.querySelector<HTMLElement>('[aria-current]')
    if (!el || !btn) return
    if (variant === 'strip') el.scrollTo({ left: btn.offsetLeft - el.clientWidth / 2 + btn.offsetWidth / 2, behavior: 'smooth' })
    else el.scrollTo({ top: btn.offsetTop - el.clientHeight / 2 + btn.offsetHeight / 2, behavior: 'smooth' })
  }, [target, variant])
  return (
    <nav ref={nav} className={`floor-rail floor-rail--${variant}`} aria-label="Floors">
      <ol>
        {floors.map((f) => {
          const info = floorInfo(b, f)
          const n = info.pins.length
          return (
            <li key={f}>
              <button
                type="button"
                className="floor-rail-btn"
                aria-current={target === f ? 'true' : undefined}
                aria-label={`${floorName(f)}, ${n ? `${n} record${n > 1 ? 's' : ''}, ` : ''}${severityText(info.severity)}`}
                onClick={() => { useStore.getState().focus(f); onSelect?.(f) }}
              >
                <span className={`floor-sev ${info.severity ?? 'none'}`} aria-hidden="true" />
                <span className="floor-rail-num">{f === 0 ? 'B1' : f}</span>
                {n > 0 && <span className="floor-rail-count" aria-hidden="true">{n}</span>}
              </button>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

const fmtDate = (iso: string) => {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' })
}
const claimText = { verified: 'Verified', unverifiable: 'Unverifiable', conflict: 'Conflict' } as const

export function FloorPanel({ building: b, floor, onSelectPin }: { building: Building; floor: number | null; onSelectPin: (p: Pin) => void }) {
  const { phase, target, rooms } = useStore()
  if (floor === null) {
    return (
      <section className="floor-panel" aria-label="Floor information">
        <h2 className="floor-title">Choose a floor</h2>
        <p className="floor-summary">Pick a floor from the floor list to see what the public record says about it.</p>
      </section>
    )
  }
  const info = floorInfo(b, floor)
  const { pins, facts } = info
  const floors = floorList(b)
  const idx = floors.indexOf(floor)
  const above = idx > 0 ? floors[idx - 1] : null
  const below = idx >= 0 && idx < floors.length - 1 ? floors[idx + 1] : null
  const go = (f: number) => useStore.getState().focus(f)
  const units = facts?.units ?? []
  const occupancy = units.length > 0 || facts?.occupantLoad != null
  const last = facts?.permits.last
  const canRooms = phase === 'exploded' && target === floor
  const roomsOn = rooms === 'on' || rooms === 'opening'
  const roomNames = facts?.rooms ?? []
  // reported people (voice/dispatch "REPORT: PEOPLE, FLOOR n", crew notes about people) lead the panel
  const isReport = (p: Pin) => p.origin !== 'public' && /^REPORT\b|\b(people|persons?|victims?|trapped|occupants?|child|children)\b/i.test(p.label)
  const reports = pins.filter(isReport)
  const hazards = pins.filter((p) => !isReport(p))
  const occupants = facts?.occupants ?? []

  return (
    <section className="floor-panel" aria-label={`${floorName(floor)} information`}>
      <div className="floor-head">
        <h2 className="floor-title">{floorName(floor)}</h2>
        <div className="floor-step">
          <button type="button" disabled={above === null} onClick={() => above !== null && go(above)} aria-label={above !== null ? `Go up to ${floorName(above)}` : 'No floor above'}>▲</button>
          <button type="button" disabled={below === null} onClick={() => below !== null && go(below)} aria-label={below !== null ? `Go down to ${floorName(below)}` : 'No floor below'}>▼</button>
        </div>
      </div>
      <p className="floor-summary">{summary(info)}</p>

      {/* Arrival brief: people first. Reports from dispatch or the crew, then who the records say is usually here. */}
      <div className="floor-section floor-people">
        <h3>People on this floor</h3>
        {reports.length > 0 && (
          <ul className="floor-list">
            {reports.map((p) => (
              <li key={p.id}>
                <button type="button" className="floor-pin floor-report" onClick={() => onSelectPin(p)}>
                  <span className="floor-sev danger" aria-hidden="true" />
                  <span className="floor-pin-text">
                    <strong>{displayLabel(p.label.replace(/^REPORT:\s*/i, 'Reported: '))}</strong>
                    <small>{p.origin === 'dispatch' ? 'Dispatch' : p.origin === 'crew' ? 'Crew' : 'Report'} · not verified</small>
                  </span>
                  <span className="floor-chev" aria-hidden="true">›</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {(occupancy || occupants.length > 0) ? (
          <dl className="floor-facts">
            {facts?.occupantLoad != null && <><dt>Up to</dt><dd>{facts.occupantLoad} people<small>SFFD assembly permit occupant load</small></dd></>}
            {occupants.length > 0 && <><dt>Usually here</dt><dd>{occupants.map((o) => o.kind + (o.unit ? ` (${o.unit})` : '')).join(' · ')}<small>Business licenses and OpenStreetMap, by type only</small></dd></>}
            {units.length > 0 && <><dt>Known units</dt><dd>{units.join(', ')}<small>Lower bound: only units named in permits</small></dd></>}
          </dl>
        ) : (
          !reports.length && <p className="floor-line floor-quiet">No occupancy on public record for this floor. Search it.</p>
        )}
      </div>

      {hazards.length > 0 && (
        <div className="floor-section">
          <h3>Hazards and records on this floor</h3>
          <ul className="floor-list">
            {hazards.map((p) => (
              <li key={p.id}>
                <button type="button" className="floor-pin" onClick={() => onSelectPin(p)}>
                  <span className={`floor-sev ${p.severity}`} aria-hidden="true" />
                  <span className="floor-pin-text">
                    <strong>{displayLabel(p.label)}</strong>
                    <small>{p.evidence[0]?.source ?? (p.origin === 'public' ? 'Public record' : `${p.origin[0].toUpperCase()}${p.origin.slice(1)} input`)}{p.evidence[0]?.asOf ? ` · ${fmtDate(p.evidence[0].asOf)}` : ''}</small>
                    <span className="floor-chips">
                      <span className={`floor-chip ${p.claim}`}>{claimText[p.claim]}</span>
                      {p.stale && <span className="floor-chip stale">Stale</span>}
                    </span>
                  </span>
                  <span className="floor-chev" aria-hidden="true">›</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {(above !== null || below !== null) && (
        <div className="floor-section">
          <h3>Adjacent floors</h3>
          <ul className="floor-list">
            {[above, below].map((f, i) => {
              if (f === null) return null
              const n = floorInfo(b, f)
              const top = n.pins[0]
              const people = n.facts?.occupantLoad
              const usual = n.facts?.occupants?.[0]?.kind
              return (
                <li key={f}>
                  <button type="button" className="floor-pin" onClick={() => go(f)}>
                    <span className={`floor-sev ${n.severity ?? 'none'}`} aria-hidden="true" />
                    <span className="floor-pin-text">
                      <strong>{i === 0 ? 'Above' : 'Below'}: {floorName(f)}</strong>
                      <small>{[people != null ? `up to ${people} people` : usual, top ? displayLabel(top.label) : 'no hazards on record'].filter(Boolean).join(' · ')}{i === 0 ? ' · fire spreads up' : ''}</small>
                    </span>
                    <span className="floor-chev" aria-hidden="true">›</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {facts && facts.permits.count > 0 && (
        <div className="floor-section">
          <h3>Recent work</h3>
          <p className="floor-line"><strong>{facts.permits.count}</strong> permit{facts.permits.count > 1 ? 's' : ''} name this floor or its units</p>
          {last && (
            <div className="floor-permit">
              <small>Newest · {fmtDate(last.date)}</small>
              <p>{last.text.charAt(0).toUpperCase() + last.text.slice(1)}</p>
              {sourceUrl(last.url) && <a href={sourceUrl(last.url)} target="_blank" rel="noopener noreferrer">Open permit record ↗</a>}
            </div>
          )}
        </div>
      )}

      {facts && facts.incidents > 0 && (
        <div className="floor-section">
          <h3>Fire history</h3>
          <p className="floor-line"><strong>{facts.incidents}</strong> SFFD incident{facts.incidents > 1 ? 's' : ''} with floor of origin here</p>
        </div>
      )}

      {(roomNames.length > 0 || canRooms) && (
        <div className="floor-section">
          <h3>Rooms named in records</h3>
          {roomNames.length > 0 ? (
            <div className="floor-chips">{roomNames.map((r) => <span key={r} className="floor-chip room">{r}</span>)}</div>
          ) : (
            <p className="floor-line floor-quiet">No rooms named in records for this floor</p>
          )}
          {canRooms && (
            <button type="button" className="floor-action" onClick={() => useStore.getState().toggleRooms()} aria-pressed={roomsOn}>
              {roomsOn ? 'Close cutaway' : 'Explore floor'} · illustrative shell
            </button>
          )}
        </div>
      )}

      {facts && facts.notOnRecord.length > 0 && (
        <div className="floor-section">
          <h3>Not on public record</h3>
          <div className="floor-chips">{facts.notOnRecord.map((n) => <span key={n} className="floor-chip unverifiable">{n}</span>)}</div>
        </div>
      )}

      {!pins.length && !facts && <p className="floor-line floor-quiet">This snapshot has no per-floor summary; only pinned records are shown.</p>}
    </section>
  )
}
