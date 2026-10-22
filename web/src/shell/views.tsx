// Field shell panels: one job each, large targets, data first. PhoneShell owns navigation and app state.
import { useState, type CSSProperties, type ReactNode } from 'react'
import { Boxes, Check, ChevronRight, CircleDashed, ClipboardCheck, Database, Flame, History, Layers, Link2, ListFilter, MapPin, Navigation2, Plus, ScanSearch, Search, ShieldCheck, Siren, Wind, X, FlaskConical } from 'lucide-react'
import type { Answer, Building, Pin } from '../../../shared/building.ts'
import { SUGGESTED_QUESTIONS } from '../../../shared/client.ts'
import { ComplianceStrip } from './panels/index.ts'
import { BUILDINGS, floorLabel, localTime } from './model.ts'
import { bySeverity, counts, dispatchFloor, dispatchOf, floorName, floorSummaries, roofPins, siteOf, occupancyOf, type SiteItem } from './facts.ts'
import { tap, useCountUp } from './motion.ts'

const at = (i: number) => ({ '--i': i }) as CSSProperties

export function PinRow({ pin: p, i = 0, isNew, onPin }: { pin: Pin; i?: number; isNew?: boolean; onPin: (p: Pin) => void }) {
  const e = p.evidence[0]
  return <li className="fs-rise" style={at(i)}>
    <button className={`fs-pin ${p.severity}`} onClick={() => onPin(p)}>
      <span className="fs-sev" aria-hidden />
      <span className="fs-pin-main">
        <strong>{p.label}</strong>
        <small>{floorLabel(p)} · {e?.source.replace(/^DataSF\s+/, '') ?? (p.origin === 'public' ? 'no record' : `${p.origin} note`)} · {e?.asOf.slice(0, 10) ?? 'user supplied'}</small>
      </span>
      <span className="fs-pin-tags">
        {isNew && <i className="new">NEW</i>}
        {p.stale && <i className="stale">STALE</i>}
        {p.claim === 'conflict' && <i className="conflict">CONFLICT</i>}
        {p.claim === 'unverifiable' && <i className="unverifiable">UNVERIFIED</i>}
      </span>
      <ChevronRight className="fs-chev" size={18} aria-hidden />
    </button>
  </li>
}

function Stat({ n, label, tone, on, onClick }: { n: number; label: string; tone: string; on: boolean; onClick: () => void }) {
  const v = useCountUp(n)
  return <button className={`fs-stat ${tone}`} aria-pressed={on} onClick={() => { tap(); onClick() }}>
    <b>{v}</b><span>{label}</span>
  </button>
}

