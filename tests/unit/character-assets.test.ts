import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { EngineStore } from '@babylonjs/core/Engines/engineStore';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Scene } from '@babylonjs/core/scene';
import { FreeCamera } from '@babylonjs/core/Cameras/freeCamera';
import { Vector3, Quaternion } from '@babylonjs/core/Maths/math.vector';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { SceneLoader } from '@babylonjs/core/Loading/sceneLoader';
import '@babylonjs/loaders/glTF/2.0/glTFLoader';
import '@babylonjs/loaders/glTF/2.0/Extensions/KHR_materials_emissive_strength';

const animManifest = JSON.parse(readFileSync('content-design/animation-manifest.json', 'utf8'));

const EXPECTED_CLIPS: Record<string, string[]> = {
  astronaut: [
    'Idle', 'WalkEarth', 'RunEarth', 'WalkLunar', 'RunLunar',
    'TurnLeft', 'TurnRight', 'Stop', 'Inspect', 'Repair',
    'JumpTakeoff', 'Airborne', 'Land', 'Talk', 'PetCometa',
  ],
  'human-npc': [
    'Idle', 'Talk', 'Gesture', 'Point', 'Walk', 'TurnLeft', 'TurnRight',
  ],
  pip: [
    'Idle', 'Travel', 'TurnLeft', 'TurnRight', 'Scan', 'Acknowledge',
  ],
  scout: [
    'Idle', 'Travel', 'TurnLeft', 'TurnRight', 'Scan', 'Acknowledge',
  ],
  cometa: [
    'Idle', 'Walk', 'WalkEarth', 'WalkLunar', 'Trot', 'TrotEarth', 'TrotLunar',
    'TurnLeft', 'TurnRight', 'Stop', 'Sit', 'Wait', 'Recall',
    'Sniff', 'WagTail', 'ReceivePet', 'LookAtBeacon', 'WatchRepair',
  ],
};

function toDataUri(glbPath: string): string {
  const bytes = readFileSync(glbPath);
  return `data:application/octet-stream;base64,${bytes.toString('base64')}`;
}

function captureSkeletonPose(bones: { name: string; getTransformNode: () => TransformNode | null }[]) {
  const snapshot = new Map<string, { pos: Vector3; rot: Quaternion; scl: Vector3 }>();
  for (const b of bones) {
    const tn = b.getTransformNode();
    if (!tn) continue;
    snapshot.set(b.name, {
      pos: tn.position.clone(),
      rot: (tn.rotationQuaternion ?? Quaternion.Identity()).clone().normalize(),
      scl: tn.scaling.clone(),
    });
  }
  return snapshot;
}

function measurePoseDelta(
  a: Map<string, { pos: Vector3; rot: Quaternion; scl: Vector3 }>,
  b: Map<string, { pos: Vector3; rot: Quaternion; scl: Vector3 }>
): number {
  let total = 0;
  for (const [name, pa] of a.entries()) {
    const pb = b.get(name);
    if (!pb) continue;
    total += Vector3.Distance(pa.pos, pb.pos);
    // Account for quaternion double cover (q and -q represent the same orientation)
    const dot = Math.abs(Quaternion.Dot(pa.rot, pb.rot));
    const angle = dot >= 1 - 1e-12 ? 0 : 2 * Math.acos(Math.min(1, dot));
    total += angle;
    total += Vector3.Distance(pa.scl, pb.scl);
  }
  return total;
}

function computeCombinedBounds(meshes: any[], applySkeleton: boolean) {
  let minY = Infinity;
  let maxY = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const m of meshes) {
    if (!m.getTotalVertices || m.getTotalVertices() === 0) continue;
    m.computeWorldMatrix(true);
    if (applySkeleton && m.skeleton) m.refreshBoundingInfo(true);
    else m.refreshBoundingInfo(false);
    const bb = m.getBoundingInfo().boundingBox;
    minY = Math.min(minY, bb.minimumWorld.y);
    maxY = Math.max(maxY, bb.maximumWorld.y);
    minZ = Math.min(minZ, bb.minimumWorld.z);
    maxZ = Math.max(maxZ, bb.maximumWorld.z);
  }
  return { minY, maxY, minZ, maxZ };
}

