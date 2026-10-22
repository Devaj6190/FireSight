/// <reference types="node" />
// node --test src/cityMesh.test.ts (from web/)
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { cityGeometry, streetGeometry, streetLabels } from './cityMesh.ts'

// 10 m square, CCW, 20 m tall, in decimetres
const square = [200, 0, 0, 100, 0, 100, 100, 0, 100]

test('city walls face out and roofs face up, in world axes (y up, north = -z)', () => {
  const g = cityGeometry([square])
  const p = g.getAttribute('position'), idx = g.getIndex()!
  assert.equal(p.count, 4 * 4 + 4) // 4 walls x 4 corners + 4 roof corners
  assert.equal(idx.count, 4 * 6 + 2 * 3)
  const v = (i: number) => [p.getX(i), p.getY(i), p.getZ(i)]
  for (let t = 0; t < idx.count; t += 3) {
    const [a, b, c] = [0, 1, 2].map((k) => v(idx.getX(t + k)))
    const u = b.map((x, i) => x - a[i]), w = c.map((x, i) => x - a[i])
    const n = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]]
    const mid = [0, 1, 2].map((i) => (a[i] + b[i] + c[i]) / 3)
    const out = n[0] * (mid[0] - 5) + n[2] * (mid[2] + 5) + n[1] * (mid[1] >= 20 ? 1 : 0)
    assert.ok(out > 0, `triangle ${t / 3} faces in`)
  }
  assert.equal(Math.max(...Array.from({ length: p.count }, (_, i) => p.getY(i))), 20)
})

test('streets: one quad per segment; labels only for named streets near the hero, never upside down', () => {
  const streets = [{ w: 20, n: 'Mission St', p: [-1000, 800, 1000, 900] }, { w: 6, p: [0, 0, 500, 0] }, { w: 14, n: 'Far St', p: [9000, 0, 9600, 0] }]
  assert.equal(streetGeometry(streets).getIndex()!.count, 3 * 6)
  const labels = streetLabels(streets)
  assert.deepEqual(labels.map((l) => l.name), ['MISSION ST'])
  assert.ok(Math.abs(labels[0].a) <= Math.PI / 2)
})