export type HazardFilter = 'danger' | 'caution' | 'stale' | 'conflict' | 'unknown'
export function HazardsView({ b, filter, setFilter, onPin, onPins, onFloor, onOpen, newIds }: {
  b: Building; filter: HazardFilter; setFilter: (f: HazardFilter) => void; onPin: (p: Pin) => void
  onPins: (ids: string[]) => void; onFloor: (f: number) => void; onOpen: (page: 'records' | 'floors') => void; newIds: Set<string>
}) {
  const c = counts(b)
  const d = dispatchOf(b), df = dispatchFloor(b)
  const list = [...b.pins].filter(p => filter === 'stale' ? p.stale : filter === 'conflict' ? p.claim === 'conflict' : p.severity === filter).sort(bySeverity)
  return <>
    {d && <div className="fs-dispatch fs-rise">
      <Siren size={22} aria-hidden />
      <div><small>DISPATCH · SIMULATED</small><strong>{d.label}</strong></div>
      {df !== null && <button className="fs-btn amber" onClick={() => { tap(); onFloor(df); onOpen('floors') }}>Floor {floorName(df)}</button>}
    </div>}
    <div className="fs-stats" role="group" aria-label="Filter hazards">
      <Stat n={c.danger} label="Danger" tone="danger" on={filter === 'danger'} onClick={() => setFilter('danger')} />
      <Stat n={c.caution} label="Caution" tone="caution" on={filter === 'caution'} onClick={() => setFilter('caution')} />
      <Stat n={c.unknown} label="Unknown" tone="unknown" on={filter === 'unknown'} onClick={() => setFilter('unknown')} />
    </div>
    <div className="fs-substats">
      <button aria-pressed={filter === 'stale'} onClick={() => setFilter('stale')}><History size={14} aria-hidden />{c.stale} stale</button>
      <button aria-pressed={filter === 'conflict'} onClick={() => setFilter('conflict')}><ScanSearch size={14} aria-hidden />{c.conflict} conflict</button>
      <span>{c.total} records{occupancyOf(b) ? ` · ${occupancyOf(b)}` : ''}</span>
    </div>
    {filter === 'unknown'
      ? <ul className="fs-list">{b.unknowns.map((u, i) => <li key={u} className="fs-rise fs-unknown" style={at(i)}><CircleDashed size={18} aria-hidden /><span>{u}</span><i>NO RECORD</i></li>)}</ul>
      : <ul className="fs-list" key={filter}>{list.map((p, i) => <PinRow key={p.id} pin={p} i={i} isNew={newIds.has(p.id)} onPin={onPin} />)}{!list.length && <li className="fs-empty">None on record.</li>}</ul>}
    <button className="fs-link" onClick={() => onOpen('records')}>All {c.total} records <ChevronRight size={16} aria-hidden /></button>
    <ComplianceStrip building={b} onSelectPins={onPins} />
  </>
}

export function FloorsView({ b, target, lit, phase, rooms, onFloor, onToggle, onRooms, onPin }: {
  b: Building; target: number | null; lit: number[]; phase: string; rooms: string
  onFloor: (f: number | null) => void; onToggle: () => void; onRooms: () => void; onPin: (p: Pin) => void
}) {
  const floors = floorSummaries(b)
  const roof = roofPins(b)
  const df = dispatchFloor(b)
  const busy = phase === 'exploding' || phase === 'collapsing'
  const open = phase === 'exploded' || phase === 'exploding'
  const current = target === null ? undefined : floors.find(f => f.floor === target)
  const shown = current ? [...(current.floor === b.floors ? roof : []), ...current.pins] : []
  return <>
    <div className="fs-seg" data-on={open ? 1 : 0} role="group" aria-label="Model view">
      <span className="fs-seg-thumb" aria-hidden />
      <button aria-pressed={!open} disabled={busy} onClick={() => { if (open) { tap(); onToggle() } }}><Boxes size={18} aria-hidden />Stacked</button>
      <button aria-pressed={open} disabled={busy} onClick={() => { if (!open) { tap(); onToggle() } }}><Layers size={18} aria-hidden />Exploded</button>
    </div>
    {current
      ? <section className="fs-floorcard fs-rise" key={current.floor}>
        <header>
          <div><small>FOCUSED</small><b>{current.floor === 0 ? 'B1' : `Floor ${current.floor}`}</b></div>
          <button className="fs-btn" aria-pressed={rooms === 'on'} disabled={phase !== 'exploded' || rooms === 'opening' || rooms === 'closing'} onClick={() => { tap(); onRooms() }}>{rooms === 'off' ? 'Rooms' : 'Floors'}</button>
          <button className="fs-icon-btn" aria-label="Clear floor focus" onClick={() => onFloor(null)}><X size={20} /></button>
        </header>
        {shown.length ? <ul className="fs-list">{shown.map((p, i) => <PinRow key={p.id} pin={p} i={i} onPin={onPin} />)}</ul> : <p className="fs-muted">No public record places anything on this floor. That is not the same as nothing being there.</p>}
      </section>
      : <p className="fs-hint fs-rise"><MapPin size={16} aria-hidden />Tap a floor to bring it forward in 3D.</p>}
    <div className="fs-elevator" aria-label="Floors, top to bottom">
      {floors.map((f, i) => {
        const on = target === f.floor
        return <button key={f.floor} style={at(i)} className={`fs-floor${on ? ' on' : ''}${lit.includes(f.floor) ? ' lit' : ''}${f.floor === df ? ' fire' : ''}`} aria-pressed={on}
          aria-label={`${f.floor === 0 ? 'Basement B1' : `Floor ${f.floor}`}: ${f.danger} danger, ${f.caution} caution${f.floor === df ? ', dispatch floor' : ''}`}
          onClick={() => { tap(); onFloor(on ? null : f.floor) }}>
          <span className="fs-floor-n">{floorName(f.floor)}</span>
          {f.floor === df && <Flame className="fs-floor-fire" size={16} aria-hidden />}
          <span className="fs-floor-dots">{f.danger > 0 && <i className="d">{f.danger}</i>}{f.caution > 0 && <i className="c">{f.caution}</i>}</span>
        </button>
      })}
    </div>
    {roof.length > 0 && <p className="fs-muted">Roof records ({roof.length}) show with floor {b.floors}.</p>}
  </>
}

