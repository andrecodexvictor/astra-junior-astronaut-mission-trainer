import type { RegionId, Vec3 } from '../contracts';
import {
  COMPANION_RADIUS,
  JUMP_SPEED,
  MOON_GRAVITY,
  OBSTACLES,
  PLAYER_RADIUS,
  REGIONS,
  RUN_SPEED,
  WALK_SPEED,
  getTerrainHeight,
  getTerrainSlope,
  type Obstacle,
} from '../world/manifest';

export interface MotionState {
  x: number;
  y: number;
  z: number;
  vy: number;
  heading: number;
  grounded: boolean;
}

export interface MotionInput {
  x: number;
  z: number;
  jump: boolean;
  sprint: boolean;
}

export interface FollowOptions {
  obstacles?: readonly Obstacle[];
  bounds?: number;
  radius?: number;
  keepClearTargets?: ReadonlyArray<{ x: number; z: number; radius?: number }>;
}

export interface SafeRecallOptions {
  bounds?: number;
  radius?: number;
  maxSlope?: number;
  avoidPortals?: boolean;
}

export interface LocomotionClipQuery {
  speed: number;
  airborne: boolean;
  turning: number | 'left' | 'right' | 'none';
  isLunar: boolean;
  reducedMotion?: boolean;
  justTookOff?: boolean;
  justLanded?: boolean;
  wasMoving?: boolean;
}

export type AstronautLocomotionClip =
  | 'Idle'
  | 'WalkEarth'
  | 'RunEarth'
  | 'WalkLunar'
  | 'RunLunar'
  | 'TurnLeft'
  | 'TurnRight'
  | 'Stop'
  | 'JumpTakeoff'
  | 'Airborne'
  | 'Land';

export function isPositionBlocked(
  x: number,
  z: number,
  obstacles: readonly Obstacle[],
  radius = PLAYER_RADIUS,
  keepClearTargets: ReadonlyArray<{ x: number; z: number; radius?: number }> = [],
): boolean {
  for (const o of obstacles) {
    if (Math.abs(x - o.x) < o.halfX + radius && Math.abs(z - o.z) < o.halfZ + radius) {
      return true;
    }
  }
  for (const k of keepClearTargets) {
    const minDist = (k.radius ?? 1.2) + radius;
    if (Math.hypot(x - k.x, z - k.z) < minDist) {
      return true;
    }
  }
  return false;
}

function pushOutOfObstacles(
  x: number,
  z: number,
  obstacles: readonly Obstacle[],
  radius: number,
  bounds: number,
): { x: number; z: number } {
  let px = Math.max(-bounds, Math.min(bounds, x));
  let pz = Math.max(-bounds, Math.min(bounds, z));
  for (const o of obstacles) {
    const dx = px - o.x;
    const dz = pz - o.z;
    const ex = o.halfX + radius;
    const ez = o.halfZ + radius;
    if (Math.abs(dx) < ex && Math.abs(dz) < ez) {
      const penX = ex - Math.abs(dx);
      const penZ = ez - Math.abs(dz);
      if (penX < penZ) {
        px = o.x + (dx >= 0 ? ex + 0.02 : -(ex + 0.02));
      } else {
        pz = o.z + (dz >= 0 ? ez + 0.02 : -(ez + 0.02));
      }
    }
  }
  return {
    x: Math.max(-bounds, Math.min(bounds, px)),
    z: Math.max(-bounds, Math.min(bounds, pz)),
  };
}

