import type {
  CadetAppearance,
  CometaRuntimeMode,
  PlayerPose,
  RegionId,
  Vec3,
} from '../contracts';
import {
  createGame,
  migrateSimulationState,
  normalizeGame,
  type GameState,
} from '../simulation';

export const SAVE_KEY = 'astra-independent-demo-v4';
export const LEGACY_SAVE_KEYS = [
  'astra-independent-demo-v3',
  'astra-independent-demo-v2',
  'astra-independent-demo-v1',
] as const;

export interface Settings {
  quality: 'high' | 'low';
  reducedMotion: boolean;
  largeText: boolean;
  speed: 1 | 3;
}

export interface UiPrefs {
  captionsAlwaysOn: boolean;
  dialogueAutoAdvance: boolean;
  showControlHints: boolean;
  compactHud: boolean;
}

export interface CometaSavePersistence {
  enabled: boolean;
  region: RegionId;
  safePos: Vec3;
  heading: number;
  mode: CometaRuntimeMode;
  targetId?: string;
}

export interface Snapshot {
  simulation: GameState;
  pose?: PlayerPose;
  cometa?: CometaSavePersistence;
}

export interface SaveFile {
  version: 4;
  current: Snapshot;
  checkpoint: Snapshot;
  settings: Settings;
  cadetAppearance: CadetAppearance;
  cometa: CometaSavePersistence;
  uiPrefs: UiPrefs;
}

export const defaultSettings: Settings = {
  quality: 'high',
  reducedMotion: false,
  largeText: false,
  speed: 1,
};

export const defaultCadetAppearance: CadetAppearance = {
  suitAccent: 'orange',
  visorTone: 'gold',
  skinTone: 'medium',
};

export const defaultUiPrefs: UiPrefs = {
  captionsAlwaysOn: true,
  dialogueAutoAdvance: false,
  showControlHints: true,
  compactHud: false,
};

const VALID_REGIONS: readonly RegionId[] = ['academy', 'orbit', 'habitat', 'canyon', 'greenhouse'];

const SAFE_COMETA_ANCHORS: Record<RegionId, { pos: Vec3; targetId: string }> = {
  academy: { pos: { x: 1.5, y: 0, z: -10 }, targetId: 'academy-console' },
  orbit: { pos: { x: 1.5, y: 0, z: -9 }, targetId: 'cargo' },
  habitat: { pos: { x: 1.5, y: 0, z: -12 }, targetId: 'mission-console' },
  canyon: { pos: { x: 1.5, y: 0, z: -18 }, targetId: 'return-gate' },
  greenhouse: { pos: { x: 1.5, y: 0, z: -9 }, targetId: 'return-habitat' },
};

function sanitizeAppearance(raw: unknown): CadetAppearance {
  if (!raw || typeof raw !== 'object') return { ...defaultCadetAppearance };
  const a = raw as Partial<CadetAppearance>;
  const validToken = (v: unknown, fallback: string) =>
    typeof v === 'string' && v.trim().length > 0 && v.length <= 32 ? v.trim() : fallback;
  return {
    suitAccent: validToken(a.suitAccent, defaultCadetAppearance.suitAccent),
    visorTone: validToken(a.visorTone, defaultCadetAppearance.visorTone),
    skinTone: validToken(a.skinTone, defaultCadetAppearance.skinTone),
  };
}

function sanitizeSettings(raw: unknown): Settings {
  const s = (raw && typeof raw === 'object' ? raw : {}) as Partial<Settings>;
  return {
    quality: s.quality === 'low' ? 'low' : 'high',
    reducedMotion: s.reducedMotion === true,
    largeText: s.largeText === true,
    speed: s.speed === 3 ? 3 : 1,
  };
}

function sanitizeUiPrefs(raw: unknown): UiPrefs {
  const p = (raw && typeof raw === 'object' ? raw : {}) as Partial<UiPrefs>;
  return {
    captionsAlwaysOn: p.captionsAlwaysOn !== false,
    dialogueAutoAdvance: p.dialogueAutoAdvance === true,
    showControlHints: p.showControlHints !== false,
    compactHud: p.compactHud === true,
  };
}

