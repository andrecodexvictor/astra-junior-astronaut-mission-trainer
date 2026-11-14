import fs from 'node:fs/promises';
import path from 'node:path';
const directories=['docs','src','public','tests','scripts'];
async function walk(dir){const entries=await fs.readdir(dir,{withFileTypes:true});return (await Promise.all(entries.map(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]))).flat();}
let files=(await Promise.all(directories.map(walk))).flat();files.push(...(await fs.readdir('.')).filter(f=>f.endsWith('.md')||f.endsWith('.json')));
let json=0,links=0;
for(const file of files){
 if(file.endsWith('.json')){JSON.parse(await fs.readFile(file,'utf8'));json++;}
 if(!file.endsWith('.md'))continue;
 const text=await fs.readFile(file,'utf8');
 for(const match of text.matchAll(/\]\(([^)]+)\)/g)){
  const link=match[1].split(' ')[0].split('#')[0];
  if(!link||/^[a-z]+:|^\/\//i.test(link)||link.includes('${'))continue;
  await fs.access(path.resolve(path.dirname(file),decodeURIComponent(link)));
  links++;
 }
}
console.log(`Documentation: ${json} JSON files parse; ${links} local Markdown links resolve.`);
