import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { EngineStore } from '@babylonjs/core/Engines/engineStore';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Scene } from '@babylonjs/core/scene';
import { SceneLoader } from '@babylonjs/core/Loading/sceneLoader';
import '@babylonjs/loaders/glTF/2.0/glTFLoader';
import '@babylonjs/loaders/glTF/2.0/Extensions/KHR_materials_emissive_strength';

describe('shared model ownership',()=>{
 it('keeps a cached template usable through repeated instance disposal',async()=>{
  const engine=new NullEngine(), scene=new Scene(engine);
  const bytes=readFileSync('public/assets/models/robot.glb');
  const uri=`data:application/octet-stream;base64,${bytes.toString('base64')}`;
  const container=await SceneLoader.LoadAssetContainerAsync('',uri,scene,undefined,'.glb');
  const baseline=scene.meshes.length;
  for(let i=0;i<3;i++){
   const entry=container.instantiateModelsToScene(n=>`copy-${i}:${n}`,false,{doNotInstantiate:true});
   expect(entry.rootNodes.length).toBeGreaterThan(0);
   expect(scene.meshes.length).toBeGreaterThan(baseline);
   entry.animationGroups.forEach(g=>g.dispose());entry.skeletons.forEach(s=>s.dispose());entry.rootNodes.forEach(n=>n.dispose());
   expect(scene.meshes.length).toBe(baseline);
  }
  container.dispose();scene.dispose();engine.dispose();
  expect(EngineStore.Instances.includes(engine)).toBe(false);
 });
});