function sanitizeCometa(raw: unknown, sim: GameState): CometaSavePersistence {
  const src = (raw && typeof raw === 'object' ? raw : sim.cometa) as Partial<CometaSavePersistence>;
  const region: RegionId = VALID_REGIONS.includes(src.region as RegionId)
    ? (src.region as RegionId)
    : sim.cometa.region;
  const fallbackAnchor = SAFE_COMETA_ANCHORS[region];
  const rawPos = src.safePos;
  const validPos =
    rawPos &&
    typeof rawPos === 'object' &&
    [rawPos.x, rawPos.y, rawPos.z].every((n) => typeof n === 'number' && Number.isFinite(n)) &&
    Math.abs(rawPos.x) < 100 &&
    Math.abs(rawPos.z) < 100;
  const safePos: Vec3 = validPos
    ? { x: rawPos.x, y: rawPos.y, z: rawPos.z }
    : { ...fallbackAnchor.pos };
  const mode: CometaRuntimeMode =
    src.mode === 'follow' || src.mode === 'wait' || src.mode === 'recall'
      ? src.mode
      : sim.cometa.mode;
  const heading =
    typeof src.heading === 'number' && Number.isFinite(src.heading) ? src.heading : sim.cometa.heading;
  const targetId =
    typeof src.targetId === 'string' && src.targetId.trim()
      ? src.targetId.trim()
      : sim.cometa.safeTargetId || fallbackAnchor.targetId;
  const enabled = typeof src.enabled === 'boolean' ? src.enabled : sim.cometa.enabled;

  return {
    enabled,
    region,
    safePos,
    heading,
    mode,
    targetId,
  };
}

export function snapshot(
  simulation: GameState,
  pose?: PlayerPose,
  cometa?: Partial<CometaSavePersistence>,
): Snapshot {
  const cometaState = sanitizeCometa(cometa ?? simulation.cometa, simulation);
  return structuredClone({
    simulation,
    ...(pose ? { pose } : {}),
    cometa: cometaState,
  });
}

export function newSave(
  options: {
    seed?: number;
    cadetAppearance?: Partial<CadetAppearance>;
    cometaEnabled?: boolean;
  } = {},
): SaveFile {
  const game = createGame({ seed: options.seed });
  if (typeof options.cometaEnabled === 'boolean') {
    game.cometa.enabled = options.cometaEnabled;
    if (!options.cometaEnabled) game.cometa.mode = 'wait';
  }
  const baseSnap = snapshot(game);
  return {
    version: 4,
    current: baseSnap,
    checkpoint: structuredClone(baseSnap),
    settings: { ...defaultSettings },
    cadetAppearance: sanitizeAppearance(options.cadetAppearance),
    cometa: structuredClone(baseSnap.cometa!),
    uiPrefs: { ...defaultUiPrefs },
  };
}

function readSnapshot(value: unknown): Snapshot {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Checkpoint ausente.');
  }
  const v = value as { simulation?: unknown; pose?: PlayerPose; cometa?: unknown };
  const simulation = migrateSimulationState(v.simulation);
  let pose: PlayerPose | undefined;
  if (
    v.pose &&
    v.pose.region === simulation.region &&
    v.pose.position &&
    [v.pose.position.x, v.pose.position.y, v.pose.position.z, v.pose.heading].every(Number.isFinite) &&
    Math.abs(v.pose.position.x) < 100 &&
    Math.abs(v.pose.position.z) < 100
  ) {
    pose = structuredClone(v.pose);
  }
  const phases: Record<string, RegionId[]> = {
    academy: ['academy'],
    orbit: ['orbit'],
    lunar: ['habitat', 'canyon', 'greenhouse'],
    complete: ['habitat', 'greenhouse'],
    failed: ['habitat', 'canyon', 'greenhouse'],
  };
  if (!phases[simulation.phase]?.includes(simulation.region)) {
    throw new Error('Região incompatível com a campanha.');
  }
  const cometa = sanitizeCometa(v.cometa, simulation);
  // Keep simulation.cometa reconciled with persisted cometa without inventing resources or events.
  simulation.cometa.enabled = cometa.enabled;
  simulation.cometa.mode = cometa.mode;
  simulation.cometa.region = cometa.region;
  simulation.cometa.safePos = { ...cometa.safePos };
  simulation.cometa.heading = cometa.heading;
  if (cometa.targetId) {
    simulation.cometa.safeTargetId = cometa.targetId;
  }
  normalizeGame(simulation);
  return {
    simulation,
    ...(pose ? { pose } : {}),
    cometa,
  };
}

function migrateV1ToV2(raw: Record<string, unknown>): Record<string, unknown> {
  // v1 saves could either wrap `{ current, checkpoint, settings }` or hold a top-level `{ simulation, pose }`.
  const current =
    raw.current && typeof raw.current === 'object'
      ? raw.current
      : {
          simulation: raw.simulation,
          ...(raw.pose ? { pose: raw.pose } : {}),
        };
  const checkpoint =
    raw.checkpoint && typeof raw.checkpoint === 'object' ? raw.checkpoint : structuredClone(current);
  return {
    version: 2,
    current,
    checkpoint,
    settings: sanitizeSettings(raw.settings),
  };
}

function migrateV2ToV3(raw: Record<string, unknown>): Record<string, unknown> {
  return {
    version: 3,
    current: raw.current,
    checkpoint: raw.checkpoint ?? structuredClone(raw.current),
    settings: sanitizeSettings(raw.settings),
  };
}

