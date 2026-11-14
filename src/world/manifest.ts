import type { NpcVariant, RegionId, Vec3, WorldTarget } from '../contracts';

export interface RegionPlan {
  bounds: number;
  spawn: Vec3;
  targets: WorldTarget[];
  pressurized: boolean;
}

export interface Obstacle {
  x: number;
  z: number;
  halfX: number;
  halfZ: number;
}

export interface RampSpec {
  id: string;
  region: RegionId;
  xStart: number;
  xEnd: number;
  porchEnd: number;
  zCenter: number;
  halfWidth: number;
  heightStart: number;
  heightEnd: number;
  dogCompatible: boolean;
}

export interface NoScatterZone {
  kind: 'rect' | 'circle';
  x: number;
  z: number;
  halfX?: number;
  halfZ?: number;
  radius?: number;
}

export interface NpcPlacement {
  id: string;
  variant: NpcVariant;
  region: RegionId;
  position: Vec3;
  heading: number;
  defaultClip: string;
  targetId?: string;
}

export interface ScatterPlacement {
  x: number;
  y: number;
  z: number;
  scaleX: number;
  scaleY: number;
  scaleZ: number;
  rotY: number;
  variant: 0 | 1 | 2;
}

export const WALK_SPEED = 2.5;
export const RUN_SPEED = 4.5;
export const MOON_GRAVITY = 1.62;
export const EARTH_GRAVITY = 9.81;
export const JUMP_SPEED = 2.4;
export const PLAYER_RADIUS = 0.3;
export const COMPANION_RADIUS = 0.35;

export const RAMPS: Record<RegionId, readonly RampSpec[]> = {
  academy: [],
  orbit: [],
  habitat: [
    {
      id: 'habitat-airlock-ramp',
      region: 'habitat',
      xStart: 5.0,
      xEnd: 8.8,
      porchEnd: 11.2,
      zCenter: 1.0,
      halfWidth: 1.3,
      heightStart: 0,
      heightEnd: 0.42,
      dogCompatible: true,
    },
    {
      id: 'greenhouse-airlock-ramp',
      region: 'habitat',
      xStart: 15.6,
      xEnd: 18.4,
      porchEnd: 19.8,
      zCenter: 9.0,
      halfWidth: 1.2,
      heightStart: 0,
      heightEnd: 0.28,
      dogCompatible: true,
    },
  ],
  canyon: [],
  greenhouse: [],
};

function smoothstep01(t: number): number {
  const c = Math.max(0, Math.min(1, t));
  return c * c * (3 - 2 * c);
}

/**
 * Deterministic terrain & ramp surface height in meters (Y-up).
 * Used identically by terrain mesh generation, player motion, PIP, Scout, and Cometa.
 */
export function getTerrainHeight(region: RegionId, x: number, z: number): number {
  if (!Number.isFinite(x) || !Number.isFinite(z)) return 0;

  if (region === 'habitat') {
    for (const ramp of RAMPS.habitat) {
      if (Math.abs(z - ramp.zCenter) <= ramp.halfWidth) {
        if (x >= ramp.xStart && x <= ramp.xEnd) {
          const t = (x - ramp.xStart) / (ramp.xEnd - ramp.xStart);
          return ramp.heightStart + (ramp.heightEnd - ramp.heightStart) * t;
        }
        if (x > ramp.xEnd && x <= ramp.porchEnd + 0.6) {
          return ramp.heightEnd;
        }
      }
    }
    // Gentle outer regolith ridge relief strictly outside walkable central routes & pads
    const radial = Math.hypot(x, z);
    if (radial > 26.5) {
      const ridge = smoothstep01((radial - 26.5) / 14);
      const undulation = 0.55 + 0.45 * Math.sin(x * 0.21 + z * 0.17);
      return ridge * (1.2 + 2.8 * undulation);
    }
    return 0;
  }

  if (region === 'canyon') {
    // Gentle walkable basin dip (-0.36m) in mid-canyon with smooth transitions (slope < 0.08)
    let basin = 0;
    if (z > -12 && z < 16) {
      if (z < -6) {
        basin = -0.36 * smoothstep01((z + 12) / 6);
      } else if (z <= 10) {
        basin = -0.36;
      } else {
        basin = -0.36 * (1 - smoothstep01((z - 10) / 6));
      }
    }
    // Steep canyon rock walls strictly outside the 20m-wide canyon floor (|x| > 10.5)
    const wallDist = Math.abs(x) - 10.5;
    if (wallDist > 0) {
      const wallRise = smoothstep01(wallDist / 10.5);
      const crag = 0.7 + 0.3 * Math.cos(z * 0.33 + Math.sign(x) * 1.1);
      return basin + wallRise * 6.4 * crag;
    }
    return basin;
  }

  return 0;
}

