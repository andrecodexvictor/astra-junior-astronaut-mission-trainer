import { Engine } from '@babylonjs/core/Engines/engine';
import { WebGPUEngine } from '@babylonjs/core/Engines/webgpuEngine';
import { Constants } from '@babylonjs/core/Engines/constants';
import type { AbstractEngine } from '@babylonjs/core/Engines/abstractEngine';
import { Scene } from '@babylonjs/core/scene';
import '@babylonjs/core/Collisions/collisionCoordinator';
import { Vector3, Matrix, Quaternion } from '@babylonjs/core/Maths/math.vector';
import { Color3, Color4 } from '@babylonjs/core/Maths/math.color';
import { CreateBox } from '@babylonjs/core/Meshes/Builders/boxBuilder';
import { CreateCylinder } from '@babylonjs/core/Meshes/Builders/cylinderBuilder';
import { CreateSphere } from '@babylonjs/core/Meshes/Builders/sphereBuilder';
import { CreateTorus } from '@babylonjs/core/Meshes/Builders/torusBuilder';
import { CreatePlane } from '@babylonjs/core/Meshes/Builders/planeBuilder';
import { CreateGround } from '@babylonjs/core/Meshes/Builders/groundBuilder';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import '@babylonjs/core/Meshes/thinInstanceMesh';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { PBRMaterial } from '@babylonjs/core/Materials/PBR/pbrMaterial';
import { ImageProcessingConfiguration } from '@babylonjs/core/Materials/imageProcessingConfiguration';
import type { Material } from '@babylonjs/core/Materials/material';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import { RawTexture } from '@babylonjs/core/Materials/Textures/rawTexture';
import { RawCubeTexture } from '@babylonjs/core/Materials/Textures/rawCubeTexture';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import type { BaseTexture } from '@babylonjs/core/Materials/Textures/baseTexture';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight';
import { PointLight } from '@babylonjs/core/Lights/pointLight';
import { SpotLight } from '@babylonjs/core/Lights/spotLight';
import type { Light } from '@babylonjs/core/Lights/light';
import { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator';
import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import type { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh';
import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import type { Node } from '@babylonjs/core/node';
import { PointsCloudSystem } from '@babylonjs/core/Particles/pointsCloudSystem';
import { SceneLoader } from '@babylonjs/core/Loading/sceneLoader';
import { SceneInstrumentation } from '@babylonjs/core/Instrumentation/sceneInstrumentation';
import type { AnimationGroup } from '@babylonjs/core/Animations/animationGroup';
import type { AssetContainer, InstantiatedEntries } from '@babylonjs/core/assetContainer';
import '@babylonjs/loaders/glTF/2.0/glTFLoader';
import '@babylonjs/loaders/glTF/2.0/Extensions/KHR_materials_emissive_strength';
import type {
  AuxVisualState,
  CadetAppearance,
  CharacterActorId,
  CharacterAnimState,
  CometaRuntimeState,
  GameWorld,
  NpcVariant,
  PlayerPose,
  RegionId,
  Vec3,
  WorldCallbacks,
  WorldMetrics,
  WorldTarget,
} from '../contracts';
import {
  COMPANION_RADIUS,
  EARTH_GRAVITY,
  MOON_GRAVITY,
  NPC_PLACEMENTS,
  OBSTACLES,
  PLAYER_RADIUS,
  RAMPS,
  REGIONS,
  generateScatterPlacements,
  getTerrainHeight,
} from './manifest';
import {
  advanceMotion,
  followPosition,
  selectCometaLocomotionClip,
  selectLocomotionClip,
  selectRobotLocomotionClip,
  shortestAngleDelta,
  validateSafeRecallTarget,
  type MotionState,
} from '../actors/movement';

const STATIC_MODELS = ['habitat', 'greenhouse', 'battery', 'water', 'oxygen', 'solar'] as const;
const CHARACTER_MODELS = ['astronaut', 'human-npc', 'pip', 'scout', 'cometa'] as const;

type StaticModelName = (typeof STATIC_MODELS)[number];
type CharacterModelName = (typeof CHARACTER_MODELS)[number];
type AnyModelName = StaticModelName | CharacterModelName;

export interface CreateGameWorldOptions {
  /** Optional externally managed Babylon engine (e.g. NullEngine in headless tests). */
  engine?: AbstractEngine;
  /** Dispose an externally passed engine when `world.dispose()` runs (default false). */
  disposeEngine?: boolean;
  /** Attempt WebGPU before falling back to WebGL 2 in browser mode (default true). */
  preferWebGPU?: boolean;
  /** Override base URL for asset loading (defaults to Vite `import.meta.env.BASE_URL`). */
  assetBaseUrl?: string;
  /** Custom asset path/URI resolver for offline or NullEngine tests. */
  resolveModelUrl?: (relativePath: string) => string | Promise<string>;
}

export interface WorldDebugSnapshot {
  engine: string;
  renderer: string;
  region: RegionId;
  paused: boolean;
  reducedMotion: boolean;
  fogMode: number;
  loadedModels: string[];
  fallbackModels: string[];
  disposedRegions: number;
  auxState: AuxVisualState;
  cadetAppearance: CadetAppearance;
  cometa: {
    enabled: boolean;
    mode: string;
    effectiveMode: string;
    pressurized: boolean;
    clip: string;
    position: { x: number; y: number; z: number } | null;
  };
  actors: Record<
    string,
    {
      clip: string;
      loop: boolean;
      paused: boolean;
      usingFallback: boolean;
      skeletons: number;
      textureBoneMatrices: boolean;
      animationGroups: number;
      position: { x: number; y: number; z: number };
      visibleAccessories?: string[];
    }
  >;
  sceneCounts: {
    meshes: number;
    skeletons: number;
    animationGroups: number;
    materials: number;
    textures: number;
    lights: number;
  };
  metrics: WorldMetrics;
}

declare global {
  interface Window {
    __ASTRA_WORLD_DEBUG__?: {
      readonly getSnapshot: () => WorldDebugSnapshot;
    };
  }
}

const SUIT_ACCENT_HEX: Record<string, string> = {
  orange: '#ed702b',
  cyan: '#53c8dc',
  emerald: '#44c48a',
  cobalt: '#4b8bff',
};

const VISOR_TONE_HEX: Record<string, string> = {
  gold: '#e6b44d',
  cyan: '#53c8dc',
  slate: '#5c7085',
};

const SKIN_TONE_HEX: Record<string, string> = {
  fair: '#f0cbb2',
  light: '#dfad8d',
  medium: '#c58a66',
  tan: '#9c6747',
  deep: '#6b4431',
};

const NPC_ACCESSORIES: Record<NpcVariant, readonly string[]> = {
  reyes: ['HumanNpc_Body', 'Reyes_Beard', 'Reyes_Hair', 'Reyes_CommandJacket'],
  lia: ['HumanNpc_Body', 'Lia_Glasses', 'Lia_HairBun', 'Lia_Vest'],
  elena: ['HumanNpc_Body', 'Elena_CurlyHair', 'Elena_Headband', 'Elena_LabCoat'],
};

const ALL_NPC_ACCESSORY_PREFIXES = [
  'Reyes_Beard',
  'Reyes_Hair',
  'Reyes_CommandJacket',
  'Lia_Glasses',
  'Lia_HairBun',
  'Lia_Vest',
  'Elena_CurlyHair',
  'Elena_Headband',
  'Elena_LabCoat',
] as const;

interface RigController {
  readonly actorKey: string;
  readonly modelName: CharacterModelName;
  readonly root: TransformNode;
  readonly usingFallback: boolean;
  entry: InstantiatedEntries | undefined;
  clonedMaterials: Material[];
  groups: Map<string, AnimationGroup>;
  currentClip: string;
  currentLoop: boolean;
  oneShotClip: string | null;
  oneShotRemaining: number;
  visibleAccessories: string[];
  playClip(
    clip: string,
    opts?: { loop?: boolean; speed?: number; blendSeconds?: number; forceRestart?: boolean; paused?: boolean },
  ): void;
  interruptOneShot(): void;
  update(dt: number, paused: boolean): void;
  setPaused(paused: boolean): void;
  dispose(): void;
}

function normalizeClipKey(rawName: string, instanceTag: string): string {
  const prefix = `${instanceTag}:`;
  return rawName.startsWith(prefix) ? rawName.slice(prefix.length) : rawName;
}

function estimateClipDurationSeconds(group: AnimationGroup, speed: number): number {
  const fps = group.targetedAnimations[0]?.animation?.framePerSecond || 60;
  const span = Math.max(1, group.to - group.from);
  return span / (fps * Math.max(0.15, speed));
}

function clampByte(v: number): number {
  return Math.max(0, Math.min(255, Math.round(v)));
}

function hash2D(ix: number, iy: number, seed: number): number {
  let n = (ix * 374761393 + iy * 668265263 + seed * 1442695041) | 0;
  n = (n ^ (n >>> 13)) | 0;
  n = Math.imul(n, 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
}

function periodicNoise2D(u: number, v: number, period: number, seed: number): number {
  const x = u * period;
  const y = v * period;
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const wrap = (n: number) => ((n % period) + period) % period;
  const x0 = wrap(ix);
  const x1 = wrap(ix + 1);
  const y0 = wrap(iy);
  const y1 = wrap(iy + 1);
  const n00 = hash2D(x0, y0, seed);
  const n10 = hash2D(x1, y0, seed);
  const n01 = hash2D(x0, y1, seed);
  const n11 = hash2D(x1, y1, seed);
  const nx0 = n00 + (n10 - n00) * sx;
  const nx1 = n01 + (n11 - n01) * sx;
  return nx0 + (nx1 - nx0) * sy;
}

function periodicFbm(u: number, v: number, basePeriod: number, octaves: number, seed: number): number {
  let sum = 0;
  let amp = 0.5;
  let norm = 0;
  let period = basePeriod;
  for (let o = 0; o < octaves; o++) {
    sum += amp * periodicNoise2D(u, v, period, seed + o * 97);
    norm += amp;
    amp *= 0.5;
    period *= 2;
  }
  return sum / norm;
}

interface ProceduralPixel {
  r: number;
  g: number;
  b: number;
  h: number;
}

function generateTileablePixelBuffers(
  size: number,
  normalStrength: number,
  sampler: (u: number, v: number, x: number, y: number) => ProceduralPixel,
): { albedoRgba: Uint8Array; bumpRgba: Uint8Array } {
  const albedoRgba = new Uint8Array(size * size * 4);
  const bumpRgba = new Uint8Array(size * size * 4);
  const heights = new Float32Array(size * size);

  for (let y = 0; y < size; y++) {
    const v = y / size;
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const px = sampler(u, v, x, y);
      const idx = y * size + x;
      heights[idx] = px.h;
      const o = idx * 4;
      albedoRgba[o] = clampByte(px.r);
      albedoRgba[o + 1] = clampByte(px.g);
      albedoRgba[o + 2] = clampByte(px.b);
      albedoRgba[o + 3] = 255;
    }
  }

  const hAt = (x: number, y: number) => heights[((y + size) % size) * size + ((x + size) % size)];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const tl = hAt(x - 1, y - 1);
      const t = hAt(x, y - 1);
      const tr = hAt(x + 1, y - 1);
      const l = hAt(x - 1, y);
      const r = hAt(x + 1, y);
      const bl = hAt(x - 1, y + 1);
      const b = hAt(x, y + 1);
      const br = hAt(x + 1, y + 1);

      const dx = (tr + 2 * r + br - (tl + 2 * l + bl)) * normalStrength;
      const dy = (bl + 2 * b + br - (tl + 2 * t + tr)) * normalStrength;
      const nz = 1.0;
      const inv = 1 / Math.hypot(dx, dy, nz);

      const o = (y * size + x) * 4;
      bumpRgba[o] = clampByte((-dx * inv * 0.5 + 0.5) * 255);
      bumpRgba[o + 1] = clampByte((-dy * inv * 0.5 + 0.5) * 255);
      bumpRgba[o + 2] = clampByte((nz * inv * 0.5 + 0.5) * 255);
      bumpRgba[o + 3] = 255;
    }
  }

  return { albedoRgba, bumpRgba };
}

/** Builds deterministic RGBA cube faces (+X, -X, +Y, -Y, +Z, -Z) for offline PBR reflections. */
export function buildProceduralEnvFaces(mode: 'lunar' | 'earth', size = 32): Uint8Array[] {
  const dirs: Array<(s: number, t: number) => [number, number, number]> = [
    (s, t) => [1, -t, -s], // +X
    (s, t) => [-1, -t, s], // -X
    (s, t) => [s, 1, t], // +Y
    (s, t) => [s, -1, -t], // -Y
    (s, t) => [s, -t, 1], // +Z
    (s, t) => [-s, -t, -1], // -Z
  ];
  const sunLen = Math.hypot(-0.45, 0.72, 0.35);
  const sunDir: [number, number, number] = [-0.45 / sunLen, 0.72 / sunLen, 0.35 / sunLen];
  const earthLen = Math.hypot(-0.35, 0.45, 0.8);
  const earthDir: [number, number, number] = [-0.35 / earthLen, 0.45 / earthLen, 0.8 / earthLen];

  return dirs.map((mapFn, faceIdx) => {
    const face = new Uint8Array(size * size * 4);
    for (let y = 0; y < size; y++) {
      const t = ((y + 0.5) / size) * 2 - 1;
      for (let x = 0; x < size; x++) {
        const s = ((x + 0.5) / size) * 2 - 1;
        const [rx, ry, rz] = mapFn(s, t);
        const len = Math.hypot(rx, ry, rz);
        const dx = rx / len;
        const dy = ry / len;
        const dz = rz / len;
        const sunDot = Math.max(0, dx * sunDir[0] + dy * sunDir[1] + dz * sunDir[2]);
        const sunGlow = Math.pow(sunDot, 22) * 210 + Math.pow(sunDot, 4) * 38;

        let r = 0;
        let g = 0;
        let b = 0;
        if (mode === 'earth') {
          if (dy >= 0) {
            const skyT = Math.min(1, dy);
            r = 165 - skyT * 85 + sunGlow;
            g = 198 - skyT * 52 + sunGlow * 0.95;
            b = 230 + skyT * 18 + sunGlow * 0.82;
          } else {
            const groundT = Math.min(1, -dy);
            r = 115 - groundT * 42;
            g = 128 - groundT * 34;
            b = 102 - groundT * 42;
          }
        } else {
          const earthDot = Math.max(0, dx * earthDir[0] + dy * earthDir[1] + dz * earthDir[2]);
          const earthGlow = Math.pow(earthDot, 16) * 85;
          if (dy >= 0) {
            const star = hash2D(x + faceIdx * 41, y + faceIdx * 17, 777) > 0.985 ? 165 : 0;
            r = 10 + sunGlow * 0.95 + earthGlow * 0.35 + star;
            g = 14 + sunGlow * 0.94 + earthGlow * 0.62 + star;
            b = 24 + sunGlow * 0.88 + earthGlow + star;
          } else {
            const regBounce = 34 + Math.max(0, 1 + dy) * 26;
            r = regBounce + sunGlow * 0.25;
            g = regBounce + 2 + sunGlow * 0.24;
            b = regBounce + 6 + sunGlow * 0.22;
          }
        }

        const o = (y * size + x) * 4;
        face[o] = clampByte(r);
        face[o + 1] = clampByte(g);
        face[o + 2] = clampByte(b);
        face[o + 3] = 255;
      }
    }
    return face;
  });
}

function displaceCraggyMesh(mesh: Mesh, seed: number, amplitude = 0.24, flattenBottom = true): Mesh {
  const pos = mesh.getVerticesData('position');
  if (pos) {
    for (let i = 0; i < pos.length; i += 3) {
      const vx = pos[i];
      const vy = pos[i + 1];
      const vz = pos[i + 2];
      const len = Math.hypot(vx, vy, vz);
      if (len < 1e-4) continue;
      const nx = vx / len;
      const ny = vy / len;
      const nz = vz / len;
      const n1 = Math.sin(nx * 5.2 + seed) * Math.cos(nz * 4.7 - seed * 0.6);
      const n2 = Math.cos((ny + nx) * 8.4 + seed * 1.3) * Math.sin((nz - ny) * 7.1);
      const scale = 1 + amplitude * (0.65 * n1 + 0.35 * n2);
      let outY = vy * scale;
      if (flattenBottom && outY < -0.18) {
        outY *= 0.55;
      }
      pos[i] = vx * scale;
      pos[i + 1] = outY;
      pos[i + 2] = vz * scale;
    }
    mesh.updateVerticesData('position', pos);
  }
  mesh.convertToFlatShadedMesh();
  return mesh;
}