function migrateV3ToV4(raw: Record<string, unknown>): Record<string, unknown> {
  return {
    version: 4,
    current: raw.current,
    checkpoint: raw.checkpoint,
    settings: sanitizeSettings(raw.settings),
    cadetAppearance: sanitizeAppearance(raw.cadetAppearance),
    cometa: raw.cometa,
    uiPrefs: sanitizeUiPrefs(raw.uiPrefs),
  };
}

export function decodeSave(raw: string): SaveFile {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('Arquivo de save corrompido (JSON inválido).');
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Formato de save inválido.');
  }
  let data = parsed as Record<string, unknown>;
  const version = data.version;
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) {
    throw new Error('Versão de save incompatível.');
  }
  if (version > 4) {
    throw new Error('Save criado por uma versão mais recente e não suportada.');
  }
  let v = version;
  if (v === 1) {
    data = migrateV1ToV2(data);
    v = 2;
  }
  if (v === 2) {
    data = migrateV2ToV3(data);
    v = 3;
  }
  if (v === 3) {
    data = migrateV3ToV4(data);
    v = 4;
  }

  const current = readSnapshot(data.current);
  const checkpoint = readSnapshot(data.checkpoint);
  const settings = sanitizeSettings(data.settings);
  const cadetAppearance = sanitizeAppearance(data.cadetAppearance);
  const uiPrefs = sanitizeUiPrefs(data.uiPrefs);
  const cometa = sanitizeCometa(data.cometa ?? current.cometa, current.simulation);

  // Ensure top-level cometa and current.cometa stay consistent on load.
  current.cometa = structuredClone(cometa);
  current.simulation.cometa.enabled = cometa.enabled;
  current.simulation.cometa.mode = cometa.mode;
  current.simulation.cometa.region = cometa.region;
  current.simulation.cometa.safePos = { ...cometa.safePos };
  current.simulation.cometa.heading = cometa.heading;
  if (cometa.targetId) {
    current.simulation.cometa.safeTargetId = cometa.targetId;
  }
  normalizeGame(current.simulation);

  return {
    version: 4,
    current,
    checkpoint,
    settings,
    cadetAppearance,
    cometa,
    uiPrefs,
  };
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export type LoadSaveResult =
  | { ok: true; file: SaveFile; keyUsed: string; migratedFromVersion?: number }
  | { ok: false; reason: 'missing' | 'corrupted' | 'blocked'; message: string };

export type PersistSaveResult =
  | { ok: true }
  | { ok: false; reason: 'blocked'; message: string };

function defaultStorage(): StorageLike | undefined {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : undefined;
  } catch {
    return undefined;
  }
}

export function loadSavedFile(storage: StorageLike | undefined = defaultStorage()): LoadSaveResult {
  if (!storage) {
    return {
      ok: false,
      reason: 'blocked',
      message: 'O armazenamento local está indisponível ou bloqueado neste navegador.',
    };
  }
  const keysToTry = [SAVE_KEY, ...LEGACY_SAVE_KEYS];
  let hadCorrupted = false;
  for (const key of keysToTry) {
    let raw: string | null = null;
    try {
      raw = storage.getItem(key);
    } catch {
      return {
        ok: false,
        reason: 'blocked',
        message: 'O navegador bloqueou o acesso ao armazenamento local.',
      };
    }
    if (!raw) continue;
    try {
      const parsedVersion = (JSON.parse(raw) as { version?: unknown })?.version;
      const file = decodeSave(raw);
      return {
        ok: true,
        file,
        keyUsed: key,
        ...(typeof parsedVersion === 'number' && parsedVersion < 4
          ? { migratedFromVersion: parsedVersion }
          : {}),
      };
    } catch {
      hadCorrupted = true;
    }
  }
  if (hadCorrupted) {
    return {
      ok: false,
      reason: 'corrupted',
      message: 'O save anterior está corrompido ou incompatível. Uma nova expedição está disponível.',
    };
  }
  return {
    ok: false,
    reason: 'missing',
    message: 'Nenhum salvamento anterior encontrado.',
  };
}

export function persistSavedFile(
  file: SaveFile,
  storage: StorageLike | undefined = defaultStorage(),
): PersistSaveResult {
  if (!storage) {
    return {
      ok: false,
      reason: 'blocked',
      message: 'O navegador bloqueou o salvamento local. Sua sessão continua apenas em memória.',
    };
  }
  try {
    storage.setItem(SAVE_KEY, JSON.stringify(file));
    return { ok: true };
  } catch {
    return {
      ok: false,
      reason: 'blocked',
      message: 'O navegador bloqueou a gravação do save local. Sua sessão continua apenas em memória.',
    };
  }
}