function Dial({ deg, size = 52 }: { deg: number; size?: number }) {
  return <span className="fs-dial" style={{ '--deg': `${deg}deg`, width: size, height: size } as CSSProperties} aria-hidden>
    <span className="fs-dial-n">N</span>
    <Navigation2 className="fs-dial-arrow" size={size * 0.46} fill="currentColor" />
  </span>
}

function SiteCard({ s, i, onPin, big }: { s: SiteItem; i: number; onPin: (p: Pin) => void; big?: boolean }) {
  return <li className="fs-rise" style={at(i)}>
    <button className={`fs-site ${s.pin.severity}${big ? ' big' : ''}`} onClick={() => onPin(s.pin)}>
      <Dial deg={s.bearingDeg} size={big ? 60 : 48} />
      <span className="fs-site-main"><strong>{s.title}</strong><small>{s.pin.evidence[0]?.asOf.slice(0, 4) ?? 'model'}{s.pin.stale ? ' · STALE, check on arrival' : ''}</small></span>
      <span className="fs-dist"><b>{s.distanceM}</b><small>M {s.dir}</small></span>
    </button>
  </li>
}

export function WaterView({ b, onPin }: { b: Building; onPin: (p: Pin) => void }) {
  const { water, wind, station, around, missing } = siteOf(b)
  const [from, to] = wind?.pin.label.split(/,\s*/) ?? []
  return <>
    {wind && <button className="fs-wind fs-rise" onClick={() => onPin(wind.pin)}>
      <Dial deg={wind.bearingDeg} size={72} />
      <span><small><Wind size={14} aria-hidden /> {from}</small><b>{to?.replace(/^SMOKE TO\s*/, 'Smoke → ') ?? wind.title}</b><em>Exposure side · forecast model</em></span>
    </button>}
    <h3 className="fs-h3">Water supply</h3>
    <ul className="fs-list">{water.map((s, i) => <SiteCard key={s.pin.id} s={s} i={i} onPin={onPin} big={i === 0} />)}{!water.length && <li className="fs-empty">No hydrant on record nearby.</li>}</ul>
    {missing.length > 0 && <ul className="fs-list">{missing.map((u, i) => <li key={u} className="fs-rise fs-unknown" style={at(i)}><CircleDashed size={18} aria-hidden /><span>{u}</span><i>NO RECORD</i></li>)}</ul>}
    {station && <><h3 className="fs-h3">First due</h3><ul className="fs-list"><SiteCard s={station} i={0} onPin={onPin} /></ul></>}
    {around.length > 0 && <><h3 className="fs-h3">Around the building</h3><ul className="fs-list">{around.map((s, i) => <SiteCard key={s.pin.id} s={s} i={i} onPin={onPin} />)}</ul></>}
  </>
}