/** Approximate terrain slope (max |dy/dx| or |dy/dz|) for walkability & safe recall checks. */
export function getTerrainSlope(region: RegionId, x: number, z: number, step = 0.35): number {
  const hC = getTerrainHeight(region, x, z);
  const hX1 = getTerrainHeight(region, x + step, z);
  const hX0 = getTerrainHeight(region, x - step, z);
  const hZ1 = getTerrainHeight(region, x, z + step);
  const hZ0 = getTerrainHeight(region, x, z - step);
  const maxD = Math.max(
    Math.abs(hX1 - hC),
    Math.abs(hC - hX0),
    Math.abs(hZ1 - hC),
    Math.abs(hC - hZ0),
  );
  return maxD / step;
}

const target = (
  region: RegionId,
  id: string,
  name: string,
  kind: WorldTarget['kind'],
  x: number,
  z: number,
  description: string,
  opts: { pressurized: boolean; npcVariant?: NpcVariant; layer?: string } = { pressurized: false },
): WorldTarget => ({
  region,
  id,
  name,
  kind,
  position: { x, y: getTerrainHeight(region, x, z), z },
  radius: 3,
  description,
  pressurized: opts.pressurized,
  layer: opts.layer ?? 'interactable',
  ...(opts.npcVariant ? { npcVariant: opts.npcVariant } : {}),
});

/** Spatial baseline in meters, Y up. Walkable routes are >= 1.8 m wide. */
export const REGIONS: Record<RegionId, RegionPlan> = {
  academy: {
    bounds: 17.5,
    pressurized: true,
    spawn: { x: 0, y: 0, z: -10 },
    targets: [
      target(
        'academy',
        'academy-console',
        'Training console',
        'station',
        -5,
        0,
        'Inspect the academy power network.',
        { pressurized: true, npcVariant: 'lia' },
      ),
      target(
        'academy',
        'academy-launch',
        'Orbital trainer',
        'portal',
        0,
        13,
        'Continue to the orbital training cabin.',
        { pressurized: true, npcVariant: 'reyes' },
      ),
    ],
  },
  orbit: {
    bounds: 13.5,
    pressurized: true,
    spawn: { x: 0, y: 0, z: -9 },
    targets: [
      target(
        'orbit',
        'cargo',
        'Drifting cargo',
        'station',
        -4,
        1,
        'Practice approaching cargo in the simplified trainer.',
        { pressurized: true, npcVariant: 'reyes' },
      ),
      target(
        'orbit',
        'lunar-transfer',
        'Lunar transfer',
        'portal',
        0,
        10,
        'Travel to the lunar habitat.',
        { pressurized: true },
      ),
    ],
  },
  habitat: {
    bounds: 29,
    pressurized: false,
    spawn: { x: 0, y: 0, z: -14 },
    targets: [
      target(
        'habitat',
        'battery-bank',
        'Battery bank',
        'station',
        -11,
        0,
        'Inspect stored energy.',
        { pressurized: false, npcVariant: 'lia' },
      ),
      target(
        'habitat',
        'water-recycler',
        'Water recycler',
        'station',
        -5,
        6,
        'Inspect the water loop.',
        { pressurized: false },
      ),
      target(
        'habitat',
        'oxygen-generator',
        'Oxygen generator',
        'station',
        5,
        6,
        'Inspect oxygen production.',
        { pressurized: false },
      ),
      target(
        'habitat',
        'habitat-shelter',
        'Shelter',
        'station',
        11,
        1,
        'Enter the protected habitat.',
        { pressurized: true, npcVariant: 'reyes' },
      ),
      target(
        'habitat',
        'expedition-gate',
        'Expedition gate',
        'portal',
        0,
        23,
        'Set out for the fictional ice canyon.',
        { pressurized: false },
      ),
      target(
        'habitat',
        'mission-console',
        'Mission console',
        'station',
        0,
        -3,
        'Review the mission and local systems.',
        { pressurized: false, npcVariant: 'reyes' },
      ),
      target(
        'habitat',
        'field-locker',
        'Field locker',
        'station',
        -10,
        -8,
        'Inspect the field equipment.',
        { pressurized: false, npcVariant: 'lia' },
      ),
      target(
        'habitat',
        'greenhouse-door',
        'Greenhouse airlock',
        'portal',
        19,
        9,
        'Visit the greenhouse.',
        { pressurized: false, npcVariant: 'elena' },
      ),
    ],
  },
  canyon: {
    bounds: 28,
    pressurized: false,
    spawn: { x: 0, y: 0, z: -20 },
    targets: [
      target(
        'canyon',
        'ice-deposit',
        'Ice prospect',
        'sample',
        -5,
        13,
        'Investigate a fictional training deposit.',
        { pressurized: false },
      ),
      target(
        'canyon',
        'damaged-scout',
        'Damaged Scout',
        'companion',
        7,
        5,
        'Inspect the stranded exploration robot.',
        { pressurized: false },
      ),
      target(
        'canyon',
        'survey-beacon',
        'Survey beacon',
        'station',
        0,
        21,
        'Read the field survey.',
        { pressurized: false },
      ),
      target(
        'canyon',
        'return-gate',
        'Return to habitat',
        'portal',
        0,
        -21,
        'Return to the habitat.',
        { pressurized: false },
      ),
    ],
  },
  greenhouse: {
    bounds: 14.5,
    pressurized: true,
    spawn: { x: 0, y: 0, z: -10 },
    targets: [
      target(
        'greenhouse',
        'crop-bed',
        'Crop bed',
        'station',
        -5,
        3,
        'Inspect the plants and growing medium.',
        { pressurized: true },
      ),
      target(
        'greenhouse',
        'grow-lights',
        'Grow lights',
        'station',
        5,
        3,
        'Inspect the growing lights.',
        { pressurized: true },
      ),
      target(
        'greenhouse',
        'return-habitat',
        'Return airlock',
        'portal',
        0,
        -12,
        'Return to the habitat.',
        { pressurized: true },
      ),
      target(
        'greenhouse',
        'botanist',
        'Botanist',
        'npc',
        0,
        10,
        'Talk about tending the crops.',
        { pressurized: true, npcVariant: 'elena' },
      ),
    ],
  },
};

