export {
  VFXParticles,
  Appearance,
  Blending,
  EmitterShape,
  AttractorType,
  Easing,
  Lighting,
  bakeCurveToArray,
  createCombinedCurveTexture,
} from "./VFXParticles";

export type {
  VFXParticlesProps,
  AppearanceType,
  BlendingType,
  EmitterShapeType,
  AttractorTypeValue,
  EasingType,
  LightingType,
  CurvePoint,
  CurveData,
  FrictionConfig,
  TurbulenceConfig,
  AttractorConfig,
  CollisionConfig,
  FlipbookConfig,
  StretchConfig,
  ParticleData,
  NodeFunction,
} from "./VFXParticles";

export {
  VFXEmitter,
  useVFXEmitter,
} from "./VFXEmitter";

export type {
  VFXEmitterProps,
  VFXEmitterAPI,
  UseVFXEmitterResult,
} from "./VFXEmitter";

export {
  useVFXStore,
} from "./useVFXStore";

export type {
  ParticleAPI,
  SpawnOverrides,
  Range3D,
} from "./useVFXStore";