/** Kinematic movement in meters; bounding walls and obstacles keep actors on authored routes. */
export function advanceMotion(
  s: MotionState,
  input: MotionInput,
  dt: number,
  cameraAngle: number,
  bounds: number,
  obstacles: readonly Obstacle[] = [],
  gravity = MOON_GRAVITY,
  groundAt: number | ((x: number, z: number) => number) = 0,
): MotionState {
  const t = Math.max(0, Math.min(dt, 0.05));
  const length = Math.hypot(input.x, input.z);
  const n = Math.max(1, length);
  const ix = input.x / n;
  const iz = input.z / n;
  const sin = Math.sin(cameraAngle);
  const cos = Math.cos(cameraAngle);
  const dx = ix * cos + iz * sin;
  const dz = -ix * sin + iz * cos;
  const speed = input.sprint ? RUN_SPEED : WALK_SPEED;

  const sampleGround = (gx: number, gz: number) =>
    typeof groundAt === 'function' ? groundAt(gx, gz) : groundAt;

  const currentFloor = sampleGround(s.x, s.z);
  let vy = s.vy;
  let grounded = s.grounded;
  if (input.jump && grounded) {
    vy = JUMP_SPEED;
    grounded = false;
  }
  vy -= gravity * t;
  let y = s.y + vy * t;

  const blocked = (bx: number, bz: number) =>
    isPositionBlocked(bx, bz, obstacles, PLAYER_RADIUS) ||
    (grounded && sampleGround(bx, bz) - currentFloor > 0.45);

  let x = Math.max(-bounds, Math.min(bounds, s.x + dx * speed * t));
  let z = Math.max(-bounds, Math.min(bounds, s.z + dz * speed * t));
  if (blocked(x, s.z)) x = s.x;
  if (blocked(x, z)) z = s.z;

  const nextFloor = sampleGround(x, z);
  if (y <= nextFloor) {
    y = nextFloor;
    vy = 0;
    grounded = true;
  } else if (s.grounded && !input.jump && y - nextFloor <= 0.14) {
    // Follow gentle downward ramps smoothly without detaching into Airborne
    y = nextFloor;
    vy = 0;
    grounded = true;
  }

  return {
    x,
    z,
    y,
    vy,
    grounded,
    heading: length > 0.05 ? Math.atan2(dx, dz) : s.heading,
  };
}

/**
 * Exponential follow easing with optional obstacle sliding, portal keep-clear buffers,
 * and bounding walls so PIP, Scout, and Cometa never clip into props or block doors.
 */
export function followPosition(
  current: { x: number; z: number },
  target: { x: number; z: number },
  dt: number,
  responsiveness = 3,
  options?: FollowOptions,
): { x: number; z: number } {
  const blend = 1 - Math.exp(-responsiveness * Math.max(0, dt));
  const desiredX = current.x + (target.x - current.x) * blend;
  const desiredZ = current.z + (target.z - current.z) * blend;

  if (!options) {
    return { x: desiredX, z: desiredZ };
  }

  const obstacles = options.obstacles ?? [];
  const bounds = options.bounds ?? 1000;
  const radius = options.radius ?? COMPANION_RADIUS;
  const keepClear = options.keepClearTargets ?? [];

  const clampB = (v: number) => Math.max(-bounds, Math.min(bounds, v));
  const base = isPositionBlocked(current.x, current.z, obstacles, radius)
    ? pushOutOfObstacles(current.x, current.z, obstacles, radius, bounds)
    : { x: clampB(current.x), z: clampB(current.z) };

  const nextX = clampB(desiredX);
  const nextZ = clampB(desiredZ);

  if (!isPositionBlocked(nextX, nextZ, obstacles, radius, keepClear)) {
    return { x: nextX, z: nextZ };
  }

  // Try axis-separated sliding
  const tryX = { x: nextX, z: base.z };
  const tryZ = { x: base.x, z: nextZ };
  const xFree = !isPositionBlocked(tryX.x, tryX.z, obstacles, radius, keepClear);
  const zFree = !isPositionBlocked(tryZ.x, tryZ.z, obstacles, radius, keepClear);

  if (xFree && zFree) {
    const distX = Math.hypot(tryX.x - target.x, tryX.z - target.z);
    const distZ = Math.hypot(tryZ.x - target.x, tryZ.z - target.z);
    return distX <= distZ ? tryX : tryZ;
  }
  if (xFree) return tryX;
  if (zFree) return tryZ;

  // Tangential steering around obstacle
  const stepDist = Math.hypot(nextX - base.x, nextZ - base.z);
  if (stepDist > 1e-4) {
    const dirX = (nextX - base.x) / stepDist;
    const dirZ = (nextZ - base.z) / stepDist;
    const candA = { x: clampB(base.x - dirZ * stepDist), z: clampB(base.z + dirX * stepDist) };
    const candB = { x: clampB(base.x + dirZ * stepDist), z: clampB(base.z - dirX * stepDist) };
    const aFree = !isPositionBlocked(candA.x, candA.z, obstacles, radius, keepClear);
    const bFree = !isPositionBlocked(candB.x, candB.z, obstacles, radius, keepClear);
    if (aFree && bFree) {
      return Math.hypot(candA.x - target.x, candA.z - target.z) <=
        Math.hypot(candB.x - target.x, candB.z - target.z)
        ? candA
        : candB;
    }
    if (aFree) return candA;
    if (bFree) return candB;
  }

  return base;
}

/**
 * Validates a recall candidate against bounds, obstacles, portal keep-clear zones,
 * and walkable slope. Returns a grounded safe waypoint or `null` so runtime falls back to `'wait'`.
 */
