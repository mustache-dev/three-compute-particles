import { useRef, useEffect, useCallback, forwardRef, useImperativeHandle, ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three/webgpu";
import { useVFXStore, ParticleAPI, SpawnOverrides, Range3D, VFXStoreState } from "./useVFXStore";

const { Vector3, Quaternion } = THREE;

const _worldPos = new Vector3();
const _worldQuat = new Quaternion();
const _tempVec = new Vector3();

export interface VFXEmitterProps {
  name?: string;
  particlesRef?: React.RefObject<ParticleAPI | null> | ParticleAPI;
  position?: [number, number, number];
  emitCount?: number;
  delay?: number;
  autoStart?: boolean;
  loop?: boolean;
  localDirection?: boolean;
  direction?: Range3D;
  overrides?: SpawnOverrides | null;
  onEmit?: (data: { position: [number, number, number]; count: number; direction: Range3D | null }) => void;
  children?: ReactNode;
}

export interface VFXEmitterAPI {
  emit: () => boolean;
  burst: (count?: number) => boolean;
  start: () => void;
  stop: () => void;
  isEmitting: boolean;
  getParticleSystem: () => ParticleAPI | undefined;
  group: THREE.Group | undefined;
}

export const VFXEmitter = forwardRef<VFXEmitterAPI, VFXEmitterProps>(function VFXEmitter({
  name,
  particlesRef,
  position = [0, 0, 0],
  emitCount = 10,
  delay = 0,
  autoStart = true,
  loop = true,
  localDirection = false,
  direction,
  overrides = null,
  onEmit,
  children,
}, ref) {
  const groupRef = useRef<THREE.Group>(null);
  const emitAccumulator = useRef(0);
  const emitting = useRef(autoStart);
  const hasEmittedOnce = useRef(false);

  const getParticleSystem = useCallback((): ParticleAPI | undefined => {
    if (particlesRef) {
      if ("current" in particlesRef) {
        return particlesRef.current || undefined;
      }
      return particlesRef as ParticleAPI;
    }
    return useVFXStore.getState().getParticles(name || "");
  }, [name, particlesRef]);

  const transformDirectionByQuat = useCallback((dirRange: Range3D, quat: THREE.Quaternion): Range3D => {
    const minDir = _tempVec.set(dirRange[0][0], dirRange[1][0], dirRange[2][0]);
    minDir.applyQuaternion(quat);

    const maxDir = new Vector3(dirRange[0][1], dirRange[1][1], dirRange[2][1]);
    maxDir.applyQuaternion(quat);

    return [
      [Math.min(minDir.x, maxDir.x), Math.max(minDir.x, maxDir.x)],
      [Math.min(minDir.y, maxDir.y), Math.max(minDir.y, maxDir.y)],
      [Math.min(minDir.z, maxDir.z), Math.max(minDir.z, maxDir.z)],
    ];
  }, []);

  const getEmitParams = useCallback((): { position: [number, number, number]; direction: Range3D | undefined } => {
    if (!groupRef.current) {
      return { position: position, direction: direction };
    }

    let emitDir = direction;

    groupRef.current.getWorldPosition(_worldPos);
    const emitPos: [number, number, number] = [_worldPos.x, _worldPos.y, _worldPos.z];

    if (localDirection && direction) {
      groupRef.current.getWorldQuaternion(_worldQuat);
      emitDir = transformDirectionByQuat(direction, _worldQuat);
    }

    return { position: emitPos, direction: emitDir };
  }, [localDirection, direction, position, transformDirectionByQuat]);

  const emit = useCallback((): boolean => {
    const particles = getParticleSystem();
    if (!particles?.spawn) {
      if (name) {
        console.warn(`VFXEmitter: No particle system found for name "${name}"`);
      }
      return false;
    }

    const { position: emitPos, direction: emitDir } = getEmitParams();
    const [x, y, z] = emitPos;

    const finalOverrides = emitDir
      ? { ...overrides, direction: emitDir }
      : overrides;

    particles.spawn(x, y, z, emitCount, finalOverrides);

    if (onEmit) {
      onEmit({ position: emitPos, count: emitCount, direction: emitDir || null });
    }

    return true;
  }, [getParticleSystem, getEmitParams, name, emitCount, overrides, onEmit]);

  useFrame((_, delta) => {
    if (!emitting.current) return;

    if (!loop && hasEmittedOnce.current) {
      return;
    }

    if (delay <= 0) {
      const success = emit();
      if (success) hasEmittedOnce.current = true;
    } else {
      emitAccumulator.current += delta;

      if (emitAccumulator.current >= delay) {
        emitAccumulator.current -= delay;
        const success = emit();
        if (success) hasEmittedOnce.current = true;
      }
    }
  });

  const start = useCallback(() => {
    emitting.current = true;
    hasEmittedOnce.current = false;
    emitAccumulator.current = 0;
  }, []);

  const stop = useCallback(() => {
    emitting.current = false;
  }, []);

  const burst = useCallback((count?: number): boolean => {
    const particles = getParticleSystem();
    if (!particles?.spawn) return false;

    const { position: emitPos, direction: emitDir } = getEmitParams();
    const [x, y, z] = emitPos;

    const finalOverrides = emitDir
      ? { ...overrides, direction: emitDir }
      : overrides;

    particles.spawn(x, y, z, count ?? emitCount, finalOverrides);

    if (onEmit) {
      onEmit({ position: emitPos, count: count ?? emitCount, direction: emitDir || null });
    }

    return true;
  }, [getParticleSystem, getEmitParams, emitCount, overrides, onEmit]);

  useEffect(() => {
    emitting.current = autoStart;
    if (autoStart) {
      hasEmittedOnce.current = false;
      emitAccumulator.current = 0;
    }
  }, [autoStart]);

  useImperativeHandle(ref, () => ({
    emit,
    burst,
    start,
    stop,
    get isEmitting() { return emitting.current; },
    getParticleSystem,
    get group() { return groupRef.current || undefined; },
  }), [emit, burst, start, stop, getParticleSystem]);

  return (
    <group ref={groupRef} position={position}>
      {children}
    </group>
  );
});

export interface UseVFXEmitterResult {
  emit: (position?: [number, number, number], count?: number, overrides?: SpawnOverrides | null) => boolean;
  burst: (position?: [number, number, number], count?: number, overrides?: SpawnOverrides | null) => boolean;
  start: () => boolean;
  stop: () => boolean;
  clear: () => boolean;
  isEmitting: () => boolean;
  getUniforms: () => Record<string, { value: unknown }> | null;
  getParticles: () => ParticleAPI | undefined;
}

export function useVFXEmitter(name: string): UseVFXEmitterResult {
  const getParticles = useVFXStore((s: VFXStoreState) => s.getParticles);
  const storeEmit = useVFXStore((s: VFXStoreState) => s.emit);
  const storeStart = useVFXStore((s: VFXStoreState) => s.start);
  const storeStop = useVFXStore((s: VFXStoreState) => s.stop);
  const storeClear = useVFXStore((s: VFXStoreState) => s.clear);

  const emit = useCallback(
    (position: [number, number, number] = [0, 0, 0], count: number = 20, overrides: SpawnOverrides | null = null) => {
      const [x, y, z] = position;
      return storeEmit(name, { x, y, z, count, overrides });
    },
    [name, storeEmit]
  );

  const burst = useCallback(
    (position: [number, number, number] = [0, 0, 0], count: number = 50, overrides: SpawnOverrides | null = null) => {
      const [x, y, z] = position;
      return storeEmit(name, { x, y, z, count, overrides });
    },
    [name, storeEmit]
  );

  const start = useCallback(() => storeStart(name), [name, storeStart]);
  const stop = useCallback(() => storeStop(name), [name, storeStop]);
  const clear = useCallback(() => storeClear(name), [name, storeClear]);

  const isEmitting = useCallback(() => {
    const particles = getParticles(name);
    return particles?.isEmitting ?? false;
  }, [name, getParticles]);

  const getUniforms = useCallback(() => {
    const particles = getParticles(name);
    return particles?.uniforms ?? null;
  }, [name, getParticles]);

  return {
    emit,
    burst,
    start,
    stop,
    clear,
    isEmitting,
    getUniforms,
    getParticles: () => getParticles(name),
  };
}

export default VFXEmitter;
