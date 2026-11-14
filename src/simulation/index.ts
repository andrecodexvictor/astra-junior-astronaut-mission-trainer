import type { RegionId } from '../contracts';

/** One real simulation second is 0.01 mission hours. All rates below use mission hours. */
export type Phase = 'academy' | 'orbit' | 'lunar' | 'complete' | 'failed';
export type Action = 'diagnoseAcademy' | 'shedLoad' | 'finishAcademy' | 'collectCargo' | 'land' | 'repairPower' | 'repairWater' | 'repairOxygen' | 'toggleRecycler' | 'toggleOxygen' | 'plantCrop' | 'toggleCrop' | 'collectSample' | 'repairCompanion' | 'recruitCompanion' | 'deliverSample' | 'shelter' | 'exitShelter' | 'harvest' | 'scanSolar' | 'scanWater' | 'launchExpedition' | 'returnExpedition' | 'chooseLoadout' | 'travel';
export interface Resources { battery: number; potable: number; wastewater: number; oxygen: number; hydrogen: number; food: number; ice: number; samples: number; deliveredIce: number; processedIce: number; crewWaterConsumed: number; crewOxygenConsumed: number; crewFoodConsumed: number; waterElectrolysed: number; generatedOxygen: number; generatedHydrogen: number; energyGenerated: number; energyUsed: number; energyCurtailed: number; chargeLoss: number; dischargeLoss: number; recyclerLoss: number; cropWater: number; companionBattery: number; parts: number }
export interface Module { integrity: number; connected: boolean; enabled: boolean; repairRemaining: number }
export interface GameState {
 version: 2; seed: number; tick: number; remainder: number; phase: Phase; region: RegionId; lunarTick: number;
 resources: Resources; modules: { power: Module; water: Module; oxygen: Module; crop: Module };
 flags: { diagnosed: boolean; loadShed: boolean; academyStableTicks: number; cargo: boolean; landed: boolean; planted: boolean; harvested: boolean; scoutRepaired: boolean; scoutRecruited: boolean; sampleDelivered: boolean; stormSurvived: boolean; sheltered: boolean; loadout: boolean; expedition: boolean; solarScanned: boolean; waterScanned: boolean };
 academyBattery: number; cropGrowth: number; scoutRepairRemaining: number; sampleProcessingRemaining: number; storm: 'clear' | 'warning' | 'active'; health: number; powerSupply: number; powerDemand: number; blackouts: number;
 log: Evidence[]; awarded: string[];
}
export interface Evidence { tick: number; kind: string; text: string; before?: number; after?: number; unit?: string }
export interface Objective { id: string; title: string; description: string; targetWorldId: string; complete: boolean }
export interface ActionResult { state: GameState; ok: boolean; message: string; events: string[] }
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;
const moduleState = (integrity: number, connected: boolean, enabled = true): Module => ({ integrity, connected, enabled, repairRemaining: 0 });
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const addLog = (s: GameState, kind: string, text: string, before?: number, after?: number, unit?: string) => { s.log.push({ tick:s.tick, kind, text, ...(before === undefined ? {} : {before, after, unit}) }); if(s.log.length > 100) s.log.shift(); };
export function createGame(options: { seed?: number } = {}): GameState {
 return { version:2, seed:Number.isFinite(options.seed) ? Math.floor(options.seed!) : 42, tick:0, remainder:0, phase:'academy', region:'academy', lunarTick:0,
 resources:{ battery:8, potable:5, wastewater:2, oxygen:.5, hydrogen:0, food:3, ice:8, samples:0, deliveredIce:0, processedIce:0, crewWaterConsumed:0, crewOxygenConsumed:0, crewFoodConsumed:0, waterElectrolysed:0, generatedOxygen:0, generatedHydrogen:0, energyGenerated:0, energyUsed:0, energyCurtailed:0, chargeLoss:0, dischargeLoss:0, recyclerLoss:0, cropWater:0, companionBattery:2, parts:2 },
 modules:{ power:moduleState(.35,false), water:moduleState(.25,false), oxygen:moduleState(.25,false), crop:moduleState(1,true,false) },
 flags:{ diagnosed:false, loadShed:false, academyStableTicks:0, cargo:false, landed:false, planted:false, harvested:false, scoutRepaired:false, scoutRecruited:false, sampleDelivered:false, stormSurvived:false, sheltered:false, loadout:false, expedition:false, solarScanned:false, waterScanned:false },
 academyBattery:6, cropGrowth:0, scoutRepairRemaining:0, sampleProcessingRemaining:0, storm:'clear', health:100, powerSupply:0, powerDemand:0, blackouts:0, log:[], awarded:[] };
}
const live = (m: Module) => m.connected && m.integrity >= .8 && m.enabled;
function oneTick(s: GameState): void {
 s.tick++;
 if(s.phase === 'academy') { const before=s.academyBattery; s.academyBattery=clamp(s.academyBattery+(s.flags.loadShed ? .08 : -.18),0,10); s.flags.academyStableTicks=s.flags.loadShed ? s.flags.academyStableTicks+1 : 0; if(before>0 && s.academyBattery===0) addLog(s,'academy','Trial battery depleted; reduce the load and observe recovery.',before,0,'kWh'); return; }
 if(s.phase !== 'lunar') return;
 s.lunarTick++;
 const prevStorm=s.storm; const cycle=s.lunarTick%600; s.storm=cycle>=300&&cycle<380?'active':cycle>=180&&cycle<300?'warning':'clear';
 if(s.storm!==prevStorm) { addLog(s,'storm',`Radiation forecast: ${s.storm}.`); if(prevStorm==='active' && s.flags.sheltered) {s.flags.stormSurvived=true; addLog(s,'milestone','Shelter protected the crew through the storm.');} }
 const r=s.resources; const m=s.modules; const dt=.01;
 // Complete repair work over several ticks, consuming the reserved part at initiation.
 for(const [name,mod] of Object.entries(m)) if(mod.repairRemaining>0 && --mod.repairRemaining===0) { mod.integrity=1; mod.connected=true; addLog(s,'repair',`${name} module repair completed.`); }
 if(s.scoutRepairRemaining>0 && --s.scoutRepairRemaining===0) { s.flags.scoutRepaired=true; addLog(s,'repair','Scout repair completed.'); }
 const sunlight = s.storm==='active' ? .45 : 1;
 s.powerSupply=live(m.power) ? 5*sunlight : 0;
 s.powerDemand=1.2+(live(m.water)? .7:0)+(live(m.oxygen)?1.1:0)+(live(m.crop)&&s.flags.planted?.8:0)+(s.sampleProcessingRemaining>0?.5:0)+(s.scoutRepairRemaining>0?.3:0);
 const generated=s.powerSupply*dt; const needed=s.powerDemand*dt; r.energyGenerated+=generated;
 const directlyUsed=Math.min(generated,needed); const shortage=needed-directlyUsed;
 const drawn=Math.min(r.battery,shortage/.9); r.battery-=drawn; r.dischargeLoss+=drawn*.1;
 const used=directlyUsed+drawn*.9; r.energyUsed+=used;
 const surplus=generated-directlyUsed; const accepted=Math.min(surplus,Math.max(0,(12-r.battery)/.9));
 r.battery+=accepted*.9; r.chargeLoss+=accepted*.1; r.energyCurtailed+=surplus-accepted;
 const powered=used+1e-9>=needed; if(!powered) s.blackouts++;
 const waterUse=Math.min(r.potable,.18*dt); r.potable-=waterUse; r.wastewater+=waterUse; r.crewWaterConsumed+=waterUse;
 const o2Use=Math.min(r.oxygen,.08*dt); r.oxygen-=o2Use; r.crewOxygenConsumed+=o2Use;
 const foodUse=Math.min(r.food,.025*dt); r.food-=foodUse; r.crewFoodConsumed+=foodUse;
 if(powered && live(m.water)) { const amount=Math.min(r.wastewater,.12*dt); r.wastewater-=amount; r.potable+=amount*.8; r.recyclerLoss+=amount*.2; }
 if(powered && live(m.oxygen)) { const water=Math.min(r.potable,.18*dt); r.potable-=water; r.waterElectrolysed+=water; const oxygen=water*8/9; const hydrogen=water/9; r.oxygen+=oxygen; r.hydrogen+=hydrogen; r.generatedOxygen+=oxygen; r.generatedHydrogen+=hydrogen; }
 if(powered && live(m.crop) && s.flags.planted && !s.flags.harvested && r.potable>.01) { const water=Math.min(r.potable,.012*dt); r.potable-=water; r.cropWater+=water; s.cropGrowth=Math.min(180,s.cropGrowth+1); }
 if(powered && s.sampleProcessingRemaining>0 && --s.sampleProcessingRemaining===0) { const amount=r.deliveredIce-r.processedIce; r.potable+=amount; r.processedIce+=amount; addLog(s,'sample','Delivered ice processed into potable water.',r.potable-amount,r.potable,'kg'); }
 if(powered && s.flags.scoutRecruited && r.companionBattery<2 && r.battery>.005) { const charge=Math.min(.002,2-r.companionBattery,r.battery); r.battery-=charge; r.companionBattery+=charge; r.energyUsed+=charge; }
 if(r.potable<=0 || r.oxygen<=0 || r.food<=0 || (!powered && r.battery<=0)) s.health-=.15;
 if(s.storm==='active' && !s.flags.sheltered) s.health-=1.4;
 if(s.health<=0) {s.health=0;s.phase='failed';addLog(s,'failure','Crew reserves or protection failed. Restore a checkpoint.');}
 if(s.flags.harvested && s.flags.sampleDelivered && r.processedIce>0 && s.flags.scoutRecruited && s.flags.stormSurvived && live(m.power) && live(m.water) && live(m.oxygen) && powered && r.potable>1 && r.oxygen>.2) {s.phase='complete';addLog(s,'milestone','The habitat is stable and the mission loop is complete.');}
}
export function stepGame(state: GameState, seconds: number): GameState { const s=clone(state); if(!Number.isFinite(seconds)||seconds<=0)return s; const total=s.remainder+seconds; const ticks=Math.floor(total+1e-9); s.remainder=total-ticks; if(Math.abs(s.remainder)<1e-9) s.remainder=0; for(let i=0;i<ticks;i++) oneTick(s); return s; }
export function applyAction(state: GameState, action: Action | string, _payload?: unknown): ActionResult {
 const s=clone(state), r=s.resources, m=s.modules, f=s.flags; const events:string[]=[];
 const fail=(message:string):ActionResult=>({state:s,ok:false,message,events});
 const ok=(message:string):ActionResult=>({state:s,ok:true,message,events});
 if(s.phase==='failed'||s.phase==='complete') return fail('This run has ended.');
 const record=(id:string,text:string,before?:number,after?:number,unit?:string)=>{addLog(s,id,text,before,after,unit);events.push(id);if(!s.awarded.includes(id))s.awarded.push(id);};
 if(action==='diagnoseAcademy' && s.phase==='academy') { f.diagnosed=true;record('diagnosis','Battery is falling; demand may exceed supply. Try reducing a load, then observe.',s.academyBattery,s.academyBattery,'kWh');return ok('Possible cause recorded: demand exceeds supply. Reduce load and observe the battery.'); }
 if(action==='shedLoad' && s.phase==='academy') {if(!f.diagnosed)return fail('Inspect the academy console first.'); if(f.loadShed)return fail('Nonessential load is already shed.'); f.loadShed=true;record('load-shed','Nonessential demand reduced.',s.academyBattery,s.academyBattery,'kWh');return ok('Load reduced. Monitor the battery for 15 seconds.');}
 if(action==='finishAcademy' && s.phase==='academy') {if(f.academyStableTicks<15)return fail('Keep the reduced load running and observe 15 seconds of recovery.');record('academy-complete','The trial battery recovered under reduced load.',undefined,s.academyBattery,'kWh');s.phase='orbit';s.region='orbit';return ok('Trial complete. Collect the cargo in orbit.');}
 if(action==='collectCargo' && s.phase==='orbit') {if(f.cargo)return fail('Cargo already secured.');f.cargo=true;record('cargo','Cargo secured for descent.');return ok('Cargo secured. Proceed to lunar transfer.');}
 if(action==='land' && s.phase==='orbit') {if(!f.cargo)return fail('Secure the cargo before descent.');s.phase='lunar';s.region='habitat';f.landed=true;record('landing','Habitat reached; inspect its disconnected systems.');return ok('Landed. Restore habitat systems.');}
 if(action==='travel') {
  const region=(_payload as {region?: unknown} | undefined)?.region;
  if(s.phase==='academy' && region==='orbit') return applyAction(state,'finishAcademy');
  if(s.phase==='orbit' && region==='habitat') return applyAction(state,'land');
  if(s.phase==='lunar' && region==='canyon' && s.region==='habitat') return applyAction(state,'launchExpedition');
  if(s.phase==='lunar' && region==='habitat' && s.region==='canyon') return applyAction(state,'returnExpedition');
  if(s.phase==='lunar' && region==='greenhouse' && s.region==='habitat' && !f.sheltered) {s.region='greenhouse';return ok('Entered the greenhouse.');}
  if(s.phase==='lunar' && region==='habitat' && s.region==='greenhouse') {s.region='habitat';return ok('Returned to habitat.');}
  return fail('That route is unavailable from here.');
 }
 if(s.phase!=='lunar')return fail('That action is unavailable in this phase.');
 if(action==='repairPower'||action==='repairWater'||action==='repairOxygen') {const key=action==='repairPower'?'power':action==='repairWater'?'water':'oxygen';const mod=m[key];if(mod.connected||mod.repairRemaining)return fail('This module is repaired or repair is already underway.');if(r.battery<.2)return fail('A repair requires 0.2 kWh in the battery.');const before=r.battery;r.battery-=.2;r.energyUsed+=.2;mod.repairRemaining=5;record('repair-'+key,`${key} repair started; 0.2 kWh and 5 seconds required.`,before,r.battery,'kWh');return ok('Repair underway; wait 5 seconds.');}
 if(action==='toggleRecycler'||action==='toggleOxygen'||action==='toggleCrop') {const key=action==='toggleRecycler'?'water':action==='toggleOxygen'?'oxygen':'crop';const mod=m[key];if(!mod.connected)return fail('Repair and connect this module first.');mod.enabled=!mod.enabled;record('toggle-'+key,`${key} ${mod.enabled?'enabled':'disabled'}; power demand will change on the next tick.`);return ok(`${key} ${mod.enabled?'enabled':'disabled'}.`);}
 if(action==='scanSolar'||action==='scanWater') {const solar=action==='scanSolar';if(solar)f.solarScanned=true;else f.waterScanned=true;const value=solar?r.battery:r.potable;record(solar?'scan-solar':'scan-water',solar?'Low generation or excess demand can drain the battery. Compare supply and demand after a change.':'Potable water depends on recycling and electrolysis demand. Compare the tanks after a change.',value,value,solar?'kWh':'kg');return ok(solar?'Hypothesis recorded: check generation, demand and battery trend.':'Hypothesis recorded: check recycling, electrolysis and water trend.');}
 if(action==='plantCrop') {if(f.planted)return fail('The crop is already planted.');f.planted=true;m.crop.enabled=true;record('plant','Crop planted; lighting, power and water are required for 180 growing ticks.');return ok('Crop planted. It needs powered lighting and water to grow.');}
 if(action==='harvest') {if(f.harvested)return fail('Crop already harvested.');if(s.cropGrowth<180)return fail(`Crop needs ${Math.ceil(180-s.cropGrowth)} more powered growing seconds.`);const before=r.food;r.food+=3;f.harvested=true;record('harvest','Harvest added food from the crop.',before,r.food,'kg');return ok('Harvested 3 kg of food.');}
 if(action==='chooseLoadout') {f.loadout=true;record('loadout','Field tools selected.');return ok('Field tools selected.');}
 if(action==='launchExpedition') {if(!live(m.power)||!live(m.water)||!live(m.oxygen)||r.battery<5||r.potable<2||r.oxygen<.2)return fail('Restore and enable power, water and oxygen; reserve at least 5 kWh, 2 kg water and 0.2 kg oxygen.');if(!f.loadout)return fail('Choose field tools at the locker before leaving.');if(s.storm!=='clear')return fail('The radiation forecast is unsafe for departure.');f.expedition=true;s.region='canyon';record('expedition','Expedition launched with a working life-support chain.');return ok('Expedition launched.');}
 if(action==='returnExpedition') {if(!f.expedition)return fail('No expedition is underway.');f.expedition=false;s.region='habitat';record('return','Returned to the habitat.');return ok('Returned to habitat.');}
 if(action==='collectSample') {if(!f.expedition)return fail('Travel to the canyon first.');if(r.samples>0)return fail('Deliver your existing sample first.');if(r.ice<.5)return fail('The local ice reserve is exhausted.');r.ice-=.5;r.samples+=.5;record('sample-collected','Collected 0.5 kg from the finite ice reserve.');return ok('Collected 0.5 kg ice. Return it to the habitat.');}
 if(action==='repairCompanion') {if(!f.expedition)return fail('Find Scout in the canyon first.');if(f.scoutRepaired||s.scoutRepairRemaining)return fail('Scout is repaired or repair is underway.');if(r.parts<1||r.battery<.3)return fail('Scout repair needs one spare part and 0.3 kWh.');r.parts--;r.battery-=.3;r.energyUsed+=.3;s.scoutRepairRemaining=5;record('scout-repair','Scout repair started: one spare part, 0.3 kWh and 5 seconds.');return ok('Scout repair underway; wait 5 seconds.');}
 if(action==='recruitCompanion') {if(!f.expedition||!f.scoutRepaired)return fail('Find and repair Scout first.');if(f.scoutRecruited)return fail('Scout already joined.');f.scoutRecruited=true;record('scout','Scout joined the mission. Its battery charges from the habitat supply.');return ok('Scout joined.');}
 if(action==='deliverSample') {if(f.expedition)return fail('Return to the habitat first.');if(r.samples<=0)return fail('Collect an ice sample first.');if(s.sampleProcessingRemaining>0)return fail('A sample is already processing.');r.deliveredIce+=r.samples;r.samples=0;f.sampleDelivered=true;s.sampleProcessingRemaining=10;record('sample-delivered','Ice delivered for ten seconds of powered processing.');return ok('Sample delivered. Processing uses power for 10 seconds.');}
 if(action==='shelter') {if(f.expedition)return fail('Return to the habitat before sheltering.');if(f.sheltered)return fail('Already sheltered.');f.sheltered=true;record('shelter','Crew entered radiation shelter.');return ok('Crew sheltered.');}
 if(action==='exitShelter') {if(!f.sheltered)return fail('Crew is not in shelter.');if(s.storm==='active')return fail('Wait for the storm to clear.');f.sheltered=false;record('exit-shelter','Crew left shelter.');return ok('Crew left shelter.');}
 return fail('Action unavailable.');
}

