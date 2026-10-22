/// <reference types="node" />
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { test } from 'node:test'
import * as THREE from 'three'
import type { Building, Pin } from '../../shared/building.ts'
import { cutawayGeometry } from './cutawayGeometry.ts'
import { floorMarkers } from './floorMarkers.ts'
import { floorIncident } from './floorIncident.ts'
import { inside } from './roomPlan.ts'

const dir = new URL('../public/buildings/', import.meta.url)
const buildings = readdirSync(dir).filter(f => f.endsWith('.json')).map(f => JSON.parse(readFileSync(new URL(f, dir), 'utf8')) as Building)
for (const b of buildings) test(`${b.address}: cutaway geometry and annotation anchors remain valid`, () => {
  const model = cutawayGeometry(b.footprint, b.floorHeightM)
  for (const g of Object.values(model)) if (g instanceof THREE.BufferGeometry) {
    const positions = g.getAttribute('position')
    assert.ok(positions && positions.count > 0)
    assert.ok(Array.from(positions.array).every(Number.isFinite))
    g.dispose()
  }
  for (let f = 0; f <= b.floors; f++) {
    const markers = floorMarkers(b, f)
    assert.ok(markers.every(m => inside(m.at, b.footprint)))
    assert.ok(markers.every(m => !m.pin || (m.pin.anchor.kind === 'floor' && m.pin.anchor.floor === f)))
  }
})

test('historical fires and selected floors cannot become current incident locations', () => {
  const b = buildings.find(b => b.id === 'sf-3722080')!
  assert.equal(floorIncident(b, 22).here.length, 0)
  const report: Pin = { id: 'crew-test', layer: 'crew_note', origin: 'crew', severity: 'danger', label: 'Fire reported floor 22', detail: 'Smoke reported', anchor: { kind: 'floor', floor: 22 }, claim: 'unverifiable', evidence: [], stale: false }
  const withReport = { ...b, pins: [...b.pins, report] }
  assert.equal(floorIncident(withReport, 22).here.length, 1)
  assert.equal(floorIncident(withReport, 23).here.length, 0)
  assert.equal(floorIncident({ ...b, pins: [...b.pins, { ...report, label: 'No fire', detail: 'False alarm' }] }, 22).fires.length, 0)
})
