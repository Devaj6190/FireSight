// "View in AR" on Android: opens /ar.html, where model-viewer places the building on a real table inside Chrome
// (WebXR), falling back to Google's Scene Viewer. Elsewhere (laptop, iPhone) the same spot links "3D model", the
// same page without the table placement. Models are built by web/scripts/ar-model.mts; only buildings with one show it.
// The value says what the model highlights: only the hero building has a fire floor.
import type { Building } from '../../../shared/building.ts'
import './ar.css'

const MODELS: Record<string, string> = {
  'sf-3722080': 'fire floor 22',
  'sf-0874003': 'floors with people',
  'sf-1244030': 'floors',
  'sf-3703081': 'floors with people',
}
const android = typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent)

export function ArButton({ building: b }: { building: Building }) {
  if (!MODELS[b.id]) return null
  return (
    <a
      className="phone-ar"
      href={`/ar.html?b=${b.id}`}
      target={android ? undefined : '_blank'}
      rel={android ? undefined : 'noopener'}
      aria-label={android ? `View ${b.address} in AR on a table` : `Open the 3D model of ${b.address} (${MODELS[b.id]})`}
    >
      {android ? 'View in AR' : '3D model ↗'}
    </a>
  )
}