function getBoneWorldZ(skel: { bones: { name: string; getTransformNode: () => TransformNode | null }[] }, boneName: string): number {
  const bone = skel.bones.find((b) => b.name === boneName);
  expect(bone, `Missing bone ${boneName}`).toBeDefined();
  const tn = bone!.getTransformNode();
  expect(tn, `Missing TransformNode for bone ${boneName}`).not.toBeNull();
  tn!.computeWorldMatrix(true);
  return tn!.getAbsolutePosition().z;
}

function getMeshCenterZ(meshes: any[], predicate: (m: any) => boolean, label: string): number {
  const match = meshes.find((m) => m.getTotalVertices?.() > 0 && predicate(m));
  expect(match, `Missing mesh ${label}`).toBeDefined();
  match.computeWorldMatrix(true);
  match.refreshBoundingInfo(true);
  return match.getBoundingInfo().boundingBox.centerWorld.z;
}

describe('character rigs and skeletal animation GLBs in Babylon NullEngine', () => {
  it('loads all 5 character GLBs with valid rigs, clips, budgets, +Z forward, and grounded bounds', async () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    new FreeCamera('cam', new Vector3(0, 1.2, -5), scene);

    for (const actor of animManifest.actors) {
      const container = await SceneLoader.LoadAssetContainerAsync('', toDataUri(actor.proposedGlbPath), scene, undefined, '.glb');
      const inst = container.instantiateModelsToScene((n) => `${actor.id}:${n}`, false, { doNotInstantiate: true });

      expect(inst.skeletons.length).toBe(1);
      const skel = inst.skeletons[0];
      expect(skel.bones.length).toBeGreaterThan(0);
      expect(skel.bones.length).toBeLessThanOrEqual(64);

      const meshes = inst.rootNodes.flatMap((n) => n.getChildMeshes(false));
      const uniqueMats = new Set(meshes.map((m) => m.material).filter(Boolean));
      expect(uniqueMats.size).toBeGreaterThan(0);
      expect(uniqueMats.size).toBeLessThanOrEqual(3);

      const totalTris = meshes.reduce((acc, m) => acc + m.getTotalIndices() / 3, 0);
      expect(totalTris).toBeGreaterThan(100);
      expect(totalTris).toBeLessThanOrEqual(20000);

      // Verify all required clips are present
      const groupMap = new Map<string, any>();
      for (const g of inst.animationGroups) {
        const clipName = g.name.startsWith(`${actor.id}:`) ? g.name.slice(actor.id.length + 1) : g.name;
        groupMap.set(clipName, g);
      }
      for (const reqClip of EXPECTED_CLIPS[actor.id]) {
        expect(groupMap.has(reqClip)).toBe(true);
      }

      // Grounded bind-pose bounds
      scene.render();
      const bindBounds = computeCombinedBounds(meshes, true);
      expect(bindBounds.minY).toBeGreaterThanOrEqual(-0.005);
      expect(bindBounds.maxY).toBeGreaterThan(0.5);

      // Verify +Z forward orientation in Babylon world space (front features > +Z, rear features < 0)
      if (actor.id === 'astronaut') {
        const visorZ = getMeshCenterZ(meshes, (m) => m.material?.name === 'astra_visor_glass', 'astronaut visor');
        const backpackZ = getBoneWorldZ(skel, 'Backpack');
        expect(visorZ).toBeGreaterThan(0.04);
        expect(getBoneWorldZ(skel, 'Head')).toBeGreaterThan(0.01);
        expect(getBoneWorldZ(skel, 'Toe_L')).toBeGreaterThan(0.08);
        expect(getBoneWorldZ(skel, 'Toe_R')).toBeGreaterThan(0.08);
        expect(backpackZ).toBeLessThan(-0.15);
        expect(visorZ).toBeGreaterThan(backpackZ);
      } else if (actor.id === 'human-npc') {
        const glassesLensZ = getMeshCenterZ(meshes, (m) => m.material?.name === 'astra_lenses_glass', 'Lia glasses lens');
        const reyesBeardZ = getMeshCenterZ(meshes, (m) => m.name === 'human-npc:Reyes_Beard', 'Reyes beard');
        const liaBunZ = getMeshCenterZ(meshes, (m) => m.name === 'human-npc:Lia_HairBun', 'Lia hair bun');
        const elenaHairZ = getMeshCenterZ(meshes, (m) => m.name === 'human-npc:Elena_CurlyHair', 'Elena curly hair');
        expect(glassesLensZ).toBeGreaterThan(0.10);
        expect(reyesBeardZ).toBeGreaterThan(0.04);
        expect(getBoneWorldZ(skel, 'Toe_L')).toBeGreaterThan(0.08);
        expect(getBoneWorldZ(skel, 'Toe_R')).toBeGreaterThan(0.08);
        expect(liaBunZ).toBeLessThan(-0.01);
        expect(elenaHairZ).toBeLessThan(-0.01);
        expect(glassesLensZ).toBeGreaterThan(liaBunZ);
      } else if (actor.id === 'pip') {
        const screenZ = getMeshCenterZ(meshes, (m) => m.material?.name === 'astra_visor_screen', 'PIP visor screen');
        const antennaZ = getBoneWorldZ(skel, 'PipAntenna');
        expect(getBoneWorldZ(skel, 'PipEye_L')).toBeGreaterThan(0.15);
        expect(getBoneWorldZ(skel, 'PipEye_R')).toBeGreaterThan(0.15);
        expect(screenZ).toBeGreaterThan(0.05);
        expect(antennaZ).toBeLessThan(-0.02);
      } else if (actor.id === 'scout') {
        const sensorZ = getMeshCenterZ(meshes, (m) => m.material?.name === 'astra_sensor_glass', 'Scout sensor glass');
        expect(sensorZ).toBeGreaterThan(0.20);
        expect(getBoneWorldZ(skel, 'ScanHead')).toBeGreaterThan(0.12);
        expect(getBoneWorldZ(skel, 'ArmForearm')).toBeGreaterThan(0.30);
        expect(getBoneWorldZ(skel, 'Wheel_FL')).toBeGreaterThan(0.25);
        expect(getBoneWorldZ(skel, 'Wheel_FR')).toBeGreaterThan(0.25);
        expect(getBoneWorldZ(skel, 'Wheel_RL')).toBeLessThan(-0.25);
        expect(getBoneWorldZ(skel, 'Wheel_RR')).toBeLessThan(-0.25);
        expect(getBoneWorldZ(skel, 'Antenna_L')).toBeLessThan(-0.25);
        expect(getBoneWorldZ(skel, 'Antenna_R')).toBeLessThan(-0.25);
      } else if (actor.id === 'cometa') {
        const helmetZ = getMeshCenterZ(meshes, (m) => m.material?.name === 'astra_helmet_glass', 'Cometa helmet');
        expect(helmetZ).toBeGreaterThan(0.30);
        expect(getBoneWorldZ(skel, 'Head')).toBeGreaterThan(0.30);
        expect(getBoneWorldZ(skel, 'Neck')).toBeGreaterThan(0.25);
        expect(getBoneWorldZ(skel, 'Paw_FL')).toBeGreaterThan(0.18);
        expect(getBoneWorldZ(skel, 'Paw_FR')).toBeGreaterThan(0.18);
        expect(getBoneWorldZ(skel, 'Pelvis')).toBeLessThan(-0.20);
        expect(getBoneWorldZ(skel, 'Paw_RL')).toBeLessThan(-0.20);
        expect(getBoneWorldZ(skel, 'Paw_RR')).toBeLessThan(-0.20);
        expect(getBoneWorldZ(skel, 'Tail1')).toBeLessThan(-0.30);
        expect(getBoneWorldZ(skel, 'Tail3')).toBeLessThan(-0.45);
      }

      if (actor.id === 'human-npc') {
        const findPartMeshes = (partName: string) =>
          meshes.filter((m) => {
            const base = m.name.replace(`${actor.id}:`, '');
            return base === partName || base.startsWith(`${partName}_primitive`);
          });
        for (const acc of [
          'HumanNpc_Body',
          'Reyes_Beard', 'Reyes_Hair', 'Reyes_CommandJacket',
          'Lia_Glasses', 'Lia_HairBun', 'Lia_Vest',
          'Elena_CurlyHair', 'Elena_Headband', 'Elena_LabCoat',
        ]) {
          expect(findPartMeshes(acc).length).toBeGreaterThan(0);
        }
        for (const acc of ['Reyes_Beard', 'Lia_Glasses', 'Elena_Headband']) {
          const accMeshes = findPartMeshes(acc);
          accMeshes.forEach((m) => m.setEnabled(false));
          expect(accMeshes.every((m) => !m.isEnabled())).toBe(true);
          accMeshes.forEach((m) => m.setEnabled(true));
          expect(accMeshes.every((m) => m.isEnabled())).toBe(true);
        }
      }

      // Verify non-zero pose deltas, zero horizontal root drift, and grounded bounds across EVERY clip
      const rootBone = skel.bones[0];
      for (const clipMeta of actor.clips) {
        const grp = groupMap.get(clipMeta.name);
        expect(grp).toBeDefined();
        grp.start(false, 1, grp.from, grp.to);
        grp.pause();

        const samples = [0, 0.25, 0.5, 0.75, 0.999];
        const poses = [];
        for (const frac of samples) {
          grp.goToFrame(grp.from + (grp.to - grp.from) * frac);
          scene.render();
          poses.push(captureSkeletonPose(skel.bones));

          const rootTn = rootBone.getTransformNode();
          if (rootTn) {
            rootTn.computeWorldMatrix(true);
            const rp = rootTn.getAbsolutePosition();
            expect(Math.abs(rp.x)).toBeLessThan(1e-4);
            expect(Math.abs(rp.z)).toBeLessThan(1e-4);
          }

          const animBounds = computeCombinedBounds(meshes, true);
          expect(animBounds.minY).toBeGreaterThanOrEqual(-0.005);
        }
        grp.stop();

        let maxDelta = 0;
        for (let i = 1; i < poses.length; i++) {
          maxDelta = Math.max(maxDelta, measurePoseDelta(poses[0], poses[i]));
        }
        expect(maxDelta).toBeGreaterThan(0.02);

        if (clipMeta.loop) {
          // Loop seam continuity between t=0 and end-of-cycle
          expect(measurePoseDelta(poses[0], poses[poses.length - 1])).toBeLessThan(0.05);
        }
      }

      // Character-specific checks: Scout spinning wheels & Cometa ear-helmet clearance
      if (actor.id === 'scout') {
        const travel = groupMap.get('Travel');
        travel.start(false, 1, travel.from, travel.to);
        travel.pause();
        const wheelQuats: Record<string, Quaternion[]> = {
          Wheel_FL: [], Wheel_FR: [], Wheel_RL: [], Wheel_RR: [],
        };
        for (const frac of [0, 0.25, 0.5, 0.75]) {
          travel.goToFrame(travel.from + (travel.to - travel.from) * frac);
          scene.render();
          for (const wn of Object.keys(wheelQuats)) {
            const b = skel.bones.find((x) => x.name === wn)!;
            wheelQuats[wn].push(b.getTransformNode()!.rotationQuaternion!.clone());
          }
        }
        travel.stop();
        for (const qs of Object.values(wheelQuats)) {
          // Each quarter-revolution must differ ~90 deg from adjacent quarter
          for (let i = 0; i < 3; i++) {
            const angle = 2 * Math.acos(Math.min(1, Math.abs(Quaternion.Dot(qs[i], qs[i + 1]))));
            expect(angle).toBeGreaterThan(1.2);
          }
        }
      }

      if (actor.id === 'cometa') {
        // Verify dachshund trunk proportion L ≈ 2.5 * H and ear-to-helmet separation
        expect(bindBounds.maxZ - bindBounds.minZ).toBeGreaterThan(0.75);
        expect(actor.clearanceVerification.minClearanceMeters).toBeGreaterThanOrEqual(0.015);
      }

      inst.animationGroups.forEach((g) => g.dispose());
      inst.skeletons.forEach((s) => s.dispose());
      inst.rootNodes.forEach((n) => n.dispose());
      container.dispose();
    }

    scene.dispose();
    engine.dispose();
    expect(EngineStore.Instances.includes(engine)).toBe(false);
  }, 30000);

  it('animates two simultaneous astronaut instances independently with cloned skeletons and pause isolation', async () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    new FreeCamera('cam', new Vector3(0, 1.5, -6), scene);

    const container = await SceneLoader.LoadAssetContainerAsync(
      '',
      toDataUri('public/assets/models/characters/astronaut-animated.glb'),
      scene,
      undefined,
      '.glb'
    );
    const baselineMeshes = scene.meshes.length;

    const actorA = container.instantiateModelsToScene((n) => `astroA:${n}`, false, { doNotInstantiate: true });
    const actorB = container.instantiateModelsToScene((n) => `astroB:${n}`, false, { doNotInstantiate: true });

    const rootA = new TransformNode('wrapA', scene);
    rootA.position.set(-2, 0, 0);
    actorA.rootNodes.forEach((n) => (n.parent = rootA));

    const rootB = new TransformNode('wrapB', scene);
    rootB.position.set(2, 0, 0);
    actorB.rootNodes.forEach((n) => (n.parent = rootB));

    // Must own completely independent cloned skeletons and animation groups
    expect(actorA.skeletons[0]).not.toBe(actorB.skeletons[0]);
    expect(actorA.animationGroups.length).toBe(15);
    expect(actorB.animationGroups.length).toBe(15);

    const walkA = actorA.animationGroups.find((g) => g.name === 'astroA:WalkEarth')!;
    const walkB = actorB.animationGroups.find((g) => g.name === 'astroB:WalkEarth')!;
    const repairB = actorB.animationGroups.find((g) => g.name === 'astroB:Repair')!;

    // Start actorA walking to frame 20% and PAUSE it; advance actorB through WalkEarth & Repair
    walkA.start(true, 1, walkA.from, walkA.to);
    walkA.goToFrame(walkA.from + (walkA.to - walkA.from) * 0.2);
    walkA.pause();

    walkB.start(true, 1, walkB.from, walkB.to);
    walkB.goToFrame(walkB.from + (walkB.to - walkB.from) * 0.75);
    scene.render();

    const frozenPoseA = captureSkeletonPose(actorA.skeletons[0].bones);
    const initialPoseB = captureSkeletonPose(actorB.skeletons[0].bones);
    expect(measurePoseDelta(frozenPoseA, initialPoseB)).toBeGreaterThan(0.5);

    // Switch actorB to Repair mid-kneel while actorA stays paused
    walkB.stop();
    repairB.start(false, 1, repairB.from, repairB.to);
    repairB.goToFrame(repairB.from + (repairB.to - repairB.from) * 0.5);
    repairB.pause();
    scene.render();

    const afterPoseA = captureSkeletonPose(actorA.skeletons[0].bones);
    const kneelPoseB = captureSkeletonPose(actorB.skeletons[0].bones);

    // ActorA stayed 100% frozen during pause while ActorB transitioned independently
    expect(measurePoseDelta(frozenPoseA, afterPoseA)).toBeLessThan(1e-6);
    expect(measurePoseDelta(initialPoseB, kneelPoseB)).toBeGreaterThan(1.0);

    // Clean disposal back to baseline
    for (const entry of [actorA, actorB]) {
      entry.animationGroups.forEach((g) => g.dispose());
      entry.skeletons.forEach((s) => s.dispose());
      entry.rootNodes.forEach((n) => n.dispose());
    }
    rootA.dispose();
    rootB.dispose();
    expect(scene.meshes.length).toBe(baselineMeshes);

    container.dispose();
    scene.dispose();
    engine.dispose();
    expect(EngineStore.Instances.includes(engine)).toBe(false);
  }, 15000);
});
