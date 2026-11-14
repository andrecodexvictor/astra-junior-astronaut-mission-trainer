import { describe, expect, it } from 'vitest';
import {
  NPC_PLACEMENTS,
  OBSTACLES,
  RAMPS,
  REGIONS,
  REGION_LINKS,
  generateScatterPlacements,
  getTerrainHeight,
  getTerrainSlope,
  isPointInNoScatter,
} from '../../src/world/manifest';
import type { RegionId } from '../../src/contracts';

describe('authored world', () => {
  it('keeps every target and spawn within its region with unique IDs', () => {
    const ids = new Set<string>();
    for (const [name, plan] of Object.entries(REGIONS)) {
      expect(Math.abs(plan.spawn.x)).toBeLessThan(plan.bounds);
      expect(Math.abs(plan.spawn.z)).toBeLessThan(plan.bounds);
      for (const target of plan.targets) {
        expect(target.region).toBe(name);
        expect(ids.has(target.id)).toBe(false);
        ids.add(target.id);
        expect(Math.abs(target.position.x)).toBeLessThan(plan.bounds);
        expect(Math.abs(target.position.z)).toBeLessThan(plan.bounds);
      }
    }
    expect(ids.size).toBe(20);
  });

  it('can reach the interaction radius of every target on the collision grid', () => {
    for (const [region, plan] of Object.entries(REGIONS)) {
      const obstacles = OBSTACLES[region as RegionId];
      const step = 0.5;
      const key = (x: number, z: number) => `${x},${z}`;
      const start = [Math.round(plan.spawn.x / step), Math.round(plan.spawn.z / step)] as const;
      const queue: Array<readonly [number, number]> = [start];
      const visited = new Set([key(...start)]);
      for (let i = 0; i < queue.length; i++) {
        const [x, z] = queue[i];
        for (const [dx, dz] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ]) {
          const nx = x + dx;
          const nz = z + dz;
          const wx = nx * step;
          const wz = nz * step;
          const k = key(nx, nz);
          if (
            Math.abs(wx) > plan.bounds ||
            Math.abs(wz) > plan.bounds ||
            visited.has(k) ||
            obstacles.some((o) => Math.abs(wx - o.x) < o.halfX + 0.3 && Math.abs(wz - o.z) < o.halfZ + 0.3)
          ) {
            continue;
          }
          visited.add(k);
          queue.push([nx, nz]);
        }
      }
      for (const target of plan.targets) {
        expect(
          queue.some(([x, z]) => Math.hypot(x * step - target.position.x, z * step - target.position.z) < (target.radius ?? 3)),
          target.id,
        ).toBe(true);
      }
    }
  });

  it('connects all regions to the habitat with reversible links', () => {
    const reached = new Set<RegionId>(['habitat']);
    let previous = 0;
    while (previous !== reached.size) {
      previous = reached.size;
      for (const [a, b] of REGION_LINKS) {
        if (reached.has(a)) reached.add(b);
        if (reached.has(b)) reached.add(a);
      }
    }
    expect(reached.size).toBe(Object.keys(REGIONS).length);
  });

  it('marks pressurized environments and NPC variants consistently', () => {
    expect(REGIONS.academy.pressurized).toBe(true);
    expect(REGIONS.orbit.pressurized).toBe(true);
    expect(REGIONS.greenhouse.pressurized).toBe(true);
    expect(REGIONS.habitat.pressurized).toBe(false);
    expect(REGIONS.canyon.pressurized).toBe(false);

    const botanist = REGIONS.greenhouse.targets.find((t) => t.id === 'botanist');
    expect(botanist?.npcVariant).toBe('elena');
    const shelter = REGIONS.habitat.targets.find((t) => t.id === 'habitat-shelter');
    expect(shelter?.pressurized).toBe(true);
    expect(shelter?.npcVariant).toBe('reyes');

    for (const [region, npcs] of Object.entries(NPC_PLACEMENTS)) {
      const plan = REGIONS[region as RegionId];
      for (const npc of npcs) {
        expect(Math.abs(npc.position.x)).toBeLessThan(plan.bounds);
        expect(Math.abs(npc.position.z)).toBeLessThan(plan.bounds);
      }
    }
  });

  it('provides continuous >=1.8m wide dog-compatible airlock ramps up to habitat and greenhouse airlocks', () => {
    expect(RAMPS.habitat.length).toBeGreaterThanOrEqual(2);
    for (const ramp of RAMPS.habitat) {
      expect(ramp.dogCompatible).toBe(true);
      expect(ramp.halfWidth * 2).toBeGreaterThanOrEqual(1.8);
      const slope = (ramp.heightEnd - ramp.heightStart) / (ramp.xEnd - ramp.xStart);
      expect(slope).toBeGreaterThan(0.03);
      expect(slope).toBeLessThanOrEqual(0.2);

      let prevH = getTerrainHeight('habitat', ramp.xStart - 0.5, ramp.zCenter);
      for (let x = ramp.xStart; x <= ramp.porchEnd; x += 0.25) {
        const h = getTerrainHeight('habitat', x, ramp.zCenter);
        expect(h - prevH).toBeGreaterThanOrEqual(-0.001);
        expect(h - prevH).toBeLessThan(0.08);
        expect(getTerrainSlope('habitat', x, ramp.zCenter, 0.2)).toBeLessThanOrEqual(0.25);
        prevH = h;
      }
      expect(getTerrainHeight('habitat', ramp.porchEnd, ramp.zCenter)).toBeCloseTo(ramp.heightEnd, 3);
    }

    const habitatShelter = REGIONS.habitat.targets.find((t) => t.id === 'habitat-shelter');
    expect(habitatShelter?.position.y).toBeCloseTo(0.42, 3);
    const greenhouseDoor = REGIONS.habitat.targets.find((t) => t.id === 'greenhouse-door');
    expect(greenhouseDoor?.position.y).toBeCloseTo(0.28, 3);
  });

  it('generates deterministic regolith scatter strictly outside noScatter routes, ramps, and portals', () => {
    expect(generateScatterPlacements('academy')).toEqual([]);
    expect(generateScatterPlacements('orbit')).toEqual([]);
    expect(generateScatterPlacements('greenhouse')).toEqual([]);

    for (const region of ['habitat', 'canyon'] as const) {
      const a = generateScatterPlacements(region, 4201);
      const b = generateScatterPlacements(region, 4201);
      expect(a).toEqual(b);
      expect(a.length).toBeGreaterThan(10);
      for (const item of a) {
        expect(isPointInNoScatter(region, item.x, item.z)).toBe(false);
        for (const t of REGIONS[region].targets) {
          expect(Math.hypot(item.x - t.position.x, item.z - t.position.z)).toBeGreaterThanOrEqual(t.radius ?? 3);
        }
      }
    }
  });
});
