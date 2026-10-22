import { useEffect, useRef, useState } from 'react'
import type { Answer, Building, Pin } from '../../../../shared/building.ts'
import { ask, SUGGESTED_QUESTIONS } from '../../../../shared/client.ts'
import { parseDispatchText } from '../../../../shared/dispatch.ts'
import { reportBeats, spokenBrief, spokenSource, type Beat } from '../../../../shared/voice.ts'
import { dispatchBuilding, dispatchPin } from '../model.ts'
import { ack, canListen, canSpeak, listen, prefetch, speak, stopSpeaking } from './speech.ts'
import './voice.css'

type Props = {
  building: Building
  phase: string
  onDispatch: (text: string) => Promise<void>
  onHighlight: (floors: number[], ids: string[]) => void
  onToggle: () => void
  onAddPin: (pin: Pin) => void
}

// Survives the shell remounting when a dispatch switches buildings: the size-up is read once the dispatch pin lands.
const pending = { readout: false }

const FIRE = /\b(fire|smoke|flames?|alarm|dispatch|structure|responding)\b/i
const PEOPLE = /\b(people|persons?|victims?|occupants?|someone|trapped|caller|child|children|kids?)\b/i

// A dispatch update ("people trapped on 23") becomes a dispatch pin, so the brief, Ask and the 3D all see it.
function reportPin(text: string, floor: number): Pin {
  const at = new Date().toISOString()
  return {
    id: `dispatch-report-${at.replace(/\D/g, '').slice(0, 17)}`,
    layer: 'dispatch',
    origin: 'dispatch',
    severity: 'danger',
    label: `REPORT: PEOPLE, FLOOR ${floor}`,
    detail: `Dispatch update: "${text.trim().slice(0, 200)}"`,
    anchor: { kind: 'floor', floor },
    claim: 'verified',
    evidence: [{ source: 'Dispatch (CAD)', datasetId: 'dispatch', recordId: at, url: '', asOf: at.slice(0, 10), rule: `dispatch update names floor ${floor}` }],
    stale: false,
  }
}

// The dispatch is parsed: build the brief it will produce and start fetching its audio now, while the model is still exploding.
async function warmBrief(text: string, target: string | null, current: Building) {
  try {
    const base = target && target !== current.id ? ((await (await fetch(`${import.meta.env.BASE_URL}buildings/${target}.json`)).json()) as Building) : current
    const next = { ...base, pins: [...base.pins.filter((p) => p.origin !== 'dispatch'), dispatchPin(text, base)] }
    prefetch(spokenBrief(next).map((x) => x.text))
  } catch {
    // Prefetch is only an optimisation; the brief is still fetched when it is spoken.
  }
}

