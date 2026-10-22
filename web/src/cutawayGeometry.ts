import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import type { P } from './arrival'

// Architectural representation of a footprint, NOT a surveyed facade or interior.
// Window rhythm and wall thickness are illustrative. No circulation or room positions.
export function cutawayGeometry(fp: P[], storyHeight: number) {
  const height = Math.max(2.8, Math.min(5, storyHeight))
  const shell: THREE.BufferGeometry[] = []
  const glazing: THREE.BufferGeometry[] = []
  const ink: THREE.BufferGeometry[] = []
  const roofLines: THREE.BufferGeometry[] = []
  const line = (points: number[], target = ink) => target.push(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(points, 3)))
  const beam = (a: P, b: P, base: number, thick: number, tall: number, target = shell) => {
    const len = Math.hypot(b[0] - a[0], b[1] - a[1])
    if (len < 0.01) return
    const g = new THREE.BoxGeometry(len + thick, tall, thick)
    g.rotateY(Math.atan2(b[1] - a[1], b[0] - a[0]))
    g.translate((a[0] + b[0]) / 2, base + tall / 2, -(a[1] + b[1]) / 2)
    if (target === shell) ink.push(new THREE.EdgesGeometry(g, 25))
    target.push(g)
  }
  const signedArea = fp.reduce((s, p, i) => { const q = fp[(i + 1) % fp.length]; return s + p[0] * q[1] - q[0] * p[1] }, 0)
  fp.forEach((a, i) => {
    const b = fp[(i + 1) % fp.length]
    const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy)
    if (len < 0.05) return
    // Open the camera-facing sides into a low section cut. Keep the far facade full height.
    const facing = (signedArea > 0 ? 1 : -1) * (dy + dx) / len
    const rear = facing < 0.15
    beam(a, b, 0.28, 0.25, rear ? 0.75 : 0.38)
    if (rear) {
      beam(a, b, height, 0.24, 0.2)
      const count = Math.max(1, Math.ceil(len / 2.7))
      const point = (t: number): P => [a[0] + dx * t, a[1] + dy * t]
      for (let k = 0; k <= count; k++) {
        const p = point(k / count)
        beam(p, [p[0] + dx / len * 0.14, p[1] + dy / len * 0.14], 1.03, 0.18, height - 1.03)
      }
      beam(a, b, 1.03, 0.055, height - 1.03, glazing)
      beam(a, b, height * 0.7, 0.07, 0.06)
    }
    // Detached ceiling outline and lower slab make the selected storey legible as a section.
    line([a[0], height + 2, -a[1], b[0], height + 2, -b[1]], roofLines)
  })
  function slab(depth: number) {
    const g = new THREE.ExtrudeGeometry(new THREE.Shape(fp.map(([x, y]) => new THREE.Vector2(x, y))), { depth, bevelEnabled: false })
    g.rotateX(-Math.PI / 2)
    return g
  }
  const plate = slab(0.28)
  const plateEdges = new THREE.EdgesGeometry(plate, 25)
  const xs = fp.map(p => p[0]), ys = fp.map(p => p[1])
  const bounds = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)] as const
  // A sparse drafting grid, clipped to the actual footprint by polygon intersections.
  const hatch: number[] = []
  for (let y = Math.ceil(bounds[2] / 3) * 3; y < bounds[3]; y += 3) {
    const hits: number[] = []
    fp.forEach((a, i) => { const b = fp[(i + 1) % fp.length]; if ((a[1] <= y && b[1] > y) || (b[1] <= y && a[1] > y)) hits.push(a[0] + (y - a[1]) * (b[0] - a[0]) / (b[1] - a[1])) })
    hits.sort((a, b) => a - b)
    for (let i = 0; i + 1 < hits.length; i += 2) hatch.push(hits[i], 0.29, -y, hits[i + 1], 0.29, -y)
  }
  const grid = new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(hatch, 3))
  const combine = (parts: THREE.BufferGeometry[]) => {
    const merged = parts.length ? mergeGeometries(parts)! : new THREE.BufferGeometry()
    parts.forEach(g => g.dispose())
    return merged
  }
  const roof = combine(roofLines)
  return { plate, plateEdges, walls: combine(shell), windows: combine(glazing), ink: combine(ink), grid, roof, height, bounds }
}
