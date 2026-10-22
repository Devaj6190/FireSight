// Floor pins: dot (+ soft glow for danger) on the slab, a leader stem, and a dark dated callout chip.
// Chips are real 3D (troika text), not <Html>, so they also render inside a WebXR session (plan.md s3).
// They are re-scaled every frame to a constant pixel size and drawn over the floors so they never hide.
import { Billboard, Line, Text } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useMemo, useRef, useState, type ComponentRef } from 'react'
import * as THREE from 'three'
import sansBold from '@fontsource/ibm-plex-sans/files/ibm-plex-sans-latin-700-normal.woff?url'
import monoMedium from '@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-500-normal.woff?url'
import { reduce } from './explode'
import { fs } from './tokens'

// ponytail: slice of the Pin contract (plan.md s5) until shared/building.ts lands
export type Pin = {
  id: string
  layer: string
  severity: 'danger' | 'caution' | 'info'
  label: string
  detail: string
  anchor: { kind: 'floor'; floor: number } | { kind: 'building' } | { kind: 'roof' } | { kind: 'ground' }
  claim: 'verified' | 'unverifiable' | 'conflict'
  evidence: { source: string; datasetId: string; recordId: string; url: string; asOf: string; rule: string }[]
  stale: boolean
}
export type Reveal = { v: number } // 0 hidden .. 1 shown, tweened by the explode timeline

export const SEVERITY_ORDER = { danger: 0, caution: 1, info: 2 }
const SEV_COLOR = { danger: fs.danger, caution: fs.caution, info: fs.ink }
const SOURCE: Record<string, string> = { permit: 'PERMIT', incident: 'SFFD INCIDENT', softstory: 'SOFT-STORY LIST' }
const SNAPSHOT = new Set(['softstory']) // lists, not events: their date is when the list was read

const STEM = 9 // m, leader height above the slab
// chip layout in px (the chip group is scaled to 1 unit = 1 screen px)
const PAD_X = 10
const PAD_Y = 8
const TEXT_X = PAD_X + 14 // after the severity dot
const CHIP_H = 44
const STACK = CHIP_H + 6

const date = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase()

function roundedRect(w: number, h: number, r: number) {
  const s = new THREE.Shape()
  s.moveTo(r, 0)
  s.lineTo(w - r, 0)
  s.quadraticCurveTo(w, 0, w, r)
  s.lineTo(w, h - r)
  s.quadraticCurveTo(w, h, w - r, h)
  s.lineTo(r, h)
  s.quadraticCurveTo(0, h, 0, h - r)
  s.lineTo(0, r)
  s.quadraticCurveTo(0, 0, r, 0)
  return new THREE.ShapeGeometry(s)
}

// soft warm radial falloff, drawn once and shared by every danger glow
const glowMap = (() => {
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const g = c.getContext('2d')!
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64)
  grad.addColorStop(0, 'rgba(255, 196, 110, 1)')
  grad.addColorStop(0.22, 'rgba(255, 140, 40, 0.6)')
  grad.addColorStop(0.55, 'rgba(255, 96, 20, 0.18)')
  grad.addColorStop(1, 'rgba(255, 80, 0, 0)')
  g.fillStyle = grad
  g.fillRect(0, 0, 128, 128)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
})()

const overlay = (color: string) => new THREE.MeshBasicMaterial({ color, transparent: true, depthTest: false, depthWrite: false, fog: false, toneMapped: false })

