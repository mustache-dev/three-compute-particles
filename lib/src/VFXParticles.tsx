import { forwardRef, useImperativeHandle, useEffect, useRef, useMemo, useCallback, useState, ReactNode } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three/webgpu";
import {
  Fn,
  If,
  uniform,
  float,
  uv,
  vec2,
  vec3,
  vec4,
  hash,
  mix,
  floor,
  step,
  mod,
  texture,
  instancedArray,
  instanceIndex,
  positionLocal,
  cos,
  sin,
  atan,
  sqrt,
  acos,
  PI,
  mx_noise_vec3,
  screenUV,
  viewportDepthTexture,
  positionView,
  cameraNear,
  cameraFar,
  clamp,
} from "three/tsl";
import { useVFXStore, ParticleAPI, SpawnOverrides, Range3D } from "./useVFXStore";

type ShaderNodeObject<T> = any;
type Node = any;

export const Appearance = Object.freeze({
  DEFAULT: "default" as const,
  GRADIENT: "gradient" as const,
  CIRCULAR: "circular" as const,
});

export type AppearanceType = (typeof Appearance)[keyof typeof Appearance];

export const Blending = Object.freeze({
  NORMAL: THREE.NormalBlending,
  ADDITIVE: THREE.AdditiveBlending,
  MULTIPLY: THREE.MultiplyBlending,
  SUBTRACTIVE: THREE.SubtractiveBlending,
});

export type BlendingType = (typeof Blending)[keyof typeof Blending];

export const EmitterShape = Object.freeze({
  POINT: 0 as const,
  BOX: 1 as const,
  SPHERE: 2 as const,
  CONE: 3 as const,
  DISK: 4 as const,
  EDGE: 5 as const,
});

export type EmitterShapeType = (typeof EmitterShape)[keyof typeof EmitterShape];

export const AttractorType = Object.freeze({
  POINT: 0 as const,
  VORTEX: 1 as const,
});

export type AttractorTypeValue = (typeof AttractorType)[keyof typeof AttractorType];

export const Easing = Object.freeze({
  LINEAR: 0 as const,
  EASE_IN: 1 as const,
  EASE_OUT: 2 as const,
  EASE_IN_OUT: 3 as const,
});

export type EasingType = (typeof Easing)[keyof typeof Easing];

export const Lighting = Object.freeze({
  BASIC: "basic" as const,
  STANDARD: "standard" as const,
  PHYSICAL: "physical" as const,
});

export type LightingType = (typeof Lighting)[keyof typeof Lighting];

export interface CurvePoint {
  pos: [number, number];
  handleIn?: [number, number];
  handleOut?: [number, number];
}

export interface CurveData {
  points: CurvePoint[];
}

export interface FrictionConfig {
  intensity: number | [number, number];
  easing?: "linear" | "easeIn" | "easeOut" | "easeInOut";
}

export interface TurbulenceConfig {
  intensity: number;
  frequency: number;
  speed: number;
}

export interface AttractorConfig {
  position: [number, number, number];
  strength: number;
  radius?: number;
  type?: "point" | "vortex";
  axis?: [number, number, number];
}

export interface CollisionConfig {
  plane: { y: number };
  bounce?: number;
  friction?: number;
  die?: boolean;
  sizeBasedGravity?: number;
}

export interface FlipbookConfig {
  rows: number;
  columns: number;
}

export interface StretchConfig {
  factor: number;
  maxStretch: number;
}

export interface ParticleData {
  progress: ShaderNodeObject<Node>;
  lifetime: ShaderNodeObject<Node>;
  position: ShaderNodeObject<Node>;
  velocity: ShaderNodeObject<Node>;
  size: ShaderNodeObject<Node>;
  rotation: ShaderNodeObject<Node>;
  colorStart: ShaderNodeObject<Node>;
  colorEnd: ShaderNodeObject<Node>;
  color: ShaderNodeObject<Node>;
  intensifiedColor: ShaderNodeObject<Node>;
  shapeMask: ShaderNodeObject<Node>;
  index: ShaderNodeObject<Node>;
}

export type NodeFunction = (data: ParticleData, defaultColor?: ShaderNodeObject<Node>) => ShaderNodeObject<Node>;

export interface VFXParticlesProps {
  name?: string;
  maxParticles?: number;
  size?: number | [number, number];
  colorStart?: string[];
  colorEnd?: string[] | null;
  fadeSize?: number | [number, number];
  fadeSizeCurve?: CurveData | null;
  fadeOpacity?: number | [number, number];
  fadeOpacityCurve?: CurveData | null;
  velocityCurve?: CurveData | null;
  gravity?: [number, number, number];
  lifetime?: number | [number, number];
  direction?: Range3D | [number, number] | number;
  startPosition?: Range3D | [number, number] | number;
  speed?: number | [number, number];
  friction?: FrictionConfig;
  appearance?: AppearanceType;
  alphaMap?: THREE.Texture | null;
  flipbook?: FlipbookConfig | null;
  rotation?: Range3D | [number, number] | number;
  rotationSpeed?: Range3D | [number, number] | number;
  rotationSpeedCurve?: CurveData | null;
  geometry?: THREE.BufferGeometry | null;
  orientToDirection?: boolean;
  orientAxis?: "x" | "y" | "z" | "-x" | "-y" | "-z" | "+x" | "+y" | "+z";
  stretchBySpeed?: StretchConfig | null;
  lighting?: LightingType;
  shadow?: boolean;
  blending?: BlendingType;
  intensity?: number;
  position?: [number, number, number];
  autoStart?: boolean;
  delay?: number;
  backdropNode?: ShaderNodeObject<Node> | NodeFunction | null;
  opacityNode?: ShaderNodeObject<Node> | NodeFunction | null;
  colorNode?: ShaderNodeObject<Node> | NodeFunction | null;
  alphaTestNode?: ShaderNodeObject<Node> | NodeFunction | null;
  castShadowNode?: ShaderNodeObject<Node> | NodeFunction | null;
  emitCount?: number;
  emitterShape?: EmitterShapeType;
  emitterRadius?: number | [number, number];
  emitterAngle?: number;
  emitterHeight?: number | [number, number];
  emitterSurfaceOnly?: boolean;
  emitterDirection?: [number, number, number];
  turbulence?: TurbulenceConfig | null;
  attractors?: AttractorConfig[] | null;
  attractToCenter?: boolean;
  startPositionAsDirection?: boolean;
  softParticles?: boolean;
  softDistance?: number;
  collision?: CollisionConfig | null;
  children?: ReactNode;
}

const MAX_ATTRACTORS = 4;
const CURVE_RESOLUTION = 256;

const hexToRgb = (hex: string): [number, number, number] => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [parseInt(result[1], 16) / 255, parseInt(result[2], 16) / 255, parseInt(result[3], 16) / 255]
    : [1, 1, 1];
};

const toRange = (value: number | [number, number] | undefined | null, defaultVal: [number, number] = [0, 0]): [number, number] => {
  if (value === undefined || value === null) return defaultVal;
  if (Array.isArray(value)) return value.length === 2 ? value : [value[0], value[0]];
  return [value, value];
};

const easingToType = (easing: string | number | undefined): number => {
  if (typeof easing === "number") return easing;
  switch (easing) {
    case "easeIn": return 1;
    case "easeOut": return 2;
    case "easeInOut": return 3;
    default: return 0;
  }
};

const axisToNumber = (axis: string | undefined): number => {
  switch (axis) {
    case "x": case "+x": case "X": case "+X": return 0;
    case "y": case "+y": case "Y": case "+Y": return 1;
    case "z": case "+z": case "Z": case "+Z": return 2;
    case "-x": case "-X": return 3;
    case "-y": case "-Y": return 4;
    case "-z": case "-Z": return 5;
    default: return 2;
  }
};

const evaluateBezierSegment = (t: number, p0: [number, number], p1: [number, number], h0Out?: [number, number], h1In?: [number, number]): [number, number] => {
  const cp0 = p0;
  const cp1: [number, number] = [p0[0] + (h0Out?.[0] || 0), p0[1] + (h0Out?.[1] || 0)];
  const cp2: [number, number] = [p1[0] + (h1In?.[0] || 0), p1[1] + (h1In?.[1] || 0)];
  const cp3 = p1;

  const mt = 1 - t;
  const mt2 = mt * mt;
  const mt3 = mt2 * mt;
  const t2 = t * t;
  const t3 = t2 * t;

  return [
    mt3 * cp0[0] + 3 * mt2 * t * cp1[0] + 3 * mt * t2 * cp2[0] + t3 * cp3[0],
    mt3 * cp0[1] + 3 * mt2 * t * cp1[1] + 3 * mt * t2 * cp2[1] + t3 * cp3[1],
  ];
};

