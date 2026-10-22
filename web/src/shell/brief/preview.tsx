// Dev-only preview at /brief-preview.html (not in the production build). Lane D mounts the real thing.
import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import type { BriefLine, Building } from '../../../../shared/building.ts'
import '../../index.css'
import { BriefSheet, EvalScreen } from './index.ts'

function Preview() {
  const [b, setB] = useState<Building>()
  const [sent, setSent] = useState<BriefLine[]>()
  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}buildings/sf-0874003.json`).then((r) => r.json()).then(setB)
  }, [])
  if (!b) return null
  return (
    <div style={{ maxWidth: 390, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 12, padding: '12px 0' }}>
      <BriefSheet building={b} onSend={setSent} onSelectPins={(ids) => console.log('highlight', ids)} />
      {sent && <pre style={{ fontSize: 11, whiteSpace: 'pre-wrap', margin: '0 16px' }}>SENT: {sent.map((l) => l.text).join('\n')}</pre>}
      <EvalScreen />
    </div>
  )
}

createRoot(document.getElementById('root')!).render(<StrictMode><Preview /></StrictMode>)
