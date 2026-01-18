declare module "three/webgpu" {
  import * as THREE from "three";
  
  export * from "three";
  
  export const Fn: any;
  export const If: any;
  export const uniform: any;
  export const float: any;
  export const uv: any;
  export const vec2: any;
  export const vec3: any;
  export const vec4: any;
  export const hash: any;
  export const mix: any;
  export const floor: any;
  export const step: any;
  export const mod: any;
  export const texture: any;
  export const instancedArray: any;
  export const instanceIndex: any;
  export const positionLocal: any;
  export const cos: any;
  export const sin: any;
  export const atan: any;
  export const sqrt: any;
  export const acos: any;
  export const PI: any;
  export const mx_noise_vec3: any;
  export const screenUV: any;
  export const viewportDepthTexture: any;
  export const positionView: any;
  export const cameraNear: any;
  export const cameraFar: any;
  export const clamp: any;
  
  export type ShaderNodeObject<T> = any;
  export type Node = any;

  export interface WebGPURendererParameters {
    canvas?: HTMLCanvasElement;
    antialias?: boolean;
    alpha?: boolean;
    depth?: boolean;
    stencil?: boolean;
    powerPreference?: string;
  }

  export class WebGPURenderer extends THREE.WebGLRenderer {
    constructor(parameters?: WebGPURendererParameters);
    init(): Promise<void>;
    computeAsync(compute: any): Promise<void>;
  }

  export class SpriteNodeMaterial extends THREE.Material {
    constructor();
    colorNode: any;
    positionNode: any;
    scaleNode: any;
    rotationNode: any;
    backdropNode?: any;
    castShadowNode?: any;
    alphaTestNode?: any;
    transparent: boolean;
    depthWrite: boolean;
    blending: THREE.Blending;
  }

  export class MeshBasicNodeMaterial extends THREE.Material {
    constructor();
    colorNode: any;
    positionNode: any;
    backdropNode?: any;
    castShadowNode?: any;
    alphaTestNode?: any;
    transparent: boolean;
    depthWrite: boolean;
    blending: THREE.Blending;
    side: THREE.Side;
  }

  export class MeshStandardNodeMaterial extends THREE.Material {
    constructor();
    colorNode: any;
    positionNode: any;
    backdropNode?: any;
    castShadowNode?: any;
    alphaTestNode?: any;
    transparent: boolean;
    depthWrite: boolean;
    blending: THREE.Blending;
    side: THREE.Side;
  }

  export class MeshPhysicalNodeMaterial extends THREE.Material {
    constructor();
    colorNode: any;
    positionNode: any;
    backdropNode?: any;
    castShadowNode?: any;
    alphaTestNode?: any;
    transparent: boolean;
    depthWrite: boolean;
    blending: THREE.Blending;
    side: THREE.Side;
  }
}