export function AskView({ b, asking, answer, answerSource, onAsk, onPin }: {
  b: Building; asking: boolean; answer?: Answer; answerSource: string; onAsk: (q: string) => void; onPin: (p: Pin) => void
}) {
  const [q, setQ] = useState('')
  return <>
    <form className="fs-askbar" onSubmit={e => { e.preventDefault(); onAsk(q) }}>
      <Search size={18} aria-hidden />
      <input aria-label="Your question" value={q} onChange={e => setQ(e.target.value)} maxLength={300} placeholder="Where are the people?" />
      <button className="fs-btn amber" disabled={asking || !q.trim()}>{asking ? 'Checking…' : 'Ask'}</button>
    </form>
    {asking && <div className="fs-thinking" role="status"><i /><i /><i /><span>Checking cited records</span></div>}
    {answer && !asking && <div className="fs-answer fs-rise" role="status">
      <span className={`fs-claim ${answer.claim}`}>{answer.claim.toUpperCase()} · {answerSource === 'fallback' ? 'SAVED ANSWER' : 'MODEL ANSWER'}</span>
      <p>{answer.text}</p>
      {answer.unknowns.length > 0 && <div className="fs-tags">{answer.unknowns.map(u => <span key={u} className="fs-claim unverifiable">{u}: UNVERIFIABLE</span>)}</div>}
      <ul className="fs-list">{answer.pinIds.map((id, i) => { const p = b.pins.find(v => v.id === id); return p && <PinRow key={id} pin={p} i={i} onPin={onPin} /> })}</ul>
    </div>}
    <h3 className="fs-h3">{answer || asking ? 'Ask another' : 'Suggested'}</h3>
    <div className="fs-questions">{SUGGESTED_QUESTIONS.map((s, i) => <button key={s} className="fs-rise" style={at(i)} aria-pressed={s === q && (asking || !!answer)} disabled={asking} onClick={() => { tap(); setQ(s); onAsk(s) }}>{s}</button>)}</div>
    {!b.fallback && <p className="fs-muted">Saved offline answers have not been supplied for this snapshot.</p>}
  </>
}

const QUICK = ['Fire showing', 'Smoke showing', 'Victims reported', 'Access blocked', 'Hazmat present', 'Utilities off']
export function NoteView({ b, target, onAdd }: { b: Building; target: number | null; onAdd: (text: string, where: string, origin: 'crew' | 'department') => void }) {
  const [picked, setWhere] = useState<string>() // follows the focused floor until the officer picks one
  const where = picked ?? (target === null ? 'building' : String(target))
  const [origin, setOrigin] = useState<'crew' | 'department'>('crew')
  const [note, setNote] = useState('')
  const add = (t: string) => { if (!t.trim()) return; tap(14); onAdd(t.trim(), where, origin); setNote('') }
  return <>
    <label className="fs-field">Where
      <select value={where} onChange={e => setWhere(e.target.value)}>
        <option value="building">Whole building</option>
        {b.pins.some(p => p.anchor.kind === 'floor' && p.anchor.floor === 0) && <option value="0">B1 · basement</option>}
        {Array.from({ length: b.floors }, (_, i) => <option key={i + 1} value={i + 1}>Floor {i + 1}{target === i + 1 ? ' (focused)' : ''}</option>)}
      </select>
    </label>
    <div className="fs-seg" data-on={origin === 'crew' ? 0 : 1} role="group" aria-label="Note origin">
      <span className="fs-seg-thumb" aria-hidden />
      <button aria-pressed={origin === 'crew'} onClick={() => setOrigin('crew')}>Crew observation</button>
      <button aria-pressed={origin === 'department'} onClick={() => setOrigin('department')}>Dept pre-plan</button>
    </div>
    <h3 className="fs-h3">One tap</h3>
    <div className="fs-quick">{QUICK.map((q, i) => <button key={q} className="fs-rise" style={at(i)} onClick={() => add(q)}><Plus size={18} aria-hidden />{q}</button>)}</div>
    <form onSubmit={e => { e.preventDefault(); add(note) }}>
      <label className="fs-field">Or write it<textarea value={note} onChange={e => setNote(e.target.value)} maxLength={500} rows={3} placeholder="Stair B door chained on 3" /></label>
      <button className="fs-btn amber wide" disabled={!note.trim()}>Pin unverified note</button>
    </form>
    <p className="fs-muted">Notes last until you change address or reload, and are included in later API requests. No personal information.</p>
  </>
}