export function validateSafeRecallTarget(
  region: RegionId,
  candidate: { x: number; z: number; y?: number } | null | undefined,
  obstacles: readonly Obstacle[] = OBSTACLES[region],
  options: SafeRecallOptions = {},
): Vec3 | null {
  if (!candidate || !Number.isFinite(candidate.x) || !Number.isFinite(candidate.z)) {
    return null;
  }
  const plan = REGIONS[region];
  const radius = options.radius ?? COMPANION_RADIUS;
  const maxBounds = (options.bounds ?? plan.bounds) - radius;
  if (Math.abs(candidate.x) > maxBounds || Math.abs(candidate.z) > maxBounds) {
    return null;
  }
  const portalBuffers =
    options.avoidPortals === false
      ? []
      : plan.targets
          .filter((t) => t.kind === 'portal')
          .map((t) => ({ x: t.position.x, z: t.position.z, radius: 0.9 }));

  if (isPositionBlocked(candidate.x, candidate.z, obstacles, radius, portalBuffers)) {
    return null;
  }

  const maxSlope = options.maxSlope ?? 0.35;
  if (getTerrainSlope(region, candidate.x, candidate.z) > maxSlope) {
    return null;
  }

  return {
    x: candidate.x,
    y: getTerrainHeight(region, candidate.x, candidate.z),
    z: candidate.z,
  };
}

/** Shortest signed angular delta in [-PI, PI] in Babylon heading space (atan2(dx, dz)). */
export function shortestAngleDelta(from: number, to: number): number {
  let delta = (to - from) % (Math.PI * 2);
  if (delta > Math.PI) delta -= Math.PI * 2;
  if (delta < -Math.PI) delta += Math.PI * 2;
  return delta;
}

/**
 * Selects the astronaut skeletal clip cleanly from controller locomotion state.
 * Numeric `turning` uses Babylon heading velocity (rad/s): negative = turning left (-X),
 * positive = turning right (+X).
 */
export function selectLocomotionClip(query: LocomotionClipQuery): AstronautLocomotionClip {
  if (query.justTookOff) return 'JumpTakeoff';
  if (query.airborne) return 'Airborne';
  if (query.justLanded) return 'Land';

  if (query.speed >= 3.2) {
    return query.isLunar ? 'RunLunar' : 'RunEarth';
  }
  if (query.speed > 0.2) {
    return query.isLunar ? 'WalkLunar' : 'WalkEarth';
  }

  const turnThresh = query.reducedMotion ? 1.2 : 0.35;
  if (query.turning === 'left' || (typeof query.turning === 'number' && query.turning < -turnThresh)) {
    return 'TurnLeft';
  }
  if (query.turning === 'right' || (typeof query.turning === 'number' && query.turning > turnThresh)) {
    return 'TurnRight';
  }
  if (query.wasMoving && !query.reducedMotion) {
    return 'Stop';
  }
  return 'Idle';
}

export function selectRobotLocomotionClip(query: {
  speed: number;
  turning: number;
  reducedMotion?: boolean;
}): 'Idle' | 'Travel' | 'TurnLeft' | 'TurnRight' {
  if (query.speed > 0.22) return 'Travel';
  const thresh = query.reducedMotion ? 1.2 : 0.4;
  if (query.turning < -thresh) return 'TurnLeft';
  if (query.turning > thresh) return 'TurnRight';
  return 'Idle';
}

export function selectCometaLocomotionClip(query: {
  speed: number;
  mode: 'follow' | 'wait' | 'recall';
  isLunar: boolean;
  isOrbit?: boolean;
  turning: number;
  reducedMotion?: boolean;
}):
  | 'Idle'
  | 'Walk'
  | 'WalkEarth'
  | 'WalkLunar'
  | 'Trot'
  | 'TrotEarth'
  | 'TrotLunar'
  | 'TurnLeft'
  | 'TurnRight'
  | 'Wait' {
  if (query.speed >= 2.8) {
    if (query.isOrbit) return 'Trot';
    return query.isLunar ? 'TrotLunar' : 'TrotEarth';
  }
  if (query.speed > 0.2) {
    if (query.isOrbit) return 'Walk';
    return query.isLunar ? 'WalkLunar' : 'WalkEarth';
  }
  const thresh = query.reducedMotion ? 1.2 : 0.45;
  if (query.turning < -thresh) return 'TurnLeft';
  if (query.turning > thresh) return 'TurnRight';
  if (query.mode === 'wait') return 'Wait';
  return 'Idle';
}
