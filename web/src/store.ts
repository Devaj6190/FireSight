// Scene store: Lane D's dispatch box and buttons, and Lane C's answers, drive the 3D through these.
// useStore.getState().focus(22) explodes (if needed) and frames floor 22.
// useStore.getState().highlight(answer.highlight) lights every floor an answer names, keeping the focused floor.
import { create } from 'zustand'
import type { Answer, Building } from '../../shared/building'

export type Phase = 'assembled' | 'exploding' | 'exploded' | 'collapsing' // plan.md s4
export type RoomsPhase = 'off' | 'opening' | 'on' | 'closing' // second level: the focused floor split into rooms

type Store = {
  building?: Building
  phase: Phase
  target: number | null // focused floor, contract numbering: 0 = B1, 1 = ground
  lit: number[] // floors an answer names, sorted; shown full alongside target
  rooms: RoomsPhase
  collapseAfterRooms: boolean // collapse asked while rooms were open: rooms close first, then the floors
  view: number // bumped by resetView: the scene flies the camera back to the framing for the current phase
  setBuilding: (b: Building) => void
  setPhase: (p: Phase) => void
  explode: () => void
  collapse: () => void
  focus: (floor: number | null) => void
  highlight: (h: Answer['highlight']) => void
  toggleRooms: () => void
  setRooms: (r: RoomsPhase) => void
  resetView: () => void
}

export const useStore = create<Store>((set, get) => ({
  phase: 'assembled',
  target: null,
  lit: [],
  rooms: 'off',
  collapseAfterRooms: false,
  view: 0,
  setBuilding: (building) => set({ building }),
  setPhase: (phase) => set({ phase }),
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
  setRooms: (rooms) => {
    set({ rooms })
    if (rooms === 'off' && get().collapseAfterRooms) {
      set({ collapseAfterRooms: false })
      get().collapse()
    }
  },
  resetView: () => set({ view: get().view + 1 }),
}))
