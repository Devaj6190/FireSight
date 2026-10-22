import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { Answer, BriefLine, Building, Pin } from '../../../shared/building.ts'
import { ask, SUGGESTED_QUESTIONS } from '../../../shared/client.ts'
import { ArrivalCard, BriefSheet, EvalScreen } from './brief/index.ts'
import { ComplianceStrip, LimitsPanel, SourcesDrawer } from './panels/index.ts'
import { Provenance, ResolutionView } from './Provenance.tsx'
import { Freshness, useRefreshRuns } from './Freshness.tsx'
import { BUILDINGS, floorLabel, HERO_DISPATCH, localTime } from './model.ts'
import { VoiceCommand } from './voice/VoiceCommand.tsx'
import { FloorPanel, FloorRail, floorName } from './Floors.tsx'
import { useStore } from '../store.ts'
import './phone.css'

type Page = 'sizeup' | 'floor' | 'dispatch' | 'ask' | 'brief' | 'resolution' | 'records' | 'limits' | 'sources' | 'eval' | 'notes' | 'refresh' | 'crew' | 'pin'
type Props = {
  building: Building; children: ReactNode; phase: string; selectedPin?: Pin; focusedFloors: number[]
  onBuilding: (id: string) => void; onDispatch: (text: string) => Promise<void>
  onToggle: () => void; onSelectPin: (pin: Pin | undefined) => void
  onHighlight: (floors: number[], ids: string[]) => void; onAddPin: (pin: Pin) => void
}
const tabs: [Page, string][] = [['sizeup', 'Size-up'], ['floor', 'Floors'], ['brief', 'Brief'], ['resolution', 'Resolution'], ['records', 'Records'], ['limits', 'Limits'], ['sources', 'Sources'], ['notes', 'Add note'], ['refresh', 'Changes'], ['eval', 'Eval']]