export const REGION_LINKS: ReadonlyArray<readonly [RegionId, RegionId]> = [
  ['academy', 'orbit'],
  ['orbit', 'habitat'],
  ['habitat', 'canyon'],
  ['habitat', 'greenhouse'],
];

/** Axis-aligned blocking footprints, expanded by the actor radius in movement. */
export const OBSTACLES: Record<RegionId, Obstacle[]> = {
  academy: [
    { x: -5, z: 0, halfX: 0.8, halfZ: 0.5 },
    { x: 3.4, z: 11.2, halfX: 1.2, halfZ: 0.8 }, // Aurora miniature briefing prop
    { x: -12, z: -8, halfX: 1.5, halfZ: 0.65 },
    { x: -12, z: 2, halfX: 1.5, halfZ: 0.65 },
    { x: -12, z: 10, halfX: 1.5, halfZ: 0.65 },
    { x: 12, z: -8, halfX: 1.5, halfZ: 0.65 },
    { x: 12, z: 2, halfX: 1.5, halfZ: 0.65 },
    { x: 12, z: 10, halfX: 1.5, halfZ: 0.65 },
  ],
  orbit: [
    { x: 8, z: -8, halfX: 0.8, halfZ: 0.5 },
    { x: 8, z: -3, halfX: 0.8, halfZ: 0.5 },
    { x: 8, z: 2, halfX: 0.8, halfZ: 0.5 },
    { x: 8, z: 7, halfX: 0.8, halfZ: 0.5 },
    { x: -5.4, z: 1.5, halfX: 0.9, halfZ: 0.9 }, // cargo crate stack
  ],
  habitat: [
    { x: 13, z: 0, halfX: 3, halfZ: 3 },
    // Airlock ramp handrail borders leaving 2.06m clear walkable width at z in [-0.03, 2.03]
    { x: 7.5, z: -0.45, halfX: 2.3, halfZ: 0.12 },
    { x: 7.5, z: 2.45, halfX: 2.3, halfZ: 0.12 },
    { x: 22, z: 10, halfX: 2, halfZ: 2 },
    { x: -11, z: 0, halfX: 0.7, halfZ: 0.7 },
    { x: -5, z: 6, halfX: 0.7, halfZ: 0.7 },
    { x: 5, z: 6, halfX: 0.7, halfZ: 0.7 },
    { x: 0, z: -3, halfX: 0.8, halfZ: 0.5 },
    { x: -10, z: -8, halfX: 1, halfZ: 0.5 },
    { x: -19, z: 15, halfX: 1.3, halfZ: 1.0 },
    { x: -14, z: 15, halfX: 1.3, halfZ: 1.0 },
    { x: -9, z: 15, halfX: 1.3, halfZ: 1.0 },
    { x: 2.4, z: 8.5, halfX: 0.35, halfZ: 0.35 }, // Central fork signpost
    { x: 12.2, z: -10.5, halfX: 1.3, halfZ: 0.8 }, // Cargo sled prop
    { x: -7.5, z: 2.5, halfX: 0.9, halfZ: 0.55 }, // AuxBay pad
    { x: -6.5, z: -6.5, halfX: 0.95, halfZ: 0.55 }, // FieldKit pad
  ],
  canyon: [
    { x: 0, z: 21, halfX: 0.8, halfZ: 0.5 },
    { x: -9.5, z: 20.5, halfX: 2.2, halfZ: 1.8 }, // Field research shelter
    { x: -3.5, z: 20.5, halfX: 0.65, halfZ: 0.5 }, // MOD. COM-03 crate
    { x: 2.4, z: 2.0, halfX: 0.35, halfZ: 0.35 }, // Fork signpost
    { x: 2.4, z: -15.0, halfX: 0.35, halfZ: 0.35 }, // Return signpost
    { x: -8.5, z: 14.5, halfX: 1.4, halfZ: 1.4 }, // Ice alcove rock face
  ],
  greenhouse: [-5, 1, 7].flatMap((z) => [-6, 6].map((x) => ({ x, z, halfX: 1.5, halfZ: 2 }))),
};

