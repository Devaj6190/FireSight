// "View in AR" on Android: opens the building's model in Google's Scene Viewer (ARCore), which places it
// on a real table and keeps it there. The model is built by web/scripts/ar-model.mts; only buildings with one show the button.
import type { Building } from '../../../shared/building.ts'
import './ar.css'

const MODELS: Record<string, string> = { 'sf-3722080': 'fire floor 22' }
const android = typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent)

export function arIntent(b: Building, origin: string): string {
  const file = `${origin}/ar/${b.id}.glb`
  const title = `${b.address} · ${MODELS[b.id]}`
  const params = `file=${encodeURIComponent(file)}&mode=ar_preferred&title=${encodeURIComponent(title)}`
  const fallback = `https://arvr.google.com/scene-viewer/1.0?${params}`
  return `intent://arvr.google.com/scene-viewer/1.0?${params}#Intent;scheme=https;package=com.google.android.googlequicksearchbox;action=android.intent.action.VIEW;S.browser_fallback_url=${encodeURIComponent(fallback)};end;`
}

export function ArButton({ building: b }: { building: Building }) {
  if (!android || !MODELS[b.id]) return null
  return (
    <a className="phone-ar" href={arIntent(b, window.location.origin)} aria-label={`View ${b.address} in AR on a table`}>
      View in AR
    </a>
  )
}