export function PhoneShell({ building: b, children, phase, selectedPin, focusedFloors, onBuilding, onDispatch, onToggle, onSelectPin, onHighlight, onAddPin }: Props) {
  const target = useStore(s => s.target)
  const [page, setPage] = useState<Page>(() => target !== null ? 'floor' : 'sizeup')
  const [panelFloor, setPanelFloor] = useState<number | null>(target)
  // any focus (floor rail, dispatch, voice, ?focus=) opens that floor's panel; clearing focus keeps the last floor
  useEffect(() => {
    if (target === null) return
    setPanelFloor(target); setPage('floor'); onSelectPin(undefined); setMessage('')
  }, [target]) // eslint-disable-line react-hooks/exhaustive-deps
  const [expanded, setExpanded] = useState(() => b.pins.some(p => p.origin === 'dispatch'))
  const [dispatch, setDispatch] = useState(HERO_DISPATCH)
  const [dispatchBusy, setDispatchBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState<Answer>()
  const [answerSource, setAnswerSource] = useState('')
  const [asking, setAsking] = useState(false)
  const [note, setNote] = useState('')
  const [noteFloor, setNoteFloor] = useState('building')
  const [origin, setOrigin] = useState<'crew' | 'department'>('crew')
  const [approved, setApproved] = useState<BriefLine[]>([])
  const [filter, setFilter] = useState('')
  const active = useRef(true)
  useEffect(() => { active.current = true; return () => { active.current = false } }, [])
  const { runs, unavailable } = useRefreshRuns()
  const busy = phase === 'exploding' || phase === 'collapsing'
  const selected = selectedPin ? 'pin' : page
  const latest = runs.filter(r => r.buildingId === b.id).sort((a, c) => Date.parse(c.at) - Date.parse(a.at))[0]
  const newIds = new Set(latest?.added?.map(p => p.pinId) ?? [])
  const rank = { danger: 0, caution: 1, info: 2 }
  const topPins = [...b.pins].sort((a, c) => rank[a.severity] - rank[c.severity]).slice(0, 3)

  function openFloor(f: number) { onSelectPin(undefined); setPanelFloor(f); setPage('floor'); setMessage('') }
  function navigate(next: Page) { onSelectPin(undefined); setPage(next); setExpanded(next !== 'sizeup'); setMessage('') }
  function selectPin(p: Pin) { onSelectPin(p); setExpanded(true) }
  function highlight(ids: string[]) { onHighlight(b.pins.filter(p => ids.includes(p.id) && p.anchor.kind === 'floor').map(p => p.anchor.kind === 'floor' ? p.anchor.floor : 1), ids) }

  async function submitDispatch() {
    if (!dispatch.trim()) return
    setDispatchBusy(true); setMessage('')
    try { await onDispatch(dispatch); navigate(useStore.getState().target !== null ? 'floor' : 'sizeup'); setExpanded(true) } catch (e) { setMessage(e instanceof Error ? e.message : 'Unable to resolve dispatch.') } finally { setDispatchBusy(false) }
  }
  async function askQuestion(q: string) {
    if (!q.trim() || asking) return
    setAsking(true); setMessage(''); setAnswer(undefined); setQuestion(q)
    try { const res = await ask(b, q); if (!active.current) return; setAnswer(res.answer); setAnswerSource(res.source); onHighlight(res.answer.highlight.floors, res.answer.highlight.pinIds) }
    catch { setMessage('No connection or saved answer. Try a suggested question once offline answers are available.') }
    finally { setAsking(false) }
  }
  function addNote() {
    if (!note.trim()) return
    const pin: Pin = { id: `${origin}-${crypto.randomUUID()}`, layer: origin === 'crew' ? 'crew_note' : 'preplan', origin, severity: 'caution', label: `${origin === 'crew' ? 'CREW' : 'DEPT'}: ${note.trim().slice(0, 42)}`, detail: note.trim(), anchor: noteFloor === 'building' ? { kind: 'building' } : { kind: 'floor', floor: Number(noteFloor) }, claim: 'unverifiable', evidence: [], stale: false }
    onAddPin(pin); setNote(''); selectPin(pin)
  }
  const crewText = `${b.address}\nOFFICER-APPROVED SIZE-UP\n${approved.map(l => `[${l.claim.toUpperCase()}] ${l.text}`).join('\n')}\nSource records: ${[...new Set(approved.flatMap(l => l.pinIds).flatMap(id => b.pins.find(p => p.id === id)?.evidence.map(e => `${e.datasetId}/${e.recordId} (${e.asOf})`) ?? []))].join('; ')}`

  return <div className="phone-app">
    <header className="phone-header">
      <div className="phone-row"><span className="phone-brand">FIRE<span>SIGHT</span></span><span className="phone-mono">FIELD PROTOTYPE</span></div>
      <div className="phone-address-row"><label className="phone-address">Responding to<select aria-label="Building address" value={b.id} onChange={e => onBuilding(e.target.value)}>{BUILDINGS.map(v => <option key={v.id} value={v.id}>{v.address}</option>)}</select></label><div className="phone-eta">4:00<span>DEMO ETA</span></div></div>
      <div className="phone-row phone-subline"><span>{b.floors} floors · parcel {b.apn}</span><button className="phone-fresh" onClick={() => navigate('refresh')}>Refreshed {localTime(b.fetchedAt)} ↗</button></div>
      {focusedFloors.length > 0 && <button className="phone-focus" onClick={() => onHighlight([], [])}>Focused floor: {focusedFloors.map(f => f === 0 ? 'B1' : f).join(', ')} · Clear ×</button>}
      <p className="phone-notice">Not for operational use · public records may be incomplete</p>
    </header>
    <main className="phone-stage" aria-label="Building model">
      {children}
      <div className="phone-scene-meta"><span>{phase.toUpperCase()}</span></div>
      <button className="phone-dispatch-shortcut" onClick={() => navigate('dispatch')}>Paste dispatch ↗</button>
      <FloorRail building={b} target={target} variant="float" onSelect={openFloor} />
      <VoiceCommand building={b} phase={phase} onDispatch={onDispatch} onHighlight={onHighlight} onToggle={onToggle} onAddPin={onAddPin} />
    </main>
    <section className={`phone-sheet ${expanded || selectedPin ? 'expanded' : ''}`} aria-label="Building information">
      <div className="phone-sheet-top"><button className="phone-handle" aria-label={expanded ? 'Collapse information sheet' : 'Expand information sheet'} aria-expanded={expanded} onClick={() => { if (selectedPin) { onSelectPin(undefined); setPage('sizeup') } setExpanded(!expanded) }}><span /></button><div className="phone-row"><span className="phone-eyebrow">{selected === 'pin' ? 'Source record' : selected === 'floor' && panelFloor !== null ? floorName(panelFloor) : tabs.find(t => t[0] === page)?.[1] ?? page}</span><button className="phone-close" onClick={() => { if (selectedPin) onSelectPin(undefined); setExpanded(false); setPage('sizeup') }}>Close ×</button></div></div>
      <FloorRail building={b} target={target} variant="strip" onSelect={openFloor} />
      <nav className="phone-tabs" aria-label="Information panels">{tabs.map(([id, label]) => <button key={id} aria-current={selected === id ? 'page' : undefined} onClick={() => navigate(id)}>{label}</button>)}</nav>
      <div className="phone-sheet-body">
        {message && <p className="phone-message" role="status">{message}</p>}
        {selected === 'sizeup' && <>{b.pins.some(p => p.origin === 'dispatch') && <><ArrivalCard building={b} onSelect={onHighlight} /><ComplianceStrip building={b} onSelectPins={highlight} /></>}<div className="phone-row"><span className="phone-eyebrow">Priority records</span><span className="phone-mono">{b.pins.length} PINS</span></div><ul className="phone-pins">{topPins.map(p => <li key={p.id}><button onClick={() => selectPin(p)}><span className={`phone-dot ${p.severity}`} /><span><strong>{p.label}</strong><small>{floorLabel(p)} · {p.evidence[0]?.source ?? p.origin} · {p.evidence[0]?.asOf ?? 'user supplied'}{p.stale ? ' · STALE' : ''}</small></span><span>↗</span></button></li>)}</ul><button className="phone-text-button" onClick={() => navigate('records')}>View all {b.pins.length} records →</button><div className="phone-tags">{b.unknowns.slice(0, 3).map(u => <span className="phone-claim unverifiable" key={u}>{u}: UNKNOWN</span>)}</div>{expanded && !b.pins.some(p => p.origin === 'dispatch') && <ComplianceStrip building={b} onSelectPins={highlight} />}</>}
        {selected === 'floor' && <>{panelFloor !== null && b.pins.some(p => p.origin === 'dispatch' && p.anchor.kind === 'floor' && p.anchor.floor === panelFloor) && <ArrivalCard building={b} onSelect={onHighlight} />}<FloorPanel building={b} floor={panelFloor} onSelectPin={selectPin} /></>}
        {selected === 'dispatch' && <form onSubmit={e => { e.preventDefault(); void submitDispatch() }}><h2>Dispatch → building → floor</h2><p className="phone-muted">Simulated CAD input. Only cached addresses can be resolved in this prototype.</p><label>Dispatch message<textarea value={dispatch} onChange={e => setDispatch(e.target.value)} rows={4} maxLength={1000} /></label><button className="phone-primary" disabled={dispatchBusy || !dispatch.trim()}>{dispatchBusy ? 'Resolving…' : 'Resolve and explode'}</button></form>}
        {selected === 'ask' && <section><h2>Ask the records</h2><p className="phone-muted">Answers cite records. A missing public fact stays unverifiable.</p><div className="phone-questions">{SUGGESTED_QUESTIONS.map(q => <button key={q} disabled={asking} onClick={() => void askQuestion(q)}>{q} ↗</button>)}</div><form onSubmit={e => { e.preventDefault(); void askQuestion(question) }}><label>Your question<input value={question} onChange={e => setQuestion(e.target.value)} maxLength={300} placeholder="Where are the people?" /></label><button className="phone-primary" disabled={asking || !question.trim()}>{asking ? 'Checking cited records…' : 'Ask'}</button></form>{answer && <div className="phone-answer" role="status"><span className={`phone-claim ${answer.claim}`}>{answer.claim.toUpperCase()} · {answerSource === 'fallback' ? 'SAVED ANSWER' : 'MODEL ANSWER'}</span><p>{answer.text}</p><div className="phone-tags">{answer.unknowns.map(u => <span key={u} className="phone-claim unverifiable">{u}: UNVERIFIABLE</span>)}</div>{answer.pinIds.map(id => { const p = b.pins.find(v => v.id === id); return p && <button className="phone-text-button" key={id} onClick={() => selectPin(p)}>{p.label} · source ↗</button> })}</div>}{!b.fallback && <p className="phone-muted">Saved offline answers have not been supplied for this snapshot.</p>}</section>}
        {selected === 'brief' && <BriefSheet building={b} onSelectPins={highlight} onSend={lines => { setApproved(lines); navigate('crew') }} />}
        {selected === 'resolution' && <ResolutionView building={b} onSelectPin={selectPin} />}
        {selected === 'records' && <><label>Filter records<input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Battery, floor 22, water…" /></label><ul className="phone-pins">{b.pins.filter(p => `${p.label} ${p.detail} ${floorLabel(p)}`.toLowerCase().includes(filter.toLowerCase())).map(p => <li key={p.id}><button onClick={() => selectPin(p)}><span className={`phone-dot ${p.severity}`} /><span><strong>{p.label} {newIds.has(p.id) && <span className="phone-new">NEW</span>}</strong><small>{floorLabel(p)} · {p.claim.toUpperCase()}{p.stale && ' · STALE'}</small></span><span>↗</span></button></li>)}</ul></>}
        {selected === 'pin' && selectedPin && <Provenance pin={selectedPin} />}
        {selected === 'limits' && <LimitsPanel building={b} />}
        {selected === 'sources' && <><SourcesDrawer building={b} defaultOpen /><ComplianceStrip building={b} onSelectPins={highlight} /></>}
        {selected === 'eval' && <EvalScreen />}
        {selected === 'refresh' && <Freshness building={b} runs={runs} unavailable={unavailable} />}
        {selected === 'notes' && <form onSubmit={e => { e.preventDefault(); addNote() }}><h2>Add officer context</h2><p className="phone-muted">Notes last until you change address or reload, and are included in subsequent API requests. Do not enter personal information.</p><label>Origin<select value={origin} onChange={e => setOrigin(e.target.value as 'crew' | 'department')}><option value="crew">Crew observation</option><option value="department">Department pre-plan</option></select></label><label>Location<select value={noteFloor} onChange={e => setNoteFloor(e.target.value)}><option value="building">Building (floor unspecified)</option>{b.pins.some(p => p.anchor.kind === 'floor' && p.anchor.floor === 0) && <option value="0">B1 · basement</option>}{Array.from({ length: b.floors }, (_, i) => <option key={i + 1} value={i + 1}>Floor {i + 1}</option>)}</select></label><label>Observation<textarea value={note} onChange={e => setNote(e.target.value)} maxLength={500} rows={3} required /></label><button className="phone-primary" disabled={!note.trim()}>Add unverified note</button></form>}
        {selected === 'crew' && <section className="phone-card"><div className="phone-eyebrow">Officer approved · {approved.length} lines</div><h2>Crew radio card</h2><p className="phone-muted">Prepared for manual sharing. Nothing has been transmitted.</p><pre className="phone-radio">{crewText}</pre><button className="phone-primary" disabled={!approved.length} onClick={async () => { try { await navigator.clipboard.writeText(crewText); setMessage('Approved crew card copied.') } catch { setMessage('Clipboard unavailable. Select and copy the radio card text.') } }}>Copy approved card</button><button className="phone-text-button" onClick={() => navigate('brief')}>Back to review</button></section>}
      </div>
    </section>
    <footer className="phone-bar"><button className="phone-primary" disabled={busy} onClick={onToggle}>{busy ? phase === 'exploding' ? 'Exploding…' : 'Collapsing…' : phase === 'exploded' ? 'Collapse' : 'Explode'}</button><button className="phone-secondary" onClick={() => navigate('ask')}>Ask ↗</button></footer>
  </div>
}
