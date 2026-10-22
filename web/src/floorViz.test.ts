/// <reference types="node" />
// node --experimental-strip-types --test src/floorViz.test.ts (from web/)
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import type { Building } from '../../shared/building'
import { planFloor } from './roomPlan.ts'
import { floorViz, scatter } from './floorViz.ts'

const b = JSON.parse(readFileSync(new URL('../public/buildings/sf-3722080.json', import.meta.url), 'utf8')) as Building
const plan = (f: number) => planFloor(b, f, b.pins.filter((p) => p.anchor.kind === 'floor' && p.anchor.floor === f))

test('units label distinct cells; crowd matches the occupant load exactly', () => {
  const v = floorViz(b, 1, plan(1))
  const units = [...v.cells.values()].map((c) => c.unit)
  assert.equal(new Set(units).size, units.length)
  assert.equal(units.length + v.unplaced.length, b.floorFacts!.find((f) => f.floor === 1)!.units.length)
  const dots = scatter(plan(1), v.people, 'x')
  assert.equal([...dots.values()].reduce((s, d) => s + d.length, 0), v.people)
})

test('without the optional fields nothing extra is drawn', () => {
  const bare = { ...b, floorFacts: b.floorFacts!.map(({ unitWork, openPermits, recentKinds, occupants, planning, ...f }) => f) }
  const v = floorViz(bare, 20, plan(20))
  assert.equal(v.cats.length, 0)
  assert.equal(v.anyOpen, false)
  assert.equal(v.occupants.size, 0)
  assert.equal(floorViz({ ...b, floorFacts: undefined }, 20, plan(20)).cells.size, 0)
})

test('occupants land on their unit cell, else a free cell', () => {
  const f20 = b.floorFacts!.find((f) => f.floor === 20)!
  const occupants = [
    { kind: 'Employee cafeteria', hazard: 'Cooking', unit: '2025', source: 'x', datasetId: 'd', recordId: '1', url: '' },
    { kind: 'Office', hazard: null, unit: null, source: 'x', datasetId: 'd', recordId: '2', url: '' },
  ]
  const v = floorViz({ ...b, floorFacts: [{ ...f20, occupants }] }, 20, plan(20))
  const where = (k: string) => [...v.occupants].find(([, os]) => os.some((o) => o.kind === k))![0]
  assert.equal(v.cells.get(where('Employee cafeteria'))!.unit, '2025')
  assert.equal(v.cells.has(where('Office')), false)
})
