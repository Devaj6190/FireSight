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

// Queue one utterance per sentence: Chrome cuts off long single utterances.
export function speak(sentences: string[], onLine?: (s: string) => void, onDone?: () => void) {
  if (!canSpeak) return onDone?.()
  window.speechSynthesis.cancel()
  sentences.forEach((s, i) => {
    const u = new SpeechSynthesisUtterance(s)
    if (voice) u.voice = voice
    u.rate = 1.05
    u.onstart = () => onLine?.(s)
    if (i === sentences.length - 1) u.onend = () => onDone?.()
    window.speechSynthesis.speak(u)
  })
}

export function stopSpeaking() {
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
