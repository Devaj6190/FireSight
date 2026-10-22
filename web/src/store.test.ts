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

test('openFloor: assembled explodes then opens the rooms; exploded opens them now; goToFire lands on the fire', () => {
  const reset = { building: b, phase: 'assembled' as const, target: null, lit: [], rooms: 'off' as const, roomsAfterExplode: false, roomsAt: null, fire: null }
  useStore.setState(reset)
  useStore.getState().openFloor(7)
  assert.equal(useStore.getState().phase, 'exploding')
  assert.equal(useStore.getState().rooms, 'off') // not before the fan lands
  useStore.getState().setPhase('exploded')
  assert.equal(useStore.getState().rooms, 'opening')
  assert.equal(useStore.getState().target, 7)
  useStore.getState().setRooms('on')
  useStore.getState().openFloor(10) // another floor while a plan shows: straight to its plan
  assert.deepEqual([useStore.getState().target, useStore.getState().rooms], [10, 'opening'])

  useStore.setState({ ...reset, fire: { floor: 22, side: 'east', dir: [1, 0] } })
  useStore.getState().goToFire()
  useStore.getState().setPhase('exploded')
  assert.deepEqual([useStore.getState().target, useStore.getState().rooms, useStore.getState().roomsAt], [22, 'opening', 'fire'])

  useStore.setState({ ...reset, phase: 'collapsing' })
  useStore.getState().openFloor(7) // mid-collapse: ignored
  assert.deepEqual([useStore.getState().target, useStore.getState().roomsAfterExplode], [null, false])
})
