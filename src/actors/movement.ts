import { JUMP_SPEED, MOON_GRAVITY, RUN_SPEED, WALK_SPEED, type Obstacle } from '../world/manifest';
export interface MotionState { x:number; y:number; z:number; vy:number; heading:number; grounded:boolean }
export interface MotionInput { x:number; z:number; jump:boolean; sprint:boolean }
/** Kinematic movement in meters; bounding walls keep players on the authored route. */
export function advanceMotion(s: MotionState, input: MotionInput, dt: number, cameraAngle: number, bounds: number, obstacles: readonly Obstacle[] = [], gravity = MOON_GRAVITY): MotionState {
 const t = Math.max(0, Math.min(dt, .05));
 const length = Math.hypot(input.x,input.z), n = Math.max(1,length);
 const ix=input.x/n, iz=input.z/n;
 const sin=Math.sin(cameraAngle), cos=Math.cos(cameraAngle);
 const dx=ix*cos+iz*sin, dz=-ix*sin+iz*cos;
 const speed=input.sprint ? RUN_SPEED : WALK_SPEED;
 let vy=s.vy, grounded=s.grounded;
 if (input.jump && grounded) { vy=JUMP_SPEED; grounded=false; }
 vy -= gravity*t;
 let y=s.y+vy*t;
 if (y<=0) { y=0; vy=0; grounded=true; }
 const blocked=(x:number,z:number)=>obstacles.some(o=>Math.abs(x-o.x)<o.halfX+.3 && Math.abs(z-o.z)<o.halfZ+.3);
 let x=Math.max(-bounds,Math.min(bounds,s.x+dx*speed*t));
 let z=Math.max(-bounds,Math.min(bounds,s.z+dz*speed*t));
 if(blocked(x,s.z)) x=s.x;
 if(blocked(x,z)) z=s.z;
 return {x,z,y,vy,grounded,heading:length>.05?Math.atan2(dx,dz):s.heading};
}

/** Exponential follow easing is frame-rate independent for a stationary anchor. */
export function followPosition(current: {x:number; z:number}, target: {x:number; z:number}, dt:number, responsiveness=3): {x:number; z:number} {
 const blend=1-Math.exp(-responsiveness*Math.max(0,dt));
 return {x:current.x+(target.x-current.x)*blend,z:current.z+(target.z-current.z)*blend};
}
