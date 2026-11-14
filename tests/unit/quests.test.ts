import { describe, expect, it } from 'vitest';
import { applyAction, createGame, getObjectives, getReport, stepGame, type GameState } from '../../src/simulation';
function act(s:GameState,id:string,payload?:unknown){const r=applyAction(s,id,payload);expect(r.ok,`${id}: ${r.message}`).toBe(true);return r.state;}
function play(disableOxygen:boolean){let s=createGame();s=act(s,'diagnoseAcademy');s=act(s,'shedLoad');s=stepGame(s,15);s=act(s,'travel',{region:'orbit'});s=act(s,'collectCargo');s=act(s,'travel',{region:'habitat'});s=stepGame(s,60);for(const a of ['repairPower','repairWater','repairOxygen'])s=act(s,a);s=stepGame(s,5);if(disableOxygen){s=act(s,'toggleOxygen');s=stepGame(s,10);s=act(s,'toggleOxygen');}s=act(s,'plantCrop');s=act(s,'chooseLoadout');s=act(s,'travel',{region:'canyon'});s=act(s,'collectSample');s=act(s,'repairCompanion');s=stepGame(s,5);s=act(s,'recruitCompanion');s=act(s,'travel',{region:'habitat'});s=act(s,'deliverSample');s=act(s,'shelter');s=stepGame(s,380);s=act(s,'harvest');return stepGame(s,1);}
describe('mission objectives',()=>{it.each([false,true])('completes with oxygen toggle %s',toggle=>{const s=play(toggle);expect(s.phase).toBe('complete');expect(getObjectives(s).every(o=>o.complete)).toBe(true);expect(getReport(s).understanding.note).toContain('do not validate');expect(applyAction(s,'harvest').ok).toBe(false);});it('gates launch until life support and tools are ready',()=>{let s=createGame();expect(applyAction(s,'launchExpedition').ok).toBe(false);expect(getObjectives(s).find(o=>o.id==='balance')?.complete).toBe(false);});});

it('supports a paced mission with realistic walking delays and a forecast return window',()=>{
 let s=createGame();
 s=act(s,'diagnoseAcademy');s=act(s,'shedLoad');s=stepGame(s,15);s=act(s,'travel',{region:'orbit'});s=act(s,'collectCargo');s=act(s,'travel',{region:'habitat'});
 s=stepGame(s,60);
 for(const repair of ['repairPower','repairWater','repairOxygen']) {s=act(s,repair);s=stepGame(s,5);s=stepGame(s,10);}
 s=stepGame(s,20);s=act(s,'travel',{region:'greenhouse'});s=act(s,'plantCrop');s=act(s,'travel',{region:'habitat'});
 s=stepGame(s,15);s=act(s,'chooseLoadout');s=act(s,'travel',{region:'canyon'});
 s=stepGame(s,25);s=act(s,'repairCompanion');s=stepGame(s,5);s=act(s,'recruitCompanion');s=stepGame(s,10);s=act(s,'collectSample');
 s=stepGame(s,25);s=act(s,'travel',{region:'habitat'});s=stepGame(s,10);s=act(s,'deliverSample');s=stepGame(s,15);
 expect(s.storm).toBe('warning');expect(s.lunarTick).toBeLessThan(300);s=act(s,'shelter');s=stepGame(s,380-s.lunarTick);expect(s.flags.stormSurvived).toBe(true);s=act(s,'exitShelter');s=stepGame(s,20);s=act(s,'travel',{region:'greenhouse'});s=act(s,'harvest');s=stepGame(s,1);
 expect(s.phase).toBe('complete');expect(s.health).toBe(100);expect(s.resources.potable).toBeGreaterThan(2);expect(s.resources.oxygen).toBeGreaterThan(.2);
});
