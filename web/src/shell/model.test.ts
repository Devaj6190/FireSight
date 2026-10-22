/// <reference types="node" />
// Run from the repo root: node --import ./api/node_modules/tsx/dist/loader.mjs --test web/src/shell/model.test.ts
import test from 'node:test'
import assert from 'node:assert/strict'
import type { Building } from '../../../shared/building.ts'
import { dispatchBuilding, dispatchPin, floorLabel, HERO_DISPATCH, sourceUrl } from './model.ts'

const tower = { floors: 26 } as Building

test('hero dispatch selects the right building and floor', () => {
  assert.equal(dispatchBuilding(HERO_DISPATCH), 'sf-3722080')
  assert.deepEqual(dispatchPin(HERO_DISPATCH, tower).anchor, { kind: 'floor', floor: 22 })
})
test('CAD floor abbreviations preserve floor 22', () => {
  for (const line of ['smoke fl 22', 'smoke fl. 22', 'smoke floor 22', 'smoke 22nd floor']) {
    assert.deepEqual(dispatchPin(line, tower).anchor, { kind: 'floor', floor: 22 })
  }
})
test('alternate addresses resolve to the same cached building', () => {
  for (const address of ['138 New Montgomery St', '140 New Montgomery Street']) assert.equal(dispatchBuilding(`Structure fire, ${address}, floor 22`), 'sf-3722080')
  assert.equal(dispatchBuilding('Structure fire, 50 Church St, unit 311'), 'sf-0874003')
  assert.equal(dispatchBuilding('Structure fire, 400 Duboce Avenue, unit 311'), 'sf-0874003')
})
test('unknown addresses are distinguished from a dispatch without an address', () => {
  assert.equal(dispatchBuilding('Structure fire, 999 Unknown St, floor 2'), '')
  assert.equal(dispatchBuilding('smoke floor 22'), null)
})
test('out-of-range floors remain building-level; basement remains B1', () => {
  assert.deepEqual(dispatchPin('floor 99', tower).anchor, { kind: 'building' })
  const p = dispatchPin('smoke in basement', tower)
  assert.deepEqual(p.anchor, { kind: 'floor', floor: 0 })
  assert.equal(floorLabel(p), 'B1')
})
test('provenance links allow only web URLs', () => {
  assert.equal(sourceUrl('https://data.sf.gov/resource/893e-xam6.json'), 'https://data.sf.gov/resource/893e-xam6.json')
  for (const url of ['javascript:alert(1)', 'data:text/html,test', '', 'file:///etc/passwd']) assert.equal(sourceUrl(url), undefined)
})
