// Explode = plan fan, shown at an angle. Chosen over the design.md s4 vertical lift in the prototype
// (branch prototype/explode-variants): floors slide north one footprint apart and climb, so the stack reads as an
// inclined run of floor plans; the camera drops to a low 3/4 view (like an oblique terrain map), not top-down.
// Motion: long overlapping eases, camera leads and lands last, never a snap.
import * as THREE from 'three'
import { fs } from './tokens'

export type Pose = { r: number; phi: number; theta: number; tx: number; ty: number; tz: number }
export type Ctx = {
  tl: gsap.core.Timeline
  slabs: THREE.Group[] // index 0 = ground floor, never moves
  edge: THREE.Color
  pose: Pose // live camera pose, applied on every tick
  home: Pose // camera pose when explode started
  floorH: number
  heightM: number
  floors: number
  span: number
  pins: { v: number }[] // reveal per pin, sorted danger first
}

const DEG = Math.PI / 180
// design.md s4 reduced motion: keep every position change, drop the motion
export const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
const t = (s: number) => (reduce ? 0.001 : s)
const rgb = (hex: string) => {
  const { r, g, b } = new THREE.Color(hex)
  return { r, g, b }
}
const pos = (c: Ctx) => c.slabs.slice(1).map((g) => g.position)
// the idle drift keeps turning the camera, so take the short way round to an azimuth
const near = (from: number, to: number) => from + ((((to - from + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) - Math.PI

export function explode(c: Ctx) {
  const step = c.span * 1.05 // one footprint apart, no overlap
  const rise = c.floorH + step * 0.3 // about 17 degrees of incline
  const n = c.floors - 1
  c.tl
    .to(c.edge, { ...rgb(fs.action), duration: t(0.6), ease: 'sine.inOut' }, 0)
    .to(pos(c), { z: (k) => -(k + 1) * step, y: (k) => (k + 1) * rise, duration: t(1.4), ease: 'power3.inOut', stagger: t(0.12) }, t(0.1))
    // pins after the floors have mostly landed, danger first (design.md s4 order)
    .to(c.pins, { v: 1, duration: t(0.7), ease: 'power2.out', stagger: t(0.14) }, t(1.25))
    // aim 40 percent up the fan, not the middle: perspective makes the near (ground) plates bigger
    .to(c.pose, { phi: 62 * DEG, theta: near(c.pose.theta, 30 * DEG), r: c.home.r * 2.5, tx: 0, ty: 0.4 * n * rise + c.floorH / 2, tz: -0.4 * n * step, duration: t(1.9), ease: 'sine.inOut' }, 0)
}

export function collapse(c: Ctx) {
  const { theta: _, ...home } = c.home // keep the drifted azimuth, no spin back
  c.tl
    .to(c.pins, { v: 0, duration: t(0.3), ease: 'power2.in' }, 0) // gone before the floors move
    .to(pos(c), { z: 0, y: (k) => (k + 1) * c.floorH, duration: t(1.1), ease: 'power3.inOut', stagger: { each: t(0.1), from: 'end' } }, 0)
    .to(c.pose, { ...home, duration: t(1.5), ease: 'sine.inOut' }, 0)
    .to(c.edge, { ...rgb(fs.line), duration: t(0.8), ease: 'sine.inOut' }, t(0.3))
}
