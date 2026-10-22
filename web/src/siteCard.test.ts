/// <reference types="node" />
// node --import ./api/node_modules/tsx/dist/loader.mjs --test web/src/siteCard.test.ts (from the repo root)
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import type { Building } from '../../shared/building.ts'
import {
  compassWord, entrances, faces, hydrantOf, isOffice, nearestHydrants, officeCeiling, shortStreet, sqft, windOf,
} from './shell/siteCard.ts'

const load = (id: string) => JSON.parse(readFileSync(new URL(`../public/buildings/${id}.json`, import.meta.url), 'utf8')) as Building
const hero = load('sf-3722080')
const haight = load('sf-1244030')

test('compass word from bearing', () => {
  assert.equal(compassWord(0), 'north')
  assert.equal(compassWord(40), 'northeast')
  assert.equal(compassWord(342), 'north-northwest')
  assert.equal(compassWord(123), 'east-southeast')
  assert.equal(compassWord(360), 'north')
  assert.equal(compassWord(-90), 'west')
  assert.equal(compassWord(224, 8), 'southwest')
  assert.equal(compassWord(351, 8), 'north')
})

test('hydrant pins: distance, direction, kind and source parsed; other water pins ignored', () => {
  const pins = hero.pins.filter((p) => p.layer === 'water')
  const hp = pins.find((p) => p.label === 'AWSS HIGH-PRESSURE HYDRANT 40 M NE')!
  assert.deepEqual(
    { ...hydrantOf(hp)!, url: '' },
    { highPressure: true, distanceM: 40, dir: 'northeast', source: 'SF DEM Firefighting ESF-4', year: '2018', stale: true, url: '' },
  )
  assert.equal(hydrantOf(pins.find((p) => p.label === 'FIRE ALARM')!), null)
  assert.equal(hydrantOf(pins.find((p) => p.label.startsWith('CISTERN'))!), null)
  // no anchor distance: falls back to the label text
  const noGround = { ...hp, anchor: { kind: 'building' as const } }
  assert.equal(hydrantOf(noGround)!.distanceM, 40)
  assert.equal(hydrantOf(noGround)!.dir, 'northeast')
})

test('nearest hydrant and nearest high-pressure hydrant', () => {
  const { nearest, highPressure } = nearestHydrants(haight.pins)
  assert.equal(nearest!.distanceM, 41)
  assert.equal(nearest!.highPressure, false)
  assert.equal(highPressure!.distanceM, 79)
  assert.equal(highPressure!.dir, 'northeast')
  assert.deepEqual(nearestHydrants([]), { nearest: null, highPressure: null })
})

test('wind line from the wind pin', () => {
  const w = windOf(hero.pins.find((p) => p.layer === 'wind'))!
  assert.equal(w.mph, 6)
  assert.equal(w.from, 'west-southwest')
  assert.equal(w.to, 'east-northeast')
  assert.equal(windOf(undefined), null)
})

test('square feet and the office ceiling', () => {
  assert.equal(sqft(1284), 13821)
  assert.equal(officeCeiling(1284), 92) // 13,821 / 150 = 92.1
  assert.equal(isOffice(hero.use), true)
  assert.equal(isOffice(haight.use), false)
  assert.equal(isOffice(null), false)
})

test('faces group streets by 8-point side', () => {
  const f = faces(hero.site!)
  assert.deepEqual(f.find((x) => x.side === 'Southeast')!.streets, ['New Montgomery Street', 'Natoma Street'])
  assert.deepEqual(f.find((x) => x.side === 'Northwest')!.streets, ['Minna Street'])
  assert.deepEqual(faces(haight.site!).map((x) => x.side), ['North', 'East', 'South', 'West'])
  assert.deepEqual(faces({ ...hero.site!, sides: [] }), [])
  assert.equal(shortStreet('New Montgomery Street'), 'New Montgomery St')
})

test('entrances: kind named when not generic, street from the nearest face, empty when none', () => {
  const lines = entrances(hero)
  assert.ok(lines.length >= 1 && lines.every((l) => l.text.startsWith('Parking entrance on ')))
  assert.equal(lines.reduce((n, l) => n + l.count, 0), 3)
  assert.deepEqual(entrances(haight), [])
  // plain entrance, no street data: falls back to the compass side
  const plain = { footprint: hero.footprint, site: { ...hero.site!, sides: [], entrances: [{ x: -40, y: 0, kind: 'yes', source: 'OpenStreetMap', url: '' }] } }
  assert.deepEqual(entrances(plain).map((l) => l.text), ['Entrance on the west side'])
})
