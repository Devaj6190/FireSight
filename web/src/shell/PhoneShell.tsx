import { useEffect, useRef, useState, type CSSProperties, type PointerEvent, type ReactNode } from 'react'
import { ChevronDown, ChevronLeft, ClipboardCheck, Crosshair, Droplet, Ellipsis, Expand, Flame, Layers, MessageCircleQuestion, PenLine, RotateCcw, Shrink, TriangleAlert, X } from 'lucide-react'
import type { Answer, BriefLine, Building, Pin } from '../../../shared/building.ts'
import { ask } from '../../../shared/client.ts'
import { useStore } from '../store.ts'
import { ArrivalCard, BriefSheet, EvalScreen } from './brief/index.ts'
import { ComplianceStrip, LimitsPanel, SourcesDrawer } from './panels/index.ts'
import { Provenance, ResolutionView } from './Provenance.tsx'
import { Freshness, useRefreshRuns } from './Freshness.tsx'
import { HERO_DISPATCH, floorLabel } from './model.ts'
import { counts, dispatchFloor, floorName, keyFacts } from './facts.ts'
import { tap } from './motion.ts'
import { AskView, FloorsView, HazardsView, MoreView, NoteView, PinRow, RespondView, WaterView, type HazardFilter } from './views.tsx'
import { VoiceCommand } from './voice/VoiceCommand.tsx'
import { ArButton } from './ArButton.tsx'
import './phone.css'

type Tab = 'hazards' | 'floors' | 'water' | 'ask' | 'brief' | 'note' | 'more'
type Sub = 'records' | 'sources' | 'limits' | 'changes' | 'resolution' | 'eval' | 'crew' | 'respond'
type Page = Tab | Sub
type Props = {
  building: Building; children: ReactNode; phase: string; selectedPin?: Pin
  onBuilding: (id: string) => void; onDispatch: (text: string) => Promise<void>
  onToggle: () => void; onSelectPin: (pin: Pin | undefined) => void
  onHighlight: (floors: number[], ids: string[]) => void; onFocusFloor: (floor: number | null) => void; onAddPin: (pin: Pin) => void
}
const TABS: [Tab, string, typeof Flame][] = [['hazards', 'Hazards', TriangleAlert], ['floors', 'Floors', Layers], ['water', 'Water', Droplet], ['ask', 'Ask', MessageCircleQuestion], ['brief', 'Brief', ClipboardCheck], ['note', 'Note', PenLine], ['more', 'More', Ellipsis]]
const PARENT: Record<Sub, Tab | null> = { records: 'more', sources: 'more', limits: 'more', changes: 'more', resolution: 'more', eval: 'more', crew: 'brief', respond: null }
const TITLE: Record<Page, string> = { hazards: 'Hazards', floors: 'Floors', water: 'Water & site', ask: 'Ask the records', brief: 'Size-up brief', note: 'Crew note', more: 'More', records: 'All records', sources: 'Sources', limits: 'Limits', changes: 'Changes', resolution: 'Address resolution', eval: 'Eval', crew: 'Crew radio card', respond: 'Responding to' }
const isTab = (p: Page): p is Tab => TABS.some(t => t[0] === p)
const wide = () => matchMedia('(min-width: 900px)').matches