function createCharacterStandIn(
  name: CharacterModelName,
  scene: Scene,
  root: TransformNode,
  white: PBRMaterial,
  orange: PBRMaterial,
  accent: PBRMaterial,
  dark: PBRMaterial,
): void {
  const pbrTint = (m: PBRMaterial, targetName: string) => {
    const b = CreateBox(targetName, { width: 0.48, height: 0.72, depth: 0.34 }, scene);
    b.material = m;
    b.parent = root;
    return b;
  };
  if (name === 'astronaut' || name === 'human-npc') {
    const torso = pbrTint(name === 'astronaut' ? white : dark, `${name}-standin-torso`);
    torso.position.y = 1.05;
    const head = CreateSphere(`${name}-standin-head`, { diameter: 0.34, segments: 8 }, scene);
    head.position.set(0, 1.56, 0);
    head.material = name === 'astronaut' ? accent : orange;
    head.parent = root;
  } else if (name === 'cometa') {
    const body = CreateBox('cometa-standin-body', { width: 0.32, height: 0.28, depth: 0.78 }, scene);
    body.position.set(0, 0.3, 0);
    body.material = orange;
    body.parent = root;
    const head = CreateSphere('cometa-standin-head', { diameter: 0.26, segments: 8 }, scene);
    head.position.set(0, 0.42, 0.4);
    head.material = white;
    head.parent = root;
  } else {
    const hull = CreateSphere(`${name}-standin-hull`, { diameter: 0.56, segments: 10 }, scene);
    hull.position.set(0, 0.75, 0);
    hull.material = name === 'scout' ? orange : white;
    hull.parent = root;
    const eye = CreateBox(`${name}-standin-visor`, { width: 0.3, height: 0.14, depth: 0.12 }, scene);
    eye.position.set(0, 0.78, 0.25);
    eye.material = accent;
    eye.parent = root;
  }
}

