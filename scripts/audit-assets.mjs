import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { validateBytes } from 'gltf-validator';

const REQUIRED_CHARACTER_CLIPS = {
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

function readAccessorArray(gltf, binBuffer, accIndex) {
  const acc = gltf.accessors[accIndex];
  const bv = gltf.bufferViews[acc.bufferView];
  const byteOffset = (bv.byteOffset ?? 0) + (acc.byteOffset ?? 0);
  const comps = acc.type === 'SCALAR' ? 1 : acc.type === 'VEC2' ? 2 : acc.type === 'VEC3' ? 3 : acc.type === 'VEC4' ? 4 : 16;
  const length = acc.count * comps;
  if (acc.componentType === 5126) {
    return new Float32Array(binBuffer.buffer, binBuffer.byteOffset + byteOffset, length);
  }
  if (acc.componentType === 5123) {
    return new Uint16Array(binBuffer.buffer, binBuffer.byteOffset + byteOffset, length);
  }
  if (acc.componentType === 5121) {
    return new Uint8Array(binBuffer.buffer, binBuffer.byteOffset + byteOffset, length);
  }
  throw new Error(`Unsupported componentType ${acc.componentType}`);
}

function triangleCountOf(gltf) {
  let tris = 0;
  for (const mesh of gltf.meshes) {
    for (const prim of mesh.primitives) {
      if (prim.indices !== undefined) {
        tris += gltf.accessors[prim.indices].count / 3;
      } else if (prim.attributes.POSITION !== undefined) {
        tris += gltf.accessors[prim.attributes.POSITION].count / 3;
      }
    }
  }
  return tris;
}

const manifest = JSON.parse(await fs.readFile('public/assets/manifest.json', 'utf8'));
const animManifest = JSON.parse(await fs.readFile('content-design/animation-manifest.json', 'utf8'));
const assetHashes = new Map();
let count = 0;

for (const asset of manifest.assets) {
  const bytes = await fs.readFile(path.join('public', asset.path));
  const hash = createHash('sha256').update(bytes).digest('hex');
  if (hash !== asset.sha256) throw Error(`Checksum mismatch: ${asset.path}`);
  if (!asset.credit || !asset.rights || !asset.classification) throw Error(`Missing provenance: ${asset.path}`);
  assetHashes.set(asset.id, hash);

  if (asset.path.endsWith('.glb')) {
    const report = await validateBytes(new Uint8Array(bytes), { uri: asset.path, maxIssues: 100 });
    if (report.issues.numErrors) throw Error(`${asset.path}: ${report.issues.numErrors} glTF errors`);
    const jsonLength = bytes.readUInt32LE(12);
    const gltf = JSON.parse(bytes.subarray(20, 20 + jsonLength).toString());
    if (gltf.buffers?.some((b) => b.uri) || gltf.images?.some((i) => i.uri)) {
      throw Error(`Non-local GLB resource: ${asset.path}`);
    }
    if (!gltf.meshes?.length || !gltf.accessors?.length) throw Error(`Missing geometry: ${asset.path}`);
    for (const a of gltf.accessors) {
      if (a.min?.some((n) => !Number.isFinite(n)) || a.max?.some((n) => !Number.isFinite(n))) {
        throw Error(`Invalid bounds: ${asset.path}`);
      }
    }
    if (asset.id === 'astronaut') {
      for (const name of ['ArmPivot_L', 'ArmPivot_R', 'LegPivot_L', 'LegPivot_R']) {
        if (!gltf.nodes.some((n) => n.name?.includes(name))) throw Error(`Missing animation pivot ${name}`);
      }
    }
    if (asset.id === 'robot' && !gltf.nodes.some((n) => n.name?.includes('PipHeadPivot'))) {
      throw Error('Missing PIP head pivot');
    }

    if (asset.id.endsWith('-animated')) {
      if (report.issues.numWarnings > 0) {
        throw Error(`${asset.path}: expected 0 glTF warnings, got ${report.issues.numWarnings}`);
      }
      const binHeader = 20 + jsonLength;
      const binLength = bytes.readUInt32LE(binHeader);
      const binBuffer = bytes.subarray(binHeader + 8, binHeader + 8 + binLength);

      if (!gltf.skins?.length) throw Error(`Missing skin in ${asset.path}`);
      const skin = gltf.skins[0];
      if (skin.joints.length > 64) throw Error(`Too many joints in ${asset.path}: ${skin.joints.length}`);
      if ((gltf.materials?.length ?? 0) > 3) throw Error(`Too many materials in ${asset.path}: ${gltf.materials.length}`);
      const tris = triangleCountOf(gltf);
      if (tris > 20000) throw Error(`Triangle budget exceeded in ${asset.path}: ${tris}`);

      let bindMinY = Infinity;
      for (const mesh of gltf.meshes) {
        for (const prim of mesh.primitives) {
          if (prim.attributes.JOINTS_0 === undefined || prim.attributes.WEIGHTS_0 === undefined) {
            throw Error(`Unskinned primitive in ${asset.path}`);
          }
          const posAcc = gltf.accessors[prim.attributes.POSITION];
          if (posAcc.min) bindMinY = Math.min(bindMinY, posAcc.min[1]);
          const weights = readAccessorArray(gltf, binBuffer, prim.attributes.WEIGHTS_0);
          for (let i = 0; i < weights.length; i += 4) {
            const sum = weights[i] + weights[i + 1] + weights[i + 2] + weights[i + 3];
            if (Math.abs(sum - 1) > 1e-4) {
              throw Error(`Unnormalized skin weight (sum=${sum}) in ${asset.path}`);
            }
          }
        }
      }
      if (bindMinY < -0.005) throw Error(`Grounded origin violated in ${asset.path}: minY=${bindMinY}`);

      const actorId = asset.id.replace(/-animated$/, '');
      const requiredClips = REQUIRED_CHARACTER_CLIPS[actorId];
      if (!requiredClips) throw Error(`Unexpected animated character id: ${actorId}`);
      const animNames = new Set((gltf.animations ?? []).map((a) => a.name));
      for (const req of requiredClips) {
        if (!animNames.has(req)) throw Error(`Missing clip ${req} in ${asset.path}`);
      }

      // Verify zero horizontal root X/Z translation in every clip
      const rootJointIdx = skin.joints[0];
      for (const anim of gltf.animations ?? []) {
        for (const ch of anim.channels) {
          if (ch.target.node === rootJointIdx && ch.target.path === 'translation') {
            const samp = anim.samplers[ch.sampler];
            const trans = readAccessorArray(gltf, binBuffer, samp.output);
            for (let i = 0; i < trans.length; i += 3) {
              if (Math.abs(trans[i]) > 1e-5 || Math.abs(trans[i + 2]) > 1e-5) {
                throw Error(`Non-zero horizontal root translation in ${asset.path} clip ${anim.name}`);
              }
            }
          }
        }
      }

      if (actorId === 'human-npc') {
        for (const nodeName of ['Reyes_Beard', 'Reyes_CommandJacket', 'Lia_Glasses', 'Lia_Vest', 'Elena_Headband', 'Elena_LabCoat']) {
          if (!gltf.nodes.some((n) => n.name === nodeName)) {
            throw Error(`Missing toggleable NPC accessory mesh ${nodeName} in ${asset.path}`);
          }
        }
      }
      if (actorId === 'scout') {
        for (const wheel of ['Wheel_FL', 'Wheel_FR', 'Wheel_RL', 'Wheel_RR']) {
          if (!gltf.nodes.some((n) => n.name === wheel)) {
            throw Error(`Missing Scout wheel joint ${wheel} in ${asset.path}`);
          }
        }
      }

      console.log(
        `${asset.id}: glTF valid, ${tris} tris, ${skin.joints.length} joints, ${gltf.materials.length} mats, ${gltf.animations.length} clips, ${report.issues.numWarnings} warnings, ${bytes.length} bytes`
      );
    } else {
      console.log(`${asset.id}: glTF valid, ${gltf.meshes.length} meshes, ${report.issues.numWarnings} warnings, ${bytes.length} bytes`);
    }
  }
  count++;
}

// Verify content-design/animation-manifest.json against actual GLBs
if (!animManifest.runtimeAsset) throw Error('animation-manifest.json runtimeAsset must be true');
if (animManifest.coordinateContract?.forwardAxis !== '+Z') throw Error('animation-manifest.json forwardAxis must be +Z');

for (const actorId of Object.keys(REQUIRED_CHARACTER_CLIPS)) {
  const entry = animManifest.actors.find((a) => a.id === actorId);
  if (!entry || !entry.exists) throw Error(`Missing or unbuilt actor in animation-manifest.json: ${actorId}`);
  const expectedHash = assetHashes.get(`${actorId}-animated`);
  if (!expectedHash || entry.sha256 !== expectedHash) {
    throw Error(`Hash mismatch in animation-manifest.json for ${actorId}`);
  }
  const bytes = await fs.readFile(entry.proposedGlbPath);
  const jsonLength = bytes.readUInt32LE(12);
  const gltf = JSON.parse(bytes.subarray(20, 20 + jsonLength).toString());
  const gltfJointNames = gltf.skins[0].joints.map((j) => gltf.nodes[j].name);
  if (JSON.stringify(entry.rigNodePaths) !== JSON.stringify(gltfJointNames)) {
    throw Error(`rigNodePaths mismatch in animation-manifest.json for ${actorId}`);
  }
  const gltfClipNames = new Set(gltf.animations.map((a) => a.name));
  for (const clip of entry.clips) {
    if (!gltfClipNames.has(clip.name)) throw Error(`Manifest clip ${clip.name} missing in ${entry.proposedGlbPath}`);
    if (!Number.isFinite(clip.durationSeconds) || clip.durationSeconds <= 0) {
      throw Error(`Invalid clip duration for ${actorId}.${clip.name}`);
    }
  }
  if (actorId === 'cometa' && !(entry.clearanceVerification?.minClearanceMeters >= 0.015)) {
    throw Error('Cometa helmet/ear clearance verification missing or below 0.015m');
  }
}

console.log(`Asset provenance, character rigs/clips/hashes and SHA-256: ${count} verified. GPU appearance remains a browser check.`);
