import type { PlayerPose, RegionId } from '../contracts';
import { createGame, normalizeGame, type GameState } from '../simulation';
export const SAVE_KEY = 'astra-independent-demo-v3';
export interface Settings { quality: 'high' | 'low'; reducedMotion: boolean; largeText: boolean; speed: 1 | 3 }
export interface Snapshot { simulation: GameState; pose?: PlayerPose }
export interface SaveFile { version: 3; current: Snapshot; checkpoint: Snapshot; settings: Settings }
export const defaultSettings: Settings = { quality: 'high', reducedMotion: false, largeText: false, speed: 1 };
export function snapshot(simulation: GameState, pose?: PlayerPose): Snapshot {return structuredClone({simulation, ...(pose ? {pose}: {})});}
export function newSave(): SaveFile { const s=snapshot(createGame()); return {version:3,current:s,checkpoint:structuredClone(s),settings:{...defaultSettings}}; }
function readSnapshot(value: unknown): Snapshot {
 if(!value || typeof value!=='object') throw Error('Checkpoint ausente.');
 const v=value as Snapshot, simulation=normalizeGame(v.simulation); let pose: PlayerPose | undefined;
 if(v.pose && v.pose.region===simulation.region && v.pose.position && [v.pose.position.x,v.pose.position.y,v.pose.position.z,v.pose.heading].every(Number.isFinite) && Math.abs(v.pose.position.x)<100 && Math.abs(v.pose.position.z)<100) pose=structuredClone(v.pose);
 const phases: Record<string, RegionId[]>={academy:['academy'],orbit:['orbit'],lunar:['habitat','canyon','greenhouse'],complete:['habitat','greenhouse'],failed:['habitat','canyon','greenhouse']};
 if(!phases[simulation.phase]?.includes(simulation.region))throw Error('Região incompatível com a campanha.');
 return {simulation,...(pose?{pose}:{})};
}
export function decodeSave(raw: string): SaveFile {
 const v=JSON.parse(raw) as SaveFile; if(!v || v.version!==3)throw Error('Versão de save incompatível.');
 const settings={...defaultSettings}; if(v.settings){settings.quality=v.settings.quality==='low'?'low':'high';settings.reducedMotion=v.settings.reducedMotion===true;settings.largeText=v.settings.largeText===true;settings.speed=v.settings.speed===3?3:1;}
 return {version:3,current:readSnapshot(v.current),checkpoint:readSnapshot(v.checkpoint),settings};
}
