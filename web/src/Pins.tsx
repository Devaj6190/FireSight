// Floor pins: dot (+ soft glow for danger) on the slab, a leader stem, and a dark dated callout chip.
// Only labelled pins (the focused floor's, see App.tsx) grow a stem and chip; the rest stay dots so the fan reads clear.
// Chips are real 3D (troika text), not <Html>, so they also render inside a WebXR session (plan.md s3).
// They are re-scaled every frame to a constant pixel size and drawn over the floors so they never hide.
import { Billboard, Line, Text } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState, type ComponentRef } from 'react'
import * as THREE from 'three'
import sansBold from '@fontsource/geist/files/geist-latin-600-normal.woff?url'
import monoMedium from '@fontsource/geist-mono/files/geist-mono-latin-500-normal.woff?url'
import { reduce } from './explode'
import { useStore } from './store'
import { fs } from './tokens'
import { displayLabel } from './shell/Floors'

import type { Pin } from '../../shared/building'
export type { Pin }
export type Reveal = { v: number } // 0 hidden .. 1 shown, tweened by the explode timeline

export const SEVERITY_ORDER = { danger: 0, caution: 1, info: 2 }
const SEV_COLOR = { danger: fs.danger, caution: fs.caution, info: fs.ink }
// chip source name by dataset; snapshots (lists, inventories) are dated by when they were read, not an event
const SOURCE: Record<string, string> = {
  'i98e-djp9': 'PERMIT',
  '893e-xam6': 'FIRE PERMIT',
  'wr8u-xric': 'SFFD INCIDENT',
  'beah-shgi': 'SOFT-STORY LIST',
  '5kya-mfst': 'TALL BLDG INVENTORY',
}
const SNAPSHOT = new Set(['beah-shgi', '5kya-mfst'])

const STEM = 9 // m, leader height above the slab
// chip layout in px (the chip group is scaled to 1 unit = 1 screen px)
const PAD_X = 10
const PAD_Y = 8
const TEXT_X = PAD_X + 14 // after the severity dot
const CHIP_H = 44
const GAP = 6
const TOP = 28 // px reserved under the top bar for the notice line
const DOT_PX = 5 // the dot never draws smaller than this radius on screen

// Screen-space declutter. Every pin reports its stem top in screen px and its chip width; one pass per frame picks
// the chip's side (toward screen centre), clamps it on screen, pushes overlapping chips up, and glides them there.
// Pins read last frame's result: one frame of lag is invisible. ponytail: greedy O(n^2), fine under the 40-pin cap.
type Slot = { ax: number; ay: number; w: number; on: boolean; x: number; y: number; fresh: boolean; show: number; rank: number } // x, y: chip offset from stem top, px, y up; show: 0 when pushed off the top
const slots = new Map<string, Slot>()

export function Declutter() {
  const size = useThree((s) => s.size)
  useFrame(() => {
    const inset = useStore.getState().inset // chips stay in the part of the canvas the shell leaves uncovered
    const left = inset.left + 8, right = size.width - inset.right - 8, top = inset.top + TOP
    const mid = (left + right) / 2
    const placed: { x0: number; x1: number; top: number; bottom: number }[] = []
    for (const s of [...slots.values()].filter((s) => s.on)
      .sort((a, b) => a.rank - b.rank || b.ay - a.ay)) { // danger keeps its spot; the rest fit around it
      const x0 = Math.min(Math.max(s.ax < mid ? s.ax + 8 : s.ax - 8 - s.w, left), right - s.w)
      let bottom = s.ay - GAP // screen y grows down; the chip sits just above its stem top
      for (let moved = true; moved; ) {
        moved = false
        for (const p of placed)
          if (x0 < p.x1 + GAP && x0 + s.w > p.x0 - GAP && bottom > p.top - GAP && bottom - CHIP_H < p.bottom + GAP) {
            bottom = p.top - GAP
            moved = true
          }
      }
      // no room left under the status row: fade the chip out (dot and stem stay) instead of piling chips up there
      const fits = bottom >= top + CHIP_H && bottom <= size.height - inset.bottom
      bottom = Math.max(bottom, top + CHIP_H)
      if (fits) placed.push({ x0, x1: x0 + s.w, top: bottom - CHIP_H, bottom })
      const tx = x0 - s.ax
      const ty = s.ay - bottom
      const k = s.fresh || reduce ? 1 : 0.16 // glide, except on first show
      s.x += (tx - s.x) * k
      s.y += (ty - s.y) * k
      s.show += ((fits ? 1 : 0) - s.show) * (reduce ? 1 : 0.2)
      s.fresh = false
    }
  })
  return null
}

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

