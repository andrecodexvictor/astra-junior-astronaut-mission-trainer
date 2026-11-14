import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { EngineStore } from '@babylonjs/core/Engines/engineStore';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Scene } from '@babylonjs/core/scene';
import { SceneLoader } from '@babylonjs/core/Loading/sceneLoader';
import { PBRMaterial } from '@babylonjs/core/Materials/PBR/pbrMaterial';
import { ImageProcessingConfiguration } from '@babylonjs/core/Materials/imageProcessingConfiguration';
import '@babylonjs/loaders/glTF/2.0/glTFLoader';
import '@babylonjs/loaders/glTF/2.0/Extensions/KHR_materials_emissive_strength';
import { buildProceduralEnvFaces, createGameWorld } from '../../src/world/createGameWorld';
import type { RegionId, WorldCallbacks } from '../../src/contracts';

function localModelResolver(relativePath: string): string {
  const bytes = readFileSync(join(process.cwd(), 'public', relativePath));
  return `data:application/octet-stream;base64,${bytes.toString('base64')}`;
}

function makeCallbacks() {
  const errors: string[] = [];
  const regions: RegionId[] = [];
  const callbacks: WorldCallbacks = {
    onTarget: vi.fn(),
    onInteract: vi.fn(),
    onRegion: (r) => regions.push(r),
    onMetrics: vi.fn(),
    onError: (msg) => errors.push(msg),
    onCargoReached: vi.fn(),
  };
  return { callbacks, errors, regions };
}

