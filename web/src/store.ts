// Scene store: Lane D's dispatch box and buttons, and Lane C's answers, drive the 3D through these.
// useStore.getState().focus(22) explodes (if needed) and frames floor 22.
// useStore.getState().highlight(answer.highlight) lights every floor an answer names, keeping the focused floor.
import { create } from 'zustand'
import type { Answer, Building } from '../../shared/building'
import type { Fire } from './scenario'

export type Phase = 'assembled' | 'exploding' | 'exploded' | 'collapsing' // plan.md s4
export type RoomsPhase = 'off' | 'opening' | 'on' | 'closing' // second level: the focused floor split into rooms
export type Inset = { top: number; right: number; bottom: number; left: number } // px of the canvas the shell's chrome covers

type Store = {
  building?: Building
  phase: Phase
  target: number | null // focused floor, contract numbering: 0 = B1, 1 = ground
  lit: number[] // floors an answer names, sorted; shown full alongside target
  rooms: RoomsPhase
  collapseAfterRooms: boolean // collapse asked while rooms were open: rooms close first, then the floors
  roomsAfterExplode: boolean // a floor tapped on the assembled building: explode first, then open its rooms
  roomsAt: 'fire' | null // the rooms camera lands on the fire area instead of the whole plate
  fire: Fire | null // the fire area a dispatch named (scenario.ts); simulated, never a record
  view: number // bumped by resetView: the scene flies the camera back to the framing for the current phase
  inset: Inset // the camera frames the building in the canvas minus this (the canvas itself never resizes)
  setBuilding: (b: Building) => void
  setPhase: (p: Phase) => void
  explode: () => void
  collapse: () => void
  focus: (floor: number | null) => void
  highlight: (h: Answer['highlight']) => void
  toggleRooms: () => void
  openFloor: (floor: number, at?: 'fire') => void
  goToFire: () => void
  setFire: (fire: Fire | null) => void
  setRooms: (r: RoomsPhase) => void
  resetView: () => void
  setInset: (inset: Inset) => void
}

export const useStore = create<Store>((set, get) => ({
  phase: 'assembled',
  target: null,
  lit: [],
  rooms: 'off',
  collapseAfterRooms: false,
  roomsAfterExplode: false,
  roomsAt: null,
  fire: null,
  view: 0,
  inset: { top: 0, right: 0, bottom: 0, left: 0 },
  setBuilding: (building) => set({ building }),
  setPhase: (phase) => {
    const open = phase === 'exploded' && get().roomsAfterExplode
    set({ phase, ...(open && { rooms: 'opening' as const, roomsAfterExplode: false }) })
  },
  explode: () => void (get().phase === 'assembled' && set({ phase: 'exploding' })),
  collapse: () => {
    if (get().rooms !== 'off') return void set({ rooms: 'closing', collapseAfterRooms: true }) // rooms -> floor -> building
    if (get().phase === 'exploded') set({ phase: 'collapsing', target: null, lit: [] })
  },
  focus: (target) => {
    set({ target, lit: [], ...(target !== get().target && { rooms: 'off' as const }) })
    get().explode()
  },
  // answer floors plus the floors of the pins it cites; building-wide and site pins have no floor to light
  highlight: ({ floors, pinIds }) => {
    const b = get().building
    if (!b) return
    const fromPins = b.pins.flatMap((p) => (p.anchor.kind === 'floor' && pinIds.includes(p.id) ? [p.anchor.floor] : []))
    const lit = [...new Set([...floors, ...fromPins])].filter((f) => f >= 0 && f <= b.floors).sort((x, y) => x - y)
    if (!lit.length) return
    set({ lit, rooms: 'off' })
    get().explode()
  },
  toggleRooms: () => {
    const { phase, target, rooms } = get()
    if (rooms === 'off' && phase === 'exploded' && target !== null) set({ rooms: 'opening' })
    else if (rooms === 'on' || rooms === 'opening') set({ rooms: 'closing', collapseAfterRooms: false })
  },
  // a tap on a floor: straight into its rooms, exploding the building first when it is assembled
  openFloor: (floor, at) => {
    const { phase, target, rooms } = get()
    if (phase === 'collapsing' || (target === floor && rooms !== 'off')) return void set({ roomsAt: at ?? null })
    set({ target: floor, lit: [], roomsAt: at ?? null })
    if (phase === 'exploded') set({ rooms: 'opening', collapseAfterRooms: false })
    else set({ rooms: 'off', roomsAfterExplode: true, ...(phase === 'assembled' && { phase: 'exploding' as const }) })
  },
  goToFire: () => {
    const f = get().fire
    if (f) get().openFloor(f.floor, 'fire')
  },
  setFire: (fire) => set({ fire }),
  setRooms: (rooms) => {
    set({ rooms })
    if (rooms === 'off' && get().collapseAfterRooms) {
      set({ collapseAfterRooms: false })
      get().collapse()
    }
  },
  resetView: () => set({ view: get().view + 1 }),
  setInset: (inset) => {
    const o = get().inset
    if (inset.top !== o.top || inset.right !== o.right || inset.bottom !== o.bottom || inset.left !== o.left) set({ inset })
  },
}))
