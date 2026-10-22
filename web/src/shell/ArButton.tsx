// "View in AR" on Android: opens /ar.html, where model-viewer places the building on a real table inside Chrome
// (WebXR), falling back to Google's Scene Viewer. The model is built by web/scripts/ar-model.mts; only buildings with one show the button.
import type { Building } from '../../../shared/building.ts'
import './ar.css'

const MODELS: Record<string, string> = { 'sf-3722080': 'fire floor 22' }
const android = typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent)

export function ArButton({ building: b }: { building: Building }) {
  if (!android || !MODELS[b.id]) return null
  return (
    <a className="phone-ar" href={`/ar.html?b=${b.id}`} aria-label={`View ${b.address} in AR on a table`}>
      View in AR
    </a>
  )
}