const sampleCurveAtX = (x: number, points: CurvePoint[]): number => {
  if (!points || points.length < 2) return x;
  if (!points[0]?.pos || !points[points.length - 1]?.pos) return x;

  let segmentIdx = 0;
  for (let i = 0; i < points.length - 1; i++) {
    if (points[i]?.pos && points[i + 1]?.pos && x >= points[i].pos[0] && x <= points[i + 1].pos[0]) {
      segmentIdx = i;
      break;
    }
  }

  const p0 = points[segmentIdx];
  const p1 = points[segmentIdx + 1];
  if (!p0?.pos || !p1?.pos) return x;

  let tLow = 0, tHigh = 1, t = 0.5;
  for (let iter = 0; iter < 20; iter++) {
    const [px] = evaluateBezierSegment(t, p0.pos, p1.pos, p0.handleOut, p1.handleIn);
    if (Math.abs(px - x) < 0.0001) break;
    if (px < x) tLow = t;
    else tHigh = t;
    t = (tLow + tHigh) / 2;
  }

  const [, py] = evaluateBezierSegment(t, p0.pos, p1.pos, p0.handleOut, p1.handleIn);
  return Math.max(-0.5, Math.min(1.5, py));
};

export const bakeCurveToArray = (curveData: CurveData | null | undefined, resolution: number = CURVE_RESOLUTION): Float32Array => {
  const data = new Float32Array(resolution);

  if (!curveData?.points || !Array.isArray(curveData.points) || curveData.points.length < 2) {
    for (let i = 0; i < resolution; i++) {
      data[i] = 1 - i / (resolution - 1);
    }
    return data;
  }

  const firstPoint = curveData.points[0];
  const lastPoint = curveData.points[curveData.points.length - 1];
  if (!firstPoint?.pos || !lastPoint?.pos || !Array.isArray(firstPoint.pos) || !Array.isArray(lastPoint.pos)) {
    for (let i = 0; i < resolution; i++) {
      data[i] = 1 - i / (resolution - 1);
    }
    return data;
  }

  for (let i = 0; i < resolution; i++) {
    const x = i / (resolution - 1);
    data[i] = sampleCurveAtX(x, curveData.points);
  }

  return data;
};

export const createCombinedCurveTexture = (
  sizeCurve: CurveData | null | undefined,
  opacityCurve: CurveData | null | undefined,
  velocityCurve: CurveData | null | undefined,
  rotationSpeedCurve: CurveData | null | undefined
): THREE.DataTexture => {
  const sizeData = bakeCurveToArray(sizeCurve);
  const opacityData = bakeCurveToArray(opacityCurve);
  const velocityData = bakeCurveToArray(velocityCurve);
  const rotationSpeedData = bakeCurveToArray(rotationSpeedCurve);

  const rgba = new Float32Array(CURVE_RESOLUTION * 4);
  for (let i = 0; i < CURVE_RESOLUTION; i++) {
    rgba[i * 4] = sizeData[i];
    rgba[i * 4 + 1] = opacityData[i];
    rgba[i * 4 + 2] = velocityData[i];
    rgba[i * 4 + 3] = rotationSpeedData[i];
  }

  const tex = new THREE.DataTexture(rgba, CURVE_RESOLUTION, 1, THREE.RGBAFormat, THREE.FloatType);
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.needsUpdate = true;
  return tex;
};

const toRotation3D = (value: Range3D | [number, number] | number | undefined | null): Range3D => {
  if (value === undefined || value === null) return [[0, 0], [0, 0], [0, 0]];
  if (typeof value === "number") return [[value, value], [value, value], [value, value]];
  if (Array.isArray(value)) {
    if (Array.isArray(value[0])) {
      return [
        toRange(value[0] as [number, number], [0, 0]),
        toRange(value[1] as [number, number], [0, 0]),
        toRange(value[2] as [number, number], [0, 0]),
      ];
    }
    const range = toRange(value as [number, number], [0, 0]);
    return [range, range, range];
  }
  return [[0, 0], [0, 0], [0, 0]];
};

