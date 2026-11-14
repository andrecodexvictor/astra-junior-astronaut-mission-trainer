import {describe,it,expect} from 'vitest';
import {MissionClock} from '../../src/app/clock';
import {decodeSave,newSave,snapshot} from '../../src/app/save';
import {applyAction,hashState,stepGame} from '../../src/simulation';
describe('mission integration',()=>{
 it('produces identical ticks across render schedules and explicitly pauses background time',()=>{
  const a=new MissionClock(),b=new MissionClock();a.reset(0);b.reset(0);
  let sa=newSave().current.simulation,sb=newSave().current.simulation;for(let t=50;t<=10000;t+=50)sa=stepGame(sa,a.advance(t,false));for(const t of [10,230,400,1000,1900,3500,10000])sb=stepGame(sb,b.advance(t,false));
  expect(sa.tick).toBe(10);expect(sb.tick).toBe(sa.tick);expect(sa.academyBattery).toBe(sb.academyBattery);expect(a.advance(60000,true)).toBe(0);expect(a.advance(61000,false)).toBe(1);
 });
 it('round trips the full snapshot, including the checkpoint, without offline resource production',()=>{
  const f=newSave();f.current.simulation=stepGame(applyAction(f.current.simulation,'diagnoseAcademy').state,2.5);
  const before=hashState(f.current.simulation), copy=decodeSave(JSON.stringify(f));expect(hashState(copy.current.simulation)).toBe(before);expect(copy.checkpoint.simulation.tick).toBe(0);
  copy.current=snapshot(copy.checkpoint.simulation);expect(copy.current.simulation.resources).toEqual(f.checkpoint.simulation.resources);
 });
 it('rejects damaged and incompatible saves instead of inventing missing reserves',()=>{
  const f=newSave();f.current.simulation.resources.battery=-1;expect(()=>decodeSave(JSON.stringify(f))).toThrow();expect(()=>decodeSave('{}')).toThrow();
  const wrong=newSave();wrong.current.simulation.region='canyon';expect(()=>decodeSave(JSON.stringify(wrong))).toThrow();
 });
});
