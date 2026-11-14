import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
const root=process.cwd(),manifest=JSON.parse(await fs.readFile('docs/art/manifest.json','utf8'));
if(manifest.status!=='reference_only'||manifest.images.length!==4)throw Error('Expected the four reference-only ASTRA boards');
for(const entry of manifest.images){
 const filename=path.resolve(root,entry.path);if(!filename.startsWith(path.join(root,'docs','art')+path.sep))throw Error('Art path outside the reference folder');
 const data=await fs.readFile(filename);
 if(data.subarray(0,8).toString('hex')!=='89504e470d0a1a0a')throw Error('Not a PNG: '+entry.path);
 if(createHash('sha256').update(data).digest('hex')!==entry.sha256||data.length!==entry.bytes)throw Error('Art integrity mismatch: '+entry.path);
 if(data.readUInt32BE(16)!==entry.width||data.readUInt32BE(20)!==entry.height)throw Error('Art dimensions mismatch: '+entry.path);
 if(entry.runtimeAsset!==false||entry.aiGenerated!==true||entry.visibleAiLabel!==true||!entry.credit||!entry.rights)throw Error('Incomplete concept provenance: '+entry.path);
 console.log(`${entry.id}: ${entry.width}x${entry.height}, SHA-256 verified, reference only`);
}
console.log('Four concept boards verified. Labels were visually inspected; this is not OCR, rig or GPU validation.');