// soft red radial falloff, drawn once and shared by every danger glow
const glowMap = (() => {
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const g = c.getContext('2d')!
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64)
  grad.addColorStop(0, 'rgba(255, 170, 160, 1)')
  grad.addColorStop(0.22, 'rgba(255, 77, 79, 0.6)')
  grad.addColorStop(0.55, 'rgba(255, 60, 60, 0.18)')
  grad.addColorStop(1, 'rgba(255, 40, 40, 0)')
  g.fillStyle = grad
  g.fillRect(0, 0, 128, 128)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
})()

const overlay = (color: string) => new THREE.MeshBasicMaterial({ color, transparent: true, depthTest: false, depthWrite: false, fog: false, toneMapped: false })

export function PinMarker({ pin, more = 0, at, reveal, fade, labelled = true }: { pin: Pin; more?: number; at: [number, number, number]; reveal: Reveal; fade: { a: number }; labelled?: boolean }) {
  const base = useRef<THREE.Mesh>(null)
  const stem = useRef<THREE.Group>(null)
  const chip = useRef<THREE.Group>(null)
  const content = useRef<THREE.Group>(null)
  const glow = useRef<THREE.Sprite>(null)
  const label = useRef<ComponentRef<typeof Text>>(null)
  const sub = useRef<ComponentRef<typeof Text>>(null)
  const widths = useRef([0, 0])
  const lab = useRef(labelled ? 1 : 0) // eases toward labelled, so a chip grows out of its dot on focus
  const [w, setW] = useState(180)
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera
  const size = useThree((s) => s.size)

  const color = SEV_COLOR[pin.severity]
  const danger = pin.severity === 'danger'
  const mats = useMemo(
    () => ({ border: overlay(danger ? fs.danger : fs.line), bg: overlay(fs.surface), dot: overlay(color), label: overlay('#ffffff'), sub: overlay('#ffffff') }),
    [color, danger],
  )
  const geo = useMemo(() => ({ border: roundedRect(w + 2, CHIP_H + 2, 9), bg: roundedRect(w, CHIP_H, 8) }), [w])
  const dot = useMemo(() => new THREE.CircleGeometry(4, 20), [])
  const world = useMemo(() => new THREE.Vector3(), [])
  const ndc = useMemo(() => new THREE.Vector3(), [])
  const slot = useMemo<Slot>(() => ({ ax: 0, ay: 0, w: 180, on: false, x: 0, y: 0, fresh: true, show: 1, rank: SEVERITY_ORDER[pin.severity] }), [pin.severity])
  // register in the effect, not the memo: StrictMode's mount/unmount/mount would otherwise leave it deleted
  useEffect(() => {
    slots.set(pin.id, slot)
    return () => void slots.delete(pin.id)
  }, [pin.id, slot])
  // thin leader from the stem top to the chip's nearest bottom corner, in chip px space
  const leader = useMemo(() => {
    const g = new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(6, 3))
    return new THREE.Line(g, new THREE.LineBasicMaterial({ color: pin.severity === 'danger' ? fs.danger : fs.muted, transparent: true, depthTest: false, fog: false }))
  }, [pin.severity])

  const measure = (i: number) => (m: { textRenderInfo?: { blockBounds: number[] } }) => {
    const b = m.textRenderInfo?.blockBounds
    if (!b) return
    widths.current[i] = b[2] - b[0]
    setW(Math.ceil(Math.max(...widths.current)) + TEXT_X + PAD_X)
  }

  useFrame(({ clock }) => {
    // never toggle visibility: hidden objects skip text layout and shader compile, which then hitch on reveal
    const v = Math.max(reveal.v, 1e-4)
    lab.current += ((labelled ? 1 : 0) - lab.current) * (reduce ? 1 : 0.14)
    const l = lab.current
    const pxPerUnit = (2 * base.current!.getWorldPosition(world).distanceTo(camera.position) * Math.tan((camera.fov * Math.PI) / 360)) / size.height
    base.current!.scale.setScalar(v * Math.max(1, (DOT_PX * pxPerUnit) / 0.7))
    stem.current!.scale.y = Math.max(1e-4, Math.min(1, v * 1.6) * l) // the stem draws first, the chip follows
    const cv = Math.max(0, (v - 0.3) / 0.7) * Math.max(0, (l - 0.3) / 0.7)
    chip.current!.getWorldPosition(world)
    chip.current!.scale.setScalar(pxPerUnit * (0.85 + 0.15 * cv))
    ndc.copy(world).project(camera)
    if (!slot.on && cv > 0) slot.fresh = true
    Object.assign(slot, { ax: ((ndc.x + 1) / 2) * size.width, ay: ((1 - ndc.y) / 2) * size.height, w, on: cv > 0 })
    content.current!.position.set(slot.x, slot.y, 0)
    const pos = leader.geometry.attributes.position as THREE.BufferAttribute
    pos.setXYZ(1, slot.x < 0 ? slot.x + w : slot.x, slot.y, 0)
    pos.needsUpdate = true
    const a = cv * fade.a * slot.show // focus dims the chips of faded floors with their slabs
    mats.border.opacity = mats.dot.opacity = (leader.material as THREE.LineBasicMaterial).opacity = a
    mats.bg.opacity = 0.9 * a
    label.current!.fillOpacity = sub.current!.fillOpacity = a
    if (glow.current) {
      const beat = reduce ? 0 : Math.sin((clock.elapsedTime * 2 * Math.PI) / 1.2) // design.md: 1.2 s danger pulse
      glow.current.scale.setScalar(Math.max(16, 26 * pxPerUnit) * (1 + 0.12 * beat) * v)
      glow.current.material.opacity = (0.8 + 0.2 * beat) * v * fade.a
    }
  })

  const ev = pin.evidence[0] as Pin['evidence'][number] | undefined // dispatch and crew pins carry none
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
          <primitive object={leader} renderOrder={9} />
          <group ref={content}>
            <mesh geometry={geo.border} material={mats.border} position={[-1, -1, 0]} renderOrder={10} />
            <mesh geometry={geo.bg} material={mats.bg} renderOrder={11} />
            <mesh geometry={dot} material={mats.dot} position={[PAD_X + 4, CHIP_H - PAD_Y - 7, 0]} renderOrder={12} />
            <Text
              ref={label}
              font={sansBold}
              fontSize={13}
              letterSpacing={-0.005}
              color={fs.ink}
              anchorX="left"
              anchorY="top"
              position={[TEXT_X, CHIP_H - PAD_Y, 0]}
              material={mats.label}
              renderOrder={13}
              onSync={measure(0)}
            >
              {/* ponytail: fixed cut so a chip fits a 360 px phone; the full label goes on the provenance card */}
              {(l => (l.length > 30 ? `${l.slice(0, 29).trimEnd()}…` : l))(displayLabel(pin.label))}
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
              {(ev ? `${SOURCE[ev.datasetId] ?? ev.source.toUpperCase()} · ${SNAPSHOT.has(ev.datasetId) ? 'AS OF ' : ''}${date(ev.asOf)}` : pin.origin.toUpperCase()) +
                (more ? ` · +${more} MORE` : '')}
            </Text>
          </group>
        </group>
      </Billboard>
    </group>
  )
}