export function PhoneShell({ building: b, children, phase, selectedPin, onBuilding, onDispatch, onToggle, onSelectPin, onHighlight, onFocusFloor, onAddPin }: Props) {
  const { target, lit, rooms, toggleRooms, resetView } = useStore()
  const [page, setPage] = useState<Page>('hazards')
  const [open, setOpen] = useState(() => wide() || b.pins.some(p => p.origin === 'dispatch'))
  const [dir, setDir] = useState(0)
  const [toast, setToast] = useState<{ id: number; text: string }>()
  const [filter, setFilter] = useState<HazardFilter>('danger')
  const [answer, setAnswer] = useState<Answer>()
  const [answerSource, setAnswerSource] = useState('')
  const [asking, setAsking] = useState(false)
  const [approved, setApproved] = useState<BriefLine[]>([])
  const [query, setQuery] = useState('')
  const sheet = useRef<HTMLElement>(null)
  const drag = useRef<{ y: number; dy: number } | null>(null)
  const active = useRef(true)
  const quiet = useRef(false) // a focus this shell asked for while showing a record: stay on the record's page
  useEffect(() => { active.current = true; return () => { active.current = false } }, [])
  // any other focus (3D tap, dispatch, voice, ?focus=) brings up that floor's panel
  useEffect(() => {
    if (target === null) return
    if (quiet.current) { quiet.current = false; return }
    setPage('floors'); onSelectPin(undefined)
  }, [target]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!toast) return; const id = setTimeout(() => setToast(undefined), 3200); return () => clearTimeout(id) }, [toast])

  const { runs, unavailable } = useRefreshRuns()
  const latest = runs.filter(r => r.buildingId === b.id).sort((a, c) => Date.parse(c.at) - Date.parse(a.at))[0]
  const newIds = new Set(latest?.added?.map(p => p.pinId) ?? [])
  const busy = phase === 'exploding' || phase === 'collapsing'
  const c = counts(b)
  const df = dispatchFloor(b)
  const tab = isTab(page) ? page : PARENT[page]
  const tabIndex = TABS.findIndex(t => t[0] === tab)
  const focused = target === null ? lit : [target, ...lit.filter(f => f !== target)]

  const isOpen = open || !!selectedPin // a pin tapped in the 3D opens the panel on its record
  const close = () => { setOpen(false); if (selectedPin) onSelectPin(undefined) }
  const say = (text: string) => setToast({ id: Date.now(), text })
  function go(next: Page) {
    tap()
    onSelectPin(undefined)
    const from = tabIndex, to = TABS.findIndex(t => t[0] === (isTab(next) ? next : PARENT[next]))
    setDir(to < 0 || from < 0 ? 0 : Math.sign(to - from))
    if (next === page && !selectedPin && isTab(next)) return isOpen ? close() : setOpen(true) // the active tab folds the panel away
    setPage(next); setOpen(true)
  }
  function back() { onSelectPin(undefined); if (!selectedPin) setPage(isTab(page) ? page : PARENT[page] ?? 'hazards'); setDir(-1) }
  function selectPin(p: Pin) { onSelectPin(p); setOpen(true); if (p.anchor.kind === 'floor' && p.anchor.floor !== target) { quiet.current = true; onFocusFloor(p.anchor.floor) } }
  function highlight(ids: string[]) { onHighlight(b.pins.filter(p => ids.includes(p.id) && p.anchor.kind === 'floor').map(p => p.anchor.kind === 'floor' ? p.anchor.floor : 1), ids) }

  async function askQuestion(q: string) {
    if (!q.trim() || asking) return
    setAsking(true); setAnswer(undefined)
    try { const res = await ask(b, q); if (!active.current) return; setAnswer(res.answer); setAnswerSource(res.source); onHighlight(res.answer.highlight.floors, res.answer.highlight.pinIds) }
    catch { say('No connection or saved answer. Try a suggested question.') }
    finally { if (active.current) setAsking(false) }
  }
  function addNote(text: string, where: string, origin: 'crew' | 'department') {
    const pin: Pin = { id: `${origin}-${crypto.randomUUID()}`, layer: origin === 'crew' ? 'crew_note' : 'preplan', origin, severity: 'caution', label: `${origin === 'crew' ? 'CREW' : 'DEPT'}: ${text.slice(0, 42).toUpperCase()}`, detail: text, anchor: where === 'building' ? { kind: 'building' } : { kind: 'floor', floor: Number(where) }, claim: 'unverifiable', evidence: [], stale: false }
    onAddPin(pin)
    say(`Pinned to ${floorLabel(pin)} · unverified`)
  }
  async function dispatch(text: string) { await onDispatch(text); quiet.current = true; setPage('hazards'); setFilter('danger'); setOpen(true) } // the arrival brief leads

  // phone: drag the sheet header up or down; a short drag snaps back
  const onDown = (e: PointerEvent) => {
    if (wide() || (e.target as HTMLElement).closest('button:not(.fs-grip)')) return
    drag.current = { y: e.clientY, dy: 0 }
    sheet.current?.setPointerCapture(e.pointerId); sheet.current?.classList.add('dragging')
  }
  const onMove = (e: PointerEvent) => {
    if (!drag.current || !sheet.current) return
    drag.current.dy = e.clientY - drag.current.y
    sheet.current.style.setProperty('--drag', `${isOpen ? Math.max(-8, drag.current.dy) : Math.min(8, drag.current.dy)}px`)
  }
  const onUp = () => {
    const d = drag.current; drag.current = null
    if (!d || !sheet.current) return
    sheet.current.classList.remove('dragging'); sheet.current.style.setProperty('--drag', '0px')
    if (Math.abs(d.dy) < 6) { tap(); if (isOpen) close(); else setOpen(true) } else if (d.dy < -40) { tap(); setOpen(true) } else if (d.dy > 40) { tap(); close() }
  }

  const crewText = `${b.address}\nOFFICER-APPROVED SIZE-UP\n${approved.map(l => `[${l.claim.toUpperCase()}] ${l.text}`).join('\n')}\nSource records: ${[...new Set(approved.flatMap(l => l.pinIds).flatMap(id => b.pins.find(p => p.id === id)?.evidence.map(e => `${e.datasetId}/${e.recordId} (${e.asOf})`) ?? []))].join('; ')}`
  const showBack = !!selectedPin || !isTab(page)
  const title = selectedPin ? 'Source record' : TITLE[page]
  const facts = keyFacts(b)

  return <div className={`fs-app${isOpen ? ' is-open' : ''}`}>
    <header className="fs-top">
      <span className="fs-brand" aria-label="FireSight"><Flame size={20} aria-hidden /><b>FIRE<span>SIGHT</span></b></span>
      <button className="fs-address" onClick={() => go('respond')} aria-label={`Responding to ${b.address}. Change address or paste dispatch`}>
        <small>RESPONDING TO <ChevronDown size={12} aria-hidden /></small>
        <strong>{b.address}</strong>
      </button>
      <ul className="fs-facts" aria-label="Key facts">
        {df !== null && <li className="fs-fact fire" style={{ '--i': 0 } as CSSProperties}><button onClick={() => { onFocusFloor(df); go('floors') }}><Flame size={13} aria-hidden />FL {floorName(df)}</button></li>}
        {facts.map((f, i) => <li key={f.id} className={`fs-fact ${f.tone ?? ''}`} style={{ '--i': i + 1 } as CSSProperties}>{f.text}</li>)}
      </ul>
      <button className={`fs-badge ${c.danger ? 'danger' : 'caution'}`} key={`${b.id}-${c.danger}`} onClick={() => { setFilter(c.danger ? 'danger' : 'caution'); if (page !== 'hazards' || !isOpen) go('hazards') }} aria-label={`${c.danger || c.caution} ${c.danger ? 'danger' : 'caution'} records`}>
        <TriangleAlert size={18} aria-hidden /><b>{c.danger || c.caution}</b><small>{c.danger ? 'DANGER' : 'CAUTION'}</small>
      </button>
      <VoiceCommand building={b} phase={phase} onDispatch={onDispatch} onHighlight={onHighlight} onToggle={onToggle} onAddPin={onAddPin} />
    </header>

    <div className="fs-body">
      <main className="fs-stage" aria-label="Building model">
        {children}
        <div className="fs-stage-meta">
          <p className="fs-notice">Not for operational use · records may be incomplete</p>
          <p className="fs-credit">DataSF footprints · © OpenStreetMap contributors</p>
        </div>
      </main>

      <div className="fs-dock" aria-label="Model controls">
        <div className="fs-dock-chips">
          {focused.length > 0 && <button className="fs-chip on" key={focused.join()} onClick={() => { tap(); onFocusFloor(null) }}><Crosshair size={16} aria-hidden />FL {focused.map(floorName).join(', ')}<X size={16} aria-label="Clear focus" /></button>}
          {phase === 'exploded' && target !== null && <button className="fs-chip" aria-pressed={rooms === 'on'} disabled={rooms === 'opening' || rooms === 'closing'} onClick={() => { tap(); toggleRooms() }}>{rooms === 'off' ? `Rooms · FL ${floorName(target)}` : 'Back to floors'}</button>}
        </div>
        <div className="fs-dock-row">
          <button className={`fs-explode${busy ? ' busy' : ''}`} disabled={busy} onClick={() => { tap(20); onToggle() }}>
            {phase === 'exploded' || phase === 'collapsing' ? <Shrink size={22} aria-hidden /> : <Expand size={22} aria-hidden />}
            <span key={phase}>{busy ? phase === 'exploding' ? 'Opening…' : 'Closing…' : phase === 'exploded' ? 'Collapse' : 'Explode'}</span>
          </button>
          <ArButton building={b} />
          <button className="fs-round" aria-label="Reset view" title="Reset view" disabled={busy || rooms !== 'off'} onClick={() => { tap(); resetView() }}><RotateCcw size={22} /></button>
        </div>
      </div>

      {toast && <p className="fs-toast" role="status" key={toast.id}>{toast.text}</p>}

      <section ref={sheet} className="fs-sheet" aria-label="Building information">
        <div className="fs-sheet-inner">
          <div className="fs-sheet-head" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
            <button className="fs-grip" aria-label={isOpen ? 'Lower panel' : 'Raise panel'} aria-expanded={isOpen}><span /></button>
            <div className="fs-sheet-title">
              {showBack && <button className="fs-icon-btn" onClick={back} aria-label="Back"><ChevronLeft size={22} /></button>}
              <h2 key={title}>{title}</h2>
              {page === 'hazards' && !selectedPin && <span className="fs-count">{c.total} RECORDS</span>}
              <button className="fs-icon-btn fs-fold" onClick={() => { tap(); close() }} aria-label="Hide panel"><ChevronDown size={22} /></button>
            </div>
          </div>
          <div className="fs-sheet-body">
            <div className="fs-view" key={selectedPin ? `pin-${selectedPin.id}` : page} data-dir={dir}>
              {selectedPin ? <>
                <Provenance pin={selectedPin} />
                {selectedPin.anchor.kind === 'floor' && <button className="fs-btn wide" onClick={() => { onFocusFloor(selectedPin.anchor.kind === 'floor' ? selectedPin.anchor.floor : null); onSelectPin(undefined); setPage('floors') }}><Layers size={18} aria-hidden />Open {floorLabel(selectedPin)}</button>}
              </> : <>
                {page === 'hazards' && <HazardsView b={b} arrival={b.pins.some(p => p.origin === 'dispatch') && <ArrivalCard building={b} onSelect={onHighlight} />} filter={filter} setFilter={setFilter} onPin={selectPin} onPins={highlight} onFloor={onFocusFloor} onOpen={go} newIds={newIds} />}
                {page === 'floors' && <FloorsView b={b} target={target} lit={lit} phase={phase} onFloor={onFocusFloor} onToggle={onToggle} onPin={selectPin} />}
                {page === 'water' && <WaterView b={b} onPin={selectPin} />}
                {page === 'ask' && <AskView b={b} asking={asking} answer={answer} answerSource={answerSource} onAsk={q => void askQuestion(q)} onPin={selectPin} />}
                {page === 'brief' && <BriefSheet building={b} onSelectPins={highlight} onSend={lines => { setApproved(lines); go('crew') }} />}
                {page === 'note' && <NoteView b={b} target={target} onAdd={addNote} />}
                {page === 'more' && <MoreView b={b} latest={latest?.at} onOpen={go} />}
                {page === 'respond' && <RespondView b={b} initial={HERO_DISPATCH} onBuilding={onBuilding} onDispatch={dispatch} />}
                {page === 'records' && <>
                  <label className="fs-field">Filter records<input value={query} onChange={e => setQuery(e.target.value)} placeholder="Battery, floor 22, water…" /></label>
                  <ul className="fs-list">{b.pins.filter(p => `${p.label} ${p.detail} ${floorLabel(p)}`.toLowerCase().includes(query.toLowerCase())).map((p, i) => <PinRow key={p.id} pin={p} i={i} isNew={newIds.has(p.id)} onPin={selectPin} />)}</ul>
                </>}
                {page === 'sources' && <><SourcesDrawer building={b} defaultOpen /><ComplianceStrip building={b} onSelectPins={highlight} /></>}
                {page === 'limits' && <LimitsPanel building={b} />}
                {page === 'changes' && <Freshness building={b} runs={runs} unavailable={unavailable} />}
                {page === 'resolution' && <ResolutionView building={b} onSelectPin={selectPin} />}
                {page === 'eval' && <EvalScreen />}
                {page === 'crew' && <section className="phone-card"><div className="phone-eyebrow">Officer approved · {approved.length} lines</div><p className="fs-muted">Prepared for manual sharing. Nothing has been transmitted.</p><pre className="phone-radio">{crewText}</pre><button className="fs-btn amber wide" disabled={!approved.length} onClick={async () => { try { await navigator.clipboard.writeText(crewText); say('Approved crew card copied') } catch { say('Clipboard unavailable. Select and copy the card text.') } }}>Copy approved card</button></section>}
              </>}
            </div>
          </div>
        </div>
      </section>
    </div>

    <nav className="fs-nav" aria-label="Panels" style={{ '--i': Math.max(0, tabIndex), '--n': TABS.length } as CSSProperties}>
      <span className="fs-nav-pill" aria-hidden data-hidden={tabIndex < 0 || !isOpen || undefined} />
      {TABS.map(([id, label, Icon]) => <button key={id} aria-current={tab === id && isOpen ? 'page' : undefined} onClick={() => go(id)}>
        <Icon size={24} strokeWidth={2.25} aria-hidden />
        <span>{label}</span>
        {id === 'hazards' && c.danger > 0 && <i className="fs-nav-dot">{c.danger}</i>}
      </button>)}
    </nav>
  </div>
}
