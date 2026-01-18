/* eslint-disable @typescript-eslint/no-explicit-any */

import { create } from "zustand";


export interface ParticleAPI {
  spawn: (x?: number, y?: number, z?: number, count?: number, overrides?: SpawnOverrides | null) => void;
  start: () => void;
  stop: () => void;
  clear: () => void;
  isEmitting: boolean;
  uniforms: Record<string, { value: unknown }>;
}

export interface SpawnOverrides {
  size?: number | [number, number];
  speed?: number | [number, number];
  lifetime?: number | [number, number];
  direction?: Range3D | [number, number] | number;
  startPosition?: Range3D | [number, number] | number;
  gravity?: [number, number, number];
  colorStart?: string[];
  colorEnd?: string[];
  rotation?: Range3D | [number, number] | number;
}

export type Range3D = [[number, number], [number, number], [number, number]];

export interface VFXStoreState {
  particles: Map<string, ParticleAPI>;
  registerParticles: (name: string, api: ParticleAPI) => void;
  unregisterParticles: (name: string) => void;
  getParticles: (name: string) => ParticleAPI | undefined;
  emit: (name: string, options: { x: number; y: number; z: number; count: number; overrides?: SpawnOverrides | null }) => boolean;
  start: (name: string) => boolean;
  stop: (name: string) => boolean;
  clear: (name: string) => boolean;
}

export const useVFXStore = create<VFXStoreState>((set: any, get: any) => ({
  particles: new Map(),

  registerParticles: (name: string, api: ParticleAPI) => {
    set((state: VFXStoreState) => {
      const particles = new Map(state.particles);
      particles.set(name, api);
      return { particles };
    });
  },

  unregisterParticles: (name: string) => {
    set((state: VFXStoreState) => {
      const particles = new Map(state.particles);
      particles.delete(name);
      return { particles };
    });
  },

  getParticles: (name: string) => {
    return get().particles.get(name);
  },

  emit: (name: string, { x, y, z, count, overrides }: { x: number; y: number; z: number; count: number; overrides?: SpawnOverrides | null }) => {
    const api = get().particles.get(name);
    if (!api) return false;
    api.spawn(x, y, z, count, overrides);
    return true;
  },

  start: (name: string) => {
    const api = get().particles.get(name);
    if (!api) return false;
    api.start();
    return true;
  },

  stop: (name: string) => {
    const api = get().particles.get(name);
    if (!api) return false;
    api.stop();
    return true;
  },

  clear: (name: string) => {
    const api = get().particles.get(name);
    if (!api) return false;
    api.clear();
    return true;
  },
}));
