import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
const files=[];
async function walk(dir){
 for(const entry of (await fs.readdir(dir,{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))){
  const file=path.join(dir,entry.name);
  if(entry.isDirectory())await walk(file);
  else if(entry.isFile()){const bytes=await fs.readFile(file);files.push({path:path.relative('dist',file).split(path.sep).join('/'),bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});}
 }
}
await walk('dist');
const pkg=JSON.parse(await fs.readFile('package.json','utf8'));
await fs.writeFile('docs/demo/BUILD_MANIFEST.json',JSON.stringify({version:2,node:process.versions.node,vite:pkg.devDependencies.vite,totalBytes:files.reduce((n,f)=>n+f.bytes,0),files,note:'Generated from this local static build. File integrity does not establish browser, hardware GPU, educational or competition acceptance.'},null,2)+'\n');
console.log(`Build inventory: ${files.length} files; SHA-256 recorded.`);
