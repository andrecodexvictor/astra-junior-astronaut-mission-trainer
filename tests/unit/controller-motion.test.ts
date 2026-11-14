import { describe, expect, it } from 'vitest';
import {
  advanceMotion,
  followPosition,
  selectCometaLocomotionClip,
  selectLocomotionClip,
  selectRobotLocomotionClip,
  validateSafeRecallTarget,
  type MotionState,
} from '../../src/actors/movement';
import { OBSTACLES, RAMPS, getTerrainHeight } from '../../src/world/manifest';

const start = (): MotionState => ({ x: 0, y: 0, z: 0, vy: 0, heading: 0, grounded: true });

describe('lunar locomotion and companion control', () => {
  it('walks and sprints at the specified speeds without diagonal advantage', () => {
    let walk = start();
    let run = start();
    let diagonal = start();
    for (let i = 0; i < 100; i++) {
      walk = advanceMotion(walk, { x: 0, z: 1, jump: false, sprint: false }, 0.01, 0, 100);
      run = advanceMotion(run, { x: 0, z: 1, jump: false, sprint: true }, 0.01, 0, 100);
      diagonal = advanceMotion(diagonal, { x: 1, z: 1, jump: false, sprint: false }, 0.01, 0, 100);
    }
    expect(walk.z).toBeCloseTo(2.5);
    expect(run.z).toBeCloseTo(4.5);
    expect(Math.hypot(diagonal.x, diagonal.z)).toBeCloseTo(2.5);
  });

  it('smoothly follows and gives consistent results across frame schedules', () => {
    const target = { x: 10, z: -4 };
    const origin = { x: 0, z: 0 };
    let a = origin;
    let b = origin;
    for (let i = 0; i < 10; i++) a = followPosition(a, target, 0.1);
    for (let i = 0; i < 100; i++) b = followPosition(b, target, 0.01);
    expect(a.x).toBeLessThan(10);
    expect(a.x).toBeGreaterThan(0);
    expect(a.x).toBeCloseTo(b.x, 8);
    expect(a.z).toBeCloseTo(b.z, 8);
  });

  it('rises less under Earth gravity than lunar gravity over the same interval', () => {
    let earth = start();
    let moon = start();
    for (let i = 0; i < 15; i++) {
      const input = { x: 0, z: 0, jump: i === 0, sprint: false };
      earth = advanceMotion(earth, input, 0.01, 0, 100, [], 9.81);
      moon = advanceMotion(moon, input, 0.01, 0, 100, [], 1.62);
    }
    expect(earth.y).toBeGreaterThan(0);
    expect(earth.y).toBeLessThan(moon.y);
  });

  it('jumps under lunar gravity and lands on the floor', () => {
    let s = start();
    let apex = 0;
    for (let i = 0; i < 400; i++) {
      s = advanceMotion(s, { x: 0, z: 0, jump: i === 0, sprint: false }, 0.01, 0, 100);
      apex = Math.max(apex, s.y);
    }
    expect(apex).toBeGreaterThan(1.7);
    expect(apex).toBeLessThan(1.8);
    expect(s.y).toBe(0);
    expect(s.grounded).toBe(true);
  });

  it('stops against an obstacle and can slide along it', () => {
    let s = start();
    for (let i = 0; i < 100; i++) {
      s = advanceMotion(s, { x: 1, z: 0, jump: false, sprint: false }, 0.01, 0, 20, [{ x: 2, z: 0, halfX: 0.5, halfZ: 1 }]);
    }
    expect(s.x).toBeLessThanOrEqual(1.2);
    for (let i = 0; i < 100; i++) {
      s = advanceMotion(s, { x: 1, z: 1, jump: false, sprint: false }, 0.01, 0, 20, [{ x: 2, z: 0, halfX: 0.5, halfZ: 1 }]);
    }
    expect(s.z).toBeGreaterThan(1);
  });

  it('keeps the player inside finite region bounds', () => {
    let s = start();
    for (let i = 0; i < 100; i++) {
      s = advanceMotion(s, { x: 1, z: 1, jump: false, sprint: true }, 0.05, 0, 3);
    }
    expect(s.x).toBeLessThanOrEqual(3);
    expect(s.z).toBeLessThanOrEqual(3);
  });

  it('walks smoothly up and down the habitat airlock ramp without blocking', () => {
    const ramp = RAMPS.habitat[0];
    const groundFn = (x: number, z: number) => getTerrainHeight('habitat', x, z);
    let s: MotionState = { x: ramp.xStart - 0.5, y: 0, z: ramp.zCenter, vy: 0, heading: 0, grounded: true };
    for (let i = 0; i < 200; i++) {
      s = advanceMotion(
        s,
        { x: 1, z: 0, jump: false, sprint: false },
        0.02,
        0,
        29,
        OBSTACLES.habitat,
        1.62,
        groundFn,
      );
    }
    expect(s.x).toBeGreaterThan(ramp.xEnd);
    expect(s.y).toBeCloseTo(ramp.heightEnd, 3);
    expect(s.grounded).toBe(true);

    for (let i = 0; i < 140; i++) {
      s = advanceMotion(
        s,
        { x: -1, z: 0, jump: false, sprint: false },
        0.02,
        0,
        29,
        OBSTACLES.habitat,
        1.62,
        groundFn,
      );
    }
    expect(s.x).toBeLessThan(ramp.xStart);
    expect(s.y).toBeCloseTo(0, 3);
    expect(s.grounded).toBe(true);
  });

  it('slides companions cleanly around obstacles and keeps clear of portals', () => {
    const obstacles = [{ x: 2, z: 0, halfX: 0.8, halfZ: 1.0 }];
    const portalKeepClear = [{ x: 0, z: 8, radius: 1.0 }];
    let pos = { x: 0, z: 0 };
    for (let i = 0; i < 120; i++) {
      pos = followPosition(pos, { x: 5, z: 1.6 }, 0.04, 4, {
        obstacles,
        bounds: 15,
        radius: 0.35,
        keepClearTargets: portalKeepClear,
      });
      expect(Math.abs(pos.x - 2) < 1.15 && Math.abs(pos.z) < 1.35).toBe(false);
    }
    expect(pos.z).toBeGreaterThan(1.35);
    expect(pos.x).toBeGreaterThan(3.5);

    let nearPortal = { x: 0, z: 6 };
    for (let i = 0; i < 40; i++) {
      nearPortal = followPosition(nearPortal, { x: 0, z: 8 }, 0.05, 4, {
        obstacles: [],
        bounds: 15,
        radius: 0.35,
        keepClearTargets: portalKeepClear,
      });
    }
    expect(Math.hypot(nearPortal.x - 0, nearPortal.z - 8)).toBeGreaterThanOrEqual(1.3);
  });

  it('rejects blocked, portal, out-of-bounds, and steep-slope recall targets with null', () => {
    // Inside central obstacle (mission console at 0, -3)
    expect(validateSafeRecallTarget('habitat', { x: 0, y: 0, z: -3 }, OBSTACLES.habitat)).toBeNull();
    // On top of portal (expedition gate at 0, 23)
    expect(validateSafeRecallTarget('habitat', { x: 0, y: 0, z: 23 }, OBSTACLES.habitat)).toBeNull();
    // Out of bounds
    expect(validateSafeRecallTarget('orbit', { x: 20, y: 0, z: 0 }, OBSTACLES.orbit)).toBeNull();
    // Steep canyon rock wall (|x| > 10.5)
    expect(validateSafeRecallTarget('canyon', { x: 16, y: 0, z: 0 }, OBSTACLES.canyon)).toBeNull();

    // Valid floor & ramp spots succeed with exact terrain elevation
    const safeFloor = validateSafeRecallTarget('academy', { x: -2, y: 0, z: 4 }, OBSTACLES.academy);
    expect(safeFloor).toEqual({ x: -2, y: 0, z: 4 });

    const safeRamp = validateSafeRecallTarget('habitat', { x: 7.0, y: 0, z: 1.0 }, OBSTACLES.habitat);
    expect(safeRamp).not.toBeNull();
    expect(safeRamp?.y).toBeCloseTo(getTerrainHeight('habitat', 7.0, 1.0), 4);
  });

  it('selects Earth, Lunar, Airborne, Turning, Stop, and reduced-motion clips cleanly', () => {
    expect(selectLocomotionClip({ speed: 0, airborne: false, turning: 0, isLunar: false })).toBe('Idle');
    expect(selectLocomotionClip({ speed: 2.2, airborne: false, turning: 0, isLunar: false })).toBe('WalkEarth');
    expect(selectLocomotionClip({ speed: 4.1, airborne: false, turning: 0, isLunar: false })).toBe('RunEarth');
    expect(selectLocomotionClip({ speed: 2.2, airborne: false, turning: 0, isLunar: true })).toBe('WalkLunar');
    expect(selectLocomotionClip({ speed: 4.1, airborne: false, turning: 0, isLunar: true })).toBe('RunLunar');
    expect(selectLocomotionClip({ speed: 0, airborne: false, turning: -1.1, isLunar: true })).toBe('TurnLeft');
    expect(selectLocomotionClip({ speed: 0, airborne: false, turning: 1.1, isLunar: true })).toBe('TurnRight');
    expect(selectLocomotionClip({ speed: 1, airborne: true, turning: 0, isLunar: true, justTookOff: true })).toBe(
      'JumpTakeoff',
    );
    expect(selectLocomotionClip({ speed: 1, airborne: true, turning: 0, isLunar: true })).toBe('Airborne');
    expect(selectLocomotionClip({ speed: 0, airborne: false, turning: 0, isLunar: true, justLanded: true })).toBe('Land');
    expect(selectLocomotionClip({ speed: 0, airborne: false, turning: 0, isLunar: false, wasMoving: true })).toBe('Stop');
    expect(
      selectLocomotionClip({
        speed: 0,
        airborne: false,
        turning: 0.6,
        isLunar: false,
        wasMoving: true,
        reducedMotion: true,
      }),
    ).toBe('Idle');

    expect(selectRobotLocomotionClip({ speed: 1.5, turning: 0 })).toBe('Travel');
    expect(selectCometaLocomotionClip({ speed: 0, mode: 'wait', isLunar: true, turning: 0 })).toBe('Wait');
    expect(selectCometaLocomotionClip({ speed: 3.1, mode: 'follow', isLunar: true, turning: 0 })).toBe('TrotLunar');
    expect(selectCometaLocomotionClip({ speed: 1.5, mode: 'follow', isLunar: false, isOrbit: true, turning: 0 })).toBe(
      'Walk',
    );
  });
});