type MorePage = 'records' | 'sources' | 'limits' | 'changes' | 'resolution' | 'eval'
export function MoreView({ b, latest, onOpen }: { b: Building; latest?: string; onOpen: (p: MorePage) => void }) {
  const rows: [MorePage, ReactNode, string, string][] = [
    ['records', <ListFilter key="i" />, 'All records', `${b.pins.length} pins, searchable`],
    ['sources', <Database key="i" />, 'Sources', `${b.layers.length} city datasets · compliance`],
    ['limits', <ShieldCheck key="i" />, 'Limits', 'What public records cannot tell you'],
    ['changes', <History key="i" />, 'Changes', `Snapshot ${localTime(latest ?? b.fetchedAt)}`],
    ['resolution', <Link2 key="i" />, 'Address resolution', `${b.resolution.links.length} record joins · ${b.conflicts.length} conflict`],
    ['eval', <FlaskConical key="i" />, 'Eval', 'Struck brief lines as test cases'],
  ]
  return <ul className="fs-list">{rows.map(([id, icon, t, s], i) => <li key={id} className="fs-rise" style={at(i)}>
    <button className="fs-more" onClick={() => { tap(); onOpen(id) }}><span className="fs-more-ic">{icon}</span><span><strong>{t}</strong><small>{s}</small></span><ChevronRight className="fs-chev" size={18} aria-hidden /></button>
  </li>)}</ul>
}

export function RespondView({ b, initial, onBuilding, onDispatch }: { b: Building; initial: string; onBuilding: (id: string) => void; onDispatch: (text: string) => Promise<void> }) {
  const [text, setText] = useState(initial)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function submit() {
    if (!text.trim()) return
    setBusy(true); setError(''); tap(14)
    try { await onDispatch(text) } catch (e) { setError(e instanceof Error ? e.message : 'Unable to resolve dispatch.') } finally { setBusy(false) }
  }
  return <>
    <form onSubmit={e => { e.preventDefault(); void submit() }}>
      <label className="fs-field">Dispatch message · simulated CAD<textarea value={text} onChange={e => setText(e.target.value)} rows={3} maxLength={1000} /></label>
      {error && <p className="fs-error" role="alert">{error}</p>}
      <button className="fs-btn amber wide big" disabled={busy || !text.trim()}><Siren size={20} aria-hidden />{busy ? 'Resolving…' : 'Resolve dispatch'}</button>
    </form>
    <h3 className="fs-h3">Cached buildings</h3>
    <ul className="fs-list">{BUILDINGS.map((v, i) => <li key={v.id} className="fs-rise" style={at(i)}>
      <button className={`fs-more${v.id === b.id ? ' on' : ''}`} aria-current={v.id === b.id || undefined} onClick={() => { tap(); onBuilding(v.id) }}>
        <span className="fs-more-ic">{v.id === b.id ? <Check /> : <MapPin />}</span>
        <span><strong>{v.address}</strong><small>{v.aliases.filter(a => !v.address.startsWith(a)).join(' · ') || v.id}</small></span>
        <ChevronRight className="fs-chev" size={18} aria-hidden />
      </button>
    </li>)}</ul>
    <p className="fs-muted"><ClipboardCheck size={14} aria-hidden /> Only these addresses resolve in the prototype.</p>
  </>
}
