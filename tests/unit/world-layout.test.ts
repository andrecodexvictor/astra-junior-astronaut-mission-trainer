import { describe, expect, it } from 'vitest';
import { OBSTACLES, REGIONS, REGION_LINKS } from '../../src/world/manifest';
import type { RegionId } from '../../src/contracts';

describe('authored world', () => {
 it('keeps every target and spawn within its region with unique IDs', () => {
  const ids=new Set<string>();
  for (const [name,plan] of Object.entries(REGIONS)) {
   expect(Math.abs(plan.spawn.x)).toBeLessThan(plan.bounds); expect(Math.abs(plan.spawn.z)).toBeLessThan(plan.bounds);
   for (const target of plan.targets) {expect(target.region).toBe(name);expect(ids.has(target.id)).toBe(false);ids.add(target.id);expect(Math.abs(target.position.x)).toBeLessThan(plan.bounds);expect(Math.abs(target.position.z)).toBeLessThan(plan.bounds);}
  }
  expect(ids.size).toBe(20);
 });
 it('can reach the interaction radius of every target on the collision grid', () => {
  for (const [region,plan] of Object.entries(REGIONS)) {
   const obstacles=OBSTACLES[region as RegionId], step=.5;
   const key=(x:number,z:number)=>`${x},${z}`;
   const start=[Math.round(plan.spawn.x/step),Math.round(plan.spawn.z/step)] as const;
   const queue:Array<readonly [number,number]>=[start], visited=new Set([key(...start)]);
   for(let i=0;i<queue.length;i++) {const [x,z]=queue[i];for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]) {const nx=x+dx,nz=z+dz,wx=nx*step,wz=nz*step,k=key(nx,nz);if(Math.abs(wx)>plan.bounds||Math.abs(wz)>plan.bounds||visited.has(k)||obstacles.some(o=>Math.abs(wx-o.x)<o.halfX+.3&&Math.abs(wz-o.z)<o.halfZ+.3))continue;visited.add(k);queue.push([nx,nz]);}}
   for(const target of plan.targets) expect(queue.some(([x,z])=>Math.hypot(x*step-target.position.x,z*step-target.position.z)<(target.radius??3)),target.id).toBe(true);
  }
 });
 it('connects all regions to the habitat with reversible links', () => {
  const reached=new Set<RegionId>(['habitat']);let previous=0;
  while(previous!==reached.size){previous=reached.size;for(const [a,b] of REGION_LINKS){if(reached.has(a))reached.add(b);if(reached.has(b))reached.add(a);}}
  expect(reached.size).toBe(Object.keys(REGIONS).length);
 });
});