/** Reject malformed and obsolete saves rather than silently manufacturing resources. */
export function normalizeGame(save: unknown): GameState {
 if(!save || typeof save!=='object') throw new Error('Invalid save');
 const s=save as GameState; const template=createGame();
 function validShape(value: unknown, shape: unknown): boolean {
  if(Array.isArray(shape)) return Array.isArray(value);
  if(shape && typeof shape==='object') return !!value && typeof value==='object' && !Array.isArray(value) && Object.entries(shape).every(([key,v])=>validShape((value as Record<string,unknown>)[key],v));
  return typeof value===typeof shape && (typeof value!=='number'||Number.isFinite(value));
 }
 if(!validShape(s,template)||s.version!==2||!['academy','orbit','lunar','complete','failed'].includes(s.phase)||!['academy','orbit','habitat','canyon','greenhouse'].includes(s.region)||!['clear','warning','active'].includes(s.storm)||s.tick<0||!Number.isInteger(s.tick)||s.lunarTick<0||!Number.isInteger(s.lunarTick)||s.remainder<0||s.remainder>=1||s.health<0||s.health>100||s.cropGrowth<0||s.cropGrowth>180||s.academyBattery<0||s.academyBattery>10) throw new Error('Invalid or unsupported save');
 if((s.phase==='academy' && s.region!=='academy') || (s.phase==='orbit' && s.region!=='orbit') || (s.phase==='lunar' && !['habitat','canyon','greenhouse'].includes(s.region)) || (s.phase==='lunar' && s.flags.expedition !== (s.region==='canyon')) || (s.phase==='lunar' && !s.flags.landed) || (s.phase==='orbit' && s.flags.landed)) throw new Error('Inconsistent phase or region');
 if(Object.values(s.resources).some(n=>n<0)||s.resources.battery>12||s.resources.companionBattery>2||s.resources.ice>8||s.resources.parts>2||s.resources.samples>.5||s.resources.processedIce>s.resources.deliveredIce||s.resources.deliveredIce+s.resources.samples+s.resources.ice>8+1e-8) throw new Error('Invalid resource values');
 if(!Number.isInteger(s.seed)||!Number.isInteger(s.flags.academyStableTicks)||s.flags.academyStableTicks<0||!Number.isInteger(s.blackouts)||s.blackouts<0||!Number.isInteger(s.scoutRepairRemaining)||!Number.isInteger(s.sampleProcessingRemaining)||s.powerSupply<0||s.powerDemand<0||Object.values(s.modules).some(mod=>mod.integrity<0||mod.integrity>1||mod.repairRemaining<0||!Number.isInteger(mod.repairRemaining))||s.scoutRepairRemaining<0||s.sampleProcessingRemaining<0||s.log.length>100||s.awarded.length>100||!s.awarded.every(v=>typeof v==='string')||!s.log.every(v=>v&&typeof v.tick==='number'&&Number.isFinite(v.tick)&&v.tick>=0&&Number.isInteger(v.tick)&&v.tick<=s.tick&&typeof v.kind==='string'&&typeof v.text==='string'&&(v.before===undefined||(typeof v.before==='number'&&Number.isFinite(v.before)))&&(v.after===undefined||(typeof v.after==='number'&&Number.isFinite(v.after)))&&(v.unit===undefined||typeof v.unit==='string'))) throw new Error('Invalid save data');
 return clone(s);
}
export function getTelemetry(s: GameState) { return { tick:s.tick, lunarTick:s.lunarTick, phase:s.phase, region:s.region, battery:s.resources.battery, batteryCapacity:12, powerSupply:s.powerSupply, powerDemand:s.powerDemand, potable:s.resources.potable, wastewater:s.resources.wastewater, oxygen:s.resources.oxygen, hydrogen:s.resources.hydrogen, food:s.resources.food, ice:s.resources.ice, samples:s.resources.samples, parts:s.resources.parts, companionBattery:s.resources.companionBattery, cropGrowth:s.cropGrowth, storm:s.storm, health:s.health, modules:clone(s.modules) }; }
export function getObjectives(s: GameState): Objective[] {
 const f=s.flags, m=s.modules;
 return [
  {id:'diagnose',title:'Investigate the trial',description:'Inspect the falling battery and record a possible cause.',targetWorldId:'academy-console',complete:f.diagnosed},
  {id:'balance',title:'Balance the trial load',description:'Shed a nonessential load and observe 15 seconds of recovery.',targetWorldId:'academy-console',complete:f.academyStableTicks>=15},
  {id:'depart',title:'Leave the academy',description:'Finish the trial and travel to orbit.',targetWorldId:'academy-launch',complete:s.phase!=='academy'},
  {id:'cargo',title:'Secure the cargo',description:'Collect the cargo before transfer.',targetWorldId:'cargo',complete:f.cargo},
  {id:'land',title:'Reach the Moon',description:'Use the lunar transfer after securing cargo.',targetWorldId:'lunar-transfer',complete:f.landed},
  {id:'power',title:'Restore power',description:'Repair the battery bank; watch generation and demand.',targetWorldId:'battery-bank',complete:m.power.connected},
  {id:'water',title:'Restore recycling',description:'Repair the water recycler and observe the tanks.',targetWorldId:'water-recycler',complete:m.water.connected},
  {id:'oxygen',title:'Restore oxygen',description:'Repair the electrolyser. It consumes water and power.',targetWorldId:'oxygen-generator',complete:m.oxygen.connected},
  {id:'crop',title:'Start a food crop',description:'Plant and power the grow lights; growth takes 180 powered seconds.',targetWorldId:'crop-bed',complete:f.planted},
  {id:'loadout',title:'Prepare field tools',description:'Select your expedition loadout at the locker.',targetWorldId:'field-locker',complete:f.loadout},
  {id:'expedition',title:'Explore the canyon',description:'Depart with working life support and sufficient reserves.',targetWorldId:'expedition-gate',complete:f.expedition||f.scoutRecruited||f.sampleDelivered},
  {id:'scout',title:'Repair and recruit Scout',description:'Spend one part, energy and time repairing Scout, then invite it along.',targetWorldId:'damaged-scout',complete:f.scoutRecruited},
  {id:'sample',title:'Bring back ice',description:'Collect a finite ice sample and deliver it for powered processing.',targetWorldId:f.expedition?'ice-deposit':'mission-console',complete:f.sampleDelivered&&s.resources.processedIce>0},
  {id:'storm',title:'Protect the crew',description:'Shelter through a radiation storm; watch the warning.',targetWorldId:'habitat-shelter',complete:f.stormSurvived},
  {id:'harvest',title:'Harvest food',description:'Return to the crop after 180 powered growing seconds.',targetWorldId:'crop-bed',complete:f.harvested},
 ];
}
export function getReport(s: GameState) {return { complete:s.phase==='complete', safety:{health:s.health,stormSurvived:s.flags.stormSurvived,blackoutTicks:s.blackouts}, stability:{power:s.modules.power.connected,water:s.modules.water.connected,oxygen:s.modules.oxygen.connected,battery:s.resources.battery,potable:s.resources.potable,oxygenReserve:s.resources.oxygen}, decisions:{loadShed:s.flags.loadShed,scoutRecruited:s.flags.scoutRecruited,sampleProcessed:s.resources.processedIce,cropHarvested:s.flags.harvested}, understanding:{hypothesesRecorded:[s.flags.diagnosed?'academy load':null,s.flags.solarScanned?'power balance':null,s.flags.waterScanned?'water balance':null].filter(Boolean),note:'These observations record actions and evidence; they do not validate learning.'}, evidence:clone(s.log) };}
/** Stable FNV-1a digest for deterministic replay comparisons, not a security hash. */
export function hashState(s: GameState): string { const text=JSON.stringify(s);let h=2166136261;for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619);}return (h>>>0).toString(16).padStart(8,'0'); }
