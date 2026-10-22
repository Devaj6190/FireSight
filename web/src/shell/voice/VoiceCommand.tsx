import { useEffect, useRef, useState } from 'react'
import type { Answer, Building } from '../../../../shared/building.ts'
import { ask, SUGGESTED_QUESTIONS } from '../../../../shared/client.ts'
import { spokenSizeUp, spokenSource } from '../../../../shared/voice.ts'
import { dispatchBuilding } from '../model.ts'
import { canListen, canSpeak, listen, speak, stopSpeaking } from './speech.ts'
import './voice.css'

type Props = {
  building: Building
  phase: string
  onDispatch: (text: string) => Promise<void>
  onHighlight: (floors: number[], ids: string[]) => void
  onToggle: () => void
}

// Survives the shell remounting when a dispatch switches buildings: the size-up is read once the dispatch pin lands.
const pending = { readout: false }

const FIRE = /\b(fire|smoke|flames?|alarm|dispatch|structure|responding)\b/i

export function VoiceCommand({ building: b, phase, onDispatch, onHighlight, onToggle }: Props) {
  const [state, setState] = useState<'idle' | 'listening' | 'thinking' | 'speaking'>('idle')
  const [caption, setCaption] = useState('')
  const stopRef = useRef<() => void>(() => {})

  function say(lines: string[]) {
    setState('speaking')
    speak(lines, (s) => setCaption(s), () => setState('idle'))
    if (!canSpeak) setCaption(lines.join(' '))
  }

  useEffect(() => {
    if (pending.readout && b.pins.some((p) => p.origin === 'dispatch')) {
      pending.readout = false
      say(spokenSizeUp(b))
    }
  }, [b])

  useEffect(() => () => stopRef.current(), [])

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
    if (/\b(size.?up|brief|read it|summary|what do we have)\b/i.test(t)) return say(spokenSizeUp(b))

    const target = dispatchBuilding(t)
    if (target === '') return say(["That address isn't cached. I have 140 New Montgomery, 400 Duboce, 1018 Mission and 1433 Haight."])
    if (target !== null || FIRE.test(t)) {
      setState('thinking')
      pending.readout = true
      speak(['Copy.'])
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
      onHighlight(answer.highlight.floors, answer.highlight.pinIds)
      say(answerLines(b, answer))
    } catch {
      say([`No connection or saved answer for that. Try: ${SUGGESTED_QUESTIONS[0]}`])
    }
  }

  function toggle() {
    if (state === 'listening') return stopRef.current()
    if (state === 'speaking') {
      stopSpeaking()
      return setState('idle')
    }
    stopSpeaking()
    setState('listening')
    setCaption('Listening…')
    stopRef.current = listen(
      (partial) => setCaption(partial),
      (final) => void handle(final),
      (err) => {
        setState('idle')
        setCaption(err === 'not-allowed' ? 'Microphone blocked. Allow it in the browser.' : err === 'no-speech' ? "Didn't catch that." : `Voice error: ${err}`)
      },
    )
  }

  if (!canListen && !canSpeak) return null
  return (
    <div className="voice-wrap" aria-live="polite">
      {caption && <p className={`voice-caption ${state}`}>{caption}</p>}
      <button
        className={`voice-mic ${state}`}
        onClick={canListen ? toggle : () => say(spokenSizeUp(b))}
        aria-label={canListen ? (state === 'listening' ? 'Stop listening' : 'Talk to FireSight') : 'Read the size-up aloud'}
      >
        {state === 'listening' ? '■' : state === 'speaking' ? '◼︎' : canListen ? '🎙' : '🔊'}
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
