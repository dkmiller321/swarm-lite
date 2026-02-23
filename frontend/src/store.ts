import { create } from 'zustand';
import type { Drone } from './types';

interface Store {
  drones: Map<string, Drone>;
  selectedDroneId: string | null;
  connected: boolean;
  setDrones: (drones: Drone[]) => void;
  selectDrone: (id: string | null) => void;
  setConnected: (connected: boolean) => void;
}

export const useStore = create<Store>((set) => ({
  drones: new Map(),
  selectedDroneId: null,
  connected: false,

  setDrones: (drones) =>
    set(() => {
      const map = new Map<string, Drone>();
      for (const d of drones) {
        map.set(d.id, d);
      }
      return { drones: map };
    }),

  selectDrone: (id) => set({ selectedDroneId: id }),
  setConnected: (connected) => set({ connected }),
}));
