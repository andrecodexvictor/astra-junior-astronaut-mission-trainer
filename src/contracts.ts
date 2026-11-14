/** Shared rendering contracts. Scientific state is owned by src/simulation. */
export type RegionId = 'academy' | 'orbit' | 'habitat' | 'canyon' | 'greenhouse';
export type TargetKind = 'station' | 'portal' | 'sample' | 'companion' | 'npc';
export type NpcVariant = 'reyes' | 'lia' | 'elena';
export type CometaRuntimeMode = 'follow' | 'wait' | 'recall';
export type AuxBayPortType = 'power' | 'water' | 'o2';
export type FieldKitPieceId = 'relay_mast' | 'thermal_shield' | 'sensor_pylon';
export type CharacterActorId = 'astronaut' | 'human-npc' | 'pip' | 'scout' | 'cometa';

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface WorldTarget {
  id: string;
  name: string;
  description: string;
  kind: TargetKind;
  region: RegionId;
  position: Vec3;
  radius?: number;
  pressurized?: boolean;
  layer?: string;
  npcVariant?: NpcVariant;
}

export interface PlayerPose {
  region: RegionId;
  position: Vec3;
  heading: number;
}

export interface CadetAppearance {
  suitAccent: 'orange' | 'cyan' | 'emerald' | 'cobalt' | (string & {});
  visorTone: 'gold' | 'cyan' | 'slate' | (string & {});
  skinTone: 'fair' | 'light' | 'medium' | 'tan' | 'deep' | (string & {});
}

export interface CometaRuntimeState {
  enabled: boolean;
  mode: CometaRuntimeMode;
  region: RegionId;
  safePos: Vec3;
  heading: number;
  targetId?: string;
  safeTargetId?: string;
  pressurized?: boolean;
  lastCue?: 'pet' | 'sniff' | 'beacon' | 'watch_repair' | null;
}

export interface CharacterAnimState {
  actorId: CharacterActorId | (string & {});
  clip: string;
  loop?: boolean;
  speed?: number;
  blendSeconds?: number;
  paused?: boolean;
}

export interface AuxVisualState {
  ports: Record<AuxBayPortType, boolean>;
  fieldKitSlots: Array<FieldKitPieceId | null>;
  auxSolarKw?: number;
  stormShieldActive?: boolean;
  telemetryRangeM?: number;
}

export interface WorldMetrics {
  engine: string;
  fps: number;
  meshes: number;
  activeMeshes: number;
  drawCalls: number;
  region: RegionId;
  frameTimeMs?: number;
  p95FrameTimeMs?: number;
  triangles?: number;
}

export interface WorldCallbacks {
  onTarget(target: WorldTarget | null): void;
  onInteract(target: WorldTarget): void;
  onRegion(region: RegionId): void;
  onMetrics(metrics: WorldMetrics): void;
  onError(message: string): void;
  onCargoReached?(): void;
}

export interface GameWorld {
  changeRegion(region: RegionId, pose?: PlayerPose): Promise<void>;
  setPaused(value: boolean): void;
  setQuality(value: 'high' | 'low'): void;
  setReducedMotion(value: boolean): void;
  setInput(input: Partial<{ x: number; z: number; jump: boolean; sprint: boolean }>): void;
  setCompanionRecruited(value: boolean): void;
  interact(): void;
  getPose(): PlayerPose;
  dispose(): void;
  setCometaState?(state: CometaRuntimeState): void;
  triggerActorClip?(anim: CharacterAnimState): void;
  setCadetAppearance?(appearance: CadetAppearance): void;
  setAuxVisualState?(state: AuxVisualState): void;
  getTelemetryMetrics?(): WorldMetrics;
}