export const NPC_PLACEMENTS: Record<RegionId, readonly NpcPlacement[]> = {
  academy: [
    {
      id: 'npc-lia-academy',
      variant: 'lia',
      region: 'academy',
      position: { x: -6.4, y: 0, z: 1.1 },
      heading: Math.PI * 0.72,
      defaultClip: 'Idle',
      targetId: 'academy-console',
    },
    {
      id: 'npc-reyes-academy',
      variant: 'reyes',
      region: 'academy',
      position: { x: 2.1, y: 0, z: 9.8 },
      heading: Math.PI * 0.92,
      defaultClip: 'Idle',
      targetId: 'academy-launch',
    },
    {
      id: 'npc-elena-academy',
      variant: 'elena',
      region: 'academy',
      position: { x: 4.9, y: 0, z: 10.1 },
      heading: -Math.PI * 0.88,
      defaultClip: 'Idle',
    },
  ],
  orbit: [
    {
      id: 'npc-reyes-orbit',
      variant: 'reyes',
      region: 'orbit',
      position: { x: -2.4, y: 0, z: 3.4 },
      heading: Math.PI * 0.85,
      defaultClip: 'Idle',
      targetId: 'cargo',
    },
  ],
  habitat: [
    {
      id: 'npc-reyes-habitat',
      variant: 'reyes',
      region: 'habitat',
      position: { x: 1.6, y: 0, z: -3.1 },
      heading: -Math.PI * 0.72,
      defaultClip: 'Idle',
      targetId: 'mission-console',
    },
    {
      id: 'npc-lia-habitat',
      variant: 'lia',
      region: 'habitat',
      position: { x: -8.8, y: 0, z: -1.4 },
      heading: Math.PI * 0.48,
      defaultClip: 'Idle',
      targetId: 'battery-bank',
    },
  ],
  canyon: [],
  greenhouse: [
    {
      id: 'npc-elena-greenhouse',
      variant: 'elena',
      region: 'greenhouse',
      position: { x: 0, y: 0, z: 10 },
      heading: Math.PI,
      defaultClip: 'Idle',
      targetId: 'botanist',
    },
  ],
};

/**
 * Deterministic no-scatter exclusion masks keeping walkways, portals, ramps,
 * pads, spawns and interactable targets unobstructed.
 */