export async function createGameWorld(
  canvas: HTMLCanvasElement,
  callbacks: WorldCallbacks,
  options: CreateGameWorldOptions = {},
): Promise<GameWorld> {
  const assetBase = options.assetBaseUrl ?? import.meta.env?.BASE_URL ?? '/';
  const hasDom = typeof document !== 'undefined' && typeof window !== 'undefined';

  async function initEngine(): Promise<{
    engine: AbstractEngine;
    ownsEngine: boolean;
    engineLabel: string;
  }> {
    if (options.engine) {
      const extEngine = options.engine as AbstractEngine & { description?: string };
      const nullCheck =
        extEngine.constructor?.name === 'NullEngine' ||
        Boolean(extEngine.description?.toLowerCase().includes('null'));
      const label = nullCheck ? 'NullEngine' : options.engine.isWebGPU ? 'WebGPU' : 'WebGL 2';
      return { engine: options.engine, ownsEngine: false, engineLabel: label };
    }

    if (
      options.preferWebGPU !== false &&
      typeof navigator !== 'undefined' &&
      'gpu' in navigator &&
      typeof WebGPUEngine?.IsSupportedAsync !== 'undefined'
    ) {
      try {
        const supported = await WebGPUEngine.IsSupportedAsync;
        if (supported) {
          const gpuEngine = new WebGPUEngine(canvas, { antialias: true, stencil: true });
          await gpuEngine.initAsync();
          return { engine: gpuEngine, ownsEngine: true, engineLabel: 'WebGPU' };
        }
      } catch {
        // Transparently fall back to WebGL 2 when WebGPU adapter creation fails.
      }
    }

    try {
      const glEngine = new Engine(canvas, true, {
        preserveDrawingBuffer: false,
        stencil: true,
        disableWebGL2Support: false,
      });
      if (glEngine.webGLVersion < 2) {
        glEngine.dispose();
        throw new Error('WebGL 2 is required to explore ASTRA.');
      }
      return { engine: glEngine, ownsEngine: true, engineLabel: 'WebGL 2' };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      callbacks.onError(`Unable to start the 3D world: ${message}`);
      throw error;
    }
  }

  const { engine, ownsEngine, engineLabel } = await initEngine();

  const shouldDisposeEngine = options.disposeEngine ?? ownsEngine;
  const isNullEngine = engineLabel === 'NullEngine';

  const scene = new Scene(engine);
  scene.collisionsEnabled = true;
  scene.clearColor = new Color4(0.014, 0.026, 0.065, 1);

  const camera = new ArcRotateCamera('follow-camera', -Math.PI / 2, 1.05, 12, new Vector3(0, 1, 0), scene);
  camera.checkCollisions = true;
  camera.collisionRadius = new Vector3(0.3, 0.3, 0.3);
  camera.lowerRadiusLimit = 5;
  camera.upperRadiusLimit = 22;
  camera.lowerBetaLimit = 0.42;
  camera.upperBetaLimit = 1.43;
  camera.wheelPrecision = 35;
  if (hasDom && canvas && !isNullEngine) {
    camera.attachControl(canvas, true);
  }
  camera.inputs.removeByType('ArcRotateCameraKeyboardMoveInput');

  const hemi = new HemisphericLight('fill', new Vector3(0, 1, 0), scene);
  hemi.intensity = 0.72;
  hemi.groundColor = new Color3(0.2, 0.22, 0.28);

  const sun = new DirectionalLight('sun', new Vector3(-0.55, -1, 0.35), scene);
  sun.intensity = 1.5;

  const instrumentation = new SceneInstrumentation(scene);
  const shadows = new ShadowGenerator(1024, sun);
  shadows.useBlurExponentialShadowMap = true;

  const staticCache = new Map<StaticModelName, AssetContainer>();
  const charCache = new Map<CharacterModelName, AssetContainer>();
  const loadedModels: string[] = [];
  const fallbackModels: string[] = [];

  async function loadGlbContainer(relPath: string): Promise<AssetContainer> {
    if (options.resolveModelUrl) {
      const resolved = await options.resolveModelUrl(relPath);
      return SceneLoader.LoadAssetContainerAsync('', resolved, scene, undefined, '.glb');
    }
    const cleanRel = relPath.replace(/^\/+/, '');
    const slashIdx = cleanRel.lastIndexOf('/');
    const dir = slashIdx >= 0 ? `${assetBase}${cleanRel.slice(0, slashIdx + 1)}` : assetBase;
    const file = slashIdx >= 0 ? cleanRel.slice(slashIdx + 1) : cleanRel;
    return SceneLoader.LoadAssetContainerAsync(dir, file, scene, undefined, '.glb');
  }

  await Promise.all([
    ...STATIC_MODELS.map(async (name) => {
      const rel = `assets/models/${name}.glb`;
      try {
        staticCache.set(name, await loadGlbContainer(rel));
        loadedModels.push(name);
      } catch {
        fallbackModels.push(name);
        callbacks.onError(`Could not load local model ${name}.glb; a simple stand-in will be used.`);
      }
    }),
    ...CHARACTER_MODELS.map(async (name) => {
      const rel = `assets/models/characters/${name}-animated.glb`;
      try {
        charCache.set(name, await loadGlbContainer(rel));
        loadedModels.push(`${name}-animated`);
      } catch {
        fallbackModels.push(`${name}-animated`);
        callbacks.onError(`Could not load character rig ${name}-animated.glb; a stand-in will be used.`);
      }
    }),
  ]);

  try {
    scene.imageProcessingConfiguration.toneMappingEnabled = true;
    scene.imageProcessingConfiguration.toneMappingType = ImageProcessingConfiguration.TONEMAPPING_ACES;
    scene.imageProcessingConfiguration.exposure = 1.12;
    scene.imageProcessingConfiguration.contrast = 1.12;
  } catch {
    // Headless engines without full post-processing stay cleanly unaffected.
  }

  const sharedTextures: BaseTexture[] = [];
  let lunarEnvCube: BaseTexture | null = null;
  let earthEnvCube: BaseTexture | null = null;
  try {
    lunarEnvCube = new RawCubeTexture(
      scene,
      buildProceduralEnvFaces('lunar', 32),
      32,
      Constants.TEXTUREFORMAT_RGBA,
      Constants.TEXTURETYPE_UNSIGNED_BYTE,
      false,
      false,
      Texture.BILINEAR_SAMPLINGMODE,
    );
    earthEnvCube = new RawCubeTexture(
      scene,
      buildProceduralEnvFaces('earth', 32),
      32,
      Constants.TEXTUREFORMAT_RGBA,
      Constants.TEXTURETYPE_UNSIGNED_BYTE,
      false,
      false,
      Texture.BILINEAR_SAMPLINGMODE,
    );
    sharedTextures.push(lunarEnvCube, earthEnvCube);
  } catch {
    lunarEnvCube?.dispose();
    earthEnvCube?.dispose();
    lunarEnvCube = null;
    earthEnvCube = null;
  }

  const makePbr = (name: string, hex: string, metallic = 0, roughness = 0.8) => {
    const m = new PBRMaterial(name, scene);
    m.albedoColor = Color3.FromHexString(hex);
    m.metallic = metallic;
    m.roughness = roughness;
    m.maxSimultaneousLights = 6;
    return m;
  };

  const makeTexturedPbr = (
    name: string,
    metallic: number,
    roughness: number,
    size: number,
    uScale: number,
    vScale: number,
    bumpLevel: number,
    normalStrength: number,
    sampler: (u: number, v: number, x: number, y: number) => ProceduralPixel,
  ) => {
    const { albedoRgba, bumpRgba } = generateTileablePixelBuffers(size, normalStrength, sampler);
    const albedo = RawTexture.CreateRGBATexture(
      albedoRgba,
      size,
      size,
      scene,
      true,
      false,
      Texture.TRILINEAR_SAMPLINGMODE,
      Constants.TEXTURETYPE_UNSIGNED_BYTE,
    );
    albedo.wrapU = Texture.WRAP_ADDRESSMODE;
    albedo.wrapV = Texture.WRAP_ADDRESSMODE;
    albedo.uScale = uScale;
    albedo.vScale = vScale;
    albedo.gammaSpace = true;

    const bump = RawTexture.CreateRGBATexture(
      bumpRgba,
      size,
      size,
      scene,
      true,
      false,
      Texture.TRILINEAR_SAMPLINGMODE,
      Constants.TEXTURETYPE_UNSIGNED_BYTE,
    );
    bump.wrapU = Texture.WRAP_ADDRESSMODE;
    bump.wrapV = Texture.WRAP_ADDRESSMODE;
    bump.uScale = uScale;
    bump.vScale = vScale;
    bump.gammaSpace = false;
    bump.level = bumpLevel;

    sharedTextures.push(albedo, bump);

    const m = new PBRMaterial(name, scene);
    m.albedoColor = Color3.White();
    m.albedoTexture = albedo;
    m.bumpTexture = bump;
    m.metallic = metallic;
    m.roughness = roughness;
    m.maxSimultaneousLights = 6;
    return m;
  };

  // Aerospace brushed ceramic hull panels with modular seams and rivet dimples
  const white = makeTexturedPbr('ceramic', 0.16, 0.48, 128, 3, 3, 0.85, 2.2, (u, v, x, y) => {
    const gx = (u * 2) % 1;
    const gy = (v * 2) % 1;
    const seam = gx < 0.03 || gy < 0.03 ? -0.35 : 0;
    const rivet =
      (Math.hypot(gx - 0.09, gy - 0.09) < 0.024 || Math.hypot(gx - 0.91, gy - 0.91) < 0.024) ? 0.22 : 0;
    const grain = periodicFbm(u, v, 8, 3, 11) * 0.14 + hash2D(x, y, 17) * 0.04;
    const shade = 212 + seam * 75 + rivet * 30 + grain * 36;
    return { r: shade - 2, g: shade + 3, b: shade + 7, h: 0.55 + seam + rivet + grain * 0.4 };
  });

  // Anti-slip ribbed aerospace walkway decking & dog-friendly ramp tread
  const walkwayMat = makeTexturedPbr('walkway-deck', 0.28, 0.48, 128, 2, 10, 1.15, 2.5, (u, v, x, y) => {
    const rib = Math.sin(v * Math.PI * 16) > 0.35 ? 0.16 : -0.10;
    const border = u < 0.08 || u > 0.92 ? -0.24 : 0;
    const centerGroove = Math.abs(u - 0.5) < 0.025 ? -0.16 : 0;
    const plateSeam = (v * 2) % 1 < 0.03 ? -0.22 : 0;
    const wear = periodicFbm(u, v, 6, 3, 29) * 0.18 + hash2D(x, y, 31) * 0.05;
    const base = 178 + rib * 36 + border * 68 + centerGroove * 45 + plateSeam * 50 + wear * 34;
    return { r: base - 4, g: base + 1, b: base + 7, h: 0.5 + rib + border + centerGroove + plateSeam + wear * 0.35 };
  });

  const orange = makeTexturedPbr('safety-orange', 0.14, 0.44, 64, 2, 2, 0.55, 1.4, (u, v, x, y) => {
    const brush = periodicFbm(u * 3, v, 8, 2, 41) * 0.16 + hash2D(x, y, 43) * 0.04;
    return { r: 226 + brush * 22, g: 102 + brush * 22, b: 36 + brush * 14, h: 0.5 + brush };
  });

  const yellow = makeTexturedPbr('handrail-yellow', 0.25, 0.38, 64, 2, 2, 0.5, 1.4, (u, v, x, y) => {
    const brush = periodicFbm(u * 2, v * 2, 8, 2, 53) * 0.14 + hash2D(x, y, 59) * 0.04;
    return { r: 232 + brush * 18, g: 176 + brush * 22, b: 48 + brush * 16, h: 0.5 + brush };
  });

  // Machined graphite bulkhead / orbital deck grating
  const dark = makeTexturedPbr('graphite', 0.42, 0.52, 128, 6, 6, 0.95, 2.4, (u, v, x, y) => {
    const slot = ((u * 8) % 1 < 0.22 || (v * 8) % 1 < 0.22) ? -0.28 : 0.1;
    const grain = periodicFbm(u, v, 8, 2, 67) * 0.12 + hash2D(x, y, 71) * 0.04;
    const base = 44 + slot * 28 + grain * 22;
    return { r: base - 4, g: base + 6, b: base + 18, h: 0.5 + slot + grain * 0.4 };
  });

  // Organic multi-scale lunar regolith: domain-warped irregular craters, ejecta grit & basalt relief
  const craters: Array<[number, number, number, number]> = [
    [0.19, 0.27, 0.095, 0.24],
    [0.64, 0.18, 0.058, 0.20],
    [0.48, 0.62, 0.115, 0.26],
    [0.12, 0.78, 0.046, 0.18],
    [0.83, 0.71, 0.078, 0.22],
    [0.37, 0.36, 0.032, 0.16],
    [0.74, 0.44, 0.041, 0.17],
    [0.58, 0.87, 0.036, 0.15],
    [0.91, 0.29, 0.052, 0.19],
  ];
  const groundMat = makeTexturedPbr('regolith', 0.02, 0.93, 256, 5, 5, 1.45, 3.2, (u, v, x, y) => {
    const macroFbm = periodicFbm(u, v, 5, 4, 101);
    const fineFbm = periodicFbm(u, v, 14, 3, 139);
    // Domain-warp lookup coordinates so craters never form uniform stamp circles
    const wu = u + 0.028 * (periodicFbm(u + 0.17, v + 0.41, 4, 3, 127) - 0.5);
    const wv = v + 0.028 * (periodicFbm(u + 0.63, v + 0.11, 4, 3, 131) - 0.5);
    let craterOffset = 0;
    let ejectaGlow = 0;
    for (const [cx, cy, rad, depth] of craters) {
      let du = wu - cx;
      let dv = wv - cy;
      if (du > 0.5) du -= 1;
      if (du < -0.5) du += 1;
      if (dv > 0.5) dv -= 1;
      if (dv < -0.5) dv += 1;
      const dist = Math.hypot(du, dv) / rad;
      if (dist < 1.55) {
        const ang = Math.atan2(dv, du);
        const rimWarp = 1 + 0.14 * Math.sin(ang * 3 + cx * 19) + 0.08 * Math.cos(ang * 5 - cy * 23);
        const wd = dist / rimWarp;
        if (wd < 0.78) {
          craterOffset -= (1 - (wd / 0.78) ** 2) * depth;
        } else if (wd < 1.35) {
          craterOffset += Math.exp(-Math.pow((wd - 0.96) * 4.8, 2)) * (depth * 0.48);
          ejectaGlow += Math.max(0, 1 - Math.abs(wd - 1.1) * 2.5) * 0.08;
        }
      }
    }
    const grit = hash2D(x, y, 109) > 0.93 ? -0.16 : (hash2D(x, y, 113) - 0.5) * 0.12;
    const h = 0.54 + (macroFbm - 0.5) * 0.56 + (fineFbm - 0.5) * 0.24 + craterOffset + grit * 0.55;
    const shade = 104 + (h - 0.5) * 58 + ejectaGlow * 70 + grit * 26;
    return { r: shade - 2, g: shade, b: shade + 6, h };
  });

  // Dark fractured volcanic lunar basalt for boulders, canyon walls & cave overhang
  const rockMat = makeTexturedPbr('canyon-basalt', 0.06, 0.88, 128, 3, 3, 1.45, 3.2, (u, v, x, y) => {
    const fbm = periodicFbm(u, v, 4, 4, 211);
    const strata = Math.sin((v * 5 + fbm * 1.8) * Math.PI * 2) * 0.16;
    const fissure = Math.abs(periodicNoise2D(u + 0.15, v, 8, 223) - 0.5) < 0.06 ? -0.34 : 0;
    const grit = hash2D(x, y, 227) * 0.08;
    const h = 0.52 + (fbm - 0.5) * 0.48 + strata + fissure + grit * 0.3;
    const shade = 78 + (h - 0.5) * 44;
    return { r: shade - 2, g: shade + 1, b: shade + 8, h };
  });

  // Deep-blue photovoltaic cell grid with bright silver busbars
  const solarMat = makeTexturedPbr('solar-cells', 0.55, 0.24, 128, 4, 4, 0.75, 2.0, (u, v, x, y) => {
    const cu = (u * 4) % 1;
    const cv = (v * 8) % 1;
    const grid = cu < 0.05 || cv < 0.04 ? 1 : 0;
    const fineBus = (u * 16) % 1 < 0.03 ? 0.45 : 0;
    if (grid) {
      return { r: 196, g: 214, b: 232, h: 0.86 };
    }
    const sheen = periodicFbm(u, v, 4, 2, 307) * 0.12 + hash2D(x, y, 311) * 0.03;
    return {
      r: 22 + fineBus * 110 + sheen * 16,
      g: 48 + fineBus * 125 + sheen * 24,
      b: 98 + fineBus * 110 + sheen * 32,
      h: 0.4 + fineBus * 0.25 + sheen * 0.2,
    };
  });

  // Terrestrial Academy courtyard terrazzo/stone pavers with varied tile seams & architectural weathering
  const academyFloorMat = makeTexturedPbr('academy-floor', 0.06, 0.68, 256, 6, 6, 0.95, 2.3, (u, v, x, y) => {
    const tu = Math.floor(u * 4);
    const tv = Math.floor(v * 4);
    const joint = (u * 4) % 1 < 0.032 || (v * 4) % 1 < 0.032 ? -0.36 : 0;
    const subJoint = (u * 8) % 1 < 0.015 ? -0.1 : 0;
    const tileTone = (hash2D(tu, tv, 401) - 0.5) * 0.22;
    const grain = periodicFbm(u, v, 8, 3, 409) * 0.18 + hash2D(x, y, 419) * 0.05;
    const aggregate = hash2D(x, y, 431) > 0.95 ? -16 : 0;
    const shade = 188 + joint * 72 + subJoint * 32 + tileTone * 48 + grain * 28 + aggregate;
    return { r: shade - 3, g: shade, b: shade + 6, h: 0.55 + joint + subJoint * 0.5 + grain * 0.35 };
  });

  // Earth organic grass & clover groundcover
  const earthSoilMat = makeTexturedPbr('earth-grass', 0.0, 0.94, 128, 18, 18, 0.95, 2.4, (u, v, x, y) => {
    const patch = periodicFbm(u, v, 6, 4, 503);
    const blade = hash2D(x, y, 509) * 0.18;
    const h = 0.45 + patch * 0.42 + blade * 0.3;
    return { r: 66 + patch * 32 + blade * 16, g: 112 + patch * 44 + blade * 24, b: 60 + patch * 24, h };
  });

  const accent = makePbr('interface', '#53c8dc', 0.2, 0.32);
  accent.emissiveColor = new Color3(0.08, 0.34, 0.4);

  // Fibrous bark / organic growing medium
  const soil = makeTexturedPbr('soil', 0.0, 0.95, 128, 3, 3, 1.2, 2.8, (u, v, x, y) => {
    const furrow = periodicFbm(u * 2, v * 0.7, 6, 3, 601);
    const grain = hash2D(x, y, 607) * 0.12;
    const h = 0.4 + furrow * 0.5 + grain * 0.3;
    return { r: 68 + furrow * 36 + grain * 14, g: 52 + furrow * 28 + grain * 10, b: 38 + furrow * 20, h };
  });

  // Veined foliage leaves
  const leaf = makeTexturedPbr('leaves', 0.0, 0.72, 128, 2, 2, 0.8, 2.0, (u, v, x, y) => {
    const fbm = periodicFbm(u, v, 6, 3, 701);
    const vein = Math.abs(Math.sin((u * 6 + fbm * 0.6) * Math.PI)) < 0.12 ? 0.14 : 0;
    const spec = hash2D(x, y, 709) * 0.06;
    return { r: 64 + fbm * 34 + vein * 18, g: 122 + fbm * 46 + vein * 24, b: 70 + fbm * 32 + spec * 18, h: 0.48 + fbm * 0.35 + vein };
  });

  const glass = makePbr('window', '#759eac', 0.12, 0.2);
  glass.alpha = 0.36;

  // Strictly non-emissive crystalline pale specular frost/ice lit only by canyon tripod floodlights.
  const iceMat = makeTexturedPbr('lunar-frost-ice', 0.06, 0.14, 128, 3, 3, 1.2, 2.8, (u, v, x, y) => {
    const facet = periodicFbm(u, v, 6, 3, 809);
    const crack = Math.abs(periodicNoise2D(u, v + 0.2, 10, 811) - 0.5) < 0.055 ? -0.32 : 0.1;
    const glint = hash2D(x, y, 821) * 0.08;
    const h = 0.55 + (facet - 0.5) * 0.45 + crack + glint;
    return { r: 196 + facet * 38 + glint * 18, g: 224 + facet * 24 + glint * 16, b: 240 + facet * 15, h };
  });
  iceMat.emissiveColor = new Color3(0, 0, 0);

  const cableMat = makeTexturedPbr('power-cable', 0.18, 0.62, 64, 1, 8, 0.9, 2.2, (_u, v, x, y) => {
    const rib = Math.sin(v * Math.PI * 16) * 0.25;
    const g = hash2D(x, y, 907) * 0.05;
    return { r: 28 + rib * 12 + g * 10, g: 34 + rib * 14 + g * 10, b: 42 + rib * 16 + g * 10, h: 0.5 + rib };
  });

  const lanternMat = makePbr('bollard-lantern', '#ffbe6b', 0.05, 0.22);
  lanternMat.emissiveColor = new Color3(0.95, 0.62, 0.22);

  const beamMat = new StandardMaterial('flood-beam-cone', scene);
  beamMat.diffuseColor = Color3.FromHexString('#cce8ff');
  beamMat.emissiveColor = Color3.FromHexString('#cbe6ff');
  beamMat.alpha = 0.08;
  beamMat.disableLighting = true;
  beamMat.backFaceCulling = false;

  const sharedMaterials: Material[] = [
    white,
    walkwayMat,
    orange,
    yellow,
    dark,
    groundMat,
    rockMat,
    solarMat,
    academyFloorMat,
    earthSoilMat,
    accent,
    soil,
    leaf,
    glass,
    iceMat,
    cableMat,
    lanternMat,
    beamMat,
  ];

  // Dynamic visual state owned via contracts (read-only mirror of simulation visual cues)
  let currentAuxState: AuxVisualState = {
    ports: { power: false, water: false, o2: false },
    fieldKitSlots: [null, null, null],
    auxSolarKw: 0,
    stormShieldActive: false,
    telemetryRangeM: 0,
  };
  let currentCadetAppearance: CadetAppearance = {
    suitAccent: 'orange',
    visorTone: 'gold',
    skinTone: 'medium',
  };
  let cometaState: CometaRuntimeState = {
    enabled: false,
    mode: 'follow',
    region: 'academy',
    safePos: { x: 1.3, y: 0, z: -1.4 },
    heading: 0,
    pressurized: true,
    lastCue: null,
  };
  let effectiveCometaMode: 'follow' | 'wait' | 'recall' = 'follow';

  // Per-region disposable pools
  let root = new TransformNode('region', scene);
  let entries: InstantiatedEntries[] = [];
  let regionMaterials: Material[] = [];
  let regionTextures: BaseTexture[] = [];
  let regionLights: Light[] = [];
  let accentLights: Light[] = [];
  let regionPcs: PointsCloudSystem[] = [];
  let disposedRegions = 0;

  // Per-region dynamic visual handles
  let auxPortMeshes: Partial<Record<'power' | 'water' | 'o2', { mat: PBRMaterial; node: TransformNode }>> = {};
  let fieldKitSlotNodes: Array<TransformNode | null> = [];
  let auxStatusRingMat: PBRMaterial | null = null;
  let strandedScout: TransformNode | undefined;
  let strandedEntry: InstantiatedEntries | undefined;

  // Actor handles
  let actorRoot = new TransformNode('actors', scene);
  let astronautRig: RigController | undefined;
  const astronautColorSnapshots = new Map<AbstractMesh, { base: Float32Array; stride: number }>();
  let pipRig: RigController | undefined;
  let scoutRig: RigController | undefined;
  let cometaRig: RigController | undefined;
  let npcRigs: RigController[] = [];
  let cometaPos = { x: 1.3, y: 0, z: -1.5, heading: 0, prevX: 1.3, prevZ: -1.5 };
  let pipPos = { x: -1.1, y: 0, z: -1.7, heading: 0 };
  let scoutPos = { x: 1.7, y: 0, z: -1.7, heading: 0 };

  let region: RegionId = 'academy';
  let paused = false;
  let quality: 'high' | 'low' = 'high';
  let reduced = false;
  let recruited = false;
  let disposed = false;
  let transition = 0;
  let regionGeneration = 0;

  let state: MotionState = { x: 0, y: 0, z: 0, vy: 0, heading: 0, grounded: true };
  let prevStateMoving = false;
  let prevGrounded = true;
  let prevHeading = 0;
  let input = { x: 0, z: 0, jump: false, sprint: false };
  const keys = new Set<string>();
  let jumpHeld = false;
  let near: WorldTarget | null = null;
  let elapsed = 0;
  let metricTime = 0;
  let interactionTime = 0;

  const frameTimes: number[] = [];
  let lastFrameTimeMs = 16.7;

  const box = (
    name: string,
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    material: Material,
    parent: Node = root,
  ) => {
    const m = CreateBox(name, { width: w, height: h, depth: d }, scene);
    m.position.set(x, y, z);
    m.material = material;
    m.receiveShadows = true;
    m.parent = parent;
    return m;
  };

  const cylinder = (
    name: string,
    x: number,
    y: number,
    z: number,
    r: number,
    h: number,
    material: Material,
    parent: Node = root,
    tessellation = 16,
  ) => {
    const m = CreateCylinder(name, { diameter: r * 2, height: h, tessellation }, scene);
    m.position.set(x, y, z);
    m.material = material;
    m.receiveShadows = true;
    m.parent = parent;
    return m;
  };

  const sphere = (
    name: string,
    x: number,
    y: number,
    z: number,
    r: number,
    material: Material,
    parent: Node = root,
    segments = 10,
  ) => {
    const m = CreateSphere(name, { diameter: r * 2, segments }, scene);
    m.position.set(x, y, z);
    m.material = material;
    m.parent = parent;
    return m;
  };

  function createSignPlate(
    name: string,
    text: string,
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    rotY = 0,
    bgHex = '#0e1d2e',
    fgHex = '#e6fbff',
    parent: Node = root,
  ): TransformNode {
    const plate = new TransformNode(`${name}-plate`, scene);
    plate.parent = parent;
    plate.position.set(x, y, z);
    plate.rotation.y = rotY;
    box(`${name}-backing`, 0, 0, 0, w, h, 0.04, dark, plate);
    box(`${name}-rail-top`, 0, h * 0.5 + 0.015, 0, w * 1.02, 0.03, 0.055, accent, plate);
    // Double-sided planes facing South (-Z) and North (+Z) so backlit placards read upright from any side.
    const faceSouth = CreatePlane(`${name}-face-s`, { width: w * 0.94, height: h * 0.86 }, scene);
    faceSouth.parent = plate;
    faceSouth.position.set(0, 0, -0.025);
    const faceNorth = CreatePlane(`${name}-face-n`, { width: w * 0.94, height: h * 0.86 }, scene);
    faceNorth.parent = plate;
    faceNorth.position.set(0, 0, 0.025);
    faceNorth.rotation.y = Math.PI;
    if (hasDom) {
      const tex = new DynamicTexture(`${name}-tex`, { width: 512, height: 192 }, scene, false);
      tex.drawText(text, null, 114, 'bold 42px sans-serif', fgHex, bgHex, true, false);
      const ctx = tex.getContext();
      ctx.strokeStyle = '#4ad0e8';
      ctx.lineWidth = 6;
      ctx.strokeRect(8, 8, 496, 176);
      tex.update(false);
      const sm = new StandardMaterial(`${name}-mat`, scene);
      sm.diffuseTexture = tex;
      sm.emissiveTexture = tex;
      sm.emissiveColor = new Color3(0.88, 0.94, 0.98);
      sm.specularColor = new Color3(0.05, 0.05, 0.05);
      faceSouth.material = sm;
      faceNorth.material = sm;
      regionTextures.push(tex);
      regionMaterials.push(sm);
    } else {
      faceSouth.material = accent;
      faceNorth.material = accent;
    }
    return plate;
  }

  function instanceStatic(
    name: StaticModelName,
    x: number,
    y: number,
    z: number,
    scale = 1,
    rotY = 0,
    parent: Node = root,
  ): TransformNode {
    const wrapper = new TransformNode(`${name}-instance`, scene);
    wrapper.parent = parent;
    wrapper.position.set(x, y, z);
    wrapper.rotation.y = rotY;
    wrapper.scaling.setAll(scale);
    const template = staticCache.get(name);
    if (template) {
      const result = template.instantiateModelsToScene((n) => `${name}:${n}`, false, {
        doNotInstantiate: true,
      });
      entries.push(result);
      result.rootNodes.forEach((node) => {
        node.parent = wrapper;
      });
    } else {
      box(`${name}-placeholder`, 0, 0.7, 0, 1.4, 1.4, 1.4, white, wrapper);
    }
    return wrapper;
  }

  function applyNpcAccessories(wrapper: TransformNode, variant: NpcVariant): string[] {
    const keepPrefixes = new Set(NPC_ACCESSORIES[variant]);
    const visible: string[] = [];
    const allNodes: Node[] = wrapper.getDescendants(false);
    for (const node of allNodes) {
      const colonIdx = node.name.indexOf(':');
      const baseName = colonIdx >= 0 ? node.name.slice(colonIdx + 1) : node.name;
      const matchesExcluded = ALL_NPC_ACCESSORY_PREFIXES.some((prefix) =>
        baseName === prefix || baseName.startsWith(`${prefix}_primitive`),
      );
      if (!matchesExcluded) continue;
      const show = Array.from(keepPrefixes).some(
        (prefix) => baseName === prefix || baseName.startsWith(`${prefix}_primitive`),
      );
      node.setEnabled(show);
      if ('isVisible' in node) {
        (node as AbstractMesh).isVisible = show;
      }
      if (show && !visible.includes(baseName)) {
        visible.push(baseName);
      }
    }
    return visible;
  }

  function createCharacterRig(
    actorKey: string,
    modelName: CharacterModelName,
    x: number,
    y: number,
    z: number,
    scale: number,
    heading: number,
    opts: { npcVariant?: NpcVariant; cloneMaterials?: boolean; parent?: Node; castShadows?: boolean } = {},
  ): RigController {
    const wrapper = new TransformNode(`${actorKey}-root`, scene);
    wrapper.parent = opts.parent ?? actorRoot;
    wrapper.position.set(x, y, z);
    wrapper.rotation.y = heading;
    wrapper.scaling.setAll(scale);

    const template = charCache.get(modelName);
    const clonedMaterials: Material[] = [];
    const groups = new Map<string, AnimationGroup>();
    let entry: InstantiatedEntries | undefined;
    let usingFallback = false;

    if (template) {
      entry = template.instantiateModelsToScene((n) => `${actorKey}:${n}`, false, {
        doNotInstantiate: true,
      });
      entry.rootNodes.forEach((n) => {
        n.parent = wrapper;
      });
      for (const sk of entry.skeletons) {
        sk.useTextureToStoreBoneMatrices = true;
      }
      const matRemap = new Map<Material, Material>();
      if (opts.cloneMaterials) {
        for (const node of wrapper.getChildMeshes(false)) {
          if (node.material) {
            let cloned = matRemap.get(node.material);
            if (!cloned) {
              cloned = node.material.clone(`${actorKey}:${node.material.name}`) ?? node.material;
              if (cloned !== node.material) {
                clonedMaterials.push(cloned);
              }
              matRemap.set(node.material, cloned);
            }
            node.material = cloned;
          }
        }
      }
      for (const g of entry.animationGroups) {
        const cleanName = normalizeClipKey(g.name, actorKey);
        g.enableBlending = true;
        g.blendingSpeed = 0.12;
        g.stop();
        groups.set(cleanName, g);
      }
    } else {
      usingFallback = true;
      createCharacterStandIn(modelName, scene, wrapper, white, orange, accent, dark);
    }

    const visibleAccessories = opts.npcVariant ? applyNpcAccessories(wrapper, opts.npcVariant) : [];

    if (opts.castShadows !== false) {
      for (const mesh of wrapper.getChildMeshes(false)) {
        shadows.addShadowCaster(mesh);
      }
    }

    const controller: RigController = {
      actorKey,
      modelName,
      root: wrapper,
      usingFallback,
      entry,
      clonedMaterials,
      groups,
      currentClip: 'Idle',
      currentLoop: true,
      oneShotClip: null,
      oneShotRemaining: 0,
      visibleAccessories,
      playClip(clip, playOpts = {}) {
        const loop = playOpts.loop ?? true;
        const speed = playOpts.speed ?? 1;
        const blendSeconds = playOpts.blendSeconds ?? 0.14;
        const targetClip = controller.groups.has(clip) ? clip : 'Idle';
        const targetGroup = controller.groups.get(targetClip);

        if (!loop) {
          controller.oneShotClip = targetClip;
          controller.oneShotRemaining = targetGroup ? estimateClipDurationSeconds(targetGroup, speed) : 0.85;
        }

        if (
          controller.currentClip === targetClip &&
          controller.currentLoop === loop &&
          !playOpts.forceRestart &&
          targetGroup?.isStarted
        ) {
          targetGroup.speedRatio = speed;
          if (playOpts.paused) targetGroup.pause();
          return;
        }

        for (const [, g] of controller.groups) {
          if (g !== targetGroup && g.isStarted) {
            g.stop();
          }
        }

        controller.currentClip = targetClip;
        controller.currentLoop = loop;

        if (targetGroup) {
          targetGroup.enableBlending = true;
          targetGroup.blendingSpeed =
            blendSeconds > 0 ? Math.min(0.5, Math.max(0.04, 1 / (blendSeconds * 60))) : 1.0;
          targetGroup.start(loop, speed, targetGroup.from, targetGroup.to, false);
          if (playOpts.paused) {
            targetGroup.pause();
          }
        }
      },
      interruptOneShot() {
        controller.oneShotClip = null;
        controller.oneShotRemaining = 0;
      },
      update(dt, isPaused) {
        if (isPaused) return;
        if (controller.oneShotClip) {
          controller.oneShotRemaining -= dt;
          if (controller.oneShotRemaining <= 0) {
            controller.oneShotClip = null;
            controller.oneShotRemaining = 0;
          }
        }
      },
      setPaused(isPaused) {
        const active = controller.groups.get(controller.currentClip);
        if (!active) return;
        if (isPaused) {
          if (active.isStarted) active.pause();
        } else if (active.isStarted) {
          active.play(controller.currentLoop);
        }
      },
      dispose() {
        if (controller.entry) {
          for (const g of controller.entry.animationGroups) {
            g.stop();
            g.dispose();
          }
          for (const sk of controller.entry.skeletons) {
            sk.dispose();
          }
          for (const n of controller.entry.rootNodes) {
            n.dispose(false, false);
          }
          controller.entry = undefined;
        }
        controller.groups.clear();
        for (const m of controller.clonedMaterials) {
          m.dispose(true, false);
        }
        controller.clonedMaterials = [];
        controller.root.dispose(false, false);
      },
    };

    controller.playClip('Idle', { loop: true, paused });
    return controller;
  }

  function applyCadetAppearance(appearance: CadetAppearance): void {
    currentCadetAppearance = { ...appearance };
    if (!astronautRig) return;
    const accentColor = Color3.FromHexString(SUIT_ACCENT_HEX[appearance.suitAccent] ?? '#ed702b');
    const visorColor = Color3.FromHexString(VISOR_TONE_HEX[appearance.visorTone] ?? '#e6b44d');
    const skinColor = Color3.FromHexString(SKIN_TONE_HEX[appearance.skinTone] ?? '#c58a66');
    const srgbToLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
    const accentLin = { r: srgbToLinear(accentColor.r), g: srgbToLinear(accentColor.g), b: srgbToLinear(accentColor.b) };
    const skinLin = { r: srgbToLinear(skinColor.r), g: srgbToLinear(skinColor.g), b: srgbToLinear(skinColor.b) };

    for (const mat of astronautRig.clonedMaterials) {
      if (!(mat instanceof PBRMaterial)) continue;
      if (mat.name.includes('astra_luminous_cyan')) {
        mat.albedoColor = accentColor;
        mat.emissiveColor = accentColor.scale(0.32);
      } else if (mat.name.includes('astra_visor_glass')) {
        mat.albedoColor = visorColor;
        mat.emissiveColor = visorColor.scale(0.16);
      } else if (mat.name.includes('astra_skin')) {
        mat.albedoColor = skinColor;
      }
    }

    // Recolor backpack plate, shoulder pods, chest trim, bands & boots baked as orange/skin COLOR_0 vertices
    astronautColorSnapshots.forEach(({ base, stride }, node) => {
      const next = new Float32Array(base);
      for (let i = 0; i < next.length; i += stride) {
        const r = base[i];
        const g = base[i + 1];
        const b = base[i + 2];
        if (r >= 0.72 && g >= 0.08 && g <= 0.42 && b <= 0.14 && r - b >= 0.58) {
          next[i] = accentLin.r;
          next[i + 1] = accentLin.g;
          next[i + 2] = accentLin.b;
        } else if (Math.abs(r - 0.46) < 0.06 && Math.abs(g - 0.29) < 0.06 && Math.abs(b - 0.20) < 0.06) {
          next[i] = skinLin.r;
          next[i + 1] = skinLin.g;
          next[i + 2] = skinLin.b;
        }
      }
      const meshNode = node as Mesh;
      if (typeof meshNode.updateVerticesData === 'function') {
        if (meshNode.isVertexBufferUpdatable?.('color')) {
          meshNode.updateVerticesData('color', next);
        } else if (typeof meshNode.setVerticesData === 'function') {
          meshNode.setVerticesData('color', next, true, stride);
        }
      }
    });
  }

  function applyAuxVisualState(next: AuxVisualState): void {
    currentAuxState = {
      ports: { ...next.ports },
      fieldKitSlots: [...next.fieldKitSlots],
      auxSolarKw: next.auxSolarKw ?? 0,
      stormShieldActive: next.stormShieldActive ?? false,
      telemetryRangeM: next.telemetryRangeM ?? 0,
    };

    const portColors: Record<'power' | 'water' | 'o2', string> = {
      power: '#f0a63a',
      water: '#4ab6e8',
      o2: '#4cd9a8',
    };
    (['power', 'water', 'o2'] as const).forEach((portKey) => {
      const entry = auxPortMeshes[portKey];
      if (!entry) return;
      const active = Boolean(currentAuxState.ports[portKey]);
      const baseColor = Color3.FromHexString(portColors[portKey]);
      entry.mat.albedoColor = active ? baseColor : Color3.FromHexString('#364554');
      entry.mat.emissiveColor = active ? baseColor.scale(0.55) : new Color3(0, 0, 0);
      entry.node.scaling.y = active ? 1.0 : 0.45;
    });

    const activePieces = new Set(currentAuxState.fieldKitSlots.filter(Boolean));
    fieldKitSlotNodes.forEach((slotNode) => {
      if (!slotNode) return;
      const pieceId = slotNode.metadata as string | undefined;
      slotNode.setEnabled(Boolean(pieceId && activePieces.has(pieceId as 'relay_mast' | 'thermal_shield' | 'sensor_pylon')));
    });

    if (auxStatusRingMat) {
      if (currentAuxState.stormShieldActive) {
        auxStatusRingMat.albedoColor = Color3.FromHexString('#53c8dc');
        auxStatusRingMat.emissiveColor = new Color3(0.15, 0.5, 0.58);
      } else if ((currentAuxState.auxSolarKw ?? 0) > 0) {
        auxStatusRingMat.albedoColor = Color3.FromHexString('#f0b83a');
        auxStatusRingMat.emissiveColor = new Color3(0.35, 0.25, 0.06);
      } else {
        auxStatusRingMat.albedoColor = Color3.FromHexString('#344554');
        auxStatusRingMat.emissiveColor = new Color3(0, 0, 0);
      }
    }
  }

  function disposeRegion(): void {
    for (const pcs of regionPcs) {
      pcs.mesh?.material?.dispose(true, true);
      pcs.dispose();
    }
    regionPcs = [];
    for (const light of regionLights) {
      light.dispose();
    }
    regionLights = [];
    accentLights = [];
    for (const result of entries) {
      for (const g of result.animationGroups) {
        g.stop();
        g.dispose();
      }
      for (const sk of result.skeletons) sk.dispose();
      for (const n of result.rootNodes) n.dispose(false, false);
    }
    entries = [];
    for (const npc of npcRigs) {
      npc.dispose();
    }
    npcRigs = [];
    strandedScout = undefined;
    strandedEntry = undefined;
    auxPortMeshes = {};
    fieldKitSlotNodes = [];
    auxStatusRingMat = null;

    root.dispose(false, false);
    for (const m of regionMaterials) m.dispose(true, true);
    regionMaterials = [];
    for (const t of regionTextures) t.dispose();
    regionTextures = [];
    root = new TransformNode('region', scene);
    disposedRegions++;
  }

  function removeStrandedScout(): void {
    if (strandedEntry) {
      const idx = entries.indexOf(strandedEntry);
      if (idx >= 0) entries.splice(idx, 1);
      for (const g of strandedEntry.animationGroups) {
        g.stop();
        g.dispose();
      }
      for (const sk of strandedEntry.skeletons) sk.dispose();
      for (const n of strandedEntry.rootNodes) n.dispose(false, false);
      strandedEntry = undefined;
    }
    strandedScout?.dispose(false, false);
    strandedScout = undefined;
  }

  function disposeCometaInstance(): void {
    if (cometaRig) {
      cometaRig.dispose();
      cometaRig = undefined;
    }
  }

  function ensureCometaInstance(): void {
    if (!cometaState.enabled || cometaState.region !== region) {
      disposeCometaInstance();
      return;
    }
    if (!cometaRig) {
      let sx = cometaState.safePos.x;
      let sz = cometaState.safePos.z;
      if (cometaState.mode === 'follow' && scoutRig && Math.hypot(sx - scoutPos.x, sz - scoutPos.z) < 1.25) {
        sx = state.x + 1.45;
        sz = state.z - 0.45;
      }
      cometaPos = {
        x: sx,
        y: getTerrainHeight(region, sx, sz),
        z: sz,
        heading: cometaState.heading || 0,
        prevX: sx,
        prevZ: sz,
      };
      cometaRig = createCharacterRig(
        'cometa',
        'cometa',
        cometaPos.x,
        cometaPos.y,
        cometaPos.z,
        1,
        cometaPos.heading,
      );
    }
  }

  function buildTerrainMesh(id: RegionId, halfExtent: number, mat: Material): void {
    const subdiv = id === 'habitat' || id === 'canyon' ? 48 : 8;
    const ground = CreateGround(
      `${id}-terrain`,
      { width: halfExtent * 2, height: halfExtent * 2, subdivisions: subdiv, updatable: true },
      scene,
    );
    const positions = ground.getVerticesData('position');
    if (positions && (id === 'habitat' || id === 'canyon')) {
      for (let i = 0; i < positions.length; i += 3) {
        const vx = positions[i];
        const vz = positions[i + 2];
        let vy = getTerrainHeight(id, vx, vz);
        // Sink base mesh 0.025m under solid walkable ramp slabs in habitat to prevent z-fighting.
        if (id === 'habitat') {
          for (const ramp of RAMPS.habitat) {
            if (xInRampFootprint(vx, vz, ramp.xStart, ramp.porchEnd, ramp.zCenter, ramp.halfWidth)) {
              vy -= 0.025;
            }
          }
        }
        positions[i + 1] = vy;
      }
      ground.updateVerticesData('position', positions);
      const normals = new Float32Array(positions.length);
      VertexData.ComputeNormals(positions, ground.getIndices(), normals);
      ground.updateVerticesData('normal', normals);
    }
    ground.material = mat;
    ground.receiveShadows = true;
    ground.parent = root;
  }

  function xInRampFootprint(
    x: number,
    z: number,
    xStart: number,
    porchEnd: number,
    zCenter: number,
    halfWidth: number,
  ): boolean {
    return x >= xStart && x <= porchEnd && Math.abs(z - zCenter) <= halfWidth;
  }

  function buildRampWithHandrails(ramp: (typeof RAMPS.habitat)[number]): void {
    const length = ramp.xEnd - ramp.xStart;
    const dy = ramp.heightEnd - ramp.heightStart;
    const hyp = Math.hypot(length, dy);
    const pitch = Math.atan2(dy, length);
    const width = ramp.halfWidth * 2;

    const slab = CreateBox(
      `${ramp.id}-slope`,
      { width: hyp, height: 0.14, depth: width },
      scene,
    );
    slab.position.set(
      (ramp.xStart + ramp.xEnd) / 2,
      (ramp.heightStart + ramp.heightEnd) / 2 - 0.06,
      ramp.zCenter,
    );
    slab.rotation.z = pitch;
    slab.material = walkwayMat;
    slab.receiveShadows = true;
    slab.parent = root;

    // Non-slip surface cleats spaced evenly for dog-friendly traction
    for (let t = 0.15; t < 0.92; t += 0.18) {
      const cx = ramp.xStart + length * t;
      const cy = ramp.heightStart + dy * t + 0.015;
      const cleat = box(`${ramp.id}-cleat-${t.toFixed(2)}`, cx, cy, ramp.zCenter, 0.09, 0.03, width * 0.88, dark);
      cleat.rotation.z = pitch;
    }

    // Top landing porch leading flush to airlock threshold
    const porchLen = ramp.porchEnd - ramp.xEnd;
    box(
      `${ramp.id}-porch`,
      ramp.xEnd + porchLen / 2,
      ramp.heightEnd / 2,
      ramp.zCenter,
      porchLen,
      ramp.heightEnd + 0.04,
      width,
      walkwayMat,
    );

    // Yellow safety handrails flanking both sides outside >=1.8m walkable deck
    for (const side of [-1, 1]) {
      const rz = ramp.zCenter + side * (ramp.halfWidth + 0.12);
      const midY = (ramp.heightStart + ramp.heightEnd) / 2 + 0.82;
      const rail = box(`${ramp.id}-rail-${side}`, (ramp.xStart + ramp.xEnd) / 2, midY, rz, hyp + 0.2, 0.07, 0.07, yellow);
      rail.rotation.z = pitch;
      box(
        `${ramp.id}-porch-rail-${side}`,
        ramp.xEnd + porchLen / 2,
        ramp.heightEnd + 0.82,
        rz,
        porchLen + 0.1,
        0.07,
        0.07,
        yellow,
      );
      for (const frac of [0.05, 0.5, 0.98]) {
        const px = ramp.xStart + length * frac;
        const py = ramp.heightStart + dy * frac;
        cylinder(`${ramp.id}-post-${side}-${frac}`, px, py + 0.41, rz, 0.04, 0.82, yellow, root, 8);
      }
      cylinder(`${ramp.id}-post-end-${side}`, ramp.porchEnd, ramp.heightEnd + 0.41, rz, 0.04, 0.82, yellow, root, 8);
    }
  }

  function buildStarSkyAndEarth(earthPos: Vector3): void {
    // Deep crisp starfield using PointsCloudSystem (no lunar fog!).
    const pcs = new PointsCloudSystem('lunar-stars', 2.3, scene);
    pcs.addPoints(260, (particle: { position: Vector3; color: Color4 | null }, i: number) => {
      const angle = i * 2.3999632;
      const elev = 12 + ((i * 19) % 72);
      const radius = 110 + (i % 7) * 6;
      particle.position.set(Math.cos(angle) * radius, elev, Math.sin(angle) * radius);
      const tint = i % 5 === 0 ? 0.85 : 1.0;
      particle.color = new Color4(tint, tint * 0.96, 1.0, 1.0);
    });
    void pcs.buildMeshAsync().then((starMesh) => {
      if (disposed || !regionPcs.includes(pcs)) {
        starMesh.material?.dispose(true, true);
        starMesh.dispose(false, true);
        return;
      }
      starMesh.parent = root;
      starMesh.isPickable = false;
      if (starMesh.material) {
        regionMaterials.push(starMesh.material);
      }
    });
    regionPcs.push(pcs);

    const earth = CreateSphere('Earth', { diameter: 14, segments: 24 }, scene);
    earth.position.copyFrom(earthPos);
    const em = new StandardMaterial('earth-mat', scene);
    em.specularColor = new Color3(0.05, 0.05, 0.08);
    if (hasDom) {
      const earthTex = new Texture(`${assetBase}assets/textures/earth.jpg`, scene);
      em.diffuseTexture = earthTex;
      em.emissiveTexture = earthTex;
      em.emissiveColor = new Color3(0.65, 0.68, 0.72);
      regionTextures.push(earthTex);
    } else {
      em.diffuseColor = Color3.FromHexString('#2b6db8');
      em.emissiveColor = Color3.FromHexString('#1e4f8a');
    }
    earth.material = em;
    earth.parent = root;
    regionMaterials.push(em);
  }

  function buildRegolithScatter(id: 'habitat' | 'canyon'): void {
    const placements = generateScatterPlacements(id);
    if (placements.length === 0) return;

    // 3 craggy geological rock variants with flat-shaded normals, LODs, and thin-instances
    const variants: Mesh[] = [];
    for (let v = 0; v < 3; v++) {
      const rock = CreateSphere(`scatter-rock-v${v}`, { diameter: 1, segments: 5 + v, updatable: true }, scene);
      displaceCraggyMesh(rock, 13.7 * (v + 1), 0.28 + v * 0.04, true);
      rock.material = rockMat;
      rock.receiveShadows = true;
      rock.parent = root;

      const lod = CreateSphere(`scatter-rock-v${v}-lod`, { diameter: 1, segments: 3, updatable: true }, scene);
      displaceCraggyMesh(lod, 13.7 * (v + 1), 0.25, true);
      lod.material = rockMat;
      lod.parent = root;
      rock.addLODLevel(24, lod);
      variants.push(rock);
    }

    const buffers: Matrix[][] = [[], [], []];
    for (const p of placements) {
      const m = Matrix.Compose(
        new Vector3(p.scaleX, p.scaleY, p.scaleZ),
        Quaternion.FromEulerAngles(0, p.rotY, 0),
        new Vector3(p.x, p.y, p.z),
      );
      buffers[p.variant].push(m);
    }

    variants.forEach((mesh, idx) => {
      const list = buffers[idx];
      if (list.length === 0) {
        mesh.isVisible = false;
        return;
      }
      const flat = new Float32Array(list.length * 16);
      list.forEach((mat, i) => mat.copyToArray(flat, i * 16));
      mesh.thinInstanceSetBuffer('matrix', flat, 16, true);
    });
  }

  function buildSurfaceCable(name: string, points: ReadonlyArray<[number, number]>, id: RegionId): void {
    for (let i = 0; i < points.length - 1; i++) {
      const [x1, z1] = points[i];
      const [x2, z2] = points[i + 1];
      const len = Math.hypot(x2 - x1, z2 - z1);
      if (len < 0.05) continue;
      const mx = (x1 + x2) / 2;
      const mz = (z1 + z2) / 2;
      const my = getTerrainHeight(id, mx, mz) + 0.05;
      const seg = box(`${name}-seg-${i}`, mx, my, mz, 0.14, 0.08, len + 0.05, cableMat);
      seg.rotation.y = Math.atan2(x2 - x1, z2 - z1);
      if (i % 2 === 0) {
        box(`${name}-clamp-${i}`, mx, my + 0.03, mz, 0.28, 0.1, 0.18, orange);
      }
    }
  }

  function buildPathBollards(id: RegionId, z1: number, z2: number, x = 0): void {
    const midZ = (z1 + z2) / 2;
    const len = Math.abs(z2 - z1);
    const baseH = getTerrainHeight(id, x, midZ);
    box('walkway', x, baseH + 0.02, midZ, 3.0, 0.04, len, walkwayMat);
    const isOutdoorLunar = id === 'habitat' || id === 'canyon';
    let idx = 0;
    for (let z = z1; z <= z2; z += 4) {
      const y = getTerrainHeight(id, x, z);
      cylinder(`bollard-l-${z}`, x - 1.75, y + 0.19, z, 0.09, 0.38, dark, root, 10);
      cylinder(`bollard-r-${z}`, x + 1.75, y + 0.19, z, 0.09, 0.38, dark, root, 10);
      cylinder(`bollard-collar-l-${z}`, x - 1.75, y + 0.36, z, 0.1, 0.05, orange, root, 10);
      cylinder(`bollard-collar-r-${z}`, x + 1.75, y + 0.36, z, 0.1, 0.05, orange, root, 10);
      sphere(`bollard-cap-l-${z}`, x - 1.75, y + 0.43, z, 0.09, lanternMat, root, 8);
      sphere(`bollard-cap-r-${z}`, x + 1.75, y + 0.43, z, 0.09, lanternMat, root, 8);
      if (isOutdoorLunar && idx % 4 === 1 && accentLights.length < 2) {
        const pool = new PointLight(`bollard-pool-${z}`, new Vector3(x, y + 1.15, z), scene);
        pool.intensity = 1.15;
        pool.range = 8.5;
        pool.diffuse = Color3.FromHexString('#ffd18c');
        pool.setEnabled(quality === 'high');
        regionLights.push(pool);
        accentLights.push(pool);
      }
      idx++;
    }
  }

  function buildConsoleAt(id: RegionId, x: number, z: number): void {
    const y = getTerrainHeight(id, x, z);
    box('console-stand', x, y + 0.65, z, 1.4, 1.3, 0.7, white);
    const panel = box('console-screen', x, y + 1.35, z, 1.5, 0.12, 0.8, dark);
    panel.rotation.x = -0.22;
    box('console-display', x, y + 1.43, z, 1.0, 0.03, 0.5, accent);
  }

  function buildMarkerRing(id: RegionId, x: number, z: number): void {
    const y = getTerrainHeight(id, x, z);
    cylinder(`target-foot-${x}-${z}`, x, y + 0.06, z, 1.15, 0.12, dark);
    const ring = CreateTorus(`target-ring-${x}-${z}`, { diameter: 2.2, thickness: 0.04, tessellation: 24 }, scene);
    ring.position.set(x, y + 0.16, z);
    ring.material = accent;
    ring.parent = root;
  }

  function buildWalls(size: number): void {
    const wall = (x: number, z: number, w: number, d: number, h = 3.0) => {
      const surf = box('pressure-wall', x, h / 2, z, w, h, d, white);
      surf.checkCollisions = true;
      box('safety-band', x, h * 0.7, z, w + 0.02, 0.16, d + 0.02, orange);
    };
    wall(-size, 0, 0.4, size * 2);
    wall(size, 0, 0.4, size * 2);
    wall(0, size, size * 2, 0.4);
    wall(0, -size, size * 2, 0.4);
  }

  function buildNpcRosterForRegion(id: RegionId): void {
    for (const npc of NPC_PLACEMENTS[id]) {
      const rig = createCharacterRig(
        npc.id,
        'human-npc',
        npc.position.x,
        getTerrainHeight(id, npc.position.x, npc.position.z),
        npc.position.z,
        1,
        npc.heading,
        { npcVariant: npc.variant, cloneMaterials: true },
      );
      rig.playClip(npc.defaultClip, { loop: true, paused });
      npcRigs.push(rig);
    }
  }

  function buildRegion(id: RegionId): void {
    // Enforce airless lunar / space clarity: FOGMODE_EXP2 is NEVER permitted in lunar or orbital regions.
    scene.fogMode = Scene.FOGMODE_NONE;
    scene.environmentTexture = id === 'academy' ? earthEnvCube : lunarEnvCube;
    scene.environmentIntensity = id === 'academy' ? 0.72 : 0.65;

    if (id === 'academy') {
      scene.clearColor = new Color4(0.46, 0.68, 0.88, 1);
      scene.fogMode = Scene.FOGMODE_LINEAR;
      scene.fogStart = 30;
      scene.fogEnd = 96;
      scene.fogColor = new Color3(0.68, 0.78, 0.88);
      hemi.intensity = 0.92;
      sun.intensity = 1.65;

      buildTerrainMesh('academy', 24, academyFloorMat);
      buildWalls(18);
      buildPathBollards('academy', -13, 15);
      buildConsoleAt('academy', -5, 0);

      // Articulated secondary desk lamp rig (Board 05)
      box('lamp-base', -5.9, 1.32, 0.2, 0.25, 0.06, 0.25, dark);
      const arm = box('lamp-arm', -5.75, 1.66, 0.2, 0.05, 0.65, 0.05, yellow);
      arm.rotation.z = -0.35;
      box('lamp-head', -5.55, 1.94, 0.2, 0.34, 0.09, 0.2, white);
      sphere('lamp-bulb', -5.55, 1.88, 0.2, 0.08, lanternMat, root, 6);
      createSignPlate('secondary-lamp', 'LÂMPADA SECUNDÁRIA', -6.3, 2.35, 0.2, 1.7, 0.46);

      // Training desks
      for (const x of [-12, 12]) {
        for (const z of [-8, 2, 10]) {
          box('training-desk', x, 0.65, z, 3, 1.3, 1.3, white);
          box('desk-display', x, 1.4, z, 2, 0.3, 0.15, dark);
          box('display-line', x, 1.43, z - 0.1, 1.5, 0.07, 0.04, accent);
        }
      }

      // Aurora miniature briefing table (Board 05)
      box('briefing-plinth', 3.4, 0.55, 11.2, 2.3, 1.1, 1.5, dark);
      cylinder('mini-hab', 3.7, 1.24, 11.2, 0.26, 0.28, white);
      sphere('mini-dome', 4.1, 1.22, 11.4, 0.18, glass);
      box('mini-solar', 2.9, 1.22, 11.3, 0.44, 0.05, 0.28, solarMat);
      createSignPlate('briefing-sign', 'MISSAO AURORA', 3.4, 1.8, 12.1, 1.5, 0.42, Math.PI);

      // Curved glass-and-steel Academy courtyard lab wing facade (Board 05)
      const facade = new TransformNode('academy-lab-wing', scene);
      facade.parent = root;
      facade.position.set(0, 0, 17.6);
      for (let i = -3; i <= 3; i++) {
        const fx = i * 3.4;
        const arcZ = -Math.pow(i / 3.4, 2) * 1.4;
        box(`wing-mullion-${i}`, fx, 2.7, arcZ, 0.28, 5.4, 0.38, dark, facade);
        if (i < 3) {
          const panel = box(`wing-glass-${i}`, fx + 1.7, 2.6, arcZ - 0.15, 3.12, 4.4, 0.1, glass, facade);
          panel.rotation.y = -i * 0.08;
        }
      }
      box('wing-crown', 0, 5.45, -0.4, 21.5, 0.52, 1.4, white, facade);
      box('wing-trim', 0, 5.15, -0.45, 21.6, 0.14, 1.45, orange, facade);
      createSignPlate('wing-title', 'ACADEMIA ASTRA', 0, 4.9, 16.9, 3.4, 0.68, Math.PI);

      // Sunlit terrestrial Earth courtyard horizon & trees ONLY on Earth (academy)
      const meadow = CreateGround('academy-meadow', { width: 90, height: 90 }, scene);
      meadow.position.set(0, -0.1, 0);
      meadow.material = earthSoilMat;
      meadow.parent = root;
      for (const [tx, tz] of [
        [-22, 16],
        [-24, 4],
        [-22, -10],
        [22, 18],
        [24, 2],
        [22, -12],
      ]) {
        cylinder(`tree-trunk-${tx}-${tz}`, tx, 1.4, tz, 0.24, 2.8, soil);
        const canopy = sphere(`tree-canopy-${tx}-${tz}`, tx, 3.4, tz, 1.55, leaf, root, 7);
        canopy.scaling.set(1.15, 0.88, 1.1);
      }
      instanceStatic('solar', 10, 0, 8, 0.5);
      const demoCell = box('trainer-pv-face', 10, 1.35, 8.1, 1.45, 0.04, 1.05, solarMat);
      demoCell.rotation.x = -0.42;
    }

    if (id === 'orbit') {
      scene.clearColor = new Color4(0.01, 0.016, 0.04, 1);
      hemi.intensity = 0.78;
      sun.intensity = 1.25;
      buildTerrainMesh('orbit', 14, dark);
      buildStarSkyAndEarth(new Vector3(0, 6, 42));
      buildWalls(14);
      buildPathBollards('orbit', -11, 12);

      // Curved orbital hull ribs, yellow cabin handrails & external solar array wing glimpse (Board 06)
      for (let z = -8; z <= 10; z += 5) {
        box('cabin-handrail-l', -10, 1.2, z, 0.12, 0.12, 3, yellow);
        box('cabin-handrail-r', 10, 1.2, z, 0.12, 0.12, 3, yellow);
        const rib = CreateTorus(`cabin-rib-${z}`, { diameter: 25, thickness: 0.28, tessellation: 24 }, scene);
        rib.position.set(0, 1.5, z);
        rib.scaling.y = 0.42;
        rib.material = white;
        rib.parent = root;
        buildConsoleAt('orbit', 8, z);
      }
      box('orbit-ext-solar-l', -17.5, 2.2, 2, 5.2, 0.08, 2.2, solarMat);
      box('orbit-ext-solar-r', 17.5, 2.2, 2, 5.2, 0.08, 2.2, solarMat);

      // Labeled cargo crates cluster (Board 06)
      const cargoLabels: Array<[string, number, number, number]> = [
        ['OXIGENIO', -5.4, 0.55, 1.5],
        ['ENERGIA', -5.4, 1.45, 1.5],
        ['FERRAMENTAS', -4.2, 0.5, 2.3],
        ['CAMPO', -4.1, 1.35, 0.7],
      ];
      cargoLabels.forEach(([lbl, cx, cy, cz], idx) => {
        const crate = box(`cargo-${lbl}`, cx, cy, cz, 0.9, 0.8, 0.9, idx % 2 === 0 ? white : orange);
        crate.rotation.y = idx * 0.18;
        createSignPlate(`crate-${lbl}`, lbl, cx, cy + 0.58, cz, 0.88, 0.26);
      });
    }

    if (id === 'habitat') {
      scene.clearColor = new Color4(0.008, 0.012, 0.025, 1);
      hemi.intensity = 0.46;
      sun.intensity = 1.85;

      buildTerrainMesh('habitat', 42, groundMat);
      buildStarSkyAndEarth(new Vector3(-48, 42, 115));
      buildPathBollards('habitat', -17, 25);

      // Dog-compatible airlock ramps with continuous cleats and yellow handrails
      for (const ramp of RAMPS.habitat) {
        buildRampWithHandrails(ramp);
      }

      // Central fork signpost (Board 02)
      cylinder('fork-post', 2.4, 1.25, 8.5, 0.09, 2.5, dark);
      createSignPlate('fork-base', '<- BASE  |  CANION ^', 2.4, 2.2, 8.5, 2.1, 0.58);

      // Midground architectural landmarks
      instanceStatic('habitat', 13, 0, 0, 1);
      // Translucent geodesic Greenhouse with structural geodesic rib arcs + warm interior crop glow
      instanceStatic('greenhouse', 22, 0, 10, 0.72);
      const extDome = sphere('greenhouse-ext-glaze', 22, 1.35, 10, 2.45, glass);
      extDome.scaling.y = 0.72;
      for (let a = 0; a < 3; a++) {
        const rib = CreateTorus(`gh-ext-rib-${a}`, { diameter: 4.95, thickness: 0.08, tessellation: 24 }, scene);
        rib.position.set(22, 1.35, 10);
        rib.rotation.y = (a * Math.PI) / 3;
        rib.scaling.y = 0.72;
        rib.material = white;
        rib.parent = root;
      }
      const baseRing = CreateTorus('gh-ext-base-ring', { diameter: 5.05, thickness: 0.14, tessellation: 24 }, scene);
      baseRing.position.set(22, 0.14, 10);
      baseRing.rotation.x = Math.PI / 2;
      baseRing.material = dark;
      baseRing.parent = root;
      box('ext-crop-bed', 22, 0.55, 10, 1.8, 0.35, 1.8, leaf);
      const extCropGlow = new PointLight('gh-ext-glow', new Vector3(22, 2.0, 10), scene);
      extCropGlow.intensity = 1.9;
      extCropGlow.range = 8.5;
      extCropGlow.diffuse = Color3.FromHexString('#e7ffd4');
      regionLights.push(extCropGlow);

      // Resource stations with recognizable icon signplates
      instanceStatic('battery', -11, 0, 0, 1);
      createSignPlate('plate-bat', 'ENERGIA / BAT', -11, 2.4, -0.9, 1.6, 0.45);
      instanceStatic('water', -5, 0, 6, 1);
      createSignPlate('plate-h2o', 'AGUA / H2O', -5, 2.4, 5.1, 1.5, 0.45);
      instanceStatic('oxygen', 5, 0, 6, 1);
      createSignPlate('plate-o2', 'OXIGENIO / O2', 5, 2.4, 5.1, 1.6, 0.45);

      for (let i = 0; i < 3; i++) {
        const sx = -19 + i * 5;
        instanceStatic('solar', sx, 0, 15, 0.85);
        const pv = box(`solar-pv-accent-${i}`, sx, 1.85, 15.05, 1.85, 0.04, 1.15, solarMat);
        pv.rotation.x = -0.45;
      }
      buildConsoleAt('habitat', 0, -3);
      box('equipment-locker', -10, 1, -8, 2, 2, 1, orange);

      // Parked lunar cargo sled prop (Board 02)
      const sled = new TransformNode('cargo-sled', scene);
      sled.parent = root;
      sled.position.set(12.2, 0, -10.5);
      box('sled-deck', 0, 0.35, 0, 2.2, 0.22, 1.3, white, sled);
      box('sled-runner-l', 0, 0.1, -0.52, 2.4, 0.12, 0.14, dark, sled);
      box('sled-runner-r', 0, 0.1, 0.52, 2.4, 0.12, 0.14, dark, sled);
      box('sled-cargo', 0.2, 0.8, 0, 1.1, 0.65, 0.9, orange, sled);

      // AuxBay visual pad (3 connector ports: power / water / o2)
      const auxPad = new TransformNode('aux-bay-pad', scene);
      auxPad.parent = root;
      auxPad.position.set(-7.5, 0, 2.5);
      box('aux-plinth', 0, 0.18, 0, 1.8, 0.36, 1.0, dark, auxPad);
      const statusRing = CreateTorus('aux-status-ring', { diameter: 1.9, thickness: 0.05, tessellation: 20 }, scene);
      statusRing.parent = auxPad;
      statusRing.position.y = 0.08;
      auxStatusRingMat = makePbr('aux-ring-mat', '#344554', 0.2, 0.4);
      regionMaterials.push(auxStatusRingMat);
      statusRing.material = auxStatusRingMat;

      (['power', 'water', 'o2'] as const).forEach((pk, idx) => {
        const px = -0.55 + idx * 0.55;
        const portNode = new TransformNode(`aux-port-${pk}`, scene);
        portNode.parent = auxPad;
        portNode.position.set(px, 0.36, 0);
        const pMat = makePbr(`aux-port-mat-${pk}`, '#364554', 0.25, 0.35);
        regionMaterials.push(pMat);
        cylinder(`aux-port-cyl-${pk}`, 0, 0.26, 0, 0.16, 0.52, pMat, portNode, 12);
        auxPortMeshes[pk] = { mat: pMat, node: portNode };
      });
      createSignPlate('aux-bay-label', 'AUX BAY', -7.5, 1.35, 2.5, 1.2, 0.36);

      // FieldKit visual pad (3 piece slots: relay_mast, thermal_shield, sensor_pylon)
      const kitPad = new TransformNode('field-kit-pad', scene);
      kitPad.parent = root;
      kitPad.position.set(-6.5, 0, -6.5);
      box('kit-plinth', 0, 0.12, 0, 1.9, 0.24, 1.0, dark, kitPad);
      const kitPieces: Array<'relay_mast' | 'thermal_shield' | 'sensor_pylon'> = [
        'relay_mast',
        'thermal_shield',
        'sensor_pylon',
      ];
      fieldKitSlotNodes = kitPieces.map((pieceId, idx) => {
        const kx = -0.6 + idx * 0.6;
        cylinder(`kit-socket-${pieceId}`, kx, 0.25, 0, 0.22, 0.05, white, kitPad, 10);
        const pieceNode = new TransformNode(`kit-piece-${pieceId}`, scene);
        pieceNode.parent = kitPad;
        pieceNode.position.set(kx, 0.28, 0);
        pieceNode.metadata = pieceId;
        if (pieceId === 'relay_mast') {
          cylinder('relay-pole', 0, 0.45, 0, 0.05, 0.9, orange, pieceNode, 8);
          sphere('relay-tip', 0, 0.92, 0, 0.1, accent, pieceNode, 8);
        } else if (pieceId === 'thermal_shield') {
          box('shield-panel', 0, 0.35, 0, 0.45, 0.65, 0.08, yellow, pieceNode);
        } else {
          cylinder('sensor-tripod', 0, 0.38, 0, 0.12, 0.72, accent, pieceNode, 6);
        }
        return pieceNode;
      });
      createSignPlate('kit-pad-label', 'KIT CAMPO', -6.5, 1.25, -6.5, 1.35, 0.36);

      // Surface power/telemetry cables connecting hub -> stations -> background ridge dish
      buildSurfaceCable('cable-west', [[0, -3], [-6, 0], [-11, 0]], 'habitat');
      buildSurfaceCable('cable-east', [[0, -3], [6, 0], [8.8, 1]], 'habitat');
      buildSurfaceCable('cable-dish', [[-9, 15], [8, 22], [24, 33]], 'habitat');

      // Landing pad
      cylinder('landing-pad', 15, 0.05, -15, 5, 0.1, dark);
      const ring = CreateTorus('landing-circle', { diameter: 8, thickness: 0.13 }, scene);
      ring.position.set(15, 0.13, -15);
      ring.material = white;
      ring.parent = root;

      // Background ridge landmark: hilltop Dish Antenna (Board 02)
      const ridgeY = getTerrainHeight('habitat', 24, 33);
      const dishRoot = new TransformNode('hilltop-dish', scene);
      dishRoot.parent = root;
      dishRoot.position.set(24, ridgeY, 33);
      cylinder('dish-tower', 0, 2.2, 0, 0.45, 4.4, white, dishRoot, 10);
      const bowl = CreateSphere('dish-reflector', { diameter: 3.6, segments: 12, slice: 0.42 }, scene);
      bowl.parent = dishRoot;
      bowl.position.set(0, 4.7, 0);
      bowl.rotation.x = Math.PI * 0.72;
      bowl.material = white;
      sphere('dish-beacon', 0, 6.2, 0, 0.22, orange, dishRoot, 8);

      buildRegolithScatter('habitat');
      applyAuxVisualState(currentAuxState);
    }

    if (id === 'canyon') {
      scene.clearColor = new Color4(0.006, 0.01, 0.022, 1);
      hemi.intensity = 0.34;
      sun.intensity = 1.45;

      buildTerrainMesh('canyon', 38, groundMat);
      buildStarSkyAndEarth(new Vector3(-42, 46, 120));
      buildPathBollards('canyon', -23, 24);

      // Canyon signage (Board 07)
      cylinder('return-post', 2.4, 1.15, -15, 0.09, 2.3, dark);
      createSignPlate('sign-return', 'RETORNO A BASE v', 2.4, 2.05, -15, 2.0, 0.52);

      cylinder('canyon-fork-post', 2.4, 1.25, 2.0, 0.09, 2.5, dark);
      createSignPlate('sign-canyon-fork', '<- GELO  |  ABRIGO ^', 2.4, 2.2, 2.0, 2.2, 0.58);

      // Canyon perimeter craggy rock spires
      for (let z = -22; z <= 24; z += 6) {
        for (const x of [-15.5, 15.5]) {
          const y = getTerrainHeight('canyon', x, z);
          const ridge = CreateSphere(`canyon-wall-${x}-${z}`, { diameter: 8.6, segments: 6, updatable: true }, scene);
          displaceCraggyMesh(ridge, x * 0.7 + z * 0.31, 0.32, true);
          ridge.position.set(x, y + 1.4, z);
          ridge.scaling.set(1.0, 1.35, 1.6);
          ridge.material = rockMat;
          ridge.receiveShadows = true;
          ridge.parent = root;
        }
      }

      // Field Research Shelter + unplugged MOD. COM-03 module & cable (Board 07)
      const sy = getTerrainHeight('canyon', -9.5, 20.5);
      box('research-shelter', -9.5, sy + 1.3, 20.5, 4.0, 2.6, 3.2, white);
      box('shelter-stripe', -9.5, sy + 2.0, 20.5, 4.08, 0.25, 3.28, orange);
      const cy = getTerrainHeight('canyon', -3.5, 20.5);
      box('mod-com03-crate', -3.5, cy + 0.55, 20.5, 1.1, 1.1, 0.9, orange);
      createSignPlate('sign-com03', 'MOD. COM-03', -3.5, cy + 1.45, 20.5, 1.4, 0.38);
      // Unplugged cable stops 1.1m short of survey-beacon to illustrate fault visually
      buildSurfaceCable('cable-com03', [[-3.5, 20.5], [-1.9, 20.8], [-1.1, 20.9]], 'canyon');

      // Shadowed Ice Cave Alcove + pale, specular, NON-EMISSIVE frost/icicles lit by tripod floodlights
      const iceY = getTerrainHeight('canyon', -5, 13);
      for (let i = 0; i < 6; i++) {
        const ix = -6.8 + i * 0.72;
        const iz = 13.8 + (i % 2) * 0.65;
        const iy = getTerrainHeight('canyon', ix, iz);
        const frost = CreateSphere(`frost-shelf-${i}`, { diameter: 1.24, segments: 5, updatable: true }, scene);
        displaceCraggyMesh(frost, 7.1 + i * 1.9, 0.24, true);
        frost.position.set(ix, iy + 0.2, iz);
        frost.scaling.set(1.18, 0.42, 0.96);
        frost.material = iceMat;
        frost.receiveShadows = true;
        frost.parent = root;

        const icicle = CreateCylinder(
          `icicle-${i}`,
          { diameterTop: 0.26, diameterBottom: 0.04, height: 1.05, tessellation: 6 },
          scene,
        );
        icicle.position.set(ix - 1.1, iy + 2.15, iz + 0.4);
        icicle.material = iceMat;
        icicle.parent = root;
      }
      // Sculpted rocky cave overhang framing the shadowed ice deposit
      const overhangSpecs: Array<[number, number, number, number, number, number]> = [
        [-8.4, iceY + 1.5, 15.2, 3.6, 3.2, 2.2],
        [-7.6, iceY + 2.9, 14.1, 4.4, 1.6, 3.4],
        [-9.2, iceY + 1.4, 12.9, 3.2, 2.8, 2.1],
      ];
      overhangSpecs.forEach(([ox, oy, oz, sx, sy2, sz], idx) => {
        const crag = CreateSphere(`ice-cave-overhang-${idx}`, { diameter: 1, segments: 6, updatable: true }, scene);
        displaceCraggyMesh(crag, 31.4 + idx * 9.2, 0.34, false);
        crag.position.set(ox, oy, oz);
        crag.scaling.set(sx, sy2, sz);
        crag.material = rockMat;
        crag.receiveShadows = true;
        crag.parent = root;
      });

      // Two 3-legged tripod floodlights + subtle dust-free light beam cones illuminating the non-emissive ice prospect
      const floodCoords: Array<[number, number, number, number]> = [
        [-2.8, 10.6, -5.8, 13.6],
        [-3.4, 15.6, -6.2, 13.4],
      ];
      floodCoords.forEach(([fx, fz, tx, tz], idx) => {
        const fy = getTerrainHeight('canyon', fx, fz);
        cylinder(`tripod-mast-${idx}`, fx, fy + 1.25, fz, 0.055, 1.1, yellow, root, 8);
        for (let leg = 0; leg < 3; leg++) {
          const ang = (leg * Math.PI * 2) / 3;
          const legMesh = cylinder(`tripod-leg-${idx}-${leg}`, fx + Math.cos(ang) * 0.24, fy + 0.48, fz + Math.sin(ang) * 0.24, 0.032, 1.05, dark, root, 6);
          legMesh.rotation.z = Math.cos(ang) * 0.44;
          legMesh.rotation.x = -Math.sin(ang) * 0.44;
        }
        const dir = new Vector3(tx - fx, -0.55, tz - fz).normalize();
        const yaw = Math.atan2(dir.x, dir.z);
        const head = box(`tripod-head-${idx}`, fx, fy + 1.85, fz, 0.38, 0.22, 0.26, white);
        head.rotation.y = yaw;
        const lens = box(`tripod-lens-${idx}`, fx + dir.x * 0.14, fy + 1.85, fz + dir.z * 0.14, 0.28, 0.16, 0.04, lanternMat);
        lens.rotation.y = yaw;

        // Subtle unlit floodlight beam cone
        const cone = CreateCylinder(
          `flood-beam-${idx}`,
          { diameterTop: 0.26, diameterBottom: 3.1, height: 4.4, tessellation: 14, cap: 0 },
          scene,
        );
        cone.position.set(fx + dir.x * 2.1, fy + 1.82 + dir.y * 1.4, fz + dir.z * 2.1);
        cone.lookAt(new Vector3(tx, fy + 0.3, tz));
        cone.rotate(Vector3.Right(), Math.PI / 2);
        cone.material = beamMat;
        cone.isPickable = false;
        cone.parent = root;

        const spot = new SpotLight(
          `ice-flood-spot-${idx}`,
          new Vector3(fx, fy + 1.9, fz),
          dir,
          Math.PI * 0.42,
          6,
          scene,
        );
        spot.intensity = 7.2;
        spot.range = 18;
        spot.diffuse = new Color3(0.92, 0.96, 1.0);
        regionLights.push(spot);

        if (idx === 0) {
          const fill = new PointLight(`ice-flood-fill-${idx}`, new Vector3(tx, fy + 1.8, tz), scene);
          fill.intensity = 1.7;
          fill.range = 9;
          fill.diffuse = new Color3(0.86, 0.94, 1.0);
          regionLights.push(fill);
        }
      });

      // Distant Aurora base silhouette on south horizon
      box('distant-aurora-dome', 0, 1.2, -35.5, 4.5, 2.2, 2.5, white);
      sphere('distant-aurora-beacon', 0, 2.8, -35.5, 0.2, orange, root, 6);

      if (!recruited) {
        const yScout = getTerrainHeight('canyon', 7, 5);
        const wrapper = new TransformNode('stranded-scout-wrapper', scene);
        wrapper.parent = root;
        wrapper.position.set(7, yScout, 5);
        wrapper.rotation.set(0.16, -Math.PI * 0.65, 0.14);
        const scoutTmpl = charCache.get('scout');
        if (scoutTmpl) {
          const res = scoutTmpl.instantiateModelsToScene((n) => `stranded:${n}`, false, {
            doNotInstantiate: true,
          });
          res.skeletons.forEach((sk) => {
            sk.useTextureToStoreBoneMatrices = true;
          });
          res.animationGroups.forEach((g) => g.stop());
          res.rootNodes.forEach((n) => {
            n.parent = wrapper;
          });
          entries.push(res);
          strandedEntry = res;
        } else {
          createCharacterStandIn('scout', scene, wrapper, white, orange, accent, dark);
        }
        strandedScout = wrapper;
      }

      buildConsoleAt('canyon', 0, 21);
      buildRegolithScatter('canyon');
    }

    if (id === 'greenhouse') {
      // Pressurized geodesic dome interior; starry lunar sky visible outside transparent glaze
      scene.clearColor = new Color4(0.01, 0.015, 0.032, 1);
      hemi.intensity = 0.85;
      sun.intensity = 1.1;

      buildTerrainMesh('greenhouse', 15, dark);
      buildStarSkyAndEarth(new Vector3(-38, 34, 90));
      buildWalls(15);
      buildPathBollards('greenhouse', -13, 12);

      // Pressurized airlock vestibule & geodesic arch ribs + longitudinal glazing mullions
      box('airlock-frame-l', -1.8, 1.5, -13.6, 0.4, 3.0, 1.6, yellow);
      box('airlock-frame-r', 1.8, 1.5, -13.6, 0.4, 3.0, 1.6, yellow);
      for (const z of [-8, 0, 8]) {
        const arch = CreateTorus(`dome-rib-${z}`, { diameter: 28, thickness: 0.22, tessellation: 24 }, scene);
        arch.position.set(0, 1.2, z);
        arch.scaling.y = 0.48;
        arch.material = white;
        arch.parent = root;
      }
      for (const [px, py] of [
        [-10.2, 5.5],
        [-5.4, 7.25],
        [5.4, 7.25],
        [10.2, 5.5],
      ]) {
        box(`dome-purlin-${px}`, px, py, 0, 0.16, 0.16, 26.5, white);
      }

      // Lush hydroponic crop beds (STRICTLY inside pressurized greenhouse!) with slender open grow-light rigs
      for (const x of [-6, 6]) {
        for (const z of [-5, 1, 7]) {
          box('raised-planter', x, 0.5, z, 3, 1, 4, white);
          box('growing-medium', x, 1.03, z, 2.7, 0.1, 3.7, soil);
          for (let a = -1; a <= 1; a++) {
            for (let b = -1; b <= 1; b++) {
              const stemH = 0.42 + ((Math.abs(a * 3 + b) % 3) * 0.09);
              cylinder(
                `plant-stem-${x}-${z}-${a}-${b}`,
                x + a * 0.72,
                1.08 + stemH * 0.5,
                z + b * 0.95,
                0.045,
                stemH,
                leaf,
                root,
                8,
              );
              for (let k = 0; k < 4; k++) {
                const ang = k * (Math.PI * 0.5) + (a + b) * 0.45;
                const rad = k === 3 ? 0.12 : 0.24;
                const lf = sphere(
                  `leaf-${x}-${z}-${a}-${b}-${k}`,
                  x + a * 0.72 + Math.cos(ang) * rad,
                  1.12 + stemH + (k === 3 ? 0.06 : 0),
                  z + b * 0.95 + Math.sin(ang) * rad,
                  k === 3 ? 0.18 : 0.24,
                  leaf,
                  root,
                  6,
                );
                lf.scaling.set(1.05, 0.34, 0.85);
                lf.rotation.y = ang;
              }
            }
          }
          // Slender open gantry poles, rail frame, and narrow LED diffuser strips (no opaque canopy slab!)
          for (const px of [-1.36, 1.36]) {
            for (const pz of [-1.72, 1.72]) {
              box(`grow-post-${x}-${z}-${px}-${pz}`, x + px, 2.02, z + pz, 0.055, 2.04, 0.055, dark);
            }
            box(`grow-rail-${x}-${z}-${px}`, x + px, 3.04, z, 0.065, 0.065, 3.55, dark);
          }
          for (const pz of [-1.72, 1.72]) {
            box(`grow-tie-${x}-${z}-${pz}`, x, 3.04, z + pz, 2.78, 0.065, 0.065, dark);
          }
          for (const lx of [-0.66, 0.66]) {
            box(`grow-led-${x}-${z}-${lx}`, x + lx, 3.01, z, 0.14, 0.045, 3.3, accent);
          }
        }
        // Consolidate greenhouse aisle illumination into 2 broad grow lights within maxSimultaneousLights budget
        const growLight = new PointLight(`grow-aisle-${x}`, new Vector3(x, 3.2, 1), scene);
        growLight.intensity = 2.0;
        growLight.range = 16;
        growLight.diffuse = new Color3(0.95, 0.85, 1.0);
        regionLights.push(growLight);
      }

      // Cozy pressurized resting cushion pad for Cometa (Board 08)
      cylinder('cometa-rest-pad', -1.8, 0.09, -8.5, 0.85, 0.18, orange, root, 16);
      createSignPlate('cometa-pad-sign', 'CANTINHO COMETA', -1.8, 0.95, -9.4, 1.35, 0.36);
    }

    for (const target of REGIONS[id].targets) {
      buildMarkerRing(id, target.position.x, target.position.z);
    }
    buildNpcRosterForRegion(id);
  }

  function buildActors(): void {
    shadows.getShadowMap()?.renderList?.splice(0);
    astronautColorSnapshots.clear();
    astronautRig?.dispose();
    pipRig?.dispose();
    scoutRig?.dispose();
    disposeCometaInstance();
    actorRoot.dispose(false, false);
    actorRoot = new TransformNode('actors', scene);

    astronautRig = createCharacterRig('astronaut', 'astronaut', 0, 0, 0, 1, 0, { cloneMaterials: true });
    for (const node of astronautRig.root.getChildMeshes(false)) {
      const meshNode = node as Mesh;
      if (typeof meshNode.makeGeometryUnique === 'function' && node.isVerticesDataPresent('color')) {
        meshNode.makeGeometryUnique();
        const raw = node.getVerticesData('color');
        if (raw && raw.length >= 3) {
          const stride = meshNode.getVertexBuffer('color')?.getStrideSize() ?? 4;
          astronautColorSnapshots.set(node, { base: Float32Array.from(raw), stride });
        }
      }
    }
    applyCadetAppearance(currentCadetAppearance);

    pipRig = createCharacterRig('pip', 'pip', -1.25, 0, -1.65, 1, 0);
    if (recruited) {
      scoutRig = createCharacterRig('scout', 'scout', 1.75, 0, -2.45, 1, 0.3);
    } else {
      scoutRig = undefined;
    }
    ensureCometaInstance();
  }

  function placeActors(): void {
    if (astronautRig) {
      astronautRig.root.position.set(state.x, state.y, state.z);
      astronautRig.root.rotation.y = state.heading;
    }
    pipPos = {
      x: state.x - 1.25,
      y: getTerrainHeight(region, state.x - 1.25, state.z - 1.65),
      z: state.z - 1.65,
      heading: state.heading,
    };
    if (pipRig) {
      pipRig.root.position.set(pipPos.x, pipPos.y, pipPos.z);
      pipRig.root.rotation.y = pipPos.heading;
    }
    scoutPos = {
      x: state.x + 1.75,
      y: getTerrainHeight(region, state.x + 1.75, state.z - 2.45),
      z: state.z - 2.45,
      heading: state.heading,
    };
    if (scoutRig) {
      scoutRig.root.position.set(scoutPos.x, scoutPos.y, scoutPos.z);
      scoutRig.root.rotation.y = scoutPos.heading;
    }
    if (cometaRig) {
      cometaPos = {
        x: cometaState.safePos.x,
        y: getTerrainHeight(region, cometaState.safePos.x, cometaState.safePos.z),
        z: cometaState.safePos.z,
        heading: cometaState.heading,
        prevX: cometaState.safePos.x,
        prevZ: cometaState.safePos.z,
      };
      cometaRig.root.position.set(cometaPos.x, cometaPos.y, cometaPos.z);
      cometaRig.root.rotation.y = cometaPos.heading;
    }
  }

  function setRegion(id: RegionId, pose?: PlayerPose): void {
    regionGeneration++;
    astronautRig?.interruptOneShot();
    pipRig?.interruptOneShot();
    scoutRig?.interruptOneShot();
    cometaRig?.interruptOneShot();

    disposeRegion();
    region = id;
    buildRegion(id);

    const p =
      pose?.region === id &&
      Number.isFinite(pose.position.x) &&
      Number.isFinite(pose.position.z) &&
      Math.abs(pose.position.x) < REGIONS[id].bounds &&
      Math.abs(pose.position.z) < REGIONS[id].bounds
        ? pose.position
        : REGIONS[id].spawn;

    const spawnY = getTerrainHeight(id, p.x, p.z);
    state = {
      x: p.x,
      y: spawnY,
      z: p.z,
      vy: 0,
      heading: Number.isFinite(pose?.heading) ? pose!.heading : 0,
      grounded: true,
    };
    prevHeading = state.heading;
    prevGrounded = true;
    prevStateMoving = false;

    cometaState = {
      ...cometaState,
      region: id,
      pressurized: REGIONS[id].pressurized,
      ...(cometaState.enabled
        ? { safePos: { x: state.x + 1.45, y: spawnY, z: state.z - 0.45 } }
        : {}),
    };
    ensureCometaInstance();
    placeActors();

    near = null;
    callbacks.onTarget(null);
    callbacks.onRegion(id);
  }

  buildActors();
  setRegion('academy');

  function keyboard(event: KeyboardEvent, down: boolean): void {
    const k = event.key.toLowerCase();
    if (!down) {
      keys.delete(k);
      return;
    }
    const el = typeof Element !== 'undefined' && event.target instanceof Element ? event.target : null;
    if (paused || el?.closest('input, textarea, select, button, a, [contenteditable], [role="dialog"], dialog')) {
      return;
    }
    if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'shift', ' ', 'e'].includes(k)) {
      keys.add(k);
      if (event.target === canvas) event.preventDefault();
      if (k === 'e' && !event.repeat) interact();
    }
  }

  const onDown = (e: KeyboardEvent) => keyboard(e, true);
  const onUp = (e: KeyboardEvent) => keyboard(e, false);
  const onBlur = () => {
    keys.clear();
    input = { x: 0, z: 0, jump: false, sprint: false };
  };
  const onFocus = (e: FocusEvent) => {
    const el = typeof Element !== 'undefined' && e.target instanceof Element ? e.target : null;
    if (el?.closest('input, textarea, select, button, a, [contenteditable], [role="dialog"], dialog')) {
      keys.clear();
    }
  };
  const onResize = () => engine.resize();

  if (hasDom) {
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    window.addEventListener('blur', onBlur);
    window.addEventListener('focusin', onFocus);
    window.addEventListener('resize', onResize);
  }

  function interact(): void {
    if (!paused && near) {
      interactionTime = 0.55;
      astronautRig?.playClip('Inspect', { loop: false, blendSeconds: 0.12, forceRestart: true, paused: false });
      callbacks.onInteract(near);
    }
  }

  function resolveCometaRecallTarget(targetRegion: RegionId, nextState: CometaRuntimeState): Vec3 | null {
    const bounds = REGIONS[targetRegion].bounds;
    const obstacles = OBSTACLES[targetRegion];
    const recallOpts = {
      bounds,
      radius: COMPANION_RADIUS,
      avoidPortals: true,
    };
    const safeFromPos = validateSafeRecallTarget(targetRegion, nextState.safePos, obstacles, recallOpts);
    if (safeFromPos) {
      return safeFromPos;
    }
    const targetMatch = REGIONS[targetRegion].targets.find(
      (t) => t.id === (nextState.safeTargetId || nextState.targetId),
    );
    if (targetMatch && targetMatch.kind !== 'portal') {
      return validateSafeRecallTarget(targetRegion, targetMatch.position, obstacles, recallOpts);
    }
    return null;
  }

  function updateCometaActor(dt: number, portalBuffers: ReadonlyArray<{ x: number; z: number; radius?: number }>): void {
    if (!cometaRig || cometaState.region !== region) return;

    const bounds = REGIONS[region].bounds;
    const obstacles = OBSTACLES[region];
    let targetX = cometaPos.x;
    let targetZ = cometaPos.z;
    effectiveCometaMode = cometaState.mode;

    if (cometaState.mode === 'recall') {
      const safe = resolveCometaRecallTarget(region, cometaState);
      if (safe === null) {
        // Blocked or unsafe recall target must gracefully fall back to waiting in place.
        effectiveCometaMode = 'wait';
      } else {
        targetX = safe.x;
        targetZ = safe.z;
      }
    } else if (cometaState.mode === 'follow') {
      targetX = state.x - Math.sin(state.heading) * 0.45 + Math.cos(state.heading) * 1.45;
      targetZ = state.z - Math.cos(state.heading) * 0.45 - Math.sin(state.heading) * 1.45;
    }

    const prevX = cometaPos.x;
    const prevZ = cometaPos.z;
    const next =
      effectiveCometaMode === 'wait'
        ? { x: prevX, z: prevZ }
        : followPosition({ x: prevX, z: prevZ }, { x: targetX, z: targetZ }, dt, 3.6, {
            obstacles,
            bounds,
            radius: COMPANION_RADIUS,
            keepClearTargets: portalBuffers,
          });

    const dx = next.x - prevX;
    const dz = next.z - prevZ;
    const speed = dt > 1e-4 ? Math.hypot(dx, dz) / dt : 0;
    const prevHead = cometaPos.heading;
    const desiredHead = speed > 0.15 ? Math.atan2(dx, dz) : state.heading;
    const headDelta = shortestAngleDelta(prevHead, desiredHead);
    const nextHead = prevHead + headDelta * Math.min(1, dt * 8);
    const turning = dt > 1e-4 ? headDelta / dt : 0;

    cometaPos = {
      x: next.x,
      y: getTerrainHeight(region, next.x, next.z),
      z: next.z,
      heading: nextHead,
      prevX,
      prevZ,
    };

    // Single authority: position and yaw come strictly from movement controller & terrain height.
    cometaRig.root.position.set(cometaPos.x, cometaPos.y, cometaPos.z);
    cometaRig.root.rotation.y = cometaPos.heading;

    cometaRig.update(dt, paused);
    if (speed > 0.3 && cometaRig.oneShotClip) {
      cometaRig.interruptOneShot();
    }
    if (!cometaRig.oneShotClip) {
      const clip = selectCometaLocomotionClip({
        speed,
        mode: effectiveCometaMode,
        isLunar: region === 'habitat' || region === 'canyon',
        isOrbit: region === 'orbit',
        turning,
        reducedMotion: reduced,
      });
      cometaRig.playClip(clip, { loop: true, paused });
    }
  }

  function applyCueToCometa(cue: NonNullable<CometaRuntimeState['lastCue']>): void {
    if (!cometaRig) return;
    const isPressurized = cometaState.pressurized ?? REGIONS[region].pressurized;
    if (cue === 'pet') {
      cometaRig.playClip('ReceivePet', { loop: false, blendSeconds: 0.12, forceRestart: true, paused });
    } else if (cue === 'beacon') {
      cometaRig.playClip('LookAtBeacon', { loop: true, blendSeconds: 0.16, paused });
    } else if (cue === 'watch_repair') {
      cometaRig.playClip('WatchRepair', { loop: true, blendSeconds: 0.16, paused });
    } else if (cue === 'sniff') {
      // Cometa can ONLY sniff indoors/pressurized (academy, orbit, greenhouse); vacuum suppresses Sniff.
      cometaRig.playClip(isPressurized ? 'Sniff' : 'WagTail', {
        loop: false,
        blendSeconds: 0.14,
        forceRestart: true,
        paused,
      });
    }
  }

  function computeMetrics(): WorldMetrics {
    const sorted = [...frameTimes].sort((a, b) => a - b);
    const p95Idx = sorted.length > 0 ? Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95)) : 0;
    const activeMeshes = scene.getActiveMeshes();
    const meshList =
      activeMeshes.length > 0 ? activeMeshes.data.slice(0, activeMeshes.length) : scene.meshes;
    let totalIndices = 0;
    for (const m of meshList) {
      if (!m.isVisible || !m.isEnabled()) continue;
      const thinCount = 'thinInstanceCount' in m ? (m as Mesh).thinInstanceCount : 0;
      totalIndices += m.getTotalIndices() * (thinCount > 0 ? thinCount : 1);
    }
    return {
      engine: engineLabel,
      fps: Math.round(engine.getFps()),
      meshes: scene.meshes.length,
      activeMeshes: activeMeshes.length,
      drawCalls: instrumentation.drawCallsCounter.current,
      region,
      frameTimeMs: Number(lastFrameTimeMs.toFixed(2)),
      p95FrameTimeMs: Number((sorted[p95Idx] ?? lastFrameTimeMs).toFixed(2)),
      triangles: Math.round(totalIndices / 3),
    };
  }

  function getDebugSnapshot(): WorldDebugSnapshot {
    const actors: WorldDebugSnapshot['actors'] = {};
    const collect = (rig: RigController | undefined) => {
      if (!rig) return;
      const sks = rig.entry?.skeletons ?? [];
      actors[rig.actorKey] = {
        clip: rig.currentClip,
        loop: rig.currentLoop,
        paused,
        usingFallback: rig.usingFallback,
        skeletons: sks.length,
        textureBoneMatrices: sks.every((s) => s.useTextureToStoreBoneMatrices),
        animationGroups: rig.groups.size,
        position: {
          x: Number(rig.root.position.x.toFixed(3)),
          y: Number(rig.root.position.y.toFixed(3)),
          z: Number(rig.root.position.z.toFixed(3)),
        },
        ...(rig.visibleAccessories.length > 0 ? { visibleAccessories: [...rig.visibleAccessories] } : {}),
      };
    };
    collect(astronautRig);
    collect(pipRig);
    collect(scoutRig);
    collect(cometaRig);
    npcRigs.forEach(collect);

    const renderer = isNullEngine
      ? 'NullEngine'
      : engine.isWebGPU
        ? 'WebGPU'
        : (engine as Engine).getGlInfo?.().renderer ?? 'WebGL 2';

    return {
      engine: engineLabel,
      renderer,
      region,
      paused,
      reducedMotion: reduced,
      fogMode: scene.fogMode,
      loadedModels: [...loadedModels],
      fallbackModels: [...fallbackModels],
      disposedRegions,
      auxState: { ...currentAuxState, ports: { ...currentAuxState.ports }, fieldKitSlots: [...currentAuxState.fieldKitSlots] },
      cadetAppearance: { ...currentCadetAppearance },
      cometa: {
        enabled: cometaState.enabled,
        mode: cometaState.mode,
        effectiveMode: effectiveCometaMode,
        pressurized: cometaState.enabled
          ? (cometaState.pressurized ?? REGIONS[region].pressurized)
          : REGIONS[region].pressurized,
        clip: cometaRig?.currentClip ?? 'none',
        position: cometaRig
          ? {
              x: Number(cometaPos.x.toFixed(3)),
              y: Number(cometaPos.y.toFixed(3)),
              z: Number(cometaPos.z.toFixed(3)),
            }
          : null,
      },
      actors,
      sceneCounts: {
        meshes: scene.meshes.length,
        skeletons: scene.skeletons.length,
        animationGroups: scene.animationGroups.length,
        materials: scene.materials.length,
        textures: scene.textures.length,
        lights: scene.lights.length,
      },
      metrics: computeMetrics(),
    };
  }

  const debugHandle = {
    getSnapshot: () => getDebugSnapshot(),
  };
  if (hasDom) {
    window.__ASTRA_WORLD_DEBUG__ = debugHandle;
  } else {
    (globalThis as unknown as { __ASTRA_WORLD_DEBUG__?: typeof debugHandle }).__ASTRA_WORLD_DEBUG__ = debugHandle;
  }

  function frame(): void {
    if (disposed) return;
    const rawDeltaMs = engine.getDeltaTime();
    lastFrameTimeMs = Number.isFinite(rawDeltaMs) && rawDeltaMs > 0 ? rawDeltaMs : 16.67;
    frameTimes.push(lastFrameTimeMs);
    if (frameTimes.length > 120) frameTimes.shift();

    const dt = Math.min(lastFrameTimeMs / 1000, 0.05);

    if (!paused) {
      elapsed += dt;
      interactionTime = Math.max(0, interactionTime - dt);

      const x = Math.max(
        -1,
        Math.min(
          1,
          input.x +
            (keys.has('d') || keys.has('arrowright') ? 1 : 0) -
            (keys.has('a') || keys.has('arrowleft') ? 1 : 0),
        ),
      );
      const z = Math.max(
        -1,
        Math.min(
          1,
          input.z +
            (keys.has('w') || keys.has('arrowup') ? 1 : 0) -
            (keys.has('s') || keys.has('arrowdown') ? 1 : 0),
        ),
      );
      const jump = input.jump || keys.has(' ');
      const gravity = region === 'academy' || region === 'orbit' || region === 'greenhouse' ? EARTH_GRAVITY : MOON_GRAVITY;
      const obstacles = OBSTACLES[region];
      const bounds = REGIONS[region].bounds;

      const prevX = state.x;
      const prevZ = state.z;
      state = advanceMotion(
        state,
        { x, z, jump: jump && !jumpHeld, sprint: input.sprint || keys.has('shift') },
        dt,
        Math.atan2(-Math.cos(camera.alpha), -Math.sin(camera.alpha)),
        bounds,
        obstacles,
        gravity,
        (gx, gz) => getTerrainHeight(region, gx, gz),
      );
      jumpHeld = jump;

      const speed = dt > 1e-4 ? Math.hypot(state.x - prevX, state.z - prevZ) / dt : 0;
      const turnRate = dt > 1e-4 ? shortestAngleDelta(prevHeading, state.heading) / dt : 0;
      const justTookOff = prevGrounded && !state.grounded;
      const justLanded = !prevGrounded && state.grounded;
      const isLunar = region === 'habitat' || region === 'canyon';

      if (astronautRig) {
        astronautRig.root.position.set(state.x, state.y, state.z);
        astronautRig.root.rotation.y = state.heading;
        if (speed > 0.35 || !state.grounded) {
          astronautRig.interruptOneShot();
        }
        astronautRig.update(dt, false);
        if (!astronautRig.oneShotClip) {
          const clip = selectLocomotionClip({
            speed,
            airborne: !state.grounded,
            turning: turnRate,
            isLunar,
            reducedMotion: reduced,
            justTookOff,
            justLanded,
            wasMoving: prevStateMoving && speed <= 0.2,
          });
          astronautRig.playClip(clip, {
            loop: clip !== 'JumpTakeoff' && clip !== 'Land' && clip !== 'Stop',
            paused: false,
          });
        }
      }

      prevHeading = state.heading;
      prevGrounded = state.grounded;
      prevStateMoving = speed > 0.25;

      const portalKeepClear = REGIONS[region].targets
        .filter((t) => t.kind === 'portal')
        .map((t) => ({ x: t.position.x, z: t.position.z, radius: 1.0 }));

      if (pipRig) {
        const px = state.x - Math.sin(state.heading) * 1.65 - Math.cos(state.heading) * 1.25;
        const pz = state.z - Math.cos(state.heading) * 1.65 + Math.sin(state.heading) * 1.25;
        const oldPx = pipPos.x;
        const oldPz = pipPos.z;
        const nextP = followPosition({ x: oldPx, z: oldPz }, { x: px, z: pz }, dt, 3.0, {
          obstacles,
          bounds,
          radius: COMPANION_RADIUS,
          keepClearTargets: portalKeepClear,
        });
        const pSpeed = dt > 1e-4 ? Math.hypot(nextP.x - oldPx, nextP.z - oldPz) / dt : 0;
        const pHeadDelta = shortestAngleDelta(pipPos.heading, state.heading);
        pipPos = {
          x: nextP.x,
          y: getTerrainHeight(region, nextP.x, nextP.z),
          z: nextP.z,
          heading: pipPos.heading + pHeadDelta * Math.min(1, dt * 8),
        };
        pipRig.root.position.set(pipPos.x, pipPos.y, pipPos.z);
        pipRig.root.rotation.y = pipPos.heading;
        pipRig.update(dt, false);
        if (!pipRig.oneShotClip) {
          const pClip = selectRobotLocomotionClip({
            speed: pSpeed,
            turning: dt > 1e-4 ? pHeadDelta / dt : 0,
            reducedMotion: reduced,
          });
          pipRig.playClip(pClip, { loop: true, paused: false });
        }
      }

      if (scoutRig) {
        const sx = state.x - Math.sin(state.heading) * 2.45 + Math.cos(state.heading) * 1.75;
        const sz = state.z - Math.cos(state.heading) * 2.45 - Math.sin(state.heading) * 1.75;
        const oldSx = scoutPos.x;
        const oldSz = scoutPos.z;
        const scoutKeepClear = [
          ...portalKeepClear,
          ...(pipRig ? [{ x: pipPos.x, z: pipPos.z, radius: 0.9 }] : []),
        ];
        const nextS = followPosition({ x: oldSx, z: oldSz }, { x: sx, z: sz }, dt, 3.0, {
          obstacles,
          bounds,
          radius: COMPANION_RADIUS,
          keepClearTargets: scoutKeepClear,
        });
        const sSpeed = dt > 1e-4 ? Math.hypot(nextS.x - oldSx, nextS.z - oldSz) / dt : 0;
        const sHeadDelta = shortestAngleDelta(scoutPos.heading, state.heading);
        scoutPos = {
          x: nextS.x,
          y: getTerrainHeight(region, nextS.x, nextS.z),
          z: nextS.z,
          heading: scoutPos.heading + sHeadDelta * Math.min(1, dt * 8),
        };
        scoutRig.root.position.set(scoutPos.x, scoutPos.y, scoutPos.z);
        scoutRig.root.rotation.y = scoutPos.heading;
        scoutRig.update(dt, false);
        if (!scoutRig.oneShotClip) {
          const sClip = selectRobotLocomotionClip({
            speed: sSpeed,
            turning: dt > 1e-4 ? sHeadDelta / dt : 0,
            reducedMotion: reduced,
          });
          scoutRig.playClip(sClip, { loop: true, paused: false });
        }
      }

      const cometaKeepClear = [
        ...portalKeepClear,
        { x: state.x, z: state.z, radius: 0.65 },
        ...(pipRig ? [{ x: pipPos.x, z: pipPos.z, radius: 0.9 }] : []),
        ...(scoutRig ? [{ x: scoutPos.x, z: scoutPos.z, radius: 1.15 }] : []),
      ];
      updateCometaActor(dt, cometaKeepClear);

      for (const npc of npcRigs) {
        npc.update(dt, false);
        if (!npc.oneShotClip && reduced && npc.currentClip !== 'Idle') {
          npc.playClip('Idle', { loop: true, paused: false });
        }
      }

      const chosen =
        REGIONS[region].targets
          .map((t) => ({ t, d: Math.hypot(state.x - t.position.x, state.z - t.position.z) }))
          .filter((v) => v.d <= (v.t.radius ?? 3))
          .sort((a, b) => a.d - b.d)[0]?.t ?? null;

      if (chosen?.id !== near?.id) {
        near = chosen;
        callbacks.onTarget(near);
        if (near?.id === 'cargo') callbacks.onCargoReached?.();
      }
    }

    camera.target.copyFromFloats(state.x, state.y + 1.3, state.z);
    scene.render();

    metricTime += dt;
    if (metricTime >= 1) {
      metricTime = 0;
      callbacks.onMetrics(computeMetrics());
    }
  }

  engine.runRenderLoop(frame);

  return {
    async changeRegion(id, pose) {
      if (disposed || !REGIONS[id]) return;
      const serial = ++transition;
      await Promise.resolve();
      if (serial === transition && !disposed) {
        setRegion(id, pose);
      }
    },
    setPaused(v) {
      paused = v;
      if (v) {
        keys.clear();
        input = { x: 0, z: 0, jump: false, sprint: false };
        if (hasDom && canvas && !isNullEngine) camera.detachControl();
      } else if (hasDom && canvas && !isNullEngine) {
        camera.attachControl(canvas, true);
      }
      astronautRig?.setPaused(v);
      pipRig?.setPaused(v);
      scoutRig?.setPaused(v);
      cometaRig?.setPaused(v);
      npcRigs.forEach((n) => n.setPaused(v));
    },
    setQuality(v) {
      quality = v;
      engine.setHardwareScalingLevel(v === 'low' ? 3 : 1);
      scene.shadowsEnabled = v === 'high';
      shadows.useBlurExponentialShadowMap = v === 'high';
      for (const l of accentLights) {
        l.setEnabled(v === 'high');
      }
    },
    setReducedMotion(v) {
      reduced = v;
    },
    setInput(v) {
      if (!paused) input = { ...input, ...v };
    },
    setCompanionRecruited(v) {
      if (v !== recruited) {
        recruited = v;
        if (v) removeStrandedScout();
        buildActors();
        placeActors();
      }
    },
    setCadetAppearance(appearance) {
      applyCadetAppearance(appearance);
    },
    setCometaState(next) {
      const prevCue = cometaState.lastCue;
      cometaState = { ...next };
      if (!next.enabled) {
        effectiveCometaMode = 'wait';
        disposeCometaInstance();
        return;
      }
      ensureCometaInstance();
      if (next.region === region) {
        if (next.mode === 'recall') {
          effectiveCometaMode = resolveCometaRecallTarget(region, cometaState) ? 'recall' : 'wait';
        } else {
          effectiveCometaMode = next.mode;
        }
      }
      if (cometaRig && next.region === region) {
        if (next.mode === 'wait' || effectiveCometaMode === 'wait') {
          cometaRig.interruptOneShot();
          cometaRig.playClip('Wait', { loop: true, blendSeconds: 0.14, paused });
        }
        if (next.lastCue && next.lastCue !== prevCue) {
          applyCueToCometa(next.lastCue);
        } else if (next.lastCue === 'sniff' || next.lastCue === 'pet') {
          applyCueToCometa(next.lastCue);
        }
      }
    },
    triggerActorClip(anim: CharacterAnimState) {
      const actorId = anim.actorId as CharacterActorId | string;
      const targetPaused = anim.paused ?? paused;
      const speed = anim.speed ?? 1;
      const blendSeconds = anim.blendSeconds ?? 0.14;
      const loop = anim.loop ?? false;

      if (actorId === 'astronaut') {
        astronautRig?.playClip(anim.clip, { loop, speed, blendSeconds, forceRestart: true, paused: targetPaused });
      } else if (actorId === 'pip') {
        pipRig?.playClip(anim.clip, { loop, speed, blendSeconds, forceRestart: true, paused: targetPaused });
      } else if (actorId === 'scout') {
        scoutRig?.playClip(anim.clip, { loop, speed, blendSeconds, forceRestart: true, paused: targetPaused });
      } else if (actorId === 'cometa') {
        if (!cometaState.enabled || !cometaRig) return;
        const isPressurized = cometaState.pressurized ?? REGIONS[region].pressurized;
        const safeClip = anim.clip === 'Sniff' && !isPressurized ? 'WagTail' : anim.clip;
        cometaRig.playClip(safeClip, { loop, speed, blendSeconds, forceRestart: true, paused: targetPaused });
      } else if (actorId === 'human-npc') {
        npcRigs[0]?.playClip(anim.clip, { loop, speed, blendSeconds, forceRestart: true, paused: targetPaused });
      }
    },
    setAuxVisualState(next) {
      applyAuxVisualState(next);
    },
    getTelemetryMetrics() {
      return computeMetrics();
    },
    interact,
    getPose() {
      return {
        region,
        position: { x: state.x, y: state.y, z: state.z },
        heading: state.heading,
      };
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      transition++;
      regionGeneration++;

      if (hasDom) {
        window.removeEventListener('keydown', onDown);
        window.removeEventListener('keyup', onUp);
        window.removeEventListener('blur', onBlur);
        window.removeEventListener('focusin', onFocus);
        window.removeEventListener('resize', onResize);
        delete window.__ASTRA_WORLD_DEBUG__;
      } else {
        delete (globalThis as unknown as { __ASTRA_WORLD_DEBUG__?: unknown }).__ASTRA_WORLD_DEBUG__;
      }

      engine.stopRenderLoop(frame);
      disposeRegion();
      astronautColorSnapshots.clear();

      astronautRig?.dispose();
      astronautRig = undefined;
      pipRig?.dispose();
      pipRig = undefined;
      scoutRig?.dispose();
      scoutRig = undefined;
      disposeCometaInstance();
      actorRoot.dispose(false, false);

      staticCache.forEach((c) => c.dispose());
      staticCache.clear();
      charCache.forEach((c) => c.dispose());
      charCache.clear();

      sharedMaterials.forEach((m) => m.dispose(true, true));
      sharedTextures.forEach((t) => t.dispose());
      sharedTextures.length = 0;
      shadows.dispose();
      instrumentation.dispose();
      scene.dispose();
      if (shouldDisposeEngine) {
        engine.dispose();
      }
    },
  };
}
