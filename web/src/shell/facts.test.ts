/// <reference types="node" />
// node --test src/shell/facts.test.ts (from web/)
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import type { Building } from '../../../shared/building.ts'
import { compass, constructionFact, counts, floorSummaries, keyFacts, siteOf } from './facts.ts'

const hero = JSON.parse(readFileSync(new URL('../../public/buildings/sf-3722080.json', import.meta.url), 'utf8')) as Building

test('construction code reads as a fire type, wood frame flagged', () => {
  assert.deepEqual(constructionFact('1 (permits, constr type 1)'), { id: 'type', text: 'TYPE I', tone: undefined })
  assert.equal(constructionFact('5 (permits, wood frame (5)); D (assessor)').text, 'TYPE V WOOD')
  assert.equal(constructionFact('5 (permits)').tone, 'danger')
  assert.equal(constructionFact(null).tone, 'unknown')
})

test('header facts come from the snapshot only', () => {
  assert.deepEqual(keyFacts(hero).map(f => f.text), ['26 FL', 'TYPE I', '90% SPRINKLERED', '115 M', 'BUILT 1925', 'B1'])
})

test('counts and the elevator panel', () => {
  const c = counts(hero)
  assert.equal(c.danger + c.caution + c.info, hero.pins.length)
  const floors = floorSummaries(hero)
  assert.equal(floors[0].floor, 26)
  assert.equal(floors.at(-1)!.floor, 0) // B1 exists because a record says basement
  assert.equal(floors.find(f => f.floor === 22)!.danger, 1)
})

test('water sorted nearest first, titles without the distance', () => {
  const { water, wind } = siteOf(hero)
  assert.deepEqual(water.map(s => s.distanceM), [...water.map(s => s.distanceM)].sort((a, b) => a - b))
  assert.ok(water.every(s => !/\d+ M\b/.test(s.title)))
  assert.equal(wind?.dir, 'N')
  assert.equal(compass(342), 'NNW')
})
