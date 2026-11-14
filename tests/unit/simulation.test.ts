import { describe, expect, it } from 'vitest';
import { applyAction, createGame, hashState, normalizeGame, stepGame, type GameState } from '../../src/simulation';
function act(s:GameState,id:string,payload?:unknown) {const r=applyAction(s,id,payload);expect(r.ok,`${id}: ${r.message}`).toBe(true);return r.state;}
function lunar() {let s=createGame();s=act(s,'diagnoseAcademy');s=act(s,'shedLoad');s=stepGame(s,15);s=act(s,'finishAcademy');s=act(s,'collectCargo');return act(s,'land');}
function repaired() {let s=lunar();for(const id of ['repairPower','repairWater','repairOxygen'])s=act(s,id);return stepGame(s,5);}
describe('fixed simulation',()=>{
 it('conserves electrolysis mass, ice transfers, and electrical energy',()=>{let s=repaired();s=stepGame(s,100);expect(s.resources.generatedOxygen+s.resources.generatedHydrogen).toBeCloseTo(s.resources.waterElectrolysed,9);expect(s.resources.battery+s.resources.energyUsed+s.resources.chargeLoss+s.resources.dischargeLoss+s.resources.energyCurtailed).toBeCloseTo(8+s.resources.energyGenerated,8);s=act(s,'chooseLoadout');s=act(s,'launchExpedition');s=act(s,'collectSample');expect(s.resources.ice+s.resources.samples).toBeCloseTo(8);s=act(s,'returnExpedition');s=act(s,'deliverSample');s=stepGame(s,10);expect(s.resources.ice+s.resources.deliveredIce).toBeCloseTo(8);expect(s.resources.processedIce).toBe(.5);});
 it('requires time and pays repair costs once',()=>{let s=lunar();const before=s.resources.battery;s=act(s,'repairPower');expect(s.resources.battery).toBeCloseTo(before-.2);expect(applyAction(s,'repairPower').ok).toBe(false);s=stepGame(s,4);expect(s.modules.power.connected).toBe(false);s=stepGame(s,1);expect(s.modules.power.connected).toBe(true);});
 it('is deterministic across tick chunking and save/reload',()=>{const s=repaired();const a=stepGame(s,12.5);const b=stepGame(normalizeGame(JSON.parse(JSON.stringify(stepGame(s,4.25)))),8.25);expect(hashState(a)).toBe(hashState(b));expect(()=>normalizeGame({...s,version:1})).toThrow();expect(()=>normalizeGame({...s,resources:{...s.resources,battery:-1}})).toThrow();});
 it('gives a warning and makes an unsheltered full storm fatal',()=>{let s=repaired();s=stepGame(s,175);expect(s.storm).toBe('warning');s=stepGame(s,200);expect(s.phase).toBe('failed');});
 it('replays ordered actions without duplicate awards',()=>{let s=repaired();const actions=['scanSolar','toggleOxygen','toggleOxygen','scanSolar'];let a=s,b=normalizeGame(JSON.parse(JSON.stringify(s)));for(const action of actions){a=act(a,action);b=act(b,action);}expect(hashState(a)).toBe(hashState(b));expect(a.awarded.filter(id=>id==='scan-solar')).toHaveLength(1);expect(a.awarded.filter(id=>id==='toggle-oxygen')).toHaveLength(1);expect(a.modules.oxygen.enabled).toBe(true);});
 it('fails with depleted reserves and leaves checkpoint unchanged',()=>{const checkpoint=lunar();const failing=structuredClone(checkpoint);failing.resources.oxygen=0;const failed=stepGame(failing,700);expect(failed.phase).toBe('failed');expect(normalizeGame(checkpoint).phase).toBe('lunar');expect(checkpoint.resources.oxygen).toBe(.5);});
});

it('rejects inconsistent regions, counters and malformed evidence in saves',()=>{
 const s=repaired();
 expect(()=>normalizeGame({...s,region:'orbit'})).toThrow();
 expect(()=>normalizeGame({...s,flags:{...s.flags,expedition:true}})).toThrow();
 expect(()=>normalizeGame({...s,blackouts:-1})).toThrow();
 expect(()=>normalizeGame({...s,scoutRepairRemaining:1.5})).toThrow();
 expect(()=>normalizeGame({...s,log:[{tick:0,kind:'x',text:'x',before:Infinity}]})).toThrow();
 expect(()=>normalizeGame({...s,log:[{tick:s.tick+1,kind:'x',text:'x'}]})).toThrow();
});


it('normalizes fractional frame schedules at the same integer duration',()=>{
 const initial=repaired(); const reference=stepGame(initial,10);
 for(const fps of [10,30,60,144]) {
  let s=initial;
  for(let i=0;i<fps*10;i++) s=stepGame(s,1/fps);
  expect(s.remainder, `${fps} fps`).toBe(0);
  expect(hashState(s), `${fps} fps`).toBe(hashState(reference));
  expect(()=>normalizeGame(JSON.parse(JSON.stringify(s)))).not.toThrow();
 }
});
