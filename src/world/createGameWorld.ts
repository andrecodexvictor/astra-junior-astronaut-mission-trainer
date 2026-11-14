import { Engine } from '@babylonjs/core/Engines/engine';
import { Scene } from '@babylonjs/core/scene';
import '@babylonjs/core/Collisions/collisionCoordinator';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Color3, Color4 } from '@babylonjs/core/Maths/math.color';
import { CreateBox } from '@babylonjs/core/Meshes/Builders/boxBuilder';
import { CreateCylinder } from '@babylonjs/core/Meshes/Builders/cylinderBuilder';
import { CreateSphere } from '@babylonjs/core/Meshes/Builders/sphereBuilder';
import { CreateTorus } from '@babylonjs/core/Meshes/Builders/torusBuilder';
import { CreateLineSystem } from '@babylonjs/core/Meshes/Builders/linesBuilder';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { PBRMaterial } from '@babylonjs/core/Materials/PBR/pbrMaterial';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight';
import { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator';
import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { SceneLoader } from '@babylonjs/core/Loading/sceneLoader';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import { SceneInstrumentation } from '@babylonjs/core/Instrumentation/sceneInstrumentation';
import type { AssetContainer, InstantiatedEntries } from '@babylonjs/core/assetContainer';
import type { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh';
import '@babylonjs/loaders/glTF/2.0/glTFLoader';
import '@babylonjs/loaders/glTF/2.0/Extensions/KHR_materials_emissive_strength';
import type { GameWorld, PlayerPose, RegionId, WorldCallbacks, WorldTarget } from '../contracts';
import { OBSTACLES, REGIONS } from './manifest';
import { advanceMotion, followPosition, type MotionState } from '../actors/movement';

const MODEL_NAMES = ['astronaut','robot','habitat','greenhouse','battery','water','oxygen','solar'] as const;
type ModelName = typeof MODEL_NAMES[number];
const base = import.meta.env.BASE_URL;

export async function createGameWorld(canvas: HTMLCanvasElement, callbacks: WorldCallbacks): Promise<GameWorld> {
 let engine: Engine;
 try {
  engine = new Engine(canvas, true, { preserveDrawingBuffer: false, stencil: true, disableWebGL2Support: false });
  if (engine.webGLVersion < 2) { engine.dispose(); throw new Error('WebGL 2 is required to explore ASTRA.'); }
 } catch (error) { const message = error instanceof Error ? error.message : String(error); callbacks.onError(`Unable to start the 3D world: ${message}`); throw error; }
 const scene = new Scene(engine); scene.collisionsEnabled=true; scene.clearColor = new Color4(.014,.026,.065,1);
 const camera = new ArcRotateCamera('follow-camera', -Math.PI/2, 1.05, 12, new Vector3(0,1,0), scene);
 camera.checkCollisions=true; camera.collisionRadius=new Vector3(.3,.3,.3); camera.lowerRadiusLimit=5; camera.upperRadiusLimit=20; camera.lowerBetaLimit=.45; camera.upperBetaLimit=1.43; camera.wheelPrecision=35; camera.attachControl(canvas,true); camera.inputs.removeByType('ArcRotateCameraKeyboardMoveInput');
 const hemi = new HemisphericLight('fill', new Vector3(0,1,0), scene); hemi.intensity=.8; hemi.groundColor=new Color3(.25,.27,.34);
 const sun = new DirectionalLight('sun', new Vector3(-.5,-1,.35), scene); sun.intensity=1.4;
 const instrumentation = new SceneInstrumentation(scene);
 const shadows=new ShadowGenerator(1024,sun); shadows.useBlurExponentialShadowMap=true;
 const cache = new Map<ModelName, AssetContainer>();
 await Promise.all(MODEL_NAMES.map(async name => { try { cache.set(name, await SceneLoader.LoadAssetContainerAsync(`${base}assets/models/`, `${name}.glb`, scene)); } catch { callbacks.onError(`Could not load local model ${name}.glb; a simple stand-in will be used.`); } }));
 const mat = (name:string, color:string, metallic=0, roughness=.8) => {const m=new PBRMaterial(name,scene); m.albedoColor=Color3.FromHexString(color); m.metallic=metallic; m.roughness=roughness; return m;};
 const white=mat('ceramic','#d9e2e3',.12), orange=mat('safety orange','#ed702b',.1), dark=mat('graphite','#283948',.3), ground=mat('regolith','#777b80'), accent=mat('interface','#53c8dc',.2), soil=mat('soil','#554838'), leaf=mat('leaves','#5b9160'), glass=mat('window','#759eac',.1,.3); glass.alpha=.4; accent.emissiveColor=new Color3(.08,.32,.37);
 const materials=[white,orange,dark,ground,accent,soil,leaf,glass];
 let root = new TransformNode('region',scene), entries: InstantiatedEntries[]=[]; let regionMaterials: StandardMaterial[]=[];
 let actorRoot = new TransformNode('actors',scene), actorEntries: InstantiatedEntries[]=[];
 let region:RegionId='academy', paused=false, reduced=false, recruited=false, disposed=false, transition=0;
 let state:MotionState={x:0,y:0,z:0,vy:0,heading:0,grounded:true};
 let input={x:0,z:0,jump:false,sprint:false}; const keys=new Set<string>(); let jumpHeld=false;
 let near:WorldTarget|null=null; let elapsed=0, metricTime=0, interactionTime=0;
 let astronaut:TransformNode|undefined, pip:TransformNode|undefined, scout:TransformNode|undefined;
 let strandedScout:TransformNode|undefined, strandedEntry:InstantiatedEntries|undefined;
 const box=(name:string,x:number,y:number,z:number,w:number,h:number,d:number,material:PBRMaterial,parent=root) => {const m=CreateBox(name,{width:w,height:h,depth:d},scene); m.position.set(x,y,z); m.material=material; m.receiveShadows=true; m.parent=parent; return m;};
 const cylinder=(name:string,x:number,y:number,z:number,r:number,h:number,material:PBRMaterial,parent=root) => {const m=CreateCylinder(name,{diameter:r*2,height:h,tessellation:16},scene);m.position.set(x,y,z);m.material=material;m.parent=parent;return m;};
 const sphere=(name:string,x:number,y:number,z:number,r:number,material:PBRMaterial,parent=root) => {const m=CreateSphere(name,{diameter:r*2,segments:8},scene);m.position.set(x,y,z);m.material=material;m.parent=parent;return m;};
 function instance(name:ModelName,x:number,y:number,z:number,scale=1,parent=root, actor=false):TransformNode {
  const wrapper=new TransformNode(name+' instance',scene); wrapper.parent=parent; wrapper.position.set(x,y,z); wrapper.scaling.setAll(scale);
  const template=cache.get(name);
  if (template) { const result=template.instantiateModelsToScene(n=>`${name}:${n}`,false,{doNotInstantiate:true}); (actor?actorEntries:entries).push(result); result.rootNodes.forEach(node=>node.parent=wrapper); }
  else { box(name+' placeholder',0,.7,0,1.2,1.4,1.2,white,wrapper); }
  return wrapper;
 }
 function disposeEntries(list:InstantiatedEntries[]) {for(const entry of list){entry.animationGroups.forEach(g=>g.dispose());entry.skeletons.forEach(s=>s.dispose());entry.rootNodes.forEach(n=>n.dispose());}list.length=0;}
 function removeStrandedScout(){if(strandedEntry){const index=entries.indexOf(strandedEntry);if(index>=0)entries.splice(index,1);disposeEntries([strandedEntry]);strandedEntry=undefined;}strandedScout?.dispose();strandedScout=undefined;}
 function marker(x:number,z:number) {cylinder('station footing',x,.08,z,1.25,.16,dark); const ring=CreateTorus('station ring',{diameter:2.3,thickness:.045,tessellation:24},scene);ring.position.set(x,.2,z);ring.material=accent;ring.parent=root;}
 function path(z1:number,z2:number,x=0){box('walkway',x,.025,(z1+z2)/2,3.2,.05,Math.abs(z2-z1),white);for(let z=z1;z<z2;z+=4){cylinder('path light',x-1.9,.13,z,.1,.26,orange);cylinder('path light',x+1.9,.13,z,.1,.26,orange);}}
 function wall(x:number,z:number,w:number,d:number,h=3) {const surface=box('pressure wall',x,h/2,z,w,h,d,white);surface.checkCollisions=true;box('safety band',x,h*.7,z,w+.02,.16,d+.02,orange);}
 function interior(size:number) {box('floor',0,-.18,0,size*2,.35,size*2,dark);for(let x=-size+2;x<size;x+=4)box('floor seam',x,.006,0,.035,.02,size*2,white);wall(-size,0,.4,size*2);wall(size,0,.4,size*2);wall(0,size,size*2,.4);wall(0,-size,size*2,.4);/* Open roof keeps the orbit camera's view unobstructed. */for(let z=-size+4;z<size;z+=6){box('ceiling lamp',0,4.85,z,5,.08,.35,accent);box('window',-size+.22,2.2,z,.06,1.4,3,glass);box('window',size-.22,2.2,z,.06,1.4,3,glass);}}
 function outdoor(size:number) {box('lunar ground',0,-.3,0,size*2+8,.6,size*2+8,ground);scene.fogMode=Scene.FOGMODE_EXP2;scene.fogDensity=.0025;scene.fogColor=new Color3(.09,.11,.16);const earth=CreateSphere('Earth',{diameter:14,segments:24},scene);earth.position.set(-55,35,100);const em=new StandardMaterial('Earth texture',scene);em.diffuseTexture=new Texture(`${base}assets/textures/earth.jpg`,scene);em.emissiveColor=new Color3(.6,.6,.6);earth.material=em;earth.parent=root;regionMaterials.push(em);const stars:Vector3[][]=[];for(let i=0;i<100;i++){const a=i*2.399, h=15+(i*17%65), r=100+(i%5)*3;const x=Math.cos(a)*r,z=Math.sin(a)*r;stars.push([new Vector3(x,h,z),new Vector3(x+.18,h+.18,z)]);}const sky=CreateLineSystem('stars',{lines:stars},scene);sky.color=new Color3(.8,.85,1);sky.parent=root;for(let i=0;i<28;i++){const angle=i*2.399, radius=size*.77+(i%3)*1.8;const rock=sphere('regolith ridge',Math.cos(angle)*radius,.3,Math.sin(angle)*radius,1+(i%4)*.45,ground);rock.scaling.y=.45;}}
 function consoleAt(x:number,z:number){box('console stand',x,.65,z,1.4,1.3,.7,white);const panel=box('console screen',x,1.35,z,1.5,.12,.8,dark);panel.rotation.x=-.22;box('display',x,1.43,z,1,.03,.5,accent);}
 function buildRegion(id:RegionId) {
  scene.fogMode=Scene.FOGMODE_NONE; scene.clearColor=id==='academy'?new Color4(.36,.58,.76,1):new Color4(.014,.022,.05,1);
  const plan=REGIONS[id];
  if(id==='academy'){interior(18);path(-13,15);consoleAt(-5,0);for(let x of [-12,12])for(let z of [-8,2,10]){box('training desk',x,.65,z,3,1.3,1.3,white);box('desk display',x,1.4,z,2,.3,.15,dark);box('display line',x,1.43,z-.1,1.5,.07,.04,accent);}instance('solar',10,0,8,.5);}
  if(id==='orbit'){interior(14);path(-11,12);for(let z=-8;z<10;z+=5){box('cabin handrail',-10,1.2,z,.12,.12,3,orange);box('cabin handrail',10,1.2,z,.12,.12,3,orange);consoleAt(8,z);}for(let i=0;i<5;i++){const c=box('floating cargo',-5+i*1.6,1.5+(i%2),1+i*.7,1,1,1,i%2?orange:white);c.rotation.set(i*.2,i*.3,i*.1);}}
  if(id==='habitat'){outdoor(29);path(-17,25);instance('habitat',13,0,0,1);instance('greenhouse',22,0,10,.7);instance('battery',-11,0,0,1);instance('water',-5,0,6,1);instance('oxygen',5,0,6,1);for(let i=0;i<3;i++)instance('solar',-19+i*5,0,15,.8);consoleAt(0,-3);box('equipment locker',-10,1,-8,2,2,1,orange);for(let x of [-8,8]){box('utility conduit',x,.18,4,.25,.25,15,dark);for(let z=-2;z<12;z+=3)box('conduit clamp',x,.25,z,.4,.22,.25,orange);}cylinder('landing pad',15,.05,-15,5,.1,dark);const ring=CreateTorus('landing circle',{diameter:8,thickness:.13},scene);ring.position.set(15,.13,-15);ring.material=white;ring.parent=root;}
  if(id==='canyon'){outdoor(28);path(-23,24);for(let z=-19;z<23;z+=5){for(let x of [-15,15]){const ridge=sphere('canyon wall',x,1.4,z,4.5,ground);ridge.scaling.set(1,1.1,1.5);}}for(let i=0;i<5;i++){const r=sphere('survey rubble',-9+i*1.3,.3,12+i*.4,.55,white);r.scaling.y=.5;}if(!recruited){const count=entries.length;strandedScout=instance('robot',7,0,5,1);strandedEntry=entries.length>count?entries[entries.length-1]:undefined;}consoleAt(0,21);}
  if(id==='greenhouse'){interior(15);path(-13,12);for(let x of [-6,6])for(let z of [-5,1,7]){box('raised planter',x,.5,z,3,1,4,white);box('growing medium',x,1.03,z,2.7,.1,3.7,soil);for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++){cylinder('plant stem',x+a*.7,1.3,z+b, .045,.5,leaf);for(let k=0;k<3;k++){const l=sphere('leaf',x+a*.7+Math.cos(k*2.1)*.25,1.5,z+b+Math.sin(k*2.1)*.25,.25,leaf);l.scaling.y=.35;}}box('grow light',x,3.6,z,3,.1,3,accent);}instance('astronaut',0,0,10,.8);}
  for(const target of plan.targets) marker(target.position.x,target.position.z);
 }
 function buildActors(){shadows.getShadowMap()?.renderList?.splice(0);disposeEntries(actorEntries);actorRoot.dispose();actorRoot=new TransformNode('actors',scene);astronaut=instance('astronaut',0,0,0,1,actorRoot,true);pip=instance('robot',-1.5,0,-1.3,.65,actorRoot,true);if(recruited){scout=instance('robot',1.7,0,-1.6,.8,actorRoot,true);scout.rotation.y=.3;cylinder('Scout antenna',0,2.1,0,.06,.8,orange,scout);sphere('Scout beacon',0,2.55,0,.14,orange,scout);}else scout=undefined;for(const node of actorRoot.getChildMeshes())shadows.addShadowCaster(node as AbstractMesh);}
 function setRegion(id:RegionId,pose?:PlayerPose){
  disposeEntries(entries);root.dispose();strandedScout=undefined;strandedEntry=undefined;regionMaterials.forEach(m=>m.dispose(true,true));regionMaterials=[];root=new TransformNode('region',scene);region=id;buildRegion(id);
  const p=pose?.region===id&&Number.isFinite(pose.position.x)&&Number.isFinite(pose.position.z)&&Math.abs(pose.position.x)<REGIONS[id].bounds&&Math.abs(pose.position.z)<REGIONS[id].bounds?pose.position:REGIONS[id].spawn;
  state={x:p.x,y:0,z:p.z,vy:0,heading:Number.isFinite(pose?.heading)?pose!.heading:0,grounded:true};placeActors();near=null;callbacks.onTarget(null);callbacks.onRegion(id);
 }
 function placeActors(){if(astronaut)astronaut.position.set(state.x,state.y,state.z);if(pip)pip.position.set(state.x-1.1,0,state.z-1.7);if(scout)scout.position.set(state.x+1.7,0,state.z-1.7);}
 buildActors();setRegion('academy');
 function keyboard(event:KeyboardEvent,down:boolean){
  const k=event.key.toLowerCase();
  // Always release a key even if focus moved to a control after keydown.
  if(!down){keys.delete(k);return;}
  const el=event.target instanceof Element?event.target:null;
  if(paused || el?.closest('input, textarea, select, button, a, [contenteditable], [role="dialog"], dialog')) return;
  if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright','shift',' ','e'].includes(k)){
   keys.add(k);if(event.target===canvas)event.preventDefault();if(k==='e'&&!event.repeat)interact();
  }
 }
 const onDown=(e:KeyboardEvent)=>keyboard(e,true), onUp=(e:KeyboardEvent)=>keyboard(e,false), onBlur=()=>{keys.clear();input={x:0,z:0,jump:false,sprint:false};};
 const onFocus=(e:FocusEvent)=>{const el=e.target instanceof Element?e.target:null;if(el?.closest('input, textarea, select, button, a, [contenteditable], [role="dialog"], dialog'))keys.clear();};
 window.addEventListener('keydown',onDown);window.addEventListener('keyup',onUp);window.addEventListener('blur',onBlur);window.addEventListener('focusin',onFocus);
 function interact(){if(!paused&&near){interactionTime=.55;callbacks.onInteract(near);}}
 function frame(){if(disposed)return;const dt=Math.min(engine.getDeltaTime()/1000,.05);if(!paused){elapsed+=dt;interactionTime=Math.max(0,interactionTime-dt);const x=Math.max(-1,Math.min(1,input.x+(keys.has('d')||keys.has('arrowright')?1:0)-(keys.has('a')||keys.has('arrowleft')?1:0)));const z=Math.max(-1,Math.min(1,input.z+(keys.has('w')||keys.has('arrowup')?1:0)-(keys.has('s')||keys.has('arrowdown')?1:0)));const jump=input.jump||keys.has(' ');const moving=Math.hypot(x,z)>.05;state=advanceMotion(state,{x,z,jump:jump&&!jumpHeld,sprint:input.sprint||keys.has('shift')},dt,Math.atan2(-Math.cos(camera.alpha),-Math.sin(camera.alpha)),REGIONS[region].bounds,OBSTACLES[region],region==='academy'||region==='orbit'?9.81:1.62);jumpHeld=jump;
   if(astronaut){astronaut.position.set(state.x,state.y,state.z);astronaut.rotation.y=state.heading;const swing=moving?Math.sin(elapsed*(input.sprint||keys.has('shift')?12:8))*.55:Math.sin(elapsed*2)*.03;for(const node of astronaut.getDescendants(false)){if(!(node instanceof TransformNode))continue;if(node.name.includes('ArmPivot_L'))node.rotation.x=swing+(interactionTime>0?-.8:0);if(node.name.includes('ArmPivot_R'))node.rotation.x=-swing;if(node.name.includes('LegPivot_L'))node.rotation.x=-swing;if(node.name.includes('LegPivot_R'))node.rotation.x=swing;}}
   if(pip){const px=state.x-Math.sin(state.heading)*1.7-Math.cos(state.heading)*1.1,pz=state.z-Math.cos(state.heading)*1.7+Math.sin(state.heading)*1.1;pip.position.x+=(px-pip.position.x)*Math.min(1,dt*3);pip.position.z+=(pz-pip.position.z)*Math.min(1,dt*3);pip.rotation.y=state.heading;for(const node of pip.getDescendants(false)){if(!(node instanceof TransformNode))continue;if(node.name.includes('PipHeadPivot'))node.rotation.y=reduced?0:Math.sin(elapsed*1.5)*.14;if(node.name.includes('PipEye_'))node.rotation.y=reduced?0:Math.sin(elapsed*1.5)*.08;}}
   if(scout){const sx=state.x-Math.sin(state.heading)*1.8+Math.cos(state.heading)*1.5,sz=state.z-Math.cos(state.heading)*1.8-Math.sin(state.heading)*1.5;const next=followPosition(scout.position,{x:sx,z:sz},dt);scout.position.set(next.x,0,next.z);scout.rotation.y=state.heading;}
   const chosen=REGIONS[region].targets.map(t=>({t,d:Math.hypot(state.x-t.position.x,state.z-t.position.z)})).filter(v=>v.d<=(v.t.radius??3)).sort((a,b)=>a.d-b.d)[0]?.t??null;if(chosen?.id!==near?.id){near=chosen;callbacks.onTarget(near);if(near?.id==='cargo')callbacks.onCargoReached?.();}
  }
  camera.target.copyFromFloats(state.x,state.y+1.3,state.z);scene.render();metricTime+=dt;if(metricTime>=1){metricTime=0;callbacks.onMetrics({engine:'WebGL 2',fps:Math.round(engine.getFps()),meshes:scene.meshes.length,activeMeshes:scene.getActiveMeshes().length,drawCalls:instrumentation.drawCallsCounter.current,region});}}
 engine.runRenderLoop(frame);const resize=()=>engine.resize();window.addEventListener('resize',resize);
 return {async changeRegion(id,pose){if(disposed||!REGIONS[id])return;const serial=++transition;await Promise.resolve();if(serial===transition&&!disposed)setRegion(id,pose);},setPaused(v){paused=v;if(v){keys.clear();input={x:0,z:0,jump:false,sprint:false};camera.detachControl();}else camera.attachControl(canvas,true);},setQuality(v){engine.setHardwareScalingLevel(v==='low'?1.5:1);},setReducedMotion(v){reduced=v;},setInput(v){if(!paused)input={...input,...v};},setCompanionRecruited(v){if(v!==recruited){recruited=v;if(v)removeStrandedScout();buildActors();placeActors();}},interact,getPose(){return {region,position:{x:state.x,y:state.y,z:state.z},heading:state.heading};},dispose(){if(disposed)return;disposed=true;transition++;window.removeEventListener('keydown',onDown);window.removeEventListener('keyup',onUp);window.removeEventListener('blur',onBlur);window.removeEventListener('focusin',onFocus);window.removeEventListener('resize',resize);engine.stopRenderLoop(frame);disposeEntries(entries);disposeEntries(actorEntries);root.dispose();actorRoot.dispose();cache.forEach(c=>c.dispose());materials.forEach(m=>m.dispose());regionMaterials.forEach(m=>m.dispose(true,true));shadows.dispose();instrumentation.dispose();scene.dispose();engine.dispose();}};
}