export const VFXParticles = forwardRef<ParticleAPI, VFXParticlesProps>(function VFXParticles(
  {
    name,
    maxParticles = 10000,
    size = [0.1, 0.3],
    colorStart = ["#ffffff"],
    colorEnd = null,
    fadeSize = [1, 0],
    fadeSizeCurve = null,
    fadeOpacity = [1, 0],
    fadeOpacityCurve = null,
    velocityCurve = null,
    gravity = [0, 0, 0],
    lifetime = [1, 2],
    direction = [[-1, 1], [0, 1], [-1, 1]],
    startPosition = [[0, 0], [0, 0], [0, 0]],
    speed = [0.1, 0.1],
    friction = { intensity: 0, easing: "linear" },
    appearance = Appearance.GRADIENT,
    alphaMap = null,
    flipbook = null,
    rotation = [0, 0],
    rotationSpeed = [0, 0],
    rotationSpeedCurve = null,
    geometry = null,
    orientToDirection = false,
    orientAxis = "z",
    stretchBySpeed = null,
    lighting = Lighting.STANDARD,
    shadow = false,
    blending = Blending.NORMAL,
    intensity = 1,
    position = [0, 0, 0],
    autoStart = true,
    delay = 0,
    backdropNode = null,
    opacityNode = null,
    colorNode = null,
    alphaTestNode = null,
    castShadowNode = null,
    emitCount = 1,
    emitterShape = EmitterShape.BOX,
    emitterRadius = [0, 1],
    emitterAngle = Math.PI / 4,
    emitterHeight = [0, 1],
    emitterSurfaceOnly = false,
    emitterDirection = [0, 1, 0],
    turbulence = null,
    attractors = null,
    attractToCenter = false,
    startPositionAsDirection = false,
    softParticles = false,
    softDistance = 0.5,
    collision = null,
  },
  ref
) {
  const { gl: renderer } = useThree();
  const spriteRef = useRef<THREE.Sprite | THREE.InstancedMesh>(null);
  const initialized = useRef(false);
  const nextIndex = useRef(0);
  const [emitting, setEmitting] = useState(autoStart);
  const emitAccumulator = useRef(0);

  const delayRef = useRef(delay);
  const emitCountRef = useRef(emitCount);
  const turbulenceRef = useRef(turbulence);

  const [activeMaxParticles, setActiveMaxParticles] = useState(maxParticles);
  const [activeLighting, setActiveLighting] = useState(lighting);
  const [activeAppearance, setActiveAppearance] = useState(appearance);
  const [activeOrientToDirection, setActiveOrientToDirection] = useState(orientToDirection);
  const [activeGeometry, setActiveGeometry] = useState(geometry);
  const [activeShadow, setActiveShadow] = useState(shadow);
  const [activeFadeSizeCurve, setActiveFadeSizeCurve] = useState(fadeSizeCurve);
  const [activeFadeOpacityCurve, setActiveFadeOpacityCurve] = useState(fadeOpacityCurve);
  const [activeVelocityCurve, setActiveVelocityCurve] = useState(velocityCurve);
  const [activeRotationSpeedCurve, setActiveRotationSpeedCurve] = useState(rotationSpeedCurve);

  useEffect(() => {
    delayRef.current = delay;
    emitCountRef.current = emitCount;
    turbulenceRef.current = turbulence;
  }, [delay, emitCount, turbulence]);

  useEffect(() => {
    setActiveMaxParticles(maxParticles);
    setActiveLighting(lighting);
    setActiveAppearance(appearance);
    setActiveOrientToDirection(orientToDirection);
    setActiveGeometry(geometry);
    setActiveShadow(shadow);
    setActiveFadeSizeCurve(fadeSizeCurve);
    setActiveFadeOpacityCurve(fadeOpacityCurve);
    setActiveVelocityCurve(velocityCurve);
    setActiveRotationSpeedCurve(rotationSpeedCurve);
  }, [maxParticles, lighting, appearance, orientToDirection, geometry, shadow, fadeSizeCurve, fadeOpacityCurve, velocityCurve, rotationSpeedCurve]);

  const lifetimeToFadeRate = (seconds: number) => 1 / seconds;

  const sizeRange = useMemo(() => toRange(size, [0.1, 0.3]), [size]);
  const speedRange = useMemo(() => toRange(speed, [0.1, 0.1]), [speed]);
  const fadeSizeRange = useMemo(() => toRange(fadeSize, [1, 0]), [fadeSize]);
  const fadeOpacityRange = useMemo(() => toRange(fadeOpacity, [1, 0]), [fadeOpacity]);

  const curveTexture = useMemo(() => {
    return createCombinedCurveTexture(activeFadeSizeCurve, activeFadeOpacityCurve, activeVelocityCurve, activeRotationSpeedCurve);
  }, [activeFadeSizeCurve, activeFadeOpacityCurve, activeVelocityCurve, activeRotationSpeedCurve]);

  const prevCurveTextureRef = useRef<THREE.DataTexture | null>(null);
  useEffect(() => {
    if (prevCurveTextureRef.current && prevCurveTextureRef.current !== curveTexture) {
      prevCurveTextureRef.current.dispose();
    }
    prevCurveTextureRef.current = curveTexture;

    return () => {
      if (curveTexture) {
        curveTexture.dispose();
      }
    };
  }, [curveTexture]);

  const lifetimeRange = useMemo(() => toRange(lifetime, [1, 2]), [lifetime]);
  const rotation3D = useMemo(() => toRotation3D(rotation), [rotation]);
  const rotationSpeed3D = useMemo(() => toRotation3D(rotationSpeed), [rotationSpeed]);
  const direction3D = useMemo(() => toRotation3D(direction), [direction]);
  const startPosition3D = useMemo(() => toRotation3D(startPosition), [startPosition]);
  const emitterRadiusRange = useMemo(() => toRange(emitterRadius, [0, 1]), [emitterRadius]);
  const emitterHeightRange = useMemo(() => toRange(emitterHeight, [0, 1]), [emitterHeight]);

  const frictionIntensityRange = useMemo(() => {
    if (typeof friction === "object" && friction !== null && "intensity" in friction) {
      return toRange(friction.intensity, [0, 0]);
    }
    return [0, 0] as [number, number];
  }, [friction]);

  const frictionEasingType = useMemo(() => {
    if (typeof friction === "object" && friction !== null && "easing" in friction) {
      return easingToType(friction.easing);
    }
    return 0;
  }, [friction]);

  const startColors = useMemo(() => {
    const colors = colorStart.slice(0, 8).map(hexToRgb);
    while (colors.length < 8) colors.push(colors[colors.length - 1] || [1, 1, 1]);
    return colors;
  }, [colorStart]);

  const effectiveColorEnd = colorEnd ?? colorStart;

  const endColors = useMemo(() => {
    const colors = effectiveColorEnd.slice(0, 8).map(hexToRgb);
    while (colors.length < 8) colors.push(colors[colors.length - 1] || [1, 1, 1]);
    return colors;
  }, [effectiveColorEnd]);

  const uniforms = useMemo(
    () => ({
      sizeMin: uniform(sizeRange[0]),
      sizeMax: uniform(sizeRange[1]),
      fadeSizeStart: uniform(fadeSizeRange[0]),
      fadeSizeEnd: uniform(fadeSizeRange[1]),
      fadeOpacityStart: uniform(fadeOpacityRange[0]),
      fadeOpacityEnd: uniform(fadeOpacityRange[1]),
      gravity: uniform(new THREE.Vector3(...gravity)),
      frictionIntensityStart: uniform(frictionIntensityRange[0]),
      frictionIntensityEnd: uniform(frictionIntensityRange[1]),
      frictionEasingType: uniform(frictionEasingType),
      speedMin: uniform(speedRange[0]),
      speedMax: uniform(speedRange[1]),
      lifetimeMin: uniform(lifetimeToFadeRate(lifetimeRange[1])),
      lifetimeMax: uniform(lifetimeToFadeRate(lifetimeRange[0])),
      deltaTime: uniform(0.016),
      dirMinX: uniform(direction3D[0][0]),
      dirMaxX: uniform(direction3D[0][1]),
      dirMinY: uniform(direction3D[1][0]),
      dirMaxY: uniform(direction3D[1][1]),
      dirMinZ: uniform(direction3D[2][0]),
      dirMaxZ: uniform(direction3D[2][1]),
      startPosMinX: uniform(startPosition3D[0][0]),
      startPosMaxX: uniform(startPosition3D[0][1]),
      startPosMinY: uniform(startPosition3D[1][0]),
      startPosMaxY: uniform(startPosition3D[1][1]),
      startPosMinZ: uniform(startPosition3D[2][0]),
      startPosMaxZ: uniform(startPosition3D[2][1]),
      spawnPosition: uniform(new THREE.Vector3(...position)),
      spawnIndexStart: uniform(0),
      spawnIndexEnd: uniform(0),
      spawnSeed: uniform(0),
      intensity: uniform(intensity),
      rotationMinX: uniform(rotation3D[0][0]),
      rotationMaxX: uniform(rotation3D[0][1]),
      rotationMinY: uniform(rotation3D[1][0]),
      rotationMaxY: uniform(rotation3D[1][1]),
      rotationMinZ: uniform(rotation3D[2][0]),
      rotationMaxZ: uniform(rotation3D[2][1]),
      rotationSpeedMinX: uniform(rotationSpeed3D[0][0]),
      rotationSpeedMaxX: uniform(rotationSpeed3D[0][1]),
      rotationSpeedMinY: uniform(rotationSpeed3D[1][0]),
      rotationSpeedMaxY: uniform(rotationSpeed3D[1][1]),
      rotationSpeedMinZ: uniform(rotationSpeed3D[2][0]),
      rotationSpeedMaxZ: uniform(rotationSpeed3D[2][1]),
      colorStartCount: uniform(colorStart.length),
      colorEndCount: uniform(effectiveColorEnd.length),
      colorStart0: uniform(new THREE.Color(...startColors[0])),
      colorStart1: uniform(new THREE.Color(...startColors[1])),
      colorStart2: uniform(new THREE.Color(...startColors[2])),
      colorStart3: uniform(new THREE.Color(...startColors[3])),
      colorStart4: uniform(new THREE.Color(...startColors[4])),
      colorStart5: uniform(new THREE.Color(...startColors[5])),
      colorStart6: uniform(new THREE.Color(...startColors[6])),
      colorStart7: uniform(new THREE.Color(...startColors[7])),
      colorEnd0: uniform(new THREE.Color(...endColors[0])),
      colorEnd1: uniform(new THREE.Color(...endColors[1])),
      colorEnd2: uniform(new THREE.Color(...endColors[2])),
      colorEnd3: uniform(new THREE.Color(...endColors[3])),
      colorEnd4: uniform(new THREE.Color(...endColors[4])),
      colorEnd5: uniform(new THREE.Color(...endColors[5])),
      colorEnd6: uniform(new THREE.Color(...endColors[6])),
      colorEnd7: uniform(new THREE.Color(...endColors[7])),
      emitterShapeType: uniform(emitterShape),
      emitterRadiusInner: uniform(emitterRadiusRange[0]),
      emitterRadiusOuter: uniform(emitterRadiusRange[1]),
      emitterAngle: uniform(emitterAngle),
      emitterHeightMin: uniform(emitterHeightRange[0]),
      emitterHeightMax: uniform(emitterHeightRange[1]),
      emitterSurfaceOnly: uniform(emitterSurfaceOnly ? 1 : 0),
      emitterDir: uniform(new THREE.Vector3(...emitterDirection).normalize()),
      turbulenceIntensity: uniform(turbulence?.intensity ?? 0),
      turbulenceFrequency: uniform(turbulence?.frequency ?? 1),
      turbulenceSpeed: uniform(turbulence?.speed ?? 1),
      turbulenceTime: uniform(0),
      attractorCount: uniform(0),
      attractor0Pos: uniform(new THREE.Vector3(0, 0, 0)),
      attractor0Strength: uniform(0),
      attractor0Radius: uniform(1),
      attractor0Type: uniform(0),
      attractor0Axis: uniform(new THREE.Vector3(0, 1, 0)),
      attractor1Pos: uniform(new THREE.Vector3(0, 0, 0)),
      attractor1Strength: uniform(0),
      attractor1Radius: uniform(1),
      attractor1Type: uniform(0),
      attractor1Axis: uniform(new THREE.Vector3(0, 1, 0)),
      attractor2Pos: uniform(new THREE.Vector3(0, 0, 0)),
      attractor2Strength: uniform(0),
      attractor2Radius: uniform(1),
      attractor2Type: uniform(0),
      attractor2Axis: uniform(new THREE.Vector3(0, 1, 0)),
      attractor3Pos: uniform(new THREE.Vector3(0, 0, 0)),
      attractor3Strength: uniform(0),
      attractor3Radius: uniform(1),
      attractor3Type: uniform(0),
      attractor3Axis: uniform(new THREE.Vector3(0, 1, 0)),
      attractToCenter: uniform(attractToCenter ? 1 : 0),
      startPositionAsDirection: uniform(startPositionAsDirection ? 1 : 0),
      softParticlesEnabled: uniform(softParticles ? 1 : 0),
      softDistance: uniform(softDistance),
      velocityCurveEnabled: uniform(velocityCurve ? 1 : 0),
      rotationSpeedCurveEnabled: uniform(rotationSpeedCurve ? 1 : 0),
      fadeSizeCurveEnabled: uniform(fadeSizeCurve ? 1 : 0),
      fadeOpacityCurveEnabled: uniform(fadeOpacityCurve ? 1 : 0),
      orientAxisType: uniform(axisToNumber(orientAxis)),
      stretchEnabled: uniform(stretchBySpeed ? 1 : 0),
      stretchFactor: uniform(stretchBySpeed?.factor ?? 1),
      stretchMax: uniform(stretchBySpeed?.maxStretch ?? 5),
      collisionEnabled: uniform(collision ? 1 : 0),
      collisionPlaneY: uniform(collision?.plane?.y ?? 0),
      collisionBounce: uniform(collision?.bounce ?? 0.3),
      collisionFriction: uniform(collision?.friction ?? 0.8),
      collisionDie: uniform(collision?.die ? 1 : 0),
      sizeBasedGravity: uniform(collision?.sizeBasedGravity ?? 0),
    }),
    []
  );

  const positionRef = useRef(position);

  useEffect(() => {
    positionRef.current = position;
    uniforms.sizeMin.value = sizeRange[0];
    uniforms.sizeMax.value = sizeRange[1];
    uniforms.fadeSizeStart.value = fadeSizeRange[0];
    uniforms.fadeSizeEnd.value = fadeSizeRange[1];
    uniforms.fadeOpacityStart.value = fadeOpacityRange[0];
    uniforms.fadeOpacityEnd.value = fadeOpacityRange[1];
    uniforms.gravity.value.set(...gravity);
    uniforms.frictionIntensityStart.value = frictionIntensityRange[0];
    uniforms.frictionIntensityEnd.value = frictionIntensityRange[1];
    uniforms.frictionEasingType.value = frictionEasingType;
    uniforms.speedMin.value = speedRange[0];
    uniforms.speedMax.value = speedRange[1];
    uniforms.lifetimeMin.value = lifetimeToFadeRate(lifetimeRange[1]);
    uniforms.lifetimeMax.value = lifetimeToFadeRate(lifetimeRange[0]);
    uniforms.dirMinX.value = direction3D[0][0];
    uniforms.dirMaxX.value = direction3D[0][1];
    uniforms.dirMinY.value = direction3D[1][0];
    uniforms.dirMaxY.value = direction3D[1][1];
    uniforms.dirMinZ.value = direction3D[2][0];
    uniforms.dirMaxZ.value = direction3D[2][1];
    uniforms.startPosMinX.value = startPosition3D[0][0];
    uniforms.startPosMaxX.value = startPosition3D[0][1];
    uniforms.startPosMinY.value = startPosition3D[1][0];
    uniforms.startPosMaxY.value = startPosition3D[1][1];
    uniforms.startPosMinZ.value = startPosition3D[2][0];
    uniforms.startPosMaxZ.value = startPosition3D[2][1];
    uniforms.rotationMinX.value = rotation3D[0][0];
    uniforms.rotationMaxX.value = rotation3D[0][1];
    uniforms.rotationMinY.value = rotation3D[1][0];
    uniforms.rotationMaxY.value = rotation3D[1][1];
    uniforms.rotationMinZ.value = rotation3D[2][0];
    uniforms.rotationMaxZ.value = rotation3D[2][1];
    uniforms.rotationSpeedMinX.value = rotationSpeed3D[0][0];
    uniforms.rotationSpeedMaxX.value = rotationSpeed3D[0][1];
    uniforms.rotationSpeedMinY.value = rotationSpeed3D[1][0];
    uniforms.rotationSpeedMaxY.value = rotationSpeed3D[1][1];
    uniforms.rotationSpeedMinZ.value = rotationSpeed3D[2][0];
    uniforms.rotationSpeedMaxZ.value = rotationSpeed3D[2][1];
    uniforms.intensity.value = intensity;
    uniforms.colorStartCount.value = colorStart.length;
    uniforms.colorEndCount.value = effectiveColorEnd.length;
    startColors.forEach((c, i) => {
      const key = `colorStart${i}` as keyof typeof uniforms;
      if (uniforms[key]) (uniforms[key] as { value: THREE.Color }).value.setRGB(...c);
    });
    endColors.forEach((c, i) => {
      const key = `colorEnd${i}` as keyof typeof uniforms;
      if (uniforms[key]) (uniforms[key] as { value: THREE.Color }).value.setRGB(...c);
    });
    uniforms.emitterShapeType.value = emitterShape;
    uniforms.emitterRadiusInner.value = emitterRadiusRange[0];
    uniforms.emitterRadiusOuter.value = emitterRadiusRange[1];
    uniforms.emitterAngle.value = emitterAngle;
    uniforms.emitterHeightMin.value = emitterHeightRange[0];
    uniforms.emitterHeightMax.value = emitterHeightRange[1];
    uniforms.emitterSurfaceOnly.value = emitterSurfaceOnly ? 1 : 0;
    uniforms.emitterDir.value.set(...emitterDirection).normalize();
    uniforms.turbulenceIntensity.value = turbulence?.intensity ?? 0;
    uniforms.turbulenceFrequency.value = turbulence?.frequency ?? 1;
    uniforms.turbulenceSpeed.value = turbulence?.speed ?? 1;
    const attractorList = attractors ?? [];
    uniforms.attractorCount.value = Math.min(attractorList.length, MAX_ATTRACTORS);
    for (let i = 0; i < MAX_ATTRACTORS; i++) {
      const a = attractorList[i];
      if (a) {
        (uniforms[`attractor${i}Pos` as keyof typeof uniforms] as { value: THREE.Vector3 }).value.set(...(a.position ?? [0, 0, 0]));
        (uniforms[`attractor${i}Strength` as keyof typeof uniforms] as { value: number }).value = a.strength ?? 1;
        (uniforms[`attractor${i}Radius` as keyof typeof uniforms] as { value: number }).value = a.radius ?? 0;
        (uniforms[`attractor${i}Type` as keyof typeof uniforms] as { value: number }).value = a.type === "vortex" ? 1 : 0;
        (uniforms[`attractor${i}Axis` as keyof typeof uniforms] as { value: THREE.Vector3 }).value.set(...(a.axis ?? [0, 1, 0])).normalize();
      } else {
        (uniforms[`attractor${i}Strength` as keyof typeof uniforms] as { value: number }).value = 0;
      }
    }
    uniforms.attractToCenter.value = attractToCenter ? 1 : 0;
    uniforms.startPositionAsDirection.value = startPositionAsDirection ? 1 : 0;
    uniforms.softParticlesEnabled.value = softParticles ? 1 : 0;
    uniforms.softDistance.value = softDistance;
    uniforms.velocityCurveEnabled.value = velocityCurve ? 1 : 0;
    uniforms.rotationSpeedCurveEnabled.value = rotationSpeedCurve ? 1 : 0;
    uniforms.fadeSizeCurveEnabled.value = fadeSizeCurve ? 1 : 0;
    uniforms.fadeOpacityCurveEnabled.value = fadeOpacityCurve ? 1 : 0;
    uniforms.orientAxisType.value = axisToNumber(orientAxis);
    uniforms.stretchEnabled.value = stretchBySpeed ? 1 : 0;
    uniforms.stretchFactor.value = stretchBySpeed?.factor ?? 1;
    uniforms.stretchMax.value = stretchBySpeed?.maxStretch ?? 5;
    uniforms.collisionEnabled.value = collision ? 1 : 0;
    uniforms.collisionPlaneY.value = collision?.plane?.y ?? 0;
    uniforms.collisionBounce.value = collision?.bounce ?? 0.3;
    uniforms.collisionFriction.value = collision?.friction ?? 0.8;
    uniforms.collisionDie.value = collision?.die ? 1 : 0;
    uniforms.sizeBasedGravity.value = collision?.sizeBasedGravity ?? 0;
  }, [
    position, sizeRange, fadeSizeRange, fadeOpacityRange, gravity, frictionIntensityRange, frictionEasingType,
    speedRange, lifetimeRange, direction3D, rotation3D, rotationSpeed3D,
    intensity, colorStart, effectiveColorEnd, startColors, endColors, uniforms, collision,
    emitterShape, emitterRadiusRange, emitterAngle, emitterHeightRange, emitterSurfaceOnly, emitterDirection,
    turbulence, startPosition3D, attractors, attractToCenter, startPositionAsDirection, softParticles, softDistance,
    velocityCurve, rotationSpeedCurve, fadeSizeCurve, fadeOpacityCurve, orientAxis, stretchBySpeed
  ]);

  const { positions, velocities, lifetimes, fadeRates, particleSizes, particleRotations, particleColorStarts, particleColorEnds } = useMemo(
    () => ({
      positions: instancedArray(activeMaxParticles, "vec3"),
      velocities: instancedArray(activeMaxParticles, "vec3"),
      lifetimes: instancedArray(activeMaxParticles, "float"),
      fadeRates: instancedArray(activeMaxParticles, "float"),
      particleSizes: instancedArray(activeMaxParticles, "float"),
      particleRotations: instancedArray(activeMaxParticles, "vec3"),
      particleColorStarts: instancedArray(activeMaxParticles, "vec3"),
      particleColorEnds: instancedArray(activeMaxParticles, "vec3"),
    }),
    [activeMaxParticles]
  );

  const selectColor = (idx: ShaderNodeObject<Node>, c0: ShaderNodeObject<Node>, c1: ShaderNodeObject<Node>, c2: ShaderNodeObject<Node>, c3: ShaderNodeObject<Node>, c4: ShaderNodeObject<Node>, c5: ShaderNodeObject<Node>, c6: ShaderNodeObject<Node>, c7: ShaderNodeObject<Node>) => {
    return idx.lessThan(1).select(c0,
      idx.lessThan(2).select(c1,
        idx.lessThan(3).select(c2,
          idx.lessThan(4).select(c3,
            idx.lessThan(5).select(c4,
              idx.lessThan(6).select(c5,
                idx.lessThan(7).select(c6, c7)
              )
            )
          )
        )
      )
    );
  };

  const computeInit = useMemo(() => {
    return Fn(() => {
      const position = positions.element(instanceIndex);
      const velocity = velocities.element(instanceIndex);
      const lifetime = lifetimes.element(instanceIndex);
      const fadeRate = fadeRates.element(instanceIndex);
      const particleSize = particleSizes.element(instanceIndex);
      const particleRotation = particleRotations.element(instanceIndex);
      const colorStart = particleColorStarts.element(instanceIndex);
      const colorEnd = particleColorEnds.element(instanceIndex);

      position.assign(vec3(0, -1000, 0));
      velocity.assign(vec3(0, 0, 0));
      lifetime.assign(float(0));
      fadeRate.assign(float(0));
      particleSize.assign(float(0));
      particleRotation.assign(vec3(0, 0, 0));
      colorStart.assign(vec3(1, 1, 1));
      colorEnd.assign(vec3(1, 1, 1));
    })().compute(activeMaxParticles);
  }, [activeMaxParticles, positions, velocities, lifetimes, fadeRates, particleSizes, particleRotations, particleColorStarts, particleColorEnds]);

  const computeSpawn = useMemo(() => {
    return Fn(() => {
      const idx = float(instanceIndex);
      const startIdx = uniforms.spawnIndexStart;
      const endIdx = uniforms.spawnIndexEnd;
      const seed = uniforms.spawnSeed;

      const inRange = startIdx.lessThan(endIdx)
        .select(
          idx.greaterThanEqual(startIdx).and(idx.lessThan(endIdx)),
          idx.greaterThanEqual(startIdx).or(idx.lessThan(endIdx))
        );

      If(inRange, () => {
        const position = positions.element(instanceIndex);
        const velocity = velocities.element(instanceIndex);
        const lifetime = lifetimes.element(instanceIndex);
        const fadeRate = fadeRates.element(instanceIndex);
        const particleSize = particleSizes.element(instanceIndex);
        const particleRotation = particleRotations.element(instanceIndex);
        const pColorStart = particleColorStarts.element(instanceIndex);
        const pColorEnd = particleColorEnds.element(instanceIndex);

        const particleSeed = idx.add(seed);
        const randDirX = hash(particleSeed.add(333));
        const randDirY = hash(particleSeed.add(444));
        const randDirZ = hash(particleSeed.add(555));
        const randFade = hash(particleSeed.add(666));
        const randColorStart = hash(particleSeed.add(777));
        const randColorEnd = hash(particleSeed.add(888));
        const randSize = hash(particleSeed.add(999));
        const randSpeed = hash(particleSeed.add(1111));
        const randRotationX = hash(particleSeed.add(2222));
        const randRotationY = hash(particleSeed.add(3333));
        const randRotationZ = hash(particleSeed.add(4444));
        const randPosX = hash(particleSeed.add(5555));
        const randPosY = hash(particleSeed.add(6666));
        const randPosZ = hash(particleSeed.add(7777));
        const randRadius = hash(particleSeed.add(8880));
        const randTheta = hash(particleSeed.add(9990));
        const randPhi = hash(particleSeed.add(10100));
        const randHeight = hash(particleSeed.add(11110));

        const shapeType = uniforms.emitterShapeType;
        const radiusInner = uniforms.emitterRadiusInner;
        const radiusOuter = uniforms.emitterRadiusOuter;
        const coneAngle = uniforms.emitterAngle;
        const heightMin = uniforms.emitterHeightMin;
        const heightMax = uniforms.emitterHeightMax;
        const surfaceOnly = uniforms.emitterSurfaceOnly;
        const emitDir = uniforms.emitterDir;

        const theta = randTheta.mul(PI.mul(2));
        const phi = acos(float(1).sub(randPhi.mul(2)));

        const radiusT = surfaceOnly.greaterThan(0.5).select(
          float(1),
          randRadius.pow(float(1).div(3))
        );
        const radius = mix(radiusInner, radiusOuter, radiusT);

        const cosAngle = emitDir.y;
        const axisX = emitDir.z.negate();
        const axisZ = emitDir.x;
        const axisLenSq = axisX.mul(axisX).add(axisZ.mul(axisZ));
        const axisLen = sqrt(axisLenSq.max(0.0001));
        const kx = axisX.div(axisLen);
        const kz = axisZ.div(axisLen);
        const sinAngle = axisLen;
        const oneMinusCos = float(1).sub(cosAngle);

        const rotateToEmitDir = (localPos: ShaderNodeObject<Node>) => {
          const crossX = kz.mul(localPos.y).negate();
          const crossY = kz.mul(localPos.x).sub(kx.mul(localPos.z));
          const crossZ = kx.mul(localPos.y);
          const kDotV = kx.mul(localPos.x).add(kz.mul(localPos.z));
          const rotatedX = localPos.x.mul(cosAngle).add(crossX.mul(sinAngle)).add(kx.mul(kDotV).mul(oneMinusCos));
          const rotatedY = localPos.y.mul(cosAngle).add(crossY.mul(sinAngle));
          const rotatedZ = localPos.z.mul(cosAngle).add(crossZ.mul(sinAngle)).add(kz.mul(kDotV).mul(oneMinusCos));

          return cosAngle.greaterThan(0.999).select(
            localPos,
            cosAngle.lessThan(-0.999).select(
              vec3(localPos.x, localPos.y.negate(), localPos.z),
              vec3(rotatedX, rotatedY, rotatedZ)
            )
          );
        };

        const boxOffsetX = mix(uniforms.startPosMinX, uniforms.startPosMaxX, randPosX);
        const boxOffsetY = mix(uniforms.startPosMinY, uniforms.startPosMaxY, randPosY);
        const boxOffsetZ = mix(uniforms.startPosMinZ, uniforms.startPosMaxZ, randPosZ);
        const boxPos = vec3(boxOffsetX, boxOffsetY, boxOffsetZ);

        const sphereX = radius.mul(sin(phi)).mul(cos(theta));
        const sphereY = radius.mul(cos(phi));
        const sphereZ = radius.mul(sin(phi)).mul(sin(theta));
        const spherePos = vec3(sphereX, sphereY, sphereZ);

        const coneH = mix(heightMin, heightMax, randHeight);
        const coneR = coneH.mul(sin(coneAngle)).mul(radiusT);
        const coneLocalX = coneR.mul(cos(theta));
        const coneLocalY = coneH.mul(cos(coneAngle));
        const coneLocalZ = coneR.mul(sin(theta));
        const conePos = rotateToEmitDir(vec3(coneLocalX, coneLocalY, coneLocalZ));

        const diskR = surfaceOnly.greaterThan(0.5).select(
          radiusOuter,
          mix(radiusInner, radiusOuter, sqrt(randRadius))
        );
        const diskLocalX = diskR.mul(cos(theta));
        const diskLocalZ = diskR.mul(sin(theta));
        const diskPos = rotateToEmitDir(vec3(diskLocalX, float(0), diskLocalZ));

        const edgeT = randPosX;
        const edgePos = vec3(
          mix(uniforms.startPosMinX, uniforms.startPosMaxX, edgeT),
          mix(uniforms.startPosMinY, uniforms.startPosMaxY, edgeT),
          mix(uniforms.startPosMinZ, uniforms.startPosMaxZ, edgeT)
        );

        const pointPos = vec3(0, 0, 0);

        const shapeOffset = shapeType.lessThan(0.5).select(pointPos,
          shapeType.lessThan(1.5).select(boxPos,
            shapeType.lessThan(2.5).select(spherePos,
              shapeType.lessThan(3.5).select(conePos,
                shapeType.lessThan(4.5).select(diskPos,
                  edgePos
                )
              )
            )
          )
        );

        position.assign(uniforms.spawnPosition.add(shapeOffset));

        const randomFade = mix(uniforms.lifetimeMin, uniforms.lifetimeMax, randFade);
        fadeRate.assign(randomFade);

        const useAttractToCenter = uniforms.attractToCenter.greaterThan(0.5);
        const attractVelocity = shapeOffset.negate().mul(randomFade);
        const useStartPosAsDir = uniforms.startPositionAsDirection.greaterThan(0.5);

        const dirX = mix(uniforms.dirMinX, uniforms.dirMaxX, randDirX);
        const dirY = mix(uniforms.dirMinY, uniforms.dirMaxY, randDirY);
        const dirZ = mix(uniforms.dirMinZ, uniforms.dirMaxZ, randDirZ);
        const randomDirVec = vec3(dirX, dirY, dirZ);
        const randomDirLength = randomDirVec.length();
        const randomDir = randomDirLength.greaterThan(0.001).select(randomDirVec.div(randomDirLength), vec3(0, 0, 0));

        const startPosLength = shapeOffset.length();
        const startPosDir = startPosLength.greaterThan(0.001).select(shapeOffset.div(startPosLength), vec3(0, 0, 0));
        const dir = useStartPosAsDir.select(startPosDir, randomDir);

        const randomSpeed = mix(uniforms.speedMin, uniforms.speedMax, randSpeed);
        const normalVelocity = dir.mul(randomSpeed);

        velocity.assign(useAttractToCenter.select(attractVelocity, normalVelocity));

        const randomSize = mix(uniforms.sizeMin, uniforms.sizeMax, randSize);
        particleSize.assign(randomSize);

        const rotX = mix(uniforms.rotationMinX, uniforms.rotationMaxX, randRotationX);
        const rotY = mix(uniforms.rotationMinY, uniforms.rotationMaxY, randRotationY);
        const rotZ = mix(uniforms.rotationMinZ, uniforms.rotationMaxZ, randRotationZ);
        particleRotation.assign(vec3(rotX, rotY, rotZ));

        const startColorIdx = floor(randColorStart.mul(uniforms.colorStartCount));
        const selectedStartColor = selectColor(
          startColorIdx,
          uniforms.colorStart0, uniforms.colorStart1, uniforms.colorStart2, uniforms.colorStart3,
          uniforms.colorStart4, uniforms.colorStart5, uniforms.colorStart6, uniforms.colorStart7
        );
        pColorStart.assign(selectedStartColor);

        const endColorIdx = floor(randColorEnd.mul(uniforms.colorEndCount));
        const selectedEndColor = selectColor(
          endColorIdx,
          uniforms.colorEnd0, uniforms.colorEnd1, uniforms.colorEnd2, uniforms.colorEnd3,
          uniforms.colorEnd4, uniforms.colorEnd5, uniforms.colorEnd6, uniforms.colorEnd7
        );
        pColorEnd.assign(selectedEndColor);

        lifetime.assign(float(1));
      });
    })().compute(activeMaxParticles);
  }, [activeMaxParticles, positions, velocities, lifetimes, fadeRates, particleSizes, particleRotations, particleColorStarts, particleColorEnds, uniforms, selectColor]);

  const computeUpdate = useMemo(() => {
    return Fn(() => {
      const position = positions.element(instanceIndex);
      const velocity = velocities.element(instanceIndex);
      const lifetime = lifetimes.element(instanceIndex);
      const fadeRate = fadeRates.element(instanceIndex);
      const particleRotation = particleRotations.element(instanceIndex);
      const particleSize = particleSizes.element(instanceIndex);
      const dt = uniforms.deltaTime;

      If(lifetime.greaterThan(0), () => {
        const gravityMultiplier = float(1).add(particleSize.mul(uniforms.sizeBasedGravity));
        velocity.addAssign(uniforms.gravity.mul(dt).mul(gravityMultiplier));

        const progress = float(1).sub(lifetime);
        const velocityCurveSample = texture(curveTexture, vec2(progress, float(0.5))).z;

        const speedScale = uniforms.velocityCurveEnabled.greaterThan(0.5).select(
          velocityCurveSample,
          (() => {
            const easingType = uniforms.frictionEasingType;
            const easedProgress = easingType.lessThan(0.5).select(
              progress,
              easingType.lessThan(1.5).select(
                progress.mul(progress),
                easingType.lessThan(2.5).select(
                  float(1).sub(float(1).sub(progress).mul(float(1).sub(progress))),
                  progress.lessThan(0.5).select(
                    float(2).mul(progress).mul(progress),
                    float(1).sub(float(-2).mul(progress).add(2).pow(2).div(2))
                  )
                )
              )
            );
            const currentIntensity = mix(uniforms.frictionIntensityStart, uniforms.frictionIntensityEnd, easedProgress);
            return float(1).sub(currentIntensity.mul(0.9));
          })()
        );

        const turbIntensity = uniforms.turbulenceIntensity;
        const turbFreq = uniforms.turbulenceFrequency;
        const turbTime = uniforms.turbulenceTime;

        If(turbIntensity.greaterThan(0.001), () => {
          const noisePos = position.mul(turbFreq).add(vec3(turbTime, turbTime.mul(0.7), turbTime.mul(1.3)));
          const eps = float(0.01);

          const nPosX = mx_noise_vec3(noisePos.add(vec3(eps, 0, 0)));
          const nNegX = mx_noise_vec3(noisePos.sub(vec3(eps, 0, 0)));
          const nPosY = mx_noise_vec3(noisePos.add(vec3(0, eps, 0)));
          const nNegY = mx_noise_vec3(noisePos.sub(vec3(0, eps, 0)));
          const nPosZ = mx_noise_vec3(noisePos.add(vec3(0, 0, eps)));
          const nNegZ = mx_noise_vec3(noisePos.sub(vec3(0, 0, eps)));

          const dFx_dy = nPosY.x.sub(nNegY.x).div(eps.mul(2));
          const dFx_dz = nPosZ.x.sub(nNegZ.x).div(eps.mul(2));
          const dFy_dx = nPosX.y.sub(nNegX.y).div(eps.mul(2));
          const dFy_dz = nPosZ.y.sub(nNegZ.y).div(eps.mul(2));
          const dFz_dx = nPosX.z.sub(nNegX.z).div(eps.mul(2));
          const dFz_dy = nPosY.z.sub(nNegY.z).div(eps.mul(2));

          const curlX = dFz_dy.sub(dFy_dz);
          const curlY = dFx_dz.sub(dFz_dx);
          const curlZ = dFy_dx.sub(dFx_dy);
          const curl = vec3(curlX, curlY, curlZ);

          velocity.addAssign(curl.mul(turbIntensity).mul(uniforms.deltaTime));
        });

        const attractorCount = uniforms.attractorCount;

        const applyAttractor = (aPos: ShaderNodeObject<Node>, aStrength: ShaderNodeObject<Node>, aRadius: ShaderNodeObject<Node>, aType: ShaderNodeObject<Node>, aAxis: ShaderNodeObject<Node>) => {
          If(aStrength.abs().greaterThan(0.001), () => {
            const toAttractor = aPos.sub(position);
            const dist = toAttractor.length();
            const safeDist = dist.max(0.01);
            const direction = toAttractor.div(safeDist);

            const falloff = aRadius.greaterThan(0.001).select(
              float(1).sub(dist.div(aRadius)).max(0),
              float(1).div(safeDist.mul(safeDist).add(1))
            );

            const force = aType.lessThan(0.5).select(
              direction.mul(aStrength).mul(falloff),
              (() => {
                const tangent = vec3(
                  aAxis.y.mul(toAttractor.z).sub(aAxis.z.mul(toAttractor.y)),
                  aAxis.z.mul(toAttractor.x).sub(aAxis.x.mul(toAttractor.z)),
                  aAxis.x.mul(toAttractor.y).sub(aAxis.y.mul(toAttractor.x))
                );
                const tangentLen = tangent.length().max(0.001);
                return tangent.div(tangentLen).mul(aStrength).mul(falloff);
              })()
            );

            velocity.addAssign(force.mul(uniforms.deltaTime));
          });
        };

        If(attractorCount.greaterThan(0), () => {
          applyAttractor(uniforms.attractor0Pos, uniforms.attractor0Strength, uniforms.attractor0Radius, uniforms.attractor0Type, uniforms.attractor0Axis);
        });
        If(attractorCount.greaterThan(1), () => {
          applyAttractor(uniforms.attractor1Pos, uniforms.attractor1Strength, uniforms.attractor1Radius, uniforms.attractor1Type, uniforms.attractor1Axis);
        });
        If(attractorCount.greaterThan(2), () => {
          applyAttractor(uniforms.attractor2Pos, uniforms.attractor2Strength, uniforms.attractor2Radius, uniforms.attractor2Type, uniforms.attractor2Axis);
        });
        If(attractorCount.greaterThan(3), () => {
          applyAttractor(uniforms.attractor3Pos, uniforms.attractor3Strength, uniforms.attractor3Radius, uniforms.attractor3Type, uniforms.attractor3Axis);
        });

        position.addAssign(velocity.mul(dt).mul(speedScale));

        If(uniforms.collisionEnabled.greaterThan(0.5), () => {
          const planeY = uniforms.collisionPlaneY;
          const bounce = uniforms.collisionBounce;
          const friction = uniforms.collisionFriction;
          const shouldDie = uniforms.collisionDie;

          If(position.y.lessThan(planeY), () => {
            If(shouldDie.greaterThan(0.5), () => {
              lifetime.assign(float(0));
              position.y.assign(float(-1000));
            }).Else(() => {
              position.y.assign(planeY);
              velocity.y.assign(velocity.y.abs().mul(bounce));
              velocity.x.mulAssign(friction);
              velocity.z.mulAssign(friction);
            });
          });
        });

        const idx = float(instanceIndex);
        const rotSpeedX = mix(uniforms.rotationSpeedMinX, uniforms.rotationSpeedMaxX, hash(idx.add(8888)));
        const rotSpeedY = mix(uniforms.rotationSpeedMinY, uniforms.rotationSpeedMaxY, hash(idx.add(9999)));
        const rotSpeedZ = mix(uniforms.rotationSpeedMinZ, uniforms.rotationSpeedMaxZ, hash(idx.add(10101)));

        const rotSpeedCurveSample = texture(curveTexture, vec2(progress, float(0.5))).w;
        const rotSpeedMultiplier = uniforms.rotationSpeedCurveEnabled.greaterThan(0.5).select(
          rotSpeedCurveSample,
          float(1)
        );

        particleRotation.addAssign(vec3(rotSpeedX, rotSpeedY, rotSpeedZ).mul(uniforms.deltaTime).mul(rotSpeedMultiplier));

        lifetime.subAssign(fadeRate.mul(uniforms.deltaTime));

        If(lifetime.lessThanEqual(0), () => {
          lifetime.assign(float(0));
          position.y.assign(float(-1000));
        });
      });
    })().compute(activeMaxParticles);
  }, [activeMaxParticles, positions, velocities, lifetimes, fadeRates, particleSizes, particleRotations, uniforms, curveTexture]);

  const material = useMemo(() => {
    const lifetime = lifetimes.element(instanceIndex);
    const particleSize = particleSizes.element(instanceIndex);
    const particleRotation = particleRotations.element(instanceIndex);
    const pColorStart = particleColorStarts.element(instanceIndex);
    const pColorEnd = particleColorEnds.element(instanceIndex);
    const particlePos = positions.element(instanceIndex);
    const particleVel = velocities.element(instanceIndex);

    const progress = float(1).sub(lifetime);
    const currentColor = mix(pColorStart, pColorEnd, progress);
    const intensifiedColor = currentColor.mul(uniforms.intensity);
    const curveSample = texture(curveTexture, vec2(progress, float(0.5)));

    const sizeMultiplier = uniforms.fadeSizeCurveEnabled.greaterThan(0.5).select(
      curveSample.x,
      mix(uniforms.fadeSizeStart, uniforms.fadeSizeEnd, progress)
    );

    const opacityMultiplier = uniforms.fadeOpacityCurveEnabled.greaterThan(0.5).select(
      curveSample.y,
      mix(uniforms.fadeOpacityStart, uniforms.fadeOpacityEnd, progress)
    );

    let sampleUV = uv();

    if (flipbook && alphaMap) {
      const rows = float(flipbook.rows || 1);
      const columns = float(flipbook.columns || 1);
      const totalFrames = rows.mul(columns);
      const frameIndex = floor(progress.mul(totalFrames).min(totalFrames.sub(1)));
      const col = mod(frameIndex, columns);
      const row = floor(frameIndex.div(columns));
      const scaledUV = uv().div(vec2(columns, rows));
      const offsetX = col.div(columns);
      const offsetY = rows.sub(1).sub(row).div(rows);
      sampleUV = scaledUV.add(vec2(offsetX, offsetY));
    }

    let shapeMask: ShaderNodeObject<Node>;

    if (activeGeometry) {
      shapeMask = float(1);
    } else if (alphaMap) {
      const alphaSample = texture(alphaMap, sampleUV);
      shapeMask = alphaSample.r;
    } else {
      const dist = uv().mul(2).sub(1).length();
      switch (activeAppearance) {
        case Appearance.DEFAULT:
          shapeMask = float(1);
          break;
        case Appearance.CIRCULAR:
          shapeMask = step(dist, float(1));
          break;
        case Appearance.GRADIENT:
        default:
          shapeMask = float(1).sub(dist).max(0);
          break;
      }
    }

    const baseOpacity = opacityMultiplier.mul(shapeMask).mul(lifetime.greaterThan(0.001).select(float(1), float(0)));

    const particleData: ParticleData = {
      progress,
      lifetime,
      position: particlePos,
      velocity: particleVel,
      size: particleSize,
      rotation: particleRotation,
      colorStart: pColorStart,
      colorEnd: pColorEnd,
      color: currentColor,
      intensifiedColor,
      shapeMask,
      index: instanceIndex,
    };

    let finalOpacity = opacityNode
      ? baseOpacity.mul(typeof opacityNode === "function" ? opacityNode(particleData) : opacityNode)
      : baseOpacity;

    if (softParticles) {
      const sceneDepth = viewportDepthTexture(screenUV).x;
      const particleViewZ = positionView.z.negate();
      const near = cameraNear;
      const far = cameraFar;
      const sceneViewZ = near.mul(far).mul(2).div(
        far.add(near).sub(sceneDepth.mul(2).sub(1).mul(far.sub(near)))
      );
      const depthDiff = sceneViewZ.sub(particleViewZ);
      const softFade = clamp(depthDiff.div(uniforms.softDistance), 0, 1);
      finalOpacity = finalOpacity.mul(softFade);
    }

    if (activeGeometry) {
      let mat: THREE.MeshBasicNodeMaterial | THREE.MeshStandardNodeMaterial | THREE.MeshPhysicalNodeMaterial;
      switch (activeLighting) {
        case Lighting.BASIC:
          mat = new THREE.MeshBasicNodeMaterial();
          break;
        case Lighting.PHYSICAL:
          mat = new THREE.MeshPhysicalNodeMaterial();
          break;
        case Lighting.STANDARD:
        default:
          mat = new THREE.MeshStandardNodeMaterial();
          break;
      }

      const velocityCurveValue = curveSample.z;
      const effectiveVelocityMultiplier = uniforms.velocityCurveEnabled.greaterThan(0.5).select(
        velocityCurveValue,
        float(1)
      );
      const effectiveSpeed = particleVel.length().mul(effectiveVelocityMultiplier);

      const stretchAmount = uniforms.stretchEnabled.greaterThan(0.5).select(
        float(1).add(effectiveSpeed.mul(uniforms.stretchFactor)).min(uniforms.stretchMax),
        float(1)
      );

      const baseScale = particleSize.mul(sizeMultiplier);
      const axisType = uniforms.orientAxisType;
      const axisSign = axisType.lessThan(3).select(float(1), float(-1));
      const axisIndex = axisType.mod(3);

      const stretchedLocal = uniforms.stretchEnabled.greaterThan(0.5).select(
        axisIndex.lessThan(0.5).select(
          vec3(positionLocal.x.mul(stretchAmount), positionLocal.y, positionLocal.z),
          axisIndex.lessThan(1.5).select(
            vec3(positionLocal.x, positionLocal.y.mul(stretchAmount), positionLocal.z),
            vec3(positionLocal.x, positionLocal.y, positionLocal.z.mul(stretchAmount))
          )
        ),
        positionLocal
      );

      let rotatedPos: ShaderNodeObject<Node>;

      if (activeOrientToDirection) {
        const velLen = particleVel.length().max(0.0001);
        const velDir = particleVel.div(velLen).mul(axisSign);

        const localAxis = axisIndex.lessThan(0.5).select(
          vec3(1, 0, 0),
          axisIndex.lessThan(1.5).select(
            vec3(0, 1, 0),
            vec3(0, 0, 1)
          )
        );

        const dotProduct = localAxis.dot(velDir).clamp(-1, 1);
        const crossProduct = localAxis.cross(velDir);
        const crossLen = crossProduct.length();
        const needsRotation = crossLen.greaterThan(0.0001);

        const rotAxis = needsRotation.select(
          crossProduct.div(crossLen),
          vec3(0, 1, 0)
        );

        const cosAngle = dotProduct;
        const sinAngle = crossLen;
        const oneMinusCos = float(1).sub(cosAngle);

        const v = stretchedLocal;
        const kDotV = rotAxis.dot(v);
        const kCrossV = rotAxis.cross(v);

        const rotatedByAxis = needsRotation.select(
          v.mul(cosAngle).add(kCrossV.mul(sinAngle)).add(rotAxis.mul(kDotV.mul(oneMinusCos))),
          dotProduct.lessThan(-0.99).select(
            v.negate(),
            v
          )
        );

        rotatedPos = rotatedByAxis;
      } else {
        const rotX = particleRotation.x;
        const rotY = particleRotation.y;
        const rotZ = particleRotation.z;

        const cX = cos(rotX);
        const sX = sin(rotX);
        const afterX = vec3(
          stretchedLocal.x,
          stretchedLocal.y.mul(cX).sub(stretchedLocal.z.mul(sX)),
          stretchedLocal.y.mul(sX).add(stretchedLocal.z.mul(cX))
        );

        const cY = cos(rotY);
        const sY = sin(rotY);
        const afterY = vec3(
          afterX.x.mul(cY).add(afterX.z.mul(sY)),
          afterX.y,
          afterX.z.mul(cY).sub(afterX.x.mul(sY))
        );

        const cZ = cos(rotZ);
        const sZ = sin(rotZ);
        rotatedPos = vec3(
          afterY.x.mul(cZ).sub(afterY.y.mul(sZ)),
          afterY.x.mul(sZ).add(afterY.y.mul(cZ)),
          afterY.z
        );
      }

      const scaledPos = rotatedPos.mul(baseScale);
      mat.positionNode = scaledPos.add(particlePos);

      const defaultColor = vec4(intensifiedColor, finalOpacity);
      mat.colorNode = colorNode
        ? (typeof colorNode === "function" ? colorNode(particleData, defaultColor) : colorNode)
        : defaultColor;

      mat.transparent = true;
      mat.depthWrite = false;
      mat.blending = blending;
      mat.side = THREE.DoubleSide;

      if (backdropNode) {
        mat.backdropNode = typeof backdropNode === "function"
          ? backdropNode(particleData)
          : backdropNode;
      }

      if (castShadowNode) {
        mat.castShadowNode = typeof castShadowNode === "function"
          ? castShadowNode(particleData)
          : castShadowNode;
      }

      if (alphaTestNode) {
        mat.alphaTestNode = typeof alphaTestNode === "function"
          ? alphaTestNode(particleData)
          : alphaTestNode;
      }

      return mat;
    } else {
      const mat = new THREE.SpriteNodeMaterial();

      const defaultColor = vec4(intensifiedColor, finalOpacity);
      mat.colorNode = colorNode
        ? (typeof colorNode === "function" ? colorNode(particleData, defaultColor) : colorNode)
        : defaultColor;

      mat.positionNode = positions.toAttribute();
      mat.scaleNode = particleSize.mul(sizeMultiplier);
      mat.rotationNode = particleRotation.y;
      mat.transparent = true;
      mat.depthWrite = false;
      mat.blending = blending;

      if (backdropNode) {
        mat.backdropNode = typeof backdropNode === "function"
          ? backdropNode(particleData)
          : backdropNode;
      }

      if (castShadowNode) {
        mat.castShadowNode = typeof castShadowNode === "function"
          ? castShadowNode(particleData)
          : castShadowNode;
      }

      if (alphaTestNode) {
        mat.alphaTestNode = typeof alphaTestNode === "function"
          ? alphaTestNode(particleData)
          : alphaTestNode;
      }

      return mat;
    }
  }, [positions, velocities, lifetimes, particleSizes, particleRotations, particleColorStarts, particleColorEnds, uniforms, activeAppearance, alphaMap, flipbook, blending, activeGeometry, activeOrientToDirection, activeLighting, backdropNode, opacityNode, colorNode, alphaTestNode, castShadowNode, softParticles, curveTexture]);

  const renderObject = useMemo(() => {
    if (activeGeometry) {
      const mesh = new THREE.InstancedMesh(activeGeometry, material as any, activeMaxParticles);
      mesh.frustumCulled = false;
      mesh.castShadow = activeShadow;
      mesh.receiveShadow = activeShadow;
      return mesh;
    } else {
      const s = new THREE.Sprite(material as any);
      (s as any).count = activeMaxParticles;
      s.frustumCulled = false;
      return s;
    }
  }, [material, activeMaxParticles, activeGeometry, activeShadow]);

  useEffect(() => {
    if (!renderer || initialized.current) return;
    (renderer as any).computeAsync(computeInit).then(() => {
      initialized.current = true;
    });
  }, [renderer, computeInit]);

  const applySpawnOverrides = useCallback((overrides: SpawnOverrides | null) => {
    if (!overrides) return null;

    const saved: Record<string, unknown> = {};

    const setUniform = (key: string, value: number) => {
      const u = uniforms[key as keyof typeof uniforms] as { value: number } | undefined;
      if (u) {
        saved[key] = u.value;
        u.value = value;
      }
    };

    if (overrides.size !== undefined) {
      const range = toRange(overrides.size, [0.1, 0.3]);
      setUniform("sizeMin", range[0]);
      setUniform("sizeMax", range[1]);
    }

    if (overrides.speed !== undefined) {
      const range = toRange(overrides.speed, [0.1, 0.1]);
      setUniform("speedMin", range[0]);
      setUniform("speedMax", range[1]);
    }

    if (overrides.lifetime !== undefined) {
      const range = toRange(overrides.lifetime, [1, 2]);
      setUniform("lifetimeMin", 1 / range[1]);
      setUniform("lifetimeMax", 1 / range[0]);
    }

    if (overrides.direction !== undefined) {
      const dir3D = toRotation3D(overrides.direction);
      setUniform("dirMinX", dir3D[0][0]);
      setUniform("dirMaxX", dir3D[0][1]);
      setUniform("dirMinY", dir3D[1][0]);
      setUniform("dirMaxY", dir3D[1][1]);
      setUniform("dirMinZ", dir3D[2][0]);
      setUniform("dirMaxZ", dir3D[2][1]);
    }

    if (overrides.startPosition !== undefined) {
      const pos3D = toRotation3D(overrides.startPosition);
      setUniform("startPosMinX", pos3D[0][0]);
      setUniform("startPosMaxX", pos3D[0][1]);
      setUniform("startPosMinY", pos3D[1][0]);
      setUniform("startPosMaxY", pos3D[1][1]);
      setUniform("startPosMinZ", pos3D[2][0]);
      setUniform("startPosMaxZ", pos3D[2][1]);
    }

    if (overrides.gravity !== undefined) {
      saved.gravity = uniforms.gravity.value.clone();
      uniforms.gravity.value.set(...overrides.gravity);
    }

    if (overrides.colorStart !== undefined) {
      const colors = overrides.colorStart.slice(0, 8).map(hexToRgb);
      while (colors.length < 8) colors.push(colors[colors.length - 1] || [1, 1, 1]);
      setUniform("colorStartCount", overrides.colorStart.length);
      colors.forEach((c, i) => {
        const key = `colorStart${i}` as keyof typeof uniforms;
        const u = uniforms[key] as { value: THREE.Color } | undefined;
        if (u) {
          saved[key] = u.value.clone();
          u.value.setRGB(...c);
        }
      });
    }

    if (overrides.colorEnd !== undefined) {
      const colors = overrides.colorEnd.slice(0, 8).map(hexToRgb);
      while (colors.length < 8) colors.push(colors[colors.length - 1] || [1, 1, 1]);
      setUniform("colorEndCount", overrides.colorEnd.length);
      colors.forEach((c, i) => {
        const key = `colorEnd${i}` as keyof typeof uniforms;
        const u = uniforms[key] as { value: THREE.Color } | undefined;
        if (u) {
          saved[key] = u.value.clone();
          u.value.setRGB(...c);
        }
      });
    }

    if (overrides.rotation !== undefined) {
      const rot3D = toRotation3D(overrides.rotation);
      setUniform("rotationMinX", rot3D[0][0]);
      setUniform("rotationMaxX", rot3D[0][1]);
      setUniform("rotationMinY", rot3D[1][0]);
      setUniform("rotationMaxY", rot3D[1][1]);
      setUniform("rotationMinZ", rot3D[2][0]);
      setUniform("rotationMaxZ", rot3D[2][1]);
    }

    return () => {
      Object.entries(saved).forEach(([key, value]) => {
        const u = uniforms[key as keyof typeof uniforms] as { value: unknown } | undefined;
        if (u) {
          u.value = value;
        }
      });
    };
  }, [uniforms]);

  const spawnInternal = useCallback((x: number, y: number, z: number, count: number = 20, overrides: SpawnOverrides | null = null) => {
    if (!initialized.current || !renderer) return;

    const restore = applySpawnOverrides(overrides);

    const startIdx = nextIndex.current;
    const endIdx = (startIdx + count) % activeMaxParticles;

    uniforms.spawnPosition.value.set(x, y, z);
    uniforms.spawnIndexStart.value = startIdx;
    uniforms.spawnIndexEnd.value = endIdx;
    uniforms.spawnSeed.value = Math.random() * 10000;

    nextIndex.current = endIdx;

    (renderer as any).computeAsync(computeSpawn);

    if (restore) restore();
  }, [renderer, computeSpawn, uniforms, activeMaxParticles, applySpawnOverrides]);

  const spawn = useCallback((x: number = 0, y: number = 0, z: number = 0, count: number = 20, overrides: SpawnOverrides | null = null) => {
    const [px, py, pz] = positionRef.current;
    spawnInternal(px + x, py + y, pz + z, count, overrides);
  }, [spawnInternal]);

  const computeUpdateRef = useRef(computeUpdate);
  useEffect(() => {
    computeUpdateRef.current = computeUpdate;
  }, [computeUpdate]);

  useFrame(async (_, delta) => {
    if (!initialized.current || !renderer) return;

    uniforms.deltaTime.value = delta;

    const turbSpeed = turbulenceRef.current?.speed ?? 1;
    uniforms.turbulenceTime.value += delta * turbSpeed;

    await (renderer as any).computeAsync(computeUpdateRef.current);

    if (emitting) {
      const [px, py, pz] = positionRef.current;
      const currentDelay = delayRef.current;
      const currentEmitCount = emitCountRef.current;

      if (!currentDelay) {
        spawnInternal(px, py, pz, currentEmitCount);
      } else {
        emitAccumulator.current += delta;

        if (emitAccumulator.current >= currentDelay) {
          emitAccumulator.current -= currentDelay;
          spawnInternal(px, py, pz, currentEmitCount);
        }
      }
    }
  });

  const start = useCallback(() => {
    setEmitting(true);
    emitAccumulator.current = 0;
  }, []);

  const stop = useCallback(() => {
    setEmitting(false);
  }, []);

  const prevMaterialRef = useRef<any>(null);
  const prevRenderObjectRef = useRef<THREE.Sprite | THREE.InstancedMesh | null>(null);

  useEffect(() => {
    if (prevMaterialRef.current && prevMaterialRef.current !== material) {
      prevMaterialRef.current.dispose();
    }
    prevMaterialRef.current = material;

    if (prevRenderObjectRef.current && prevRenderObjectRef.current !== renderObject) {
      if (prevRenderObjectRef.current.material) {
        (prevRenderObjectRef.current.material as any).dispose();
      }
    }
    prevRenderObjectRef.current = renderObject;
  }, [material, renderObject]);

  useEffect(() => {
    return () => {
      if (material) {
        (material as any).dispose();
      }

      if (renderObject) {
        if (renderObject.geometry && !geometry) {
          renderObject.geometry.dispose();
        }
        if (renderObject.material) {
          (renderObject.material as any).dispose();
        }
      }

      initialized.current = false;
      nextIndex.current = 0;
    };
  }, []);

  const particleAPI = useMemo<ParticleAPI>(() => ({
    spawn,
    start,
    stop,
    get isEmitting() { return emitting; },
    clear() {
      (renderer as any).computeAsync(computeInit);
      nextIndex.current = 0;
    },
    uniforms: uniforms as unknown as Record<string, { value: unknown }>,
  }), [spawn, start, stop, emitting, renderer, computeInit, uniforms]);

  useImperativeHandle(ref, () => particleAPI, [particleAPI]);

  const registerParticles = useVFXStore((s: { registerParticles: (name: string, api: ParticleAPI) => void }) => s.registerParticles);
  const unregisterParticles = useVFXStore((s: { unregisterParticles: (name: string) => void }) => s.unregisterParticles);

  useEffect(() => {
    if (!name) return;

    registerParticles(name, particleAPI);

    return () => {
      unregisterParticles(name);
    };
  }, [name, particleAPI, registerParticles, unregisterParticles]);

  return <primitive ref={spriteRef} object={renderObject} />;
});
