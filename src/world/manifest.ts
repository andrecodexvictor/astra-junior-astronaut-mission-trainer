import type { RegionId, WorldTarget, Vec3 } from '../contracts';

export interface RegionPlan { bounds: number; spawn: Vec3; targets: WorldTarget[] }
const target = (region: RegionId, id: string, name: string, kind: WorldTarget['kind'], x: number, z: number, description: string): WorldTarget => ({ region, id, name, kind, position: { x, y: 0, z }, radius: 3, description });
/** Spatial baseline in meters, Y up. Routes are flat and at least 1.8 m wide. */
export const REGIONS: Record<RegionId, RegionPlan> = {
 academy: { bounds: 17.5, spawn: {x:0,y:0,z:-10}, targets: [
  target('academy','academy-console','Training console','station',-5,0,'Inspect the academy power network.'), target('academy','academy-launch','Orbital trainer','portal',0,13,'Continue to the orbital training cabin.') ] },
 orbit: { bounds: 13.5, spawn: {x:0,y:0,z:-9}, targets: [
  target('orbit','cargo','Drifting cargo','station',-4,1,'Practice approaching cargo in the simplified trainer.'), target('orbit','lunar-transfer','Lunar transfer','portal',0,10,'Travel to the lunar habitat.') ] },
 habitat: { bounds: 29, spawn: {x:0,y:0,z:-14}, targets: [
  target('habitat','battery-bank','Battery bank','station',-11,0,'Inspect stored energy.'), target('habitat','water-recycler','Water recycler','station',-5,6,'Inspect the water loop.'), target('habitat','oxygen-generator','Oxygen generator','station',5,6,'Inspect oxygen production.'), target('habitat','habitat-shelter','Shelter','station',11,1,'Enter the protected habitat.'), target('habitat','expedition-gate','Expedition gate','portal',0,23,'Set out for the fictional ice canyon.'), target('habitat','mission-console','Mission console','station',0,-3,'Review the mission and local systems.'), target('habitat','field-locker','Field locker','station',-10,-8,'Inspect the field equipment.'), target('habitat','greenhouse-door','Greenhouse airlock','portal',19,9,'Visit the greenhouse.') ] },
 canyon: { bounds: 28, spawn: {x:0,y:0,z:-20}, targets: [
  target('canyon','ice-deposit','Ice prospect','sample',-5,13,'Investigate a fictional training deposit.'), target('canyon','damaged-scout','Damaged Scout','companion',7,5,'Inspect the stranded exploration robot.'), target('canyon','survey-beacon','Survey beacon','station',0,21,'Read the field survey.'), target('canyon','return-gate','Return to habitat','portal',0,-21,'Return to the habitat.') ] },
 greenhouse: { bounds: 14.5, spawn: {x:0,y:0,z:-10}, targets: [
  target('greenhouse','crop-bed','Crop bed','station',-5,3,'Inspect the plants and growing medium.'), target('greenhouse','grow-lights','Grow lights','station',5,3,'Inspect the growing lights.'), target('greenhouse','return-habitat','Return airlock','portal',0,-12,'Return to the habitat.'), target('greenhouse','botanist','Botanist','npc',0,10,'Talk about tending the crops.') ] }
};
export const REGION_LINKS: ReadonlyArray<readonly [RegionId,RegionId]> = [['academy','orbit'],['orbit','habitat'],['habitat','canyon'],['habitat','greenhouse']];
export const WALK_SPEED = 2.5, RUN_SPEED = 4.5, MOON_GRAVITY = 1.62, JUMP_SPEED = 2.4;

/** Axis-aligned blocking footprints, expanded by the player's 0.3 m radius in movement. */
export interface Obstacle { x:number; z:number; halfX:number; halfZ:number }
export const OBSTACLES: Record<RegionId, Obstacle[]> = {
 academy: [{x:-5,z:0,halfX:.8,halfZ:.5}],
 orbit: [{x:8,z:-8,halfX:.8,halfZ:.5},{x:8,z:-3,halfX:.8,halfZ:.5},{x:8,z:2,halfX:.8,halfZ:.5},{x:8,z:7,halfX:.8,halfZ:.5}],
 habitat: [{x:13,z:0,halfX:3,halfZ:3},{x:22,z:10,halfX:2,halfZ:2},{x:-11,z:0,halfX:.7,halfZ:.7},{x:-5,z:6,halfX:.7,halfZ:.7},{x:5,z:6,halfX:.7,halfZ:.7},{x:0,z:-3,halfX:.8,halfZ:.5},{x:-10,z:-8,halfX:1,halfZ:.5}],
 canyon: [{x:0,z:21,halfX:.8,halfZ:.5}],
 greenhouse: [-5,1,7].flatMap(z=>[-6,6].map(x=>({x,z,halfX:1.5,halfZ:2})))
};
