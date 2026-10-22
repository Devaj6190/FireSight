// Dev-only preview at /panels-preview.html (?b=sf-3722080 picks a building). Lane D mounts the real thing.
import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import type { Building } from '../../../../shared/building.ts'
import '../../index.css'
import { ComplianceStrip, LimitsPanel, SourcesDrawer } from './index.ts'

function Preview() {
  const [b, setB] = useState<Building>()
  const id = new URLSearchParams(location.search).get('b') ?? 'sf-0874003'
  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}buildings/${id}.json`).then((r) => r.json()).then(setB)
  }, [id])
  if (!b) return null
  return (
    <div style={{ maxWidth: 390, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 12, padding: '12px 0' }}>
      <ComplianceStrip building={b} onSelectPins={(ids) => console.log('highlight', ids)} />
      <LimitsPanel building={b} />
      <SourcesDrawer building={b} />
    </div>
  )
}

createRoot(document.getElementById('root')!).render(<StrictMode><Preview /></StrictMode>)
