import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {validateBytes} from 'gltf-validator';
const manifest=JSON.parse(await fs.readFile('public/assets/manifest.json','utf8'));
let count=0;
for(const asset of manifest.assets){
 const bytes=await fs.readFile(path.join('public',asset.path));
 const hash=createHash('sha256').update(bytes).digest('hex');
 if(hash!==asset.sha256)throw Error(`Checksum mismatch: ${asset.path}`);
 if(!asset.credit||!asset.rights||!asset.classification)throw Error(`Missing provenance: ${asset.path}`);
 if(asset.path.endsWith('.glb')){
  const report=await validateBytes(new Uint8Array(bytes),{uri:asset.path,maxIssues:100});
  if(report.issues.numErrors)throw Error(`${asset.path}: ${report.issues.numErrors} glTF errors`);
  const jsonLength=bytes.readUInt32LE(12),gltf=JSON.parse(bytes.subarray(20,20+jsonLength).toString());
  if(gltf.buffers?.some(b=>b.uri)||gltf.images?.some(i=>i.uri))throw Error(`Non-local GLB resource: ${asset.path}`);
  if(!gltf.meshes?.length||!gltf.accessors?.length)throw Error(`Missing geometry: ${asset.path}`);
  for(const a of gltf.accessors)if(a.min?.some(n=>!Number.isFinite(n))||a.max?.some(n=>!Number.isFinite(n)))throw Error(`Invalid bounds: ${asset.path}`);
  if(asset.id==='astronaut')for(const name of ['ArmPivot_L','ArmPivot_R','LegPivot_L','LegPivot_R'])if(!gltf.nodes.some(n=>n.name?.includes(name)))throw Error(`Missing animation pivot ${name}`);
  if(asset.id==='robot'&&!gltf.nodes.some(n=>n.name?.includes('PipHeadPivot')))throw Error('Missing PIP head pivot');
  console.log(`${asset.id}: glTF valid, ${gltf.meshes.length} meshes, ${report.issues.numWarnings} warnings, ${bytes.length} bytes`);
 }
 count++;
}
console.log(`Asset provenance and SHA-256: ${count} verified. GPU appearance remains a browser check.`);