export function VoiceCommand({ building: b, phase, onDispatch, onHighlight, onToggle, onAddPin }: Props) {
  const [state, setState] = useState<'idle' | 'listening' | 'thinking' | 'speaking'>('idle')
  const [caption, setCaption] = useState('')
  const [step, setStep] = useState<[number, number]>([0, 0])
  const stopRef = useRef<() => void>(() => {})

  // Each sentence lights the floors and pins it names, so the model follows the voice.
  function say(lines: (string | Beat)[]) {
    const beats = lines.map((l) => (typeof l === 'string' ? { text: l, floors: [], pinIds: [] } : l))
    setState('speaking')
    speak(
      beats.map((x) => x.text),
      (s, i) => {
        setCaption(s)
        setStep([i + 1, beats.length])
        const { floors, pinIds } = beats[i]
        if (floors.length || pinIds.length) onHighlight(floors, pinIds)
      },
      () => setState('idle'),
    )
    if (!canSpeak) setCaption(beats.map((x) => x.text).join(' '))
  }

  useEffect(() => {
    if (pending.readout && b.pins.some((p) => p.origin === 'dispatch')) {
      pending.readout = false
      say(spokenBrief(b))
    }
  }, [b])

  useEffect(() => () => stopRef.current(), [])
  // Have the acknowledgement ready so it plays the instant a dispatch is heard.
  useEffect(() => prefetch(['Copy.']), [])

  // Desktop shortcut for recording: V talks, Escape stops. Ignored while typing in a field.
  const toggleRef = useRef(toggle)
  toggleRef.current = toggle
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null
      if (e.metaKey || e.ctrlKey || e.altKey || el?.closest('input, textarea, select, [contenteditable="true"]')) return
      if (e.key === 'v' || e.key === 'V') { e.preventDefault(); toggleRef.current() }
      if (e.key === 'Escape') { stopRef.current(); stopSpeaking(); setState('idle') }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  async function handle(text: string) {
    const t = text.trim()
    if (!t) return setState('idle')
    setCaption(`“${t}”`)
    if (/^(stop|quiet|cancel|shut up)\b/i.test(t)) {
      stopSpeaking()
      return setState('idle')
    }
    if (/\b(collapse|reset|close it)\b/i.test(t)) {
      if (phase === 'exploded') onToggle()
      return say(['Collapsing.'])
    }
    if (/\b(explode|open it|open up|show floors)\b/i.test(t)) {
      if (phase === 'assembled') onToggle()
      return say(['Opening the floors.'])
    }
    if (/\b(size.?up|brief|read it|summary|what do we have)\b/i.test(t)) return say(spokenBrief(b))

    const target = dispatchBuilding(t)
    const reported = parseDispatchText(t).floor
    if (target === null && PEOPLE.test(t) && reported !== null && reported >= 0 && reported <= b.floors) {
      const pin = reportPin(t, reported)
      const next = { ...b, pins: [...b.pins, pin] }
      onAddPin(pin)
      say(reportBeats(next, pin))
      return
    }
    if (target === '') return say(["That address isn't cached. I have 140 New Montgomery, 400 Duboce, 1018 Mission and 1433 Haight."])
    if (target !== null || FIRE.test(t)) {
      setState('thinking')
      pending.readout = true
      ack('Copy.')
      void warmBrief(t, target, b)
      try {
        await onDispatch(t)
      } catch (e) {
        pending.readout = false
        say([e instanceof Error ? e.message : 'I could not resolve that dispatch.'])
      }
      return
    }

    setState('thinking')
    try {
      const { answer } = await ask(b, t)
      const [first, ...rest] = answerLines(b, answer)
      say([{ text: first, floors: answer.highlight.floors, pinIds: answer.highlight.pinIds }, ...rest])
    } catch {
      say([`No connection or saved answer for that. Try: ${SUGGESTED_QUESTIONS[0]}`])
    }
  }

  function toggle() {
    if (!canListen) return state === 'speaking' ? (stopSpeaking(), setState('idle')) : say(spokenBrief(b))
    if (state === 'listening') return stopRef.current()
    // Talking over the readout starts listening straight away, so an update ("people trapped on 23") is never lost.
    stopSpeaking()
    setState('listening')
    setCaption('Listening…')
    stopRef.current = listen(
      (partial) => setCaption(partial),
      (final) => void handle(final),
      (err) => {
        setState('idle')
        // Electron and some browsers expose the API without a speech service ("network"): read the size-up instead.
        if (err === 'network' || err === 'service-not-allowed') return say(['Voice input needs Chrome here. Reading the size-up.', ...spokenBrief(b)])
        setCaption(err === 'not-allowed' ? 'Microphone blocked. Allow it in the browser.' : err === 'no-speech' ? "Didn't catch that. Press V or tap the mic." : `Voice error: ${err}`)
      },
    )
  }

  if (!canListen && !canSpeak) return null
  const label = state === 'listening' ? 'YOU' : state === 'thinking' ? 'CHECKING RECORDS' : state === 'speaking' ? `FIRESIGHT · ${step[0]}/${step[1]}` : 'FIRESIGHT'
  return (
    <div className={`voice-wrap ${state}`} aria-live="polite">
      {caption && (
        <p className={`voice-caption ${state}`}>
          <span className="voice-who">{label}</span>
          {caption}
        </p>
      )}
      <button
        className={`voice-mic ${state}`}
        onClick={toggle}
        title={canListen ? 'Talk to FireSight (V)' : 'Read the size-up aloud (V)'}
        aria-label={canListen ? (state === 'listening' ? 'Stop listening' : 'Talk to FireSight') : 'Read the size-up aloud'}
      >
        {state === 'listening' ? (
          <span className="voice-bars" aria-hidden><i /><i /><i /><i /></span>
        ) : state === 'speaking' ? (
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden><rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" /></svg>
        ) : canListen ? (
          <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="9" y="3" width="6" height="11" rx="3" fill="currentColor" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></svg>
        ) : (
          <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" /><path d="M16 9a4 4 0 0 1 0 6M19 6a8 8 0 0 1 0 12" /></svg>
        )}
      </button>
    </div>
  )
}

function answerLines(b: Building, a: Answer): string[] {
  const lines = [a.text]
  const first = b.pins.find((p) => a.pinIds.includes(p.id))
  const src = first ? spokenSource(first) : ''
  if (src && a.claim !== 'unverifiable') lines[0] = `${a.text.replace(/\.$/, '')}, ${src}.`
  if (a.claim === 'conflict') lines.push('Records disagree on this.')
  if (a.unknowns.length && a.claim !== 'unverifiable') lines.push(`Unverifiable: ${a.unknowns.slice(0, 3).join(', ')}.`)
  return lines
}