describe('shared model ownership and Babylon 3D world runtime', () => {
  it('keeps a cached template usable through repeated instance disposal', async () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const bytes = readFileSync('public/assets/models/robot.glb');
    const uri = `data:application/octet-stream;base64,${bytes.toString('base64')}`;
    const container = await SceneLoader.LoadAssetContainerAsync('', uri, scene, undefined, '.glb');
    const baseline = scene.meshes.length;
    for (let i = 0; i < 3; i++) {
      const entry = container.instantiateModelsToScene((n) => `copy-${i}:${n}`, false, { doNotInstantiate: true });
      expect(entry.rootNodes.length).toBeGreaterThan(0);
      expect(scene.meshes.length).toBeGreaterThan(baseline);
      entry.animationGroups.forEach((g) => g.dispose());
      entry.skeletons.forEach((s) => s.dispose());
      entry.rootNodes.forEach((n) => n.dispose());
      expect(scene.meshes.length).toBe(baseline);
    }
    container.dispose();
    scene.dispose();
    engine.dispose();
    expect(EngineStore.Instances.includes(engine)).toBe(false);
  });

  it('loads all 5 skeletal GLBs with bone matrix textures and removes lunar FOGMODE_EXP2', async () => {
    const engine = new NullEngine();
    const { callbacks, errors } = makeCallbacks();
    const world = await createGameWorld(undefined as unknown as HTMLCanvasElement, callbacks, {
      engine,
      disposeEngine: true,
      resolveModelUrl: localModelResolver,
    });

    try {
      expect(errors).toEqual([]);
      const scene = engine.scenes[0];
      // Terrestrial academy uses linear fog; lunar regions MUST NEVER use FOGMODE_EXP2
      expect(scene.fogMode).toBe(Scene.FOGMODE_LINEAR);
      expect(scene.imageProcessingConfiguration.toneMappingEnabled).toBe(true);
      expect(scene.imageProcessingConfiguration.toneMappingType).toBe(ImageProcessingConfiguration.TONEMAPPING_ACES);
      expect(scene.environmentIntensity).toBeGreaterThan(0);

      // Verify offline PBR albedo + bump textures on core terrain, decking, flora & ice materials
      for (const matName of [
        'ceramic',
        'walkway-deck',
        'regolith',
        'canyon-basalt',
        'solar-cells',
        'academy-floor',
        'earth-grass',
        'soil',
        'leaves',
        'lunar-frost-ice',
      ]) {
        const m = scene.materials.find((mat) => mat.name === matName) as PBRMaterial | undefined;
        expect(m, `missing material ${matName}`).toBeDefined();
        expect(m?.albedoTexture, `missing albedoTexture on ${matName}`).toBeTruthy();
        expect(m?.bumpTexture, `missing bumpTexture on ${matName}`).toBeTruthy();
      }
      expect(scene.getTransformNodeByName('academy-lab-wing')).toBeDefined();

      await world.changeRegion('habitat');
      expect(scene.fogMode).toBe(Scene.FOGMODE_NONE);
      expect(scene.getMeshByName('gh-ext-rib-0')).toBeDefined();
      expect(scene.getMeshByName('scatter-rock-v0')).toBeDefined();

      // Ice cave frost/icicles in canyon must stay strictly non-emissive
      await world.changeRegion('canyon');
      expect(scene.fogMode).toBe(Scene.FOGMODE_NONE);
      expect(scene.getMeshByName('ice-cave-overhang-0')).toBeDefined();
      expect(scene.getMeshByName('flood-beam-0')).toBeDefined();
      const iceMat = scene.materials.find((m) => m.name === 'lunar-frost-ice') as PBRMaterial | undefined;
      expect(iceMat).toBeDefined();
      expect(iceMat?.emissiveColor.r).toBe(0);
      expect(iceMat?.emissiveColor.g).toBe(0);
      expect(iceMat?.emissiveColor.b).toBe(0);

      // Every loaded skeleton uses texture bone matrices
      expect(scene.skeletons.length).toBeGreaterThan(0);
      for (const sk of scene.skeletons) {
        expect(sk.useTextureToStoreBoneMatrices).toBe(true);
      }

      // Metrics report live telemetry cleanly
      const metrics = world.getTelemetryMetrics?.();
      expect(metrics?.engine).toBe('NullEngine');
      expect(metrics?.region).toBe('canyon');
      expect((metrics?.triangles ?? 0) > 0).toBe(true);
    } finally {
      world.dispose();
    }
    expect(EngineStore.Instances.includes(engine)).toBe(false);
  }, 15_000);

  it('toggles NPC accessories independently and isolates cadet suit/visor appearance', async () => {
    const engine = new NullEngine();
    const { callbacks } = makeCallbacks();
    const world = await createGameWorld(undefined as unknown as HTMLCanvasElement, callbacks, {
      engine,
      disposeEngine: true,
      resolveModelUrl: localModelResolver,
    });

    try {
      const scene = engine.scenes[0];
      // Academy hosts Lia, Reyes, and Elena simultaneously on independent human-npc instances
      const liaGlasses = scene.meshes.filter((m) => m.name.startsWith('npc-lia-academy:Lia_Glasses'));
      const liaHiddenReyes = scene.meshes.filter((m) => m.name.startsWith('npc-lia-academy:Reyes_CommandJacket'));
      const reyesJacket = scene.meshes.filter((m) => m.name.startsWith('npc-reyes-academy:Reyes_CommandJacket'));
      const elenaCoat = scene.meshes.filter((m) => m.name.startsWith('npc-elena-academy:Elena_LabCoat'));

      expect(liaGlasses.length).toBeGreaterThan(0);
      expect(liaGlasses.every((m) => m.isVisible)).toBe(true);
      expect(liaHiddenReyes.every((m) => !m.isVisible)).toBe(true);
      expect(reyesJacket.every((m) => m.isVisible)).toBe(true);
      expect(elenaCoat.every((m) => m.isVisible)).toBe(true);

      // Cadet appearance updates cloned astronaut accent/visor without mutating NPC materials
      world.setCadetAppearance?.({ suitAccent: 'emerald', visorTone: 'cyan', skinTone: 'deep' });
      const astroAccent = scene.materials.find((m) => m.name.startsWith('astronaut:astra_luminous_cyan')) as
        | PBRMaterial
        | undefined;
      const npcAccent = scene.materials.find(
        (m) => m.name.startsWith('npc-reyes-academy:astra_luminous_cyan'),
      ) as PBRMaterial | undefined;
      expect(astroAccent).toBeDefined();
      expect(npcAccent).toBeDefined();
      expect(astroAccent?.albedoColor.g).toBeGreaterThan(astroAccent?.albedoColor.r ?? 1);
      expect(npcAccent?.albedoColor.toHexString()).not.toBe(astroAccent?.albedoColor.toHexString());

      // Vertex-color suitAccent (backpack/bands) updates to emerald, then cyan, while leaving NPCs untouched
      const astroMesh = scene.meshes.find(
        (m) => m.name.startsWith('astronaut:') && m.material?.name.includes('astra_primary_pbr'),
      );
      const countTint = (pred: (r: number, g: number, b: number) => boolean) => {
        const cols = astroMesh?.getVerticesData('color');
        if (!cols) return 0;
        let n = 0;
        for (let i = 0; i < cols.length; i += 4) {
          if (pred(cols[i], cols[i + 1], cols[i + 2])) n++;
        }
        return n;
      };
      expect(astroMesh?.getVerticesData('color')).toBeTruthy();
      expect(countTint((r, g, b) => r < 0.2 && g > 0.45 && b < 0.4)).toBeGreaterThan(20);
      expect(countTint((r, g, b) => r > 0.72 && g > 0.1 && g < 0.4 && b < 0.12 && r - b > 0.6)).toBe(0);

      world.setCadetAppearance?.({ suitAccent: 'cyan', visorTone: 'cyan', skinTone: 'deep' });
      expect(countTint((r, g, b) => r < 0.25 && g > 0.45 && b > 0.55)).toBeGreaterThan(20);
      expect(countTint((r, g, b) => r > 0.72 && g > 0.1 && g < 0.4 && b < 0.12 && r - b > 0.6)).toBe(0);

      // Simultaneous independent character poses across Astronaut, PIP, and Cometa
      world.setCometaState?.({
        enabled: true,
        mode: 'wait',
        region: 'academy',
        safePos: { x: 1.5, y: 0, z: -1.5 },
        heading: 0,
        pressurized: true,
        lastCue: 'sniff',
      });
      world.triggerActorClip?.({ actorId: 'astronaut', clip: 'PetCometa', loop: false });
      world.triggerActorClip?.({ actorId: 'pip', clip: 'Scan', loop: false });

      const astroGroups = scene.animationGroups.filter((g) => g.name.startsWith('astronaut:'));
      const pipGroups = scene.animationGroups.filter((g) => g.name.startsWith('pip:'));
      const cometaGroups = scene.animationGroups.filter((g) => g.name.startsWith('cometa:'));

      expect(astroGroups.some((g) => g.name.endsWith('PetCometa') && g.isStarted)).toBe(true);
      expect(pipGroups.some((g) => g.name.endsWith('Scan') && g.isStarted)).toBe(true);
      expect(cometaGroups.some((g) => g.name.endsWith('Sniff') && g.isStarted)).toBe(true);
    } finally {
      world.dispose();
    }
  }, 15_000);

  it('enforces pressurized-only Cometa Sniff, safe recall fallback, pause freezing, and aux visuals', async () => {
    const engine = new NullEngine();
    const { callbacks } = makeCallbacks();
    const world = await createGameWorld(undefined as unknown as HTMLCanvasElement, callbacks, {
      engine,
      disposeEngine: true,
      resolveModelUrl: localModelResolver,
    });

    try {
      const scene = engine.scenes[0];
      await world.changeRegion('habitat');

      const getSnapshot = () =>
        (
          globalThis as unknown as {
            __ASTRA_WORLD_DEBUG__?: {
              getSnapshot: () => {
                cometa: { effectiveMode: string; pressurized: boolean; position: { x: number; z: number } | null };
                actors: Record<string, { position: { x: number; z: number } }>;
              };
            };
          }
        ).__ASTRA_WORLD_DEBUG__?.getSnapshot();
      const getCometaEffectiveMode = () => getSnapshot()?.cometa.effectiveMode;

      // Cometa disabled initially -> zero cometa skeletons/groups in scene
      expect(scene.animationGroups.some((g) => g.name.startsWith('cometa:'))).toBe(false);

      // Enable Cometa in vacuum habitat & attempt Sniff -> MUST suppress Sniff and fall back to WagTail;
      // portal recall target { x: 0, y: 0, z: 23 } MUST fall back to effectiveMode === 'wait'.
      world.setCometaState?.({
        enabled: true,
        mode: 'recall',
        region: 'habitat',
        safePos: { x: 0, y: 0, z: 23 },
        safeTargetId: 'expedition-gate',
        heading: 0,
        pressurized: false,
        lastCue: 'sniff',
      });
      const cometaGroups = scene.animationGroups.filter((g) => g.name.startsWith('cometa:'));
      expect(cometaGroups.some((g) => g.name.endsWith('Sniff') && g.isStarted)).toBe(false);
      expect(cometaGroups.some((g) => g.name.endsWith('WagTail') && g.isStarted)).toBe(true);
      expect(getCometaEffectiveMode()).toBe('wait');
      expect(getSnapshot()?.cometa.pressurized).toBe(false);

      // Inside pressurized shelter in lunar habitat -> debug snapshot reflects pressurized: true & Sniff allowed
      world.setCometaState?.({
        enabled: true,
        mode: 'wait',
        region: 'habitat',
        safePos: { x: 11, y: 0, z: 1 },
        heading: 0,
        pressurized: true,
        lastCue: 'sniff',
      });
      expect(getSnapshot()?.cometa.pressurized).toBe(true);
      expect(cometaGroups.some((g) => g.name.endsWith('Sniff') && g.isStarted)).toBe(true);

      // Recruited Scout + enabled Cometa keep clean non-overlapping separation
      world.setCompanionRecruited(true);
      world.setCometaState?.({
        enabled: true,
        mode: 'follow',
        region: 'habitat',
        safePos: { x: 1.45, y: 0, z: -14.45 },
        heading: 0,
        pressurized: false,
      });
      scene.render();
      const snapActors = getSnapshot();
      const scoutPos = snapActors?.actors.scout?.position;
      const cometaPos = snapActors?.cometa.position;
      expect(scoutPos).toBeDefined();
      expect(cometaPos).toBeDefined();
      if (scoutPos && cometaPos) {
        expect(Math.hypot(cometaPos.x - scoutPos.x, cometaPos.z - scoutPos.z)).toBeGreaterThanOrEqual(1.0);
      }

      // Simulation's default recall payload in habitat (safePos clear near mission-console) MUST keep 'recall'
      world.setCometaState?.({
        enabled: true,
        mode: 'recall',
        region: 'habitat',
        safePos: { x: 1.5, y: 0, z: -12 },
        safeTargetId: 'mission-console',
        heading: 0,
        pressurized: false,
      });
      scene.render();
      expect(getCometaEffectiveMode()).toBe('recall');

      // Simulation's default recall payload in canyon (safePos near portal return-gate) MUST keep 'recall'
      await world.changeRegion('canyon');
      world.setCometaState?.({
        enabled: true,
        mode: 'recall',
        region: 'canyon',
        safePos: { x: 1.5, y: 0, z: -18 },
        safeTargetId: 'return-gate',
        heading: 0,
        pressurized: false,
      });
      scene.render();
      expect(getCometaEffectiveMode()).toBe('recall');
      await world.changeRegion('habitat');

      // Disabling Cometa cleanly disposes its runtime nodes & animationGroups
      world.setCometaState?.({
        enabled: false,
        mode: 'wait',
        region: 'habitat',
        safePos: { x: 0, y: 0, z: 0 },
        heading: 0,
      });
      expect(scene.animationGroups.some((g) => g.name.startsWith('cometa:'))).toBe(false);

      // AuxBay ports and FieldKit slots reflect visual state toggles
      world.setAuxVisualState?.({
        ports: { power: true, water: false, o2: true },
        fieldKitSlots: ['relay_mast', null, 'sensor_pylon'],
        auxSolarKw: 6,
      });
      expect(scene.getTransformNodeByName('kit-piece-relay_mast')?.isEnabled()).toBe(true);
      expect(scene.getTransformNodeByName('kit-piece-thermal_shield')?.isEnabled()).toBe(false);
      expect(scene.getTransformNodeByName('kit-piece-sensor_pylon')?.isEnabled()).toBe(true);

      // Pausing freezes active AnimationGroups
      world.triggerActorClip?.({ actorId: 'astronaut', clip: 'Repair', loop: false });
      world.setPaused(true);
      const repairGroup = scene.animationGroups.find((g) => g.name === 'astronaut:Repair');
      expect(repairGroup?.isStarted).toBe(true);
      expect(repairGroup?.isPlaying).toBe(false);
      world.setPaused(false);
      expect(repairGroup?.isPlaying).toBe(true);
    } finally {
      world.dispose();
    }
  }, 15_000);

  it('disposes cleanly across 20 region transitions with zero leaked skeletons, groups, or engines', async () => {
    const engine = new NullEngine();
    const { callbacks } = makeCallbacks();
    const world = await createGameWorld(undefined as unknown as HTMLCanvasElement, callbacks, {
      engine,
      disposeEngine: true,
      resolveModelUrl: localModelResolver,
    });

    try {
      const scene = engine.scenes[0];
      const sequence: RegionId[] = ['orbit', 'habitat', 'canyon', 'greenhouse', 'academy'];

      // Warmup pass across all 5 regions so AssetContainers and async PointsCloudSystem meshes settle
      for (const reg of sequence) {
        await world.changeRegion(reg);
      }
      await new Promise((r) => setTimeout(r, 20));
      const baselineMeshes = scene.meshes.length;
      const baselineGeometries = scene.geometries.length;
      const baselineMaterials = scene.materials.length;
      const baselineSkeletons = scene.skeletons.length;
      const baselineGroups = scene.animationGroups.length;
      const baselineTextures = scene.textures.length;

      for (let i = 0; i < 20; i++) {
        await world.changeRegion(sequence[i % sequence.length]);
      }
      await new Promise((r) => setTimeout(r, 20));

      // Ending back on academy must match baseline counts cleanly (zero leaks, including PCS materials)
      expect(baselineTextures).toBeGreaterThanOrEqual(20);
      expect(scene.meshes.length).toBe(baselineMeshes);
      expect(scene.geometries.length).toBe(baselineGeometries);
      expect(scene.materials.length).toBe(baselineMaterials);
      expect(scene.skeletons.length).toBe(baselineSkeletons);
      expect(scene.animationGroups.length).toBe(baselineGroups);
      expect(scene.textures.length).toBe(baselineTextures);
    } finally {
      world.dispose();
    }
    expect(EngineStore.Instances.includes(engine)).toBe(false);
  }, 25_000);

  it('builds deterministic procedural env cube faces and attaches scene.environmentTexture when supported', async () => {
    const lunarFaces = buildProceduralEnvFaces('lunar', 16);
    const earthFaces = buildProceduralEnvFaces('earth', 16);
    expect(lunarFaces).toHaveLength(6);
    expect(earthFaces).toHaveLength(6);
    for (const face of [...lunarFaces, ...earthFaces]) {
      expect(face.byteLength).toBe(16 * 16 * 4);
    }

    const engine = new NullEngine();
    // Stub createRawCubeTexture with NullEngine's raw texture handler to verify RawCubeTexture lifecycle.
    (engine as unknown as { createRawCubeTexture: (...args: unknown[]) => unknown }).createRawCubeTexture = () => {
      const tex = engine.createRawTexture(null, 16, 16, 5, false, false, 3);
      tex.isCube = true;
      return tex;
    };
    const { callbacks, errors } = makeCallbacks();
    const world = await createGameWorld(undefined as unknown as HTMLCanvasElement, callbacks, {
      engine,
      disposeEngine: true,
      resolveModelUrl: () => {
        throw new Error('skip-models');
      },
    });
    try {
      expect(errors.length).toBeGreaterThan(0);
      const scene = engine.scenes[0];
      expect(scene.environmentTexture).toBeTruthy();
      expect(scene.environmentTexture?.isCube).toBe(true);
      await world.changeRegion('habitat');
      expect(scene.environmentTexture).toBeTruthy();
      expect(scene.environmentIntensity).toBeCloseTo(0.65, 2);
    } finally {
      world.dispose();
    }
    expect(EngineStore.Instances.includes(engine)).toBe(false);
  });

  it('reports clear diagnostics and builds procedural stand-ins when GLB loading fails', async () => {
    const engine = new NullEngine();
    const { callbacks, errors } = makeCallbacks();
    const world = await createGameWorld(undefined as unknown as HTMLCanvasElement, callbacks, {
      engine,
      disposeEngine: true,
      resolveModelUrl: () => {
        throw new Error('offline-test-missing');
      },
    });

    try {
      expect(errors.length).toBeGreaterThanOrEqual(11);
      expect(errors.some((e) => e.includes('astronaut-animated.glb'))).toBe(true);
      const scene = engine.scenes[0];
      expect(scene.getMeshByName('astronaut-standin-torso')).toBeDefined();
      expect(scene.getMeshByName('pip-standin-hull')).toBeDefined();
      world.setCometaState?.({
        enabled: true,
        mode: 'follow',
        region: 'academy',
        safePos: { x: 1, y: 0, z: -1 },
        heading: 0,
      });
      expect(scene.getMeshByName('cometa-standin-body')).toBeDefined();
    } finally {
      world.dispose();
    }
    expect(EngineStore.Instances.includes(engine)).toBe(false);
  });
});
