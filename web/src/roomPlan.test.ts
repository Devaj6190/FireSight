/// <reference types="node" />
// node --test src/rooms.test.ts (from web/)
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import type { Building } from '../../shared/building'
import { area, planFloor } from './roomPlan.ts'

const b = JSON.parse(readFileSync(new URL('../public/buildings/sf-3722080.json', import.meta.url), 'utf8')) as Building
const on = (f: number) => b.pins.filter((p) => p.anchor.kind === 'floor' && p.anchor.floor === f)

test('same building and floor give the same plan; rooms tile the footprint', () => {
  assert.deepEqual(planFloor(b, 22, on(22)), planFloor(b, 22, on(22)))
  const plan = planFloor(b, 22, on(22))
  const sum = plan.rooms.reduce((s, r) => s + r.area, 0)
  assert.ok(Math.abs(sum - Math.abs(area(b.footprint))) < 20)
  assert.equal(plan.rooms.filter((r) => r.kind === 'core').length, 1)
})

test('only cited records name rooms; every floor pin lands in a room', () => {
  const named = (f: number) => planFloor(b, f, on(f)).rooms.filter((r) => r.kind === 'named').map((r) => r.name)
  assert.deepEqual(named(22), ['COMPUTER ROOM'])
  assert.deepEqual(named(0), ['FIRE PUMP / GENERATOR RM'])
  assert.deepEqual(named(18), ['SERVER ROOM'])
  assert.deepEqual(named(1), ['ASSEMBLY SPACE'])
  assert.deepEqual(named(7), [])
  // a dispatch pin that says "computer room" is not a record: it sits in generic space
  const dispatch = { ...on(22)[0], id: 'dispatch-1', origin: 'dispatch' as const, claim: 'unverifiable' as const, evidence: [] }
  const plan = planFloor(b, 22, [...on(22), dispatch])
  assert.equal(plan.rooms.find((r) => r.pins.some((p) => p.id === 'dispatch-1'))!.kind, 'space')
  assert.equal(plan.rooms.flatMap((r) => r.pins).length, on(22).length + 1)
})