export const NO_SCATTER_ZONES: Record<RegionId, readonly NoScatterZone[]> = {
  academy: [{ kind: 'rect', x: 0, z: 0, halfX: 14, halfZ: 15 }],
  orbit: [{ kind: 'rect', x: 0, z: 0, halfX: 14, halfZ: 14 }],
  habitat: [
    // Main north-south walkway (-17..25, wide corridor)
    { kind: 'rect', x: 0, z: 4, halfX: 4.2, halfZ: 23.5 },
    // Spawn & landing pad apron
    { kind: 'circle', x: 0, z: -14, radius: 4.5 },
    { kind: 'circle', x: 15, z: -15, radius: 6.5 },
    // Airlock ramp, habitat & greenhouse wing
    { kind: 'rect', x: 11.5, z: 2.5, halfX: 9.5, halfZ: 6.5 },
    { kind: 'circle', x: 21, z: 10, radius: 6.0 },
    // West power/water/locker/solar/pad wing
    { kind: 'rect', x: -10, z: 2, halfX: 10.5, halfZ: 13.5 },
    { kind: 'rect', x: -14, z: 15, halfX: 8.5, halfZ: 3.8 },
    // East sled zone
    { kind: 'circle', x: 12.2, z: -10.5, radius: 3.2 },
  ],
  canyon: [
    // Main canyon corridor
    { kind: 'rect', x: 0, z: 0, halfX: 5.0, halfZ: 26 },
    // Ice prospect & floodlight alcove
    { kind: 'circle', x: -5, z: 13, radius: 5.5 },
    // Damaged Scout & side spur
    { kind: 'circle', x: 7, z: 5, radius: 4.8 },
    // Research shelter & MOD. COM-03
    { kind: 'rect', x: -5.5, z: 20.5, halfX: 7.5, halfZ: 4.5 },
  ],
  greenhouse: [{ kind: 'rect', x: 0, z: 0, halfX: 15, halfZ: 15 }],
};

export function isPointInNoScatter(region: RegionId, x: number, z: number): boolean {
  const plan = REGIONS[region];
  if (Math.hypot(x - plan.spawn.x, z - plan.spawn.z) < 3.6) return true;
  for (const t of plan.targets) {
    if (Math.hypot(x - t.position.x, z - t.position.z) < (t.radius ?? 3) + 1.1) {
      return true;
    }
  }
  for (const obs of OBSTACLES[region]) {
    if (Math.abs(x - obs.x) < obs.halfX + 1.2 && Math.abs(z - obs.z) < obs.halfZ + 1.2) {
      return true;
    }
  }
  for (const ramp of RAMPS[region]) {
    if (
      x >= ramp.xStart - 1.5 &&
      x <= ramp.porchEnd + 1.5 &&
      Math.abs(z - ramp.zCenter) <= ramp.halfWidth + 1.5
    ) {
      return true;
    }
  }
  for (const zone of NO_SCATTER_ZONES[region]) {
    if (zone.kind === 'circle') {
      if (Math.hypot(x - zone.x, z - zone.z) < (zone.radius ?? 2)) return true;
    } else if (
      Math.abs(x - zone.x) < (zone.halfX ?? 2) &&
      Math.abs(z - zone.z) < (zone.halfZ ?? 2)
    ) {
      return true;
    }
  }
  return false;
}

function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Generates deterministic seeded rock scatter outside all walkable paths, ramps,
 * portals, obstacles, and noScatter exclusion masks.
 */
export function generateScatterPlacements(region: RegionId, seed = 4201): ScatterPlacement[] {
  if (region !== 'habitat' && region !== 'canyon') return [];
  const rng = mulberry32(seed + (region === 'canyon' ? 101 : 0));
  const bounds = REGIONS[region].bounds;
  const maxAttempts = region === 'habitat' ? 220 : 180;
  const targetCount = region === 'habitat' ? 64 : 52;
  const items: ScatterPlacement[] = [];

  for (let i = 0; i < maxAttempts && items.length < targetCount; i++) {
    const x = (rng() * 2 - 1) * (bounds + 6);
    const z = (rng() * 2 - 1) * (bounds + 6);
    const rotY = rng() * Math.PI * 2;
    const baseScale = 0.45 + rng() * 1.15;
    const scaleY = baseScale * (0.38 + rng() * 0.35);
    const variant = (i % 3) as 0 | 1 | 2;

    if (isPointInNoScatter(region, x, z)) continue;
    const y = getTerrainHeight(region, x, z) + scaleY * 0.28;
    items.push({
      x: Number(x.toFixed(3)),
      y: Number(y.toFixed(3)),
      z: Number(z.toFixed(3)),
      scaleX: Number(baseScale.toFixed(3)),
      scaleY: Number(scaleY.toFixed(3)),
      scaleZ: Number((baseScale * (0.8 + rng() * 0.4)).toFixed(3)),
      rotY: Number(rotY.toFixed(3)),
      variant,
    });
  }
  return items;
}
