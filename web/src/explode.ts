// Explode = plan fan, shown at an angle. Chosen over the design.md s4 vertical lift in the prototype
// (branch prototype/explode-variants): floors slide north one footprint apart and climb, so the stack reads as an
// inclined run of floor plans; the camera drops to a low 3/4 view (like an oblique terrain map), not top-down.
// B1 continues the fan downhill, through the ground. Motion: long overlapping eases, camera lands last, never a snap.
import * as THREE from 'three'
import { fs } from './tokens'

export type Pose = { r: number; phi: number; theta: number; tx: number; ty: number; tz: number }
export type Ctx = {
  tl: gsap.core.Timeline
  slabs: THREE.Group[] // index 0 = ground floor, never moves
  basement: THREE.Group | null // B1, below grade
  edges: THREE.Color[]
  pose: Pose // live camera pose, applied on every tick
  home: Pose // camera pose when explode started
  floorH: number
  heightM: number
  floors: number
  span: number
  aspect: number // canvas width / height
  pins: { v: number }[] // reveal per pin group, sorted danger first
  fades: { a: number }[] // opacity per floor, contract numbering (0 = B1)
  target: number | null // focused floor
  lit: number[] // floors an answer names, shown full alongside target
  hot: Set<number> // floors with a danger pin
}

const DEG = Math.PI / 180
// design.md s4 reduced motion: keep every position change, drop the motion
export const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
export const t = (s: number) => (reduce ? 0.001 : s)
const rgb = (hex: string) => {
  const { r, g, b } = new THREE.Color(hex)
  return { r, g, b }
}
const pos = (c: Ctx) => c.slabs.slice(1).map((g) => g.position)
// the idle drift keeps turning the camera, so take the short way round to an azimuth
export const near = (from: number, to: number) => from + ((((to - from + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) - Math.PI
// portrait phones see less across than up: back off so the fan fits the narrow side
const fit = (c: Ctx) => Math.max(1, 0.8 / c.aspect)

function fan(c: Ctx) {
  const n = c.floors - 1
  // one footprint apart, but the fan is at most about 3 footprints long: a tower becomes a leaning fanned deck
  const step = c.span * 1.05 * Math.min(1, 3 / n)
  const rise = c.floorH + step * 0.3 // about 17 degrees of incline
  return { n, step, rise }
}

// focus: the floor and any answer floors full, the floor above (fire spreads up) and nearby danger floors half-lit, the rest dim
const HALF = 0.4
const DIM = 0.15
export const fadeFor = (f: number, c: Ctx) => {
  if ((c.target === null && !c.lit.length) || f === c.target || c.lit.includes(f)) return 1
  return c.target !== null && (f === c.target + 1 || (c.hot.has(f) && Math.abs(f - c.target) <= 4)) ? HALF : DIM
}

export function explode(c: Ctx) {
  const { n, step, rise } = fan(c)
  const fanLen = Math.hypot(n * step, n * rise + c.floorH)
  c.tl
    .to(c.edges, { ...rgb(fs.action), duration: t(0.6), ease: 'sine.inOut' }, 0)
    .to(pos(c), { z: (k) => -(k + 1) * step, y: (k) => (k + 1) * rise, duration: t(1.4), ease: 'power3.inOut', stagger: { amount: t(0.36) } }, t(0.1))
    // pins after the floors have mostly landed, danger first (design.md s4 order)
    .to(c.pins, { v: 1, duration: t(0.7), ease: 'power2.out', stagger: { amount: t(Math.min(0.7, 0.14 * (c.pins.length - 1))) } }, t(1.25))
    // aim 40 percent up the fan, not the middle: perspective makes the near (ground) plates bigger
    .to(c.pose, { phi: 62 * DEG, theta: near(c.pose.theta, 30 * DEG), r: 1.6 * fit(c) * Math.max(fanLen, c.span), tx: 0, ty: 0.4 * n * rise + c.floorH / 2, tz: -0.4 * n * step, duration: t(1.9), ease: 'sine.inOut' }, 0)
  if (c.basement) c.tl.to(c.basement.position, { z: step, y: -rise, duration: t(1.4), ease: 'power3.inOut' }, t(0.1))
}

// reset view on the open fan: the same framing explode lands on
export function frame(c: Ctx) {
  const { n, step, rise } = fan(c)
  const fanLen = Math.hypot(n * step, n * rise + c.floorH)
  c.tl.to(c.pose, { phi: 62 * DEG, theta: near(c.pose.theta, 30 * DEG), r: 1.6 * fit(c) * Math.max(fanLen, c.span), tx: 0, ty: 0.4 * n * rise + c.floorH / 2, tz: -0.4 * n * step, duration: t(1.1), ease: 'power3.inOut' }, 0)
}

// runs once the fan has landed (and again whenever the target changes): fade floors, frame the target
export function focus(c: Ctx) {
  c.tl.to(c.fades, { a: (f: number) => fadeFor(f, c), duration: t(0.8), ease: 'sine.inOut' }, 0)
  const shown = c.target === null ? c.lit : [c.target, ...c.lit]
  if (!shown.length) return
  const { step, rise } = fan(c)
  // slab indices; B1 is -1, which the fan formula places downhill. Frame the middle, back off to fit the run
  const lo = Math.min(...shown) - 1
  const hi = Math.max(...shown) - 1
  const s = (lo + hi) / 2
  const r = fit(c) * Math.max(3 * c.span, 1.6 * (hi - lo) * Math.hypot(step, rise))
  c.tl.to(c.pose, { tx: 0, ty: s * rise + c.floorH / 2, tz: -s * step, r, duration: t(1.4), ease: 'sine.inOut' }, 0)
}

export function collapse(c: Ctx) {
  const { theta: _, ...home } = c.home // keep the drifted azimuth, no spin back
  c.tl
    .to(c.pins, { v: 0, duration: t(0.3), ease: 'power2.in' }, 0) // gone before the floors move
    .to(c.fades, { a: 1, duration: t(0.6), ease: 'sine.inOut' }, 0)
    .to(pos(c), { z: 0, y: (k) => (k + 1) * c.floorH, duration: t(1.1), ease: 'power3.inOut', stagger: { amount: t(0.3), from: 'end' } }, 0)
    .to(c.pose, { ...home, duration: t(1.5), ease: 'sine.inOut' }, 0)
    .to(c.edges, { ...rgb(fs.line), duration: t(0.8), ease: 'sine.inOut' }, t(0.3))
  if (c.basement) c.tl.to(c.basement.position, { z: 0, y: -c.floorH, duration: t(1.1), ease: 'power3.inOut' }, 0)
}
