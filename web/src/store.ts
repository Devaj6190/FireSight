// Scene store: Lane D's dispatch box and buttons, and Lane C's answers, drive the 3D through these.
// useStore.getState().focus(22) explodes (if needed) and frames floor 22.
import { create } from 'zustand'
import type { Building } from '../../shared/building'

export type Phase = 'assembled' | 'exploding' | 'exploded' | 'collapsing' // plan.md s4

type Store = {
  building?: Building
  phase: Phase
  target: number | null // focused floor, contract numbering: 0 = B1, 1 = ground
  setBuilding: (b: Building) => void
  setPhase: (p: Phase) => void
  explode: () => void
  collapse: () => void
  focus: (floor: number | null) => void
}

export const useStore = create<Store>((set, get) => ({
  phase: 'assembled',
  target: null,
  setBuilding: (building) => set({ building }),
  setPhase: (phase) => set({ phase }),
  explode: () => void (get().phase === 'assembled' && set({ phase: 'exploding' })),
  collapse: () => void (get().phase === 'exploded' && set({ phase: 'collapsing', target: null })),
  focus: (target) => {
    set({ target })
    get().explode()
  },
}))
