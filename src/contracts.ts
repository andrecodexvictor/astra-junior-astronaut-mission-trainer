/** Shared rendering contracts. Scientific state is owned by src/simulation. */
export type RegionId = 'academy' | 'orbit' | 'habitat' | 'canyon' | 'greenhouse';
export type TargetKind = 'station' | 'portal' | 'sample' | 'companion' | 'npc';
export interface Vec3 { x: number; y: number; z: number }
export interface WorldTarget { id: string; name: string; description: string; kind: TargetKind; region: RegionId; position: Vec3; radius?: number }
export interface PlayerPose { region: RegionId; position: Vec3; heading: number }
export interface WorldMetrics { engine: string; fps: number; meshes: number; activeMeshes: number; drawCalls: number; region: RegionId }
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
 setInput(input: Partial<{x: number; z: number; jump: boolean; sprint: boolean}>): void;
 setCompanionRecruited(value: boolean): void;
 interact(): void;
 getPose(): PlayerPose;
 dispose(): void;
}
