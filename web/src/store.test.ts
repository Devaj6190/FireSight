/// <reference types="node" />
// node --test src/store.test.ts (from web/)
import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { Building, Pin } from '../../shared/building'
import { useStore } from './store.ts'

const pin = (id: string, floor: number): Pin => ({ id, anchor: { kind: 'floor', floor } }) as Pin
const b = { floors: 26, pins: [pin('a', 7), pin('b', 22), { id: 'roof', anchor: { kind: 'building' } } as Pin] } as unknown as Building

test('highlight lights answer floors and cited pin floors, keeps target, focus clears', () => {
  useStore.setState({ building: b, phase: 'assembled', target: 22, lit: [] })
  useStore.getState().highlight({ floors: [15, 3, 99, 15], pinIds: ['a', 'roof'] })
  assert.deepEqual(useStore.getState().lit, [3, 7, 15]) // deduped, sorted, 99 is off the model, roof pin has no floor
  assert.equal(useStore.getState().target, 22)
  assert.equal(useStore.getState().phase, 'exploding')
  useStore.getState().highlight({ floors: [], pinIds: ['roof'] }) // nothing to light: keep the last answer
  assert.deepEqual(useStore.getState().lit, [3, 7, 15])
  useStore.getState().focus(10)
  assert.deepEqual(useStore.getState().lit, [])
})

test('openFloor focuses a floor and opens its cutaway, only on the exploded building with no cutaway open', () => {
  useStore.setState({ building: b, phase: 'assembled', target: null, lit: [], rooms: 'off' })
  useStore.getState().openFloor(22)
  assert.equal(useStore.getState().rooms, 'off') // assembled: the tap explodes instead (App.tsx)
  useStore.setState({ phase: 'exploded', target: 7, lit: [3] })
  useStore.getState().openFloor(22)
  assert.equal(useStore.getState().target, 22)
  assert.deepEqual(useStore.getState().lit, [])
  assert.equal(useStore.getState().rooms, 'opening')
  useStore.getState().openFloor(10) // already opening: stays on 22
  assert.equal(useStore.getState().target, 22)
})
