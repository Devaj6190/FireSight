// Browser speech in and out (Web Speech API). Chrome on Android over HTTPS supports both.
// Recognition audio is processed by the browser's speech service; FireSight stores no audio.

type Rec = {
  lang: string; interimResults: boolean; continuous: boolean; maxAlternatives: number
  start(): void; stop(): void; abort(): void
  onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null
  onerror: ((e: { error: string }) => void) | null
  onend: (() => void) | null
}
type RecCtor = new () => Rec

const Ctor: RecCtor | undefined =
  typeof window === 'undefined' ? undefined : ((window as unknown as { SpeechRecognition?: RecCtor; webkitSpeechRecognition?: RecCtor }).SpeechRecognition ??
    (window as unknown as { webkitSpeechRecognition?: RecCtor }).webkitSpeechRecognition)

export const canListen = !!Ctor
export const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window

let voice: SpeechSynthesisVoice | undefined
function pickVoice() {
  const vs = window.speechSynthesis.getVoices().filter((v) => v.lang.startsWith('en'))
  voice = vs.find((v) => /Google US English/.test(v.name)) ?? vs.find((v) => v.lang === 'en-US') ?? vs[0]
}
if (canSpeak) {
  pickVoice()
  window.speechSynthesis.onvoiceschanged = pickVoice
}

// Natural voice from /api/tts (ElevenLabs) when the server has a key; otherwise, or on any failure, the browser voice.
let tts: 'unknown' | 'on' | 'off' = 'unknown'
let session = 0
let aborter: AbortController | null = null
let audio: HTMLAudioElement | null = null

async function clip(text: string, signal: AbortSignal): Promise<string> {
  const res = await fetch('/api/tts', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text }), signal })
  if (!res.ok) throw new Error(`tts ${res.status}`)
  return URL.createObjectURL(await res.blob())
}

function play(url: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const a = new Audio(url)
    audio = a
    a.onended = () => resolve()
    a.onerror = () => reject(new Error('audio'))
    a.play().catch(reject)
  }).finally(() => URL.revokeObjectURL(url))
}

export function speak(sentences: string[], onLine?: (s: string, i: number) => void, onDone?: () => void) {
  stopSpeaking()
  const id = ++session
  if (tts === 'off' || typeof fetch === 'undefined') return browserSpeak(sentences, onLine, onDone)
  const ctl = new AbortController()
  aborter = ctl
  // Fetch every sentence at once so playback has no gaps; give up on the natural voice if the first takes over 5 s.
  const clips = sentences.map((s) => clip(s, ctl.signal))
  clips.forEach((p) => p.catch(() => {}))
  void (async () => {
    for (let i = 0; i < sentences.length; i++) {
      let url: string
      try {
        url = i === 0 ? await Promise.race([clips[0], new Promise<string>((_, rej) => setTimeout(() => rej(new Error('slow')), 5000))]) : await clips[i]
      } catch {
        if (id !== session) return
        if (i === 0) tts = 'off'
        ctl.abort()
        return browserSpeak(sentences.slice(i), (s, j) => onLine?.(s, i + j), onDone)
      }
      if (id !== session) return URL.revokeObjectURL(url)
      tts = 'on'
      onLine?.(sentences[i], i)
      try {
        await play(url)
      } catch {
        if (id !== session) return
        return browserSpeak(sentences.slice(i + 1), (s, j) => onLine?.(s, i + 1 + j), onDone)
      }
      if (id !== session) return
    }
    onDone?.()
  })()
}

// Browser voice: one utterance per sentence, since Chrome cuts off long single utterances.
function browserSpeak(sentences: string[], onLine?: (s: string, i: number) => void, onDone?: () => void) {
  if (!canSpeak || !sentences.length) return onDone?.()
  window.speechSynthesis.cancel()
  sentences.forEach((s, i) => {
    const u = new SpeechSynthesisUtterance(s)
    if (voice) u.voice = voice
    u.rate = 1.05
    u.onstart = () => onLine?.(s, i)
    if (i === sentences.length - 1) u.onend = () => onDone?.()
    window.speechSynthesis.speak(u)
  })
}

export function stopSpeaking() {
  session++
  aborter?.abort()
  aborter = null
  audio?.pause()
  audio = null
  if (canSpeak) window.speechSynthesis.cancel()
}

export function listen(onPartial: (t: string) => void, onFinal: (t: string) => void, onError: (e: string) => void): () => void {
  if (!Ctor) {
    onError('not-supported')
    return () => {}
  }
  const rec = new Ctor()
  rec.lang = 'en-US'
  rec.interimResults = true
  rec.continuous = false
  rec.maxAlternatives = 1
  let finalText = ''
  rec.onresult = (e) => {
    let text = ''
    for (let i = 0; i < e.results.length; i++) {
      text += e.results[i][0].transcript
      if (e.results[i].isFinal) finalText = text
    }
    onPartial(text)
  }
  rec.onerror = (e) => onError(e.error)
  rec.onend = () => onFinal(finalText.trim())
  rec.start()
  return () => rec.stop()
}