// side: which way the chip extends from its stem, so it stays on screen
export function PinMarker({ pin, at, stack, side, reveal }: { pin: Pin; at: [number, number, number]; stack: number; side: 'left' | 'right'; reveal: Reveal }) {
  const base = useRef<THREE.Mesh>(null)
  const stem = useRef<THREE.Group>(null)
  const chip = useRef<THREE.Group>(null)
  const glow = useRef<THREE.Sprite>(null)
  const label = useRef<ComponentRef<typeof Text>>(null)
  const sub = useRef<ComponentRef<typeof Text>>(null)
  const widths = useRef([0, 0])
  const [w, setW] = useState(180)
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera
  const height = useThree((s) => s.size.height)

  const color = SEV_COLOR[pin.severity]
  const danger = pin.severity === 'danger'
  const mats = useMemo(
    () => ({ border: overlay(danger ? fs.danger : fs.line), bg: overlay(fs.surface), dot: overlay(color), label: overlay('#ffffff'), sub: overlay('#ffffff') }),
    [color, danger],
  )
  const geo = useMemo(() => ({ border: roundedRect(w + 2, CHIP_H + 2, 9), bg: roundedRect(w, CHIP_H, 8) }), [w])
  const dot = useMemo(() => new THREE.CircleGeometry(4, 20), [])
  const world = useMemo(() => new THREE.Vector3(), [])

  const measure = (i: number) => (m: { textRenderInfo?: { blockBounds: number[] } }) => {
    const b = m.textRenderInfo?.blockBounds
    if (!b) return
    widths.current[i] = b[2] - b[0]
    setW(Math.ceil(Math.max(...widths.current)) + TEXT_X + PAD_X)
  }

  useFrame(({ clock }) => {
    // never toggle visibility: hidden objects skip text layout and shader compile, which then hitch on reveal
    const v = Math.max(reveal.v, 1e-4)
    base.current!.scale.setScalar(v)
    stem.current!.scale.y = Math.min(1, v * 1.6) // the stem draws first, the chip follows
    const cv = Math.max(0, (v - 0.3) / 0.7)
    chip.current!.getWorldPosition(world)
    const pxPerUnit = (2 * world.distanceTo(camera.position) * Math.tan((camera.fov * Math.PI) / 360)) / height
    chip.current!.scale.setScalar(pxPerUnit * (0.85 + 0.15 * cv))
    mats.border.opacity = mats.bg.opacity = mats.dot.opacity = cv
    label.current!.fillOpacity = sub.current!.fillOpacity = cv
    if (glow.current) {
      const beat = reduce ? 0 : Math.sin((clock.elapsedTime * 2 * Math.PI) / 1.2) // design.md: 1.2 s danger pulse
      glow.current.scale.setScalar(16 * (1 + 0.12 * beat) * v)
      glow.current.material.opacity = (0.8 + 0.2 * beat) * v
    }
  })

  const ev = pin.evidence[0]
  return (
    <group position={at}>
      <mesh ref={base}>
        <sphereGeometry args={[0.7, 16, 12]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      {danger && (
        <sprite ref={glow} position-y={0.2}>
          <spriteMaterial map={glowMap} blending={THREE.AdditiveBlending} transparent depthWrite={false} fog={false} toneMapped={false} />
        </sprite>
      )}
      <group ref={stem}>
        <Line points={[[0, 0, 0], [0, STEM, 0]]} color={danger ? fs.danger : fs.muted} lineWidth={1.5} />
      </group>
      <Billboard position-y={STEM}>
        <group ref={chip}>
          <group position={[side === 'right' ? 6 : -6 - w, stack * STACK, 0]}>
            <mesh geometry={geo.border} material={mats.border} position={[-1, -1, 0]} renderOrder={10} />
            <mesh geometry={geo.bg} material={mats.bg} renderOrder={11} />
            <mesh geometry={dot} material={mats.dot} position={[PAD_X + 4, CHIP_H - PAD_Y - 7, 0]} renderOrder={12} />
            <Text
              ref={label}
              font={sansBold}
              fontSize={12.5}
              letterSpacing={0.04}
              color={fs.ink}
              anchorX="left"
              anchorY="top"
              position={[TEXT_X, CHIP_H - PAD_Y, 0]}
              material={mats.label}
              renderOrder={13}
              onSync={measure(0)}
            >
              {pin.label}
            </Text>
            <Text
              ref={sub}
              font={monoMedium}
              fontSize={10.5}
              color={fs.muted}
              anchorX="left"
              anchorY="bottom"
              position={[TEXT_X, PAD_Y, 0]}
              material={mats.sub}
              renderOrder={13}
              onSync={measure(1)}
            >
              {`${SOURCE[pin.layer] ?? pin.layer.toUpperCase()} · ${SNAPSHOT.has(pin.layer) ? 'AS OF ' : ''}${date(ev.asOf)}`}
            </Text>
          </group>
        </group>
      </Billboard>
    </group>
  )
}
