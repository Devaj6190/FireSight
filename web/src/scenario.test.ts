/// <reference types="node" />
// node --test src/scenario.test.ts (from web/)
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import type { Building } from '../../shared/building'
import { archPlan } from './archPlan.ts'
import { inside } from './roomPlan.ts'
import { FIRE_TEST, fireFor, fireSide } from './scenario.ts'

const b = JSON.parse(readFileSync(new URL('../public/buildings/sf-3722080.json', import.meta.url), 'utf8')) as Building
const on = (f: number) => b.pins.filter((p) => p.anchor.kind === 'floor' && p.anchor.floor === f)

test('a dispatch side names where on the floor; no side, no fire area', () => {
  assert.equal(fireSide(FIRE_TEST.dispatch)?.side, 'east')
  assert.equal(fireSide('smoke from the north-east corner')?.side, 'northeast')
  assert.equal(fireSide('flames on the western side')?.side, 'west')
  assert.equal(fireSide('smoke at the back side, south wing')?.side, 'south') // "back side" has no compass word
  assert.equal(fireSide('Structure fire, 140 New Montgomery St, smoke reported 22nd floor.'), null)
  assert.equal(fireFor(FIRE_TEST.dispatch, null), null) // no floor named: nothing to draw on
  assert.deepEqual(fireFor(FIRE_TEST.dispatch, 22), { floor: 22, side: 'east', dir: [1, 0] })
})

test('the fire area sits at the named end of the floor, inside the footprint, and never moves the hazard rooms', () => {
  const plain = archPlan(b, 22, on(22))
  const east = archPlan(b, 22, on(22), [1, 0])
  const west = archPlan(b, 22, on(22), [-1, 0])
  assert.equal(plain.fire, undefined)
  assert.deepEqual(east.rooms, plain.rooms)
  assert.ok(east.fire && west.fire)
  assert.ok(east.fire.c[0] > west.fire.c[0] + 30) // the east wing tip, not the west
  assert.ok(inside(east.fire.c, b.footprint))
  assert.equal(east.fire.cells[0].heat, 1)
  assert.deepEqual(archPlan(b, 22, on(22), [1, 0]), east) // deterministic
})
