import type {
  AuxBayPortType,
  CometaRuntimeMode,
  FieldKitPieceId,
  RegionId,
  Vec3,
} from '../contracts';

/**
 * One real simulation second is 0.01 mission hours. All rates below use mission hours.
 * Crew consumption rates represent a didactic crew aggregate (explicitly including optional
 * Cometa when active; no separate per-actor veterinary metabolic model is claimed).
 */
export type Phase = 'academy' | 'orbit' | 'lunar' | 'complete' | 'failed';

export type Action =
  | 'diagnoseAcademy'
  | 'shedLoad'
  | 'chooseAcademyLoad'
  | 'finishAcademy'
  | 'collectCargo'
  | 'land'
  | 'repairPower'
  | 'repairWater'
  | 'repairOxygen'
  | 'toggleRecycler'
  | 'toggleOxygen'
  | 'plantCrop'
  | 'chooseCropStrategy'
  | 'toggleCrop'
  | 'collectSample'
  | 'repairCompanion'
  | 'recruitCompanion'
  | 'dispatchScoutScan'
  | 'rechargeScout'
  | 'deliverSample'
  | 'shelter'
  | 'exitShelter'
  | 'harvest'
  | 'scanSolar'
  | 'scanWater'
  | 'launchExpedition'
  | 'returnExpedition'
  | 'chooseLoadout'
  | 'travel'
  | 'inspectEvidence'
  | 'runFieldProbe'
  | 'classifyDiscovery'
  | 'deferDiscovery'
  | 'toggleCometa'
  | 'setCometaMode'
  | 'petCometa'
  | 'cometaSniff'
  | 'cometaLookBeacon'
  | 'advanceBeat'
  | 'recordDialogueTone'
  | 'installAuxPort'
  | 'removeAuxPort'
  | 'installFieldKitPiece'
  | 'removeFieldKitPiece'
  | 'undoFieldKit';

export type DiscoveryId = 'com03_unplugged_cable' | 'canyon_ice_strata' | 'solar_dust_attenuation';
export type DiscoveryStatus =
  | 'unavailable'
  | 'detectable'
  | 'observed'
  | 'investigating'
  | 'resolved'
  | 'deferred';
export type DiscoveryClassification = 'fictional_abstraction' | 'verified_telemetry';

export type BeatId =
  | 'arrival'
  | 'trial'
  | 'transit'
  | 'aurora'
  | 'prepare'
  | 'trace'
  | 'scout'
  | 'warning'
  | 'harvest'
  | 'home';

export const BEAT_IDS: readonly BeatId[] = [
  'arrival',
  'trial',
  'transit',
  'aurora',
  'prepare',
  'trace',
  'scout',
  'warning',
  'harvest',
  'home',
] as const;

export const CARGO_CAPACITY_KG = 45;
export const LOADOUT_CAPACITY_KG = 18;
export const FIELD_KIT_SLOTS = 3;
export const FIELD_KIT_COST_KWH = 0.2;
export const AUX_PORT_INSTALL_KWH = 0.15;

export interface CargoCatalogItem {
  id: string;
  massKg: number;
  essential: boolean;
}

export const ORBIT_CARGO_ITEMS: Record<string, CargoCatalogItem> = {
  solar_cells: { id: 'solar_cells', massKg: 14, essential: true },
  water_filter: { id: 'water_filter', massKg: 12, essential: true },
  tool_spares: { id: 'tool_spares', massKg: 10, essential: true },
  seed_pack: { id: 'seed_pack', massKg: 4, essential: true },
  heavy_ballast: { id: 'heavy_ballast', massKg: 20, essential: false },
};
export const DEFAULT_CARGO_IDS = ['solar_cells', 'water_filter', 'tool_spares', 'seed_pack'] as const;

export const FIELD_LOCKER_ITEMS: Record<string, CargoCatalogItem> = {
  diagnostic_multimeter: { id: 'diagnostic_multimeter', massKg: 4, essential: true },
  ice_corer: { id: 'ice_corer', massKg: 6, essential: true },
  repair_kit: { id: 'repair_kit', massKg: 5, essential: true },
  thermal_blanket: { id: 'thermal_blanket', massKg: 3, essential: false },
  auxiliary_drill: { id: 'auxiliary_drill', massKg: 8, essential: false },
};
export const DEFAULT_LOADOUT_IDS = ['diagnostic_multimeter', 'ice_corer', 'repair_kit'] as const;

export const AUX_BAY_PORTS: readonly AuxBayPortType[] = ['power', 'water', 'o2'] as const;
export const FIELD_KIT_PIECES: readonly FieldKitPieceId[] = [
  'relay_mast',
  'thermal_shield',
  'sensor_pylon',
] as const;

export interface DiscoveryEntry {
  id: DiscoveryId;
  status: DiscoveryStatus;
  region: RegionId;
  sourceKind: DiscoveryClassification;
  hypothesis: string;
  telemetrySummary: string;
  classificationSubmitted?: DiscoveryClassification;
}

export interface CometaSimState {
  enabled: boolean;
  mode: CometaRuntimeMode;
  region: RegionId;
  safePos: Vec3;
  heading: number;
  safeTargetId: string;
  petCount: number;
  sniffCount: number;
  beaconLookCount: number;
  lifeSupportModel: 'crew_aggregate_didactic';
}

export interface AuxBayState {
  ports: Record<AuxBayPortType, boolean>;
  installedCount: number;
}

export interface FieldKitState {
  slots: Array<FieldKitPieceId | null>;
  stock: Record<FieldKitPieceId, number>;
  lastPlacedSlot: number | null;
  escrowKwh: number;
}

export interface DialogueHistoryEntry {
  tick: number;
  beatId: BeatId;
  speaker: string;
  line: string;
  choiceLabel?: string;
}

export interface EpisodeChoices {
  academyLoad: 'undecided' | 'shed' | 'keep_secondary';
  cropTiming: 'undecided' | 'early_plant' | 'deferred_plant';
  tone: Record<string, string>;
}

export interface EpisodeState {
  currentBeatId: BeatId;
  visitedBeats: BeatId[];
  skippedBeats: BeatId[];
  choices: EpisodeChoices;
  dialogueHistory: DialogueHistoryEntry[];
}

export interface Resources {
  battery: number;
  potable: number;
  wastewater: number;
  oxygen: number;
  hydrogen: number;
  food: number;
  ice: number;
  samples: number;
  deliveredIce: number;
  processedIce: number;
  crewWaterConsumed: number;
  crewOxygenConsumed: number;
  crewFoodConsumed: number;
  waterElectrolysed: number;
  generatedOxygen: number;
  generatedHydrogen: number;
  energyGenerated: number;
  energyUsed: number;
  energyCurtailed: number;
  chargeLoss: number;
  dischargeLoss: number;
  energyLossKwh: number;
  recyclerLoss: number;
  cropWater: number;
  companionBattery: number;
  parts: number;
}

export interface Module {
  integrity: number;
  connected: boolean;
  enabled: boolean;
  repairRemaining: number;
}

export interface Flags {
  diagnosed: boolean;
  loadShed: boolean;
  academyStableTicks: number;
  cargo: boolean;
  landed: boolean;
  planted: boolean;
  harvested: boolean;
  scoutRepaired: boolean;
  scoutRecruited: boolean;
  scoutStrandedOutOfCharge: boolean;
  sampleDelivered: boolean;
  stormSurvived: boolean;
  sheltered: boolean;
  loadout: boolean;
  expedition: boolean;
  solarScanned: boolean;
  waterScanned: boolean;
}

export interface GameState {
  version: 3;
  seed: number;
  tick: number;
  remainder: number;
  phase: Phase;
  region: RegionId;
  lunarTick: number;
  orbitAssisted: boolean;
  cargoCapacityKg: number;
  cargoMassKg: number;
  selectedCargoIds: string[];
  loadoutCapacityKg: number;
  loadoutMassKg: number;
  selectedLoadoutIds: string[];
  academyGenerationKw: number;
  academyDemandKw: number;
  resources: Resources;
  modules: { power: Module; water: Module; oxygen: Module; crop: Module };
  flags: Flags;
  academyBattery: number;
  cropGrowth: number;
  scoutRepairRemaining: number;
  sampleProcessingRemaining: number;
  scoutScans: number;
  pipBattery: number;
  pipTelemetryRangeM: number;
  discoveryXp: number;
  storm: 'clear' | 'warning' | 'active';
  health: number;
  powerSupply: number;
  powerDemand: number;
  blackouts: number;
  cometa: CometaSimState;
  auxBay: AuxBayState;
  fieldKit: FieldKitState;
  discoveries: Record<DiscoveryId, DiscoveryEntry>;
  episode: EpisodeState;
  log: Evidence[];
  awarded: string[];
}

export interface Evidence {
  tick: number;
  kind: string;
  text: string;
  before?: number;
  after?: number;
  unit?: string;
}

export interface Objective {
  id: string;
  title: string;
  description: string;
  targetWorldId: string;
  complete: boolean;
}

export interface ActionResult {
  state: GameState;
  ok: boolean;
  message: string;
  events: string[];
}

const REGION_SAFE_ANCHORS: Record<RegionId, { targetId: string; pos: Vec3 }> = {
  academy: { targetId: 'academy-console', pos: { x: 1.5, y: 0, z: -10 } },
  orbit: { targetId: 'cargo', pos: { x: 1.5, y: 0, z: -9 } },
  habitat: { targetId: 'mission-console', pos: { x: 1.5, y: 0, z: -12 } },
  canyon: { targetId: 'return-gate', pos: { x: 1.5, y: 0, z: -18 } },
  greenhouse: { targetId: 'return-habitat', pos: { x: 1.5, y: 0, z: -9 } },
};

const REGION_BEACONS: Record<RegionId, string> = {
  academy: 'academy-console',
  orbit: 'cargo',
  habitat: 'mission-console',
  canyon: 'survey-beacon',
  greenhouse: 'crop-bed',
};

const REGION_LABELS_PT: Record<RegionId, string> = {
  academy: 'Academia Terra',
  orbit: 'Treinador orbital',
  habitat: 'Base Aurora',
  canyon: 'Cânion de gelo',
  greenhouse: 'Jardim de Elena',
};

const STORM_LABELS_PT: Record<GameState['storm'], string> = {
  clear: 'limpa',
  warning: 'alerta',
  active: 'ativa',
};

const SCOUT_TARGET_LABELS_PT: Record<'beacon' | 'ice' | 'solar', string> = {
  beacon: 'marco de pesquisa',
  ice: 'depósito de gelo',
  solar: 'fluxo solar',
};

const DISCOVERY_CLASS_LABELS_PT: Record<DiscoveryClassification, string> = {
  fictional_abstraction: 'abstração ficcional',
  verified_telemetry: 'telemetria medida',
};

const AUX_PORT_LABELS_PT: Record<AuxBayPortType, string> = {
  power: 'energia',
  water: 'água',
  o2: 'oxigênio',
};

const AUX_PORT_PARENT_LABELS_PT: Record<AuxBayPortType, string> = {
  power: 'rede elétrica',
  water: 'reciclador de água',
  o2: 'gerador de oxigênio',
};

const FIELD_KIT_LABELS_PT: Record<FieldKitPieceId, string> = {
  relay_mast: 'mastro retransmissor',
  thermal_shield: 'escudo térmico',
  sensor_pylon: 'torre de sensores',
};

const TARGET_LABELS_PT: Record<string, string> = {
  'academy-console': 'simulador de energia',
  'academy-launch': 'embarque orbital',
  cargo: 'carga à deriva',
  'lunar-transfer': 'descida lunar',
  'battery-bank': 'rede elétrica',
  'water-recycler': 'reciclador de água',
  'oxygen-generator': 'gerador de oxigênio',
  'habitat-shelter': 'abrigo de regolito',
  'expedition-gate': 'trilha do cânion',
  'mission-console': 'central da missão',
  'field-locker': 'armário de campo',
  'greenhouse-door': 'eclusa da estufa',
  'ice-deposit': 'depósito de gelo',
  'damaged-scout': 'Scout avariado',
  'survey-beacon': 'marco de pesquisa',
  'return-gate': 'retorno à base',
  'crop-bed': 'canteiro hidropônico',
  'grow-lights': 'luzes de cultivo',
  'return-habitat': 'retorno à base',
  botanist: 'Elena',
};

const DISCOVERY_META: Record<
  DiscoveryId,
  { region: RegionId; sourceKind: DiscoveryClassification; label: string }
> = {
  com03_unplugged_cable: {
    region: 'canyon',
    sourceKind: 'fictional_abstraction',
    label: 'Cabo solto no módulo COM-03',
  },
  canyon_ice_strata: {
    region: 'canyon',
    sourceKind: 'fictional_abstraction',
    label: 'Estratos de gelo no cânion',
  },
  solar_dust_attenuation: {
    region: 'habitat',
    sourceKind: 'verified_telemetry',
    label: 'Atenuação solar na tempestade',
  },
};

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;
const moduleState = (integrity: number, connected: boolean, enabled = true): Module => ({
  integrity,
  connected,
  enabled,
  repairRemaining: 0,
});
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const fmtPt = (n: number, decimals = 2) => n.toFixed(decimals).replace('.', ',');
const addLog = (
  s: GameState,
  kind: string,
  text: string,
  before?: number,
  after?: number,
  unit?: string,
) => {
  s.log.push({
    tick: s.tick,
    kind,
    text,
    ...(before === undefined ? {} : { before, after, unit }),
  });
  if (s.log.length > 100) s.log.shift();
};

const createInitialDiscoveries = (): Record<DiscoveryId, DiscoveryEntry> => ({
  com03_unplugged_cable: {
    id: 'com03_unplugged_cable',
    status: 'unavailable',
    region: 'canyon',
    sourceKind: 'fictional_abstraction',
    hypothesis: '',
    telemetrySummary: '',
  },
  canyon_ice_strata: {
    id: 'canyon_ice_strata',
    status: 'unavailable',
    region: 'canyon',
    sourceKind: 'fictional_abstraction',
    hypothesis: '',
    telemetrySummary: '',
  },
  solar_dust_attenuation: {
    id: 'solar_dust_attenuation',
    status: 'unavailable',
    region: 'habitat',
    sourceKind: 'verified_telemetry',
    hypothesis: '',
    telemetrySummary: '',
  },
});

export function createGame(options: { seed?: number } = {}): GameState {
  return {
    version: 3,
    seed: Number.isFinite(options.seed) ? Math.floor(options.seed!) : 42,
    tick: 0,
    remainder: 0,
    phase: 'academy',
    region: 'academy',
    lunarTick: 0,
    orbitAssisted: true,
    cargoCapacityKg: CARGO_CAPACITY_KG,
    cargoMassKg: 0,
    selectedCargoIds: [],
    loadoutCapacityKg: LOADOUT_CAPACITY_KG,
    loadoutMassKg: 0,
    selectedLoadoutIds: [],
    academyGenerationKw: 20,
    academyDemandKw: 38,
    resources: {
      battery: 8,
      potable: 5,
      wastewater: 2,
      oxygen: 0.5,
      hydrogen: 0,
      food: 3,
      ice: 8,
      samples: 0,
      deliveredIce: 0,
      processedIce: 0,
      crewWaterConsumed: 0,
      crewOxygenConsumed: 0,
      crewFoodConsumed: 0,
      waterElectrolysed: 0,
      generatedOxygen: 0,
      generatedHydrogen: 0,
      energyGenerated: 0,
      energyUsed: 0,
      energyCurtailed: 0,
      chargeLoss: 0,
      dischargeLoss: 0,
      energyLossKwh: 0,
      recyclerLoss: 0,
      cropWater: 0,
      companionBattery: 2,
      parts: 2,
    },
    modules: {
      power: moduleState(0.35, false),
      water: moduleState(0.25, false),
      oxygen: moduleState(0.25, false),
      crop: moduleState(1, true, false),
    },
    flags: {
      diagnosed: false,
      loadShed: false,
      academyStableTicks: 0,
      cargo: false,
      landed: false,
      planted: false,
      harvested: false,
      scoutRepaired: false,
      scoutRecruited: false,
      scoutStrandedOutOfCharge: false,
      sampleDelivered: false,
      stormSurvived: false,
      sheltered: false,
      loadout: false,
      expedition: false,
      solarScanned: false,
      waterScanned: false,
    },
    academyBattery: 6,
    cropGrowth: 0,
    scoutRepairRemaining: 0,
    sampleProcessingRemaining: 0,
    scoutScans: 0,
    pipBattery: 1.5,
    pipTelemetryRangeM: 35,
    discoveryXp: 0,
    storm: 'clear',
    health: 100,
    powerSupply: 0,
    powerDemand: 0,
    blackouts: 0,
    cometa: {
      enabled: true,
      mode: 'follow',
      region: 'academy',
      safePos: { ...REGION_SAFE_ANCHORS.academy.pos },
      heading: 0,
      safeTargetId: REGION_SAFE_ANCHORS.academy.targetId,
      petCount: 0,
      sniffCount: 0,
      beaconLookCount: 0,
      lifeSupportModel: 'crew_aggregate_didactic',
    },
    auxBay: {
      ports: { power: false, water: false, o2: false },
      installedCount: 0,
    },
    fieldKit: {
      slots: [null, null, null],
      stock: { relay_mast: 1, thermal_shield: 1, sensor_pylon: 1 },
      lastPlacedSlot: null,
      escrowKwh: 0,
    },
    discoveries: createInitialDiscoveries(),
    episode: {
      currentBeatId: 'arrival',
      visitedBeats: [],
      skippedBeats: [],
      choices: {
        academyLoad: 'undecided',
        cropTiming: 'undecided',
        tone: {},
      },
      dialogueHistory: [],
    },
    log: [],
    awarded: [],
  };
}

const live = (m: Module) => m.connected && m.integrity >= 0.8 && m.enabled;

export function getActiveEpisodeBeat(s: GameState): BeatId {
  if (s.phase === 'academy') {
    return s.flags.diagnosed ? 'trial' : 'arrival';
  }
  if (s.phase === 'orbit') {
    return 'transit';
  }
  if (s.phase === 'complete') {
    return 'home';
  }
  // Dynamic storm alert/active overrides storyboard progression to prioritize shelter.
  if ((s.storm === 'warning' || s.storm === 'active') && !s.flags.sheltered) {
    return 'warning';
  }
  const m = s.modules;
  const f = s.flags;
  if (!m.power.connected || !m.water.connected || !m.oxygen.connected) {
    return 'aurora';
  }
  if (!f.loadout && !f.expedition && !f.scoutRecruited) {
    return 'prepare';
  }
  if (
    s.region === 'canyon' &&
    !s.episode.visitedBeats.includes('trace') &&
    !s.episode.skippedBeats.includes('trace')
  ) {
    return 'trace';
  }
  if (s.region === 'canyon' || !f.scoutRecruited || s.resources.deliveredIce <= 0) {
    return 'scout';
  }
  if (!f.harvested || s.resources.processedIce <= 0) {
    return 'harvest';
  }
  return 'home';
}

function syncCometaOnRegionChange(s: GameState): void {
  if (s.cometa.enabled && s.cometa.mode !== 'wait') {
    const anchor = REGION_SAFE_ANCHORS[s.region];
    s.cometa.region = s.region;
    s.cometa.safeTargetId = anchor.targetId;
    s.cometa.safePos = { ...anchor.pos };
  }
}

function isPressurizedForSniff(s: GameState): boolean {
  // Vacuum in canyon or simplified orbital cabin NEVER permits sniffing;
  // in lunar habitat, only inside the pressurized shelter (`flags.sheltered`).
  return (
    s.region === 'academy' ||
    s.region === 'greenhouse' ||
    (s.region === 'habitat' && s.flags.sheltered)
  );
}

function computePipTelemetryRangeM(s: GameState): number {
  const hasRelay = s.fieldKit.slots.includes('relay_mast');
  const base = s.pipBattery > 0.2 ? 35 : 15;
  const relayBonus = hasRelay ? 20 : 0;
  const stormPenalty = s.storm === 'active' && !hasRelay ? 10 : 0;
  return Math.max(15, base + relayBonus - stormPenalty);
}

function oneTick(s: GameState): void {
  s.tick++;
  if (s.phase === 'academy') {
    const before = s.academyBattery;
    s.academyGenerationKw = 20;
    s.academyDemandKw = s.flags.loadShed ? 12 : 38;
    s.academyBattery = clamp(s.academyBattery + (s.flags.loadShed ? 0.08 : -0.18), 0, 10);
    s.flags.academyStableTicks = s.flags.loadShed ? s.flags.academyStableTicks + 1 : 0;
    if (before > 0 && s.academyBattery === 0) {
      addLog(
        s,
        'academy',
        'Bateria de treino esgotada; reduza a carga secundária e observe a recuperação.',
        before,
        0,
        'kWh',
      );
    }
    s.episode.currentBeatId = getActiveEpisodeBeat(s);
    return;
  }
  if (s.phase !== 'lunar') return;
  s.lunarTick++;
  const prevStorm = s.storm;
  const cycle = s.lunarTick % 600;
  s.storm = cycle >= 300 && cycle < 380 ? 'active' : cycle >= 180 && cycle < 300 ? 'warning' : 'clear';
  if (s.storm !== prevStorm) {
    addLog(s, 'storm', `Previsão de radiação: ${STORM_LABELS_PT[s.storm]}.`);
    if (prevStorm === 'active' && s.flags.sheltered) {
      s.flags.stormSurvived = true;
      addLog(s, 'milestone', 'O abrigo protegeu a tripulação durante o ciclo de tempestade.');
    }
  }
  const r = s.resources;
  const m = s.modules;
  const dt = 0.01;
  const moduleLabels: Record<string, string> = {
    power: 'rede elétrica',
    water: 'reciclador de água',
    oxygen: 'gerador de oxigênio',
    crop: 'estufa',
  };
  // Complete repair work over several ticks, consuming the reserved part at initiation.
  for (const [name, mod] of Object.entries(m)) {
    if (mod.repairRemaining > 0 && --mod.repairRemaining === 0) {
      mod.integrity = 1;
      mod.connected = true;
      addLog(s, 'repair', `Reparo concluído no módulo: ${moduleLabels[name] ?? name}.`);
    }
  }
  if (s.scoutRepairRemaining > 0 && --s.scoutRepairRemaining === 0) {
    s.flags.scoutRepaired = true;
    addLog(s, 'repair', 'Reparo do robô Scout concluído.');
  }
  const hasThermalShield = s.fieldKit.slots.includes('thermal_shield');
  const hasSensorPylon = s.fieldKit.slots.includes('sensor_pylon');
  const auxPowerActive = s.auxBay.ports.power && live(m.power);
  const auxWaterActive = s.auxBay.ports.water && live(m.water);
  const auxO2Active = s.auxBay.ports.o2 && live(m.oxygen);

  const sunlight = s.storm === 'active' ? 0.45 : 1;
  const baseSolarKw = 5 + (auxPowerActive ? 0.5 : 0) + (hasSensorPylon ? 0.3 : 0);
  s.powerSupply = live(m.power) ? baseSolarKw * sunlight : 0;
  const criticalKw = hasThermalShield ? 1.1 : 1.2;
  s.powerDemand =
    criticalKw +
    (live(m.water) ? 0.7 + (auxWaterActive ? 0.15 : 0) : 0) +
    (live(m.oxygen) ? 1.1 + (auxO2Active ? 0.2 : 0) : 0) +
    (live(m.crop) && s.flags.planted ? 0.8 : 0) +
    (s.sampleProcessingRemaining > 0 ? 0.5 : 0) +
    (s.scoutRepairRemaining > 0 ? 0.3 : 0);

  const generated = s.powerSupply * dt;
  const needed = s.powerDemand * dt;
  r.energyGenerated += generated;
  const directlyUsed = Math.min(generated, needed);
  const shortage = needed - directlyUsed;
  const drawn = Math.min(r.battery, shortage / 0.9);
  r.battery -= drawn;
  r.dischargeLoss += drawn * 0.1;
  const used = directlyUsed + drawn * 0.9;
  r.energyUsed += used;
  const surplus = generated - directlyUsed;
  const accepted = Math.min(surplus, Math.max(0, (12 - r.battery) / 0.9));
  r.battery += accepted * 0.9;
  r.chargeLoss += accepted * 0.1;
  r.energyLossKwh = r.chargeLoss + r.dischargeLoss;
  r.energyCurtailed += surplus - accepted;
  const powered = used + 1e-9 >= needed;
  if (!powered) s.blackouts++;

  const waterUse = Math.min(r.potable, 0.18 * dt);
  r.potable -= waterUse;
  r.wastewater += waterUse;
  r.crewWaterConsumed += waterUse;
  const o2Use = Math.min(r.oxygen, 0.08 * dt);
  r.oxygen -= o2Use;
  r.crewOxygenConsumed += o2Use;
  const foodUse = Math.min(r.food, 0.025 * dt);
  r.food -= foodUse;
  r.crewFoodConsumed += foodUse;

  if (powered && live(m.water)) {
    const rate = 0.12 + (auxWaterActive ? 0.04 : 0);
    const amount = Math.min(r.wastewater, rate * dt);
    r.wastewater -= amount;
    r.potable += amount * 0.8;
    r.recyclerLoss += amount * 0.2;
  }
  if (powered && live(m.oxygen)) {
    const rate = 0.18 + (auxO2Active ? 0.04 : 0);
    const water = Math.min(r.potable, rate * dt);
    r.potable -= water;
    r.waterElectrolysed += water;
    const oxygen = (water * 8) / 9;
    const hydrogen = water / 9;
    r.oxygen += oxygen;
    r.hydrogen += hydrogen;
    r.generatedOxygen += oxygen;
    r.generatedHydrogen += hydrogen;
  }
  if (powered && live(m.crop) && s.flags.planted && !s.flags.harvested && r.potable > 0.01) {
    const water = Math.min(r.potable, 0.012 * dt);
    r.potable -= water;
    r.cropWater += water;
    s.cropGrowth = Math.min(180, s.cropGrowth + 1);
  }
  if (powered && s.sampleProcessingRemaining > 0 && --s.sampleProcessingRemaining === 0) {
    const amount = r.deliveredIce - r.processedIce;
    r.potable += amount;
    r.processedIce += amount;
    addLog(
      s,
      'sample',
      'Gelo entregue processado em água potável.',
      r.potable - amount,
      r.potable,
      'kg',
    );
  }
  if (
    powered &&
    s.flags.scoutRecruited &&
    !s.flags.scoutStrandedOutOfCharge &&
    !s.flags.expedition &&
    r.companionBattery < 2 &&
    r.battery > 0.005
  ) {
    const charge = Math.min(0.002, 2 - r.companionBattery, r.battery);
    r.battery -= charge;
    r.companionBattery += charge;
    r.energyUsed += charge;
  }
  if (powered && !s.flags.expedition && s.pipBattery < 1.5 && r.battery > 0.005) {
    const pipCharge = Math.min(0.002, 1.5 - s.pipBattery, r.battery);
    r.battery -= pipCharge;
    s.pipBattery += pipCharge;
    r.energyUsed += pipCharge;
  }
  s.pipTelemetryRangeM = computePipTelemetryRangeM(s);

  if (r.potable <= 0 || r.oxygen <= 0 || r.food <= 0 || (!powered && r.battery <= 0)) {
    s.health -= 0.15;
  }
  if (s.storm === 'active' && !s.flags.sheltered) {
    s.health -= hasThermalShield ? 1.25 : 1.4;
  }
  if (s.health <= 0) {
    s.health = 0;
    s.phase = 'failed';
    addLog(s, 'failure', 'Reservas da tripulação ou proteção falharam. Restaure um checkpoint.');
  }
  if (
    s.flags.harvested &&
    s.flags.sampleDelivered &&
    r.processedIce > 0 &&
    s.flags.scoutRecruited &&
    s.flags.stormSurvived &&
    live(m.power) &&
    live(m.water) &&
    live(m.oxygen) &&
    powered &&
    r.potable > 1 &&
    r.oxygen > 0.2
  ) {
    s.phase = 'complete';
    addLog(s, 'milestone', 'O habitat está estável e o ciclo completo da missão foi concluído.');
  }
  s.episode.currentBeatId = getActiveEpisodeBeat(s);
}

export function stepGame(state: GameState, seconds: number): GameState {
  const s = clone(state);
  if (!Number.isFinite(seconds) || seconds <= 0) return s;
  const total = s.remainder + seconds;
  const ticks = Math.floor(total + 1e-9);
  s.remainder = total - ticks;
  if (Math.abs(s.remainder) < 1e-9) s.remainder = 0;
  for (let i = 0; i < ticks; i++) oneTick(s);
  return s;
}

function parseSelectionIds(
  payload: unknown,
  catalog: Record<string, CargoCatalogItem>,
  fallback: readonly string[],
): { ok: true; ids: string[]; massKg: number } | { ok: false; message: string } {
  const p = (payload ?? {}) as { itemIds?: unknown; itemId?: unknown };
  let ids: string[];
  if (Array.isArray(p.itemIds)) {
    if (!p.itemIds.every((id) => typeof id === 'string')) {
      return { ok: false, message: 'Lista de itens inválida.' };
    }
    ids = Array.from(new Set(p.itemIds));
  } else if (typeof p.itemId === 'string') {
    ids = [p.itemId];
  } else {
    ids = [...fallback];
  }
  if (ids.length === 0) {
    return { ok: false, message: 'Selecione ao menos um item válido.' };
  }
  let massKg = 0;
  for (const id of ids) {
    const item = catalog[id];
    if (!item) {
      return { ok: false, message: 'Item desconhecido no manifesto.' };
    }
    massKg += item.massKg;
  }
  return { ok: true, ids, massKg };
}

export function applyAction(
  state: GameState,
  action: Action | string,
  _payload?: unknown,
): ActionResult {
  const s = clone(state);
  const r = s.resources;
  const m = s.modules;
  const f = s.flags;
  const events: string[] = [];
  const fail = (message: string): ActionResult => ({ state: s, ok: false, message, events });
  const ok = (message: string): ActionResult => ({ state: s, ok: true, message, events });
  if (s.phase === 'failed' || s.phase === 'complete') {
    return fail('Esta tentativa foi encerrada. Consulte o relatório ou restaure um checkpoint.');
  }
  const record = (id: string, text: string, before?: number, after?: number, unit?: string) => {
    addLog(s, id, text, before, after, unit);
    events.push(id);
    if (!s.awarded.includes(id)) s.awarded.push(id);
  };

  // Episode 01 beats and tone choices (never alter physical truth).
  if (action === 'advanceBeat') {
    const p = (_payload ?? {}) as {
      beatId?: unknown;
      skipped?: unknown;
      toneChoice?: unknown;
      speaker?: unknown;
      line?: unknown;
    };
    if (typeof p.beatId !== 'string' || !BEAT_IDS.includes(p.beatId as BeatId)) {
      return fail('Batida narrativa desconhecida.');
    }
    const beatId = p.beatId as BeatId;
    const skipped = p.skipped === true;
    if (skipped) {
      if (!s.episode.skippedBeats.includes(beatId)) s.episode.skippedBeats.push(beatId);
    } else if (!s.episode.visitedBeats.includes(beatId)) {
      s.episode.visitedBeats.push(beatId);
    }
    if (typeof p.toneChoice === 'string' && p.toneChoice.trim()) {
      s.episode.choices.tone[beatId] = p.toneChoice.trim();
    }
    if (typeof p.speaker === 'string' && typeof p.line === 'string') {
      s.episode.dialogueHistory.push({
        tick: s.tick,
        beatId,
        speaker: p.speaker,
        line: p.line,
        ...(typeof p.toneChoice === 'string' && p.toneChoice.trim()
          ? { choiceLabel: p.toneChoice.trim() }
          : {}),
      });
      if (s.episode.dialogueHistory.length > 100) s.episode.dialogueHistory.shift();
    }
    s.episode.currentBeatId = getActiveEpisodeBeat(s);
    return ok(skipped ? 'Batida opcional pulada.' : 'Registro narrativo atualizado.');
  }

  if (action === 'recordDialogueTone') {
    const p = (_payload ?? {}) as { beatId?: unknown; tone?: unknown; choiceLabel?: unknown };
    if (typeof p.beatId !== 'string' || !BEAT_IDS.includes(p.beatId as BeatId)) {
      return fail('Batida narrativa inválida.');
    }
    if (typeof p.tone !== 'string' || !p.tone.trim()) {
      return fail('Escolha de tom inválida.');
    }
    const beatId = p.beatId as BeatId;
    s.episode.choices.tone[beatId] = p.tone.trim();
    if (!s.episode.visitedBeats.includes(beatId)) s.episode.visitedBeats.push(beatId);
    s.episode.dialogueHistory.push({
      tick: s.tick,
      beatId,
      speaker: 'Cadete',
      line: typeof p.choiceLabel === 'string' && p.choiceLabel ? p.choiceLabel : p.tone.trim(),
      choiceLabel: p.tone.trim(),
    });
    if (s.episode.dialogueHistory.length > 100) s.episode.dialogueHistory.shift();
    s.episode.currentBeatId = getActiveEpisodeBeat(s);
    return ok('Resposta de tom registrada sem alterar a física da base.');
  }

  // Optional Cometa buddy actions (never create resources or complete quests; sniff strictly pressurized).
  if (action === 'toggleCometa') {
    const p = (_payload ?? {}) as { enabled?: unknown };
    const next = typeof p.enabled === 'boolean' ? p.enabled : !s.cometa.enabled;
    s.cometa.enabled = next;
    if (next) {
      syncCometaOnRegionChange(s);
      addLog(s, 'cometa', 'Cometa ativado na equipe opcional.');
    } else {
      s.cometa.mode = 'wait';
      addLog(s, 'cometa', 'Cometa colocado em repouso seguro (equipe opcional).');
    }
    return ok(next ? 'Cometa está acompanhando a expedição.' : 'Cometa desativado com segurança.');
  }

  if (action === 'setCometaMode') {
    if (!s.cometa.enabled) {
      return fail('Ative Cometa antes de alterar o modo.');
    }
    const p = (_payload ?? {}) as {
      mode?: unknown;
      safeTargetId?: unknown;
      safePos?: unknown;
      region?: unknown;
    };
    if (p.mode !== 'follow' && p.mode !== 'wait' && p.mode !== 'recall') {
      return fail('Modo inválido para Cometa.');
    }
    s.cometa.mode = p.mode;
    if (p.mode === 'recall') {
      const anchor = REGION_SAFE_ANCHORS[s.region];
      s.cometa.region = s.region;
      s.cometa.safeTargetId =
        typeof p.safeTargetId === 'string' && p.safeTargetId ? p.safeTargetId : anchor.targetId;
      const posCandidate = p.safePos as Partial<Vec3> | undefined;
      if (
        posCandidate &&
        [posCandidate.x, posCandidate.y, posCandidate.z].every(
          (n) => typeof n === 'number' && Number.isFinite(n) && Math.abs(n) < 100,
        )
      ) {
        s.cometa.safePos = {
          x: posCandidate.x as number,
          y: posCandidate.y as number,
          z: posCandidate.z as number,
        };
      } else {
        s.cometa.safePos = { ...anchor.pos };
      }
      addLog(s, 'cometa', 'Cometa chamado de volta a um ponto seguro.');
      return ok('Cometa retornou a um ponto seguro.');
    }
    if (p.mode === 'follow') {
      syncCometaOnRegionChange(s);
      addLog(s, 'cometa', 'Cometa voltou a acompanhar por rota segura.');
      return ok('Cometa está seguindo.');
    }
    addLog(s, 'cometa', 'Cometa aguardará em local seguro.');
    return ok('Cometa aguardará em segurança.');
  }

  if (action === 'petCometa') {
    if (!s.cometa.enabled) return fail('Cometa não está ativo no momento.');
    if (s.cometa.region !== s.region) {
      return fail('Chame Cometa para esta região antes de fazer carinho.');
    }
    s.cometa.petCount++;
    addLog(
      s,
      'cometa',
      'Você fez carinho em Cometa; ela abanou a cauda (nenhum recurso ou meta foi alterado).',
    );
    return ok('Cometa recebeu carinho com segurança.');
  }

  if (action === 'cometaSniff') {
    if (!s.cometa.enabled) return fail('Cometa não está ativo no momento.');
    if (s.cometa.region !== s.region) {
      return fail('Cometa está aguardando em outra região.');
    }
    if (!isPressurizedForSniff(s)) {
      return fail(
        'Cometa não pode farejar no vácuo (apenas na academia, na estufa ou dentro do abrigo pressurizado).',
      );
    }
    s.cometa.sniffCount++;
    addLog(
      s,
      'cometa',
      'Cometa farejou o ambiente pressurizado por curiosidade (sem gerar recursos).',
    );
    return ok('Cometa farejou a área pressurizada.');
  }

  if (action === 'cometaLookBeacon') {
    if (!s.cometa.enabled) return fail('Cometa não está ativo no momento.');
    if (s.cometa.region !== s.region) {
      return fail('Cometa está aguardando em outra região.');
    }
    const p = (_payload ?? {}) as { targetId?: unknown };
    const beaconId =
      typeof p.targetId === 'string' && p.targetId ? p.targetId : REGION_BEACONS[s.region];
    const beaconLabel = TARGET_LABELS_PT[beaconId] ?? 'marco de orientação visível';
    s.cometa.beaconLookCount++;
    addLog(
      s,
      'cometa',
      `Cometa apontou para o marco visível (${beaconLabel}), sem revelar recursos ocultos.`,
    );
    return ok(`Cometa olhou na direção de ${beaconLabel}.`);
  }

  // Phase 1: Academy
  if (action === 'diagnoseAcademy' && s.phase === 'academy') {
    f.diagnosed = true;
    s.episode.currentBeatId = getActiveEpisodeBeat(s);
    record(
      'diagnosis',
      'Bateria em queda: demanda (38 kW) pode superar a geração (20 kW). Teste reduzir uma carga e observe.',
      s.academyBattery,
      s.academyBattery,
      'kWh',
    );
    return ok(
      'Hipótese registrada: demanda supera a geração. Reduza a carga secundária e observe a bateria.',
    );
  }

  if (action === 'chooseAcademyLoad' && s.phase === 'academy') {
    if (!f.diagnosed) return fail('Inspecione o simulador da academia primeiro.');
    const p = (_payload ?? {}) as { choice?: unknown };
    if (p.choice !== 'shed' && p.choice !== 'keep_secondary') {
      return fail('Escolha de carga inválida na academia.');
    }
    if (p.choice === 'keep_secondary') {
      if (s.episode.choices.academyLoad === 'keep_secondary' && !f.loadShed) {
        return fail('A carga secundária já está mantida ativa.');
      }
      f.loadShed = false;
      f.academyStableTicks = 0;
      s.academyDemandKw = 38;
      s.episode.choices.academyLoad = 'keep_secondary';
      addLog(
        s,
        'academy-load-choice',
        'Carga secundária mantida ativa (38 kW > 20 kW): a bateria continuará descarregando.',
        s.academyBattery,
        s.academyBattery,
        'kWh',
      );
      return ok('Carga secundária mantida (38 kW > 20 kW). Observe a queda na bateria.');
    }
    if (f.loadShed) {
      return fail('A carga secundária já foi suspensa.');
    }
    f.loadShed = true;
    s.academyDemandKw = 12;
    s.episode.choices.academyLoad = 'shed';
    record(
      'load-shed',
      'Carga não essencial suspensa (12 kW < 20 kW).',
      s.academyBattery,
      s.academyBattery,
      'kWh',
    );
    return ok('Carga reduzida (12 kW). Observe a recuperação da bateria por 15 segundos.');
  }

  if (action === 'shedLoad' && s.phase === 'academy') {
    if (!f.diagnosed) return fail('Inspecione o simulador da academia primeiro.');
    if (f.loadShed) return fail('A carga não essencial já está suspensa.');
    f.loadShed = true;
    s.academyDemandKw = 12;
    s.episode.choices.academyLoad = 'shed';
    record(
      'load-shed',
      'Demanda não essencial reduzida para 12 kW.',
      s.academyBattery,
      s.academyBattery,
      'kWh',
    );
    return ok('Carga reduzida. Acompanhe a bateria por 15 segundos.');
  }

  if (action === 'finishAcademy' && s.phase === 'academy') {
    if (f.academyStableTicks < 15) {
      return fail('Mantenha a carga reduzida e observe 15 segundos de recuperação.');
    }
    record(
      'academy-complete',
      'A bateria de treino se recuperou sob carga reduzida.',
      undefined,
      s.academyBattery,
      'kWh',
    );
    s.phase = 'orbit';
    s.region = 'orbit';
    syncCometaOnRegionChange(s);
    s.episode.currentBeatId = getActiveEpisodeBeat(s);
    return ok('Treino concluído. Recolha a carga no treinador orbital.');
  }

  // Phase 2: Orbit (assisted planar cabin — NOT 6DoF)
  if (action === 'collectCargo' && s.phase === 'orbit') {
    if (f.cargo) return fail('A carga já foi fixada.');
    const parsed = parseSelectionIds(_payload, ORBIT_CARGO_ITEMS, DEFAULT_CARGO_IDS);
    if (!parsed.ok) return fail(parsed.message);
    if (parsed.massKg > s.cargoCapacityKg) {
      return fail(
        `Seleção de ${parsed.massKg} kg excede a capacidade orbital de ${s.cargoCapacityKg} kg.`,
      );
    }
    f.cargo = true;
    s.selectedCargoIds = parsed.ids;
    s.cargoMassKg = parsed.massKg;
    s.orbitAssisted = true;
    record(
      'cargo',
      `Carga fixada (${parsed.massKg}/${s.cargoCapacityKg} kg) em treinador orbital assistido.`,
      0,
      parsed.massKg,
      'kg',
    );
    return ok(`Carga de ${parsed.massKg} kg fixada. Siga para a transferência lunar.`);
  }

  if (action === 'land' && s.phase === 'orbit') {
    if (!f.cargo) return fail('Fixe a carga antes da descida lunar.');
    s.phase = 'lunar';
    s.region = 'habitat';
    f.landed = true;
    s.discoveries.solar_dust_attenuation.status = 'detectable';
    syncCometaOnRegionChange(s);
    s.episode.currentBeatId = getActiveEpisodeBeat(s);
    record('landing', 'Base Aurora alcançada; inspecione os módulos desconectados.');
    return ok('Pouso concluído em Aurora. Restaure os sistemas do habitat.');
  }

  if (action === 'travel') {
    const region = (_payload as { region?: unknown } | undefined)?.region;
    if (s.phase === 'academy' && region === 'orbit') return applyAction(state, 'finishAcademy');
    if (s.phase === 'orbit' && region === 'habitat') return applyAction(state, 'land');
    if (s.phase === 'lunar' && region === 'canyon' && s.region === 'habitat') {
      return applyAction(state, 'launchExpedition');
    }
    if (s.phase === 'lunar' && region === 'habitat' && s.region === 'canyon') {
      return applyAction(state, 'returnExpedition');
    }
    if (s.phase === 'lunar' && region === 'greenhouse' && s.region === 'habitat' && !f.sheltered) {
      s.region = 'greenhouse';
      syncCometaOnRegionChange(s);
      s.episode.currentBeatId = getActiveEpisodeBeat(s);
      return ok('Entrou na estufa pressurizada.');
    }
    if (s.phase === 'lunar' && region === 'habitat' && s.region === 'greenhouse') {
      s.region = 'habitat';
      syncCometaOnRegionChange(s);
      s.episode.currentBeatId = getActiveEpisodeBeat(s);
      return ok('Retornou à base Aurora.');
    }
    return fail('Esta rota não está disponível a partir daqui.');
  }

  if (s.phase !== 'lunar') return fail('Esta ação não está disponível nesta fase.');

  // Phase 3: Lunar Systems, Discovery, Scout, AuxBay, FieldKit
  if (action === 'repairPower' || action === 'repairWater' || action === 'repairOxygen') {
    const key = action === 'repairPower' ? 'power' : action === 'repairWater' ? 'water' : 'oxygen';
    const label =
      key === 'power'
        ? 'rede elétrica'
        : key === 'water'
          ? 'reciclador de água'
          : 'gerador de oxigênio';
    const mod = m[key];
    if (mod.connected || mod.repairRemaining) {
      return fail('Este módulo já foi reparado ou está em reparo.');
    }
    if (r.battery < 0.2) return fail('O reparo requer 0,2 kWh na bateria.');
    const before = r.battery;
    r.battery -= 0.2;
    r.energyUsed += 0.2;
    mod.repairRemaining = 5;
    record(
      'repair-' + key,
      `Reparo iniciado (${label}); consome 0,2 kWh e requer 5 segundos.`,
      before,
      r.battery,
      'kWh',
    );
    return ok('Reparo em andamento; aguarde 5 segundos fora do painel.');
  }

  if (action === 'toggleRecycler' || action === 'toggleOxygen' || action === 'toggleCrop') {
    const key = action === 'toggleRecycler' ? 'water' : action === 'toggleOxygen' ? 'oxygen' : 'crop';
    const label =
      key === 'water' ? 'reciclador de água' : key === 'oxygen' ? 'gerador de oxigênio' : 'cultivo';
    const mod = m[key];
    if (!mod.connected) return fail('Repare e conecte este módulo primeiro.');
    mod.enabled = !mod.enabled;
    record(
      'toggle-' + key,
      `Módulo ${label} ${mod.enabled ? 'ligado' : 'desligado'}; a demanda muda no próximo segundo.`,
    );
    return ok(`${label} ${mod.enabled ? 'ligado' : 'desligado'}.`);
  }

  if (action === 'scanSolar' || action === 'scanWater') {
    const solar = action === 'scanSolar';
    if (solar) f.solarScanned = true;
    else f.waterScanned = true;
    if (s.pipBattery >= 0.02) {
      s.pipBattery = Number((s.pipBattery - 0.02).toFixed(4));
    }
    s.pipTelemetryRangeM = computePipTelemetryRangeM(s);
    const value = solar ? r.battery : r.potable;
    record(
      solar ? 'scan-solar' : 'scan-water',
      solar
        ? 'Baixa geração ou demanda excessiva podem descarregar a bateria. Compare oferta e demanda após ajustar um módulo.'
        : 'Água potável depende da reciclagem e do consumo da eletrólise. Compare os tanques após ajustar um módulo.',
      value,
      value,
      solar ? 'kWh' : 'kg',
    );
    return ok(
      solar
        ? 'Hipótese elétrica registrada: compare geração, demanda e tendência da bateria.'
        : 'Hipótese hídrica registrada: compare reciclagem, eletrólise e tanque de água.',
    );
  }

  if (action === 'chooseCropStrategy') {
    const p = (_payload ?? {}) as { strategy?: unknown };
    if (p.strategy !== 'early_plant' && p.strategy !== 'deferred_plant') {
      return fail('Estratégia de cultivo inválida.');
    }
    s.episode.choices.cropTiming = p.strategy;
    if (p.strategy === 'deferred_plant') {
      if (f.planted && !f.harvested) {
        m.crop.enabled = false;
      }
      addLog(
        s,
        'crop-strategy',
        'Estratégia registrada: adiar cultivo (poupa 0,8 kW e 0,012 kg/h de água agora; posterga colheita).',
      );
      return ok('Estratégia de cultivo adiado registrada.');
    }
    addLog(
      s,
      'crop-strategy',
      'Estratégia registrada: plantar cedo (consome 0,8 kW e 0,012 kg/h de água durante o crescimento).',
    );
    return ok('Estratégia de cultivo antecipado registrada.');
  }

  if (action === 'plantCrop') {
    if (f.planted) return fail('O cultivo já foi iniciado.');
    f.planted = true;
    m.crop.enabled = true;
    if (s.episode.choices.cropTiming === 'undecided') {
      s.episode.choices.cropTiming =
        !f.stormSurvived && !f.sampleDelivered && s.lunarTick < 180
          ? 'early_plant'
          : 'deferred_plant';
    }
    record(
      'plant',
      'Cultivo iniciado; requer 180 segundos com energia (0,8 kW) e água (0,012 kg/h).',
    );
    return ok('Cultivo iniciado. Precisa de luz alimentada e água para crescer.');
  }

  if (action === 'harvest') {
    if (f.harvested) return fail('O cultivo já foi colhido.');
    if (s.cropGrowth < 180) {
      return fail(
        `O cultivo precisa de mais ${Math.ceil(180 - s.cropGrowth)} segundos com luz e água.`,
      );
    }
    const before = r.food;
    r.food += 3;
    f.harvested = true;
    record('harvest', 'Colheita adicionou 3 kg de alimento à reserva.', before, r.food, 'kg');
    return ok('Colheita concluída: +3 kg de alimento.');
  }

  if (action === 'chooseLoadout') {
    const parsed = parseSelectionIds(_payload, FIELD_LOCKER_ITEMS, DEFAULT_LOADOUT_IDS);
    if (!parsed.ok) return fail(parsed.message);
    if (parsed.massKg > s.loadoutCapacityKg) {
      return fail(
        `Equipamento de ${parsed.massKg} kg excede o limite de ${s.loadoutCapacityKg} kg do armário de campo.`,
      );
    }
    f.loadout = true;
    s.selectedLoadoutIds = parsed.ids;
    s.loadoutMassKg = parsed.massKg;
    record(
      'loadout',
      `Ferramentas de campo selecionadas (${parsed.massKg}/${s.loadoutCapacityKg} kg).`,
      0,
      parsed.massKg,
      'kg',
    );
    return ok(`Ferramentas de campo preparadas (${parsed.massKg} kg).`);
  }

  if (action === 'launchExpedition') {
    if (
      !live(m.power) ||
      !live(m.water) ||
      !live(m.oxygen) ||
      r.battery < 5 ||
      r.potable < 2 ||
      r.oxygen < 0.2
    ) {
      return fail(
        'Restaure e ligue energia, água e oxigênio; reserve ao menos 5 kWh, 2 kg de água e 0,2 kg de O₂.',
      );
    }
    if (!f.loadout) return fail('Selecione as ferramentas de campo no armário antes de sair.');
    if (s.storm !== 'clear') return fail('A previsão de radiação torna a saída insegura.');
    f.expedition = true;
    s.region = 'canyon';
    if (s.discoveries.com03_unplugged_cable.status === 'unavailable') {
      s.discoveries.com03_unplugged_cable.status = 'detectable';
    }
    if (s.discoveries.canyon_ice_strata.status === 'unavailable') {
      s.discoveries.canyon_ice_strata.status = 'detectable';
    }
    syncCometaOnRegionChange(s);
    s.episode.currentBeatId = getActiveEpisodeBeat(s);
    record('expedition', 'Expedição ao cânion iniciada com suporte à vida ativo.');
    return ok('Expedição ao cânion iniciada.');
  }

  if (action === 'returnExpedition') {
    if (!f.expedition) return fail('Nenhuma expedição está ativa.');
    f.expedition = false;
    s.region = 'habitat';
    syncCometaOnRegionChange(s);
    s.episode.currentBeatId = getActiveEpisodeBeat(s);
    record('return', 'Retorno à base Aurora concluído.');
    return ok('Retornou à base Aurora.');
  }

  if (action === 'collectSample') {
    if (!f.expedition) return fail('Viaje ao cânion primeiro.');
    if (r.samples > 0) return fail('Entregue a amostra atual na base antes de coletar outra.');
    if (r.ice < 0.5) return fail('A reserva local de gelo se esgotou.');
    r.ice -= 0.5;
    r.samples += 0.5;
    record('sample-collected', 'Coletado 0,5 kg da reserva finita de gelo.');
    return ok('Coletado 0,5 kg de gelo. Retorne à base para processar.');
  }

  if (action === 'repairCompanion') {
    if (!f.expedition) return fail('Encontre Scout no cânion primeiro.');
    if (f.scoutRepaired || s.scoutRepairRemaining) {
      return fail('Scout já foi reparado ou está em reparo.');
    }
    if (r.parts < 1 || r.battery < 0.3) {
      return fail('O reparo do Scout exige 1 peça sobressalente e 0,3 kWh.');
    }
    r.parts--;
    r.battery -= 0.3;
    r.energyUsed += 0.3;
    s.scoutRepairRemaining = 5;
    record(
      'scout-repair',
      'Reparo do Scout iniciado: 1 peça, 0,3 kWh e 5 segundos necessários.',
    );
    return ok('Reparo do Scout em andamento; aguarde 5 segundos.');
  }

  if (action === 'recruitCompanion') {
    if (!f.expedition || !f.scoutRepaired) return fail('Encontre e repare Scout primeiro.');
    if (f.scoutRecruited) return fail('Scout já faz parte da equipe.');
    f.scoutRecruited = true;
    record(
      'scout',
      'Scout entrou para a equipe. Sua bateria é recarregada a partir da base (sem gerar energia gratuita).',
    );
    return ok('Scout integrado à equipe.');
  }

  if (action === 'dispatchScoutScan') {
    if (!f.scoutRecruited) return fail('Repare e recrute Scout antes de solicitar varredura.');
    if (f.scoutStrandedOutOfCharge || r.companionBattery <= 0.1 + 1e-9) {
      f.scoutStrandedOutOfCharge = true;
      return fail('Scout está sem carga (<= 0,1 kWh) e aguarda resgate/recarga.');
    }
    if (r.companionBattery < 0.4 - 1e-9) {
      return fail('Bateria do Scout insuficiente para varredura (requer 0,4 kWh).');
    }
    const p = (_payload ?? {}) as { target?: unknown };
    const target =
      p.target === 'beacon' || p.target === 'ice' || p.target === 'solar'
        ? p.target
        : s.region === 'canyon'
          ? 'ice'
          : 'beacon';
    const before = r.companionBattery;
    r.companionBattery = Math.max(0, Number((r.companionBattery - 0.4).toFixed(6)));
    s.scoutScans++;
    if (r.companionBattery <= 0.1 + 1e-9) {
      f.scoutStrandedOutOfCharge = true;
    }
    const telemetryNote =
      target === 'ice'
        ? `Reserva local medida: ${fmtPt(r.ice)} kg de gelo (ficção didática).`
        : target === 'solar'
          ? `Fluxo elétrico atual: oferta ${fmtPt(s.powerSupply)} kW / demanda ${fmtPt(s.powerDemand)} kW.`
          : `Marco de pesquisa verificado em ${REGION_LABELS_PT[s.region]}; previsão de radiação: ${STORM_LABELS_PT[s.storm]}.`;
    const targetLabel = SCOUT_TARGET_LABELS_PT[target];
    addLog(
      s,
      'scout-scan',
      `Varredura do Scout (${targetLabel}): ${telemetryNote}${
        f.scoutStrandedOutOfCharge ? ' Atenção: Scout atingiu carga crítica e aguarda resgate.' : ''
      }`,
      before,
      r.companionBattery,
      'kWh',
    );
    events.push('scout-scan');
    return ok(
      f.scoutStrandedOutOfCharge
        ? 'Varredura concluída, mas Scout ficou sem carga e aguarda recarga.'
        : `Varredura do Scout concluída (-0,40 kWh). ${telemetryNote}`,
    );
  }

  if (action === 'rechargeScout') {
    if (!f.scoutRepaired && !f.scoutRecruited) {
      return fail('Repare Scout antes de recarregar sua bateria.');
    }
    if (r.companionBattery >= 2 - 1e-9 && !f.scoutStrandedOutOfCharge) {
      return fail('A bateria do Scout já está cheia (2,0 kWh).');
    }
    const transfer = Math.min(0.5, 2 - r.companionBattery);
    if (transfer <= 1e-9) {
      f.scoutStrandedOutOfCharge = false;
      return ok('Bateria do Scout já está completa.');
    }
    if (r.battery < transfer - 1e-9) {
      return fail(
        `A bateria da base precisa de ao menos ${fmtPt(transfer)} kWh para resgatar e recarregar Scout.`,
      );
    }
    const beforeScout = r.companionBattery;
    r.battery -= transfer;
    r.energyUsed += transfer;
    r.companionBattery = Math.min(2, r.companionBattery + transfer);
    if (r.companionBattery > 0.1 + 1e-9) {
      f.scoutStrandedOutOfCharge = false;
    }
    addLog(
      s,
      'scout-recharge',
      `Scout recarregado a partir da reserva do traje/habitat (-${fmtPt(transfer)} kWh da base).`,
      beforeScout,
      r.companionBattery,
      'kWh',
    );
    events.push('scout-recharge');
    return ok(`Scout recarregado (+${fmtPt(transfer)} kWh transferidos da base).`);
  }

  // Field Discovery Loop (G-08 / G-09 / G-10)
  if (
    action === 'inspectEvidence' ||
    action === 'runFieldProbe' ||
    action === 'classifyDiscovery' ||
    action === 'deferDiscovery'
  ) {
    const p = (_payload ?? {}) as {
      id?: unknown;
      hypothesis?: unknown;
      classification?: unknown;
    };
    if (
      p.id !== 'com03_unplugged_cable' &&
      p.id !== 'canyon_ice_strata' &&
      p.id !== 'solar_dust_attenuation'
    ) {
      return fail('Identificador de descoberta de campo inválido.');
    }
    const id = p.id as DiscoveryId;
    const entry = s.discoveries[id];
    const meta = DISCOVERY_META[id];

    // Automatically surface canyon discoveries if player is currently in canyon.
    if (entry.status === 'unavailable' && (s.region === meta.region || (id === 'solar_dust_attenuation' && f.landed))) {
      entry.status = 'detectable';
    }

    if (action === 'deferDiscovery') {
      if (entry.status === 'resolved') {
        return ok('Descoberta já concluída anteriormente.');
      }
      entry.status = 'deferred';
      addLog(s, 'discovery-defer', `Investigação opcional adiada: ${meta.label}.`);
      return ok('Investigação opcional adiada sem bloquear a campanha.');
    }

    if (action === 'inspectEvidence') {
      if (entry.status === 'unavailable') {
        return fail(`Alcance a região (${REGION_LABELS_PT[meta.region]}) antes de inspecionar esta pista.`);
      }
      if (entry.status === 'resolved') {
        return ok('Esta descoberta já foi resolvida e registrada (sem duplicar XP).');
      }
      if (entry.status === 'detectable' || entry.status === 'deferred') {
        entry.status = 'observed';
      }
      const note =
        meta.sourceKind === 'fictional_abstraction'
          ? `Elemento ficcional (${meta.label}) observado; requer sonda para testar hipótese.`
          : `Telemetria observada (${meta.label}): oferta solar ${fmtPt(s.powerSupply)} kW.`;
      addLog(s, 'discovery-observe', note);
      return ok(note);
    }

    if (action === 'runFieldProbe') {
      if (entry.status === 'unavailable' || entry.status === 'detectable' || entry.status === 'deferred') {
        return fail('Inspecione a evidência primeiro antes de acionar a sonda de campo.');
      }
      if (entry.status === 'resolved') {
        return ok('Descoberta já resolvida anteriormente.');
      }
      if (meta.region === 'canyon' && !f.loadout) {
        return fail('Prepare as ferramentas de campo antes de usar a sonda no cânion.');
      }
      if (r.battery < 0.05) {
        return fail('A sonda de campo requer 0,05 kWh da reserva elétrica.');
      }
      const before = r.battery;
      r.battery -= 0.05;
      r.energyUsed += 0.05;
      if (s.pipBattery >= 0.02) {
        s.pipBattery = Number((s.pipBattery - 0.02).toFixed(4));
      }
      s.pipTelemetryRangeM = computePipTelemetryRangeM(s);
      entry.status = 'investigating';
      entry.hypothesis =
        typeof p.hypothesis === 'string' && p.hypothesis.trim()
          ? p.hypothesis.trim()
          : `Hipótese de campo para ${meta.label}`;
      entry.telemetrySummary =
        id === 'solar_dust_attenuation'
          ? `Oferta medida: ${fmtPt(s.powerSupply)} kW; tempestade: ${STORM_LABELS_PT[s.storm]}; perda acumulada de bateria: ${fmtPt(r.energyLossKwh, 3)} kWh.`
          : id === 'canyon_ice_strata'
            ? `Reserva finita local: ${fmtPt(r.ice)} kg (abstração ficcional de cenário, não medição orbital real).`
            : `Continuidade elétrica em COM-03 sem carga conectada (traço narrativo ficcional; sem falha real de rede).`;
      addLog(
        s,
        'discovery-probe',
        `Sonda executada em ${meta.label}: ${entry.telemetrySummary}`,
        before,
        r.battery,
        'kWh',
      );
      return ok(`Sonda concluída (-0,05 kWh). ${entry.telemetrySummary}`);
    }

    // classifyDiscovery
    if (entry.status !== 'investigating' && entry.status !== 'resolved') {
      return fail('Execute a sonda de campo antes de classificar a descoberta.');
    }
    if (entry.status === 'resolved') {
      return ok('Descoberta já classificada e registrada (recompensa idempotente).');
    }
    if (p.classification !== 'fictional_abstraction' && p.classification !== 'verified_telemetry') {
      return fail('Classifique como abstração ficcional ou telemetria medida.');
    }
    entry.classificationSubmitted = p.classification;
    if (p.classification !== meta.sourceKind) {
      return fail(
        meta.sourceKind === 'fictional_abstraction'
          ? 'Pista de cenário ficcional ou depósito ilustrativo deve ser classificada como abstração ficcional (não dado lunar real).'
          : 'A variação de oferta elétrica vem diretamente da telemetria da rede (classifique como telemetria medida).',
      );
    }
    entry.status = 'resolved';
    const awardId = `discovery-${id}`;
    if (!s.awarded.includes(awardId)) {
      s.discoveryXp += 25;
    }
    const kindLabel = DISCOVERY_CLASS_LABELS_PT[meta.sourceKind];
    record(
      awardId,
      `Descoberta classificada (${meta.label}: ${kindLabel}). +25 XP de reconhecimento (zero recursos criados).`,
    );
    return ok(`Descoberta resolvida: ${meta.label} (${kindLabel}).`);
  }

  // Expansão Posterior 1: Compact 3-Port Network Bay (power, water, o2)
  if (action === 'installAuxPort') {
    if (s.region !== 'habitat') {
      return fail('Instale conectores auxiliares na baía de rede da Base Aurora.');
    }
    const port = (_payload as { port?: unknown } | undefined)?.port;
    if (port !== 'power' && port !== 'water' && port !== 'o2') {
      return fail('Porta auxiliar inválida (use energia, água ou oxigênio).');
    }
    const portLabel = AUX_PORT_LABELS_PT[port];
    const parentLabel = AUX_PORT_PARENT_LABELS_PT[port];
    if (s.auxBay.ports[port]) {
      return fail(`A porta auxiliar de ${portLabel} já está instalada.`);
    }
    const parentMod = port === 'power' ? m.power : port === 'water' ? m.water : m.oxygen;
    if (!parentMod.connected) {
      return fail(`Conecte e repare o módulo principal (${parentLabel}) antes de expandir a porta auxiliar.`);
    }
    if (r.battery < AUX_PORT_INSTALL_KWH) {
      return fail(`A instalação da porta auxiliar requer ${fmtPt(AUX_PORT_INSTALL_KWH)} kWh.`);
    }
    const before = r.battery;
    r.battery -= AUX_PORT_INSTALL_KWH;
    r.energyUsed += AUX_PORT_INSTALL_KWH;
    s.auxBay.ports[port] = true;
    s.auxBay.installedCount = AUX_BAY_PORTS.filter((k) => s.auxBay.ports[k]).length;
    addLog(
      s,
      'aux-bay',
      `Porta auxiliar de ${portLabel} conectada (-${fmtPt(AUX_PORT_INSTALL_KWH)} kWh).`,
      before,
      r.battery,
      'kWh',
    );
    events.push(`aux-install-${port}`);
    return ok(`Porta auxiliar de ${portLabel} instalada.`);
  }

  if (action === 'removeAuxPort') {
    if (s.region !== 'habitat') {
      return fail('Remova conectores auxiliares na baía de rede da Base Aurora.');
    }
    const port = (_payload as { port?: unknown } | undefined)?.port;
    if (port !== 'power' && port !== 'water' && port !== 'o2') {
      return fail('Porta auxiliar inválida.');
    }
    const portLabel = AUX_PORT_LABELS_PT[port];
    if (!s.auxBay.ports[port]) {
      return fail(`A porta auxiliar de ${portLabel} não está instalada.`);
    }
    s.auxBay.ports[port] = false;
    s.auxBay.installedCount = AUX_BAY_PORTS.filter((k) => s.auxBay.ports[k]).length;
    addLog(s, 'aux-bay', `Porta auxiliar de ${portLabel} desconectada com segurança.`);
    events.push(`aux-remove-${port}`);
    return ok(`Porta auxiliar de ${portLabel} removida.`);
  }

  // Expansão Posterior 2: 3-Piece Restricted Modular Field Kit
  if (action === 'installFieldKitPiece') {
    if (s.region !== 'habitat') {
      return fail('Monte as peças do kit modular no pátio da Base Aurora.');
    }
    const p = (_payload ?? {}) as { pieceId?: unknown; slot?: unknown };
    if (
      p.pieceId !== 'relay_mast' &&
      p.pieceId !== 'thermal_shield' &&
      p.pieceId !== 'sensor_pylon'
    ) {
      return fail('Peça de kit modular desconhecida.');
    }
    const pieceLabel = FIELD_KIT_LABELS_PT[p.pieceId];
    const slot = p.slot;
    if (typeof slot !== 'number' || !Number.isInteger(slot) || slot < 0 || slot >= FIELD_KIT_SLOTS) {
      return fail('Encaixe inválido (use posições 0, 1 ou 2).');
    }
    if (s.fieldKit.slots[slot] !== null) {
      return fail(`O encaixe ${slot} já está ocupado (sobreposição bloqueada).`);
    }
    if (s.fieldKit.stock[p.pieceId] <= 0 || s.fieldKit.slots.includes(p.pieceId)) {
      return fail('Esta peça já está instalada ou indisponível no kit.');
    }
    if (r.battery < FIELD_KIT_COST_KWH) {
      return fail(`Energia insuficiente (${fmtPt(FIELD_KIT_COST_KWH)} kWh) para fixar a peça.`);
    }
    const before = r.battery;
    r.battery -= FIELD_KIT_COST_KWH;
    r.energyUsed += FIELD_KIT_COST_KWH;
    s.fieldKit.escrowKwh = Number((s.fieldKit.escrowKwh + FIELD_KIT_COST_KWH).toFixed(6));
    s.fieldKit.stock[p.pieceId]--;
    s.fieldKit.slots[slot] = p.pieceId;
    s.fieldKit.lastPlacedSlot = slot;
    s.pipTelemetryRangeM = computePipTelemetryRangeM(s);
    addLog(
      s,
      'field-kit',
      `Peça modular ${pieceLabel} instalada no encaixe ${slot} (-${fmtPt(FIELD_KIT_COST_KWH)} kWh).`,
      before,
      r.battery,
      'kWh',
    );
    events.push(`kit-install-${p.pieceId}`);
    return ok(`Peça ${pieceLabel} encaixada no espaço ${slot}.`);
  }

  if (action === 'removeFieldKitPiece' || action === 'undoFieldKit') {
    if (s.region !== 'habitat') {
      return fail('Remova ou desfaça peças do kit modular na Base Aurora.');
    }
    const findLastOccupiedSlot = (): number => {
      for (let i = s.fieldKit.slots.length - 1; i >= 0; i -= 1) {
        if (s.fieldKit.slots[i] !== null) return i;
      }
      return -1;
    };
    const p = (_payload ?? {}) as { slot?: unknown; pieceId?: unknown };
    let targetSlot = -1;
    if (action === 'undoFieldKit') {
      if (s.fieldKit.lastPlacedSlot !== null && s.fieldKit.slots[s.fieldKit.lastPlacedSlot] !== null) {
        targetSlot = s.fieldKit.lastPlacedSlot;
      } else {
        targetSlot = findLastOccupiedSlot();
      }
    } else if (typeof p.slot === 'number' && Number.isInteger(p.slot) && p.slot >= 0 && p.slot < FIELD_KIT_SLOTS) {
      targetSlot = p.slot;
    } else if (typeof p.pieceId === 'string') {
      targetSlot = s.fieldKit.slots.indexOf(p.pieceId as FieldKitPieceId);
    }
    if (targetSlot < 0 || s.fieldKit.slots[targetSlot] === null) {
      return fail('Nenhuma peça instalada nesse encaixe para remover.');
    }
    const pieceId = s.fieldKit.slots[targetSlot]!;
    const pieceLabel = FIELD_KIT_LABELS_PT[pieceId];
    s.fieldKit.slots[targetSlot] = null;
    s.fieldKit.stock[pieceId] = Math.min(1, s.fieldKit.stock[pieceId] + 1);
    const refund = Math.min(FIELD_KIT_COST_KWH, s.fieldKit.escrowKwh);
    const headroom = Math.max(0, 12 - r.battery);
    const restored = Math.min(refund, headroom);
    const curtailed = refund - restored;
    const before = r.battery;
    r.battery += restored;
    r.energyCurtailed += curtailed;
    r.energyUsed = Math.max(0, Number((r.energyUsed - refund).toFixed(6)));
    s.fieldKit.escrowKwh = Math.max(0, Number((s.fieldKit.escrowKwh - refund).toFixed(6)));
    const remainingLastSlot = findLastOccupiedSlot();
    s.fieldKit.lastPlacedSlot = remainingLastSlot === -1 ? null : remainingLastSlot;
    s.pipTelemetryRangeM = computePipTelemetryRangeM(s);
    addLog(
      s,
      'field-kit',
      `Peça ${pieceLabel} removida do encaixe ${targetSlot}; custo (${fmtPt(refund)} kWh) devolvido.`,
      before,
      r.battery,
      'kWh',
    );
    events.push(`kit-remove-${pieceId}`);
    return ok(`Peça ${pieceLabel} removida e energia devolvida sem duplicação.`);
  }

  if (action === 'deliverSample') {
    if (f.expedition) return fail('Retorne à base Aurora antes de entregar a amostra.');
    if (r.samples <= 0) return fail('Colete uma amostra de gelo no cânion primeiro.');
    if (s.sampleProcessingRemaining > 0) return fail('Uma amostra já está em processamento.');
    r.deliveredIce += r.samples;
    r.samples = 0;
    f.sampleDelivered = true;
    s.sampleProcessingRemaining = 10;
    record(
      'sample-delivered',
      'Amostra de gelo entregue para 10 segundos de processamento com energia.',
    );
    return ok('Amostra entregue. O processamento consome energia por 10 segundos.');
  }

  if (action === 'shelter') {
    if (f.expedition) return fail('Retorne à base Aurora antes de entrar no abrigo.');
    if (f.sheltered) return fail('A tripulação já está abrigada.');
    f.sheltered = true;
    s.episode.currentBeatId = getActiveEpisodeBeat(s);
    record('shelter', 'Tripulação entrou no abrigo contra radiação.');
    return ok('Tripulação abrigada.');
  }

  if (action === 'exitShelter') {
    if (!f.sheltered) return fail('A tripulação não está no abrigo.');
    if (s.storm === 'active') return fail('Aguarde a tempestade passar antes de sair do abrigo.');
    f.sheltered = false;
    s.episode.currentBeatId = getActiveEpisodeBeat(s);
    record('exit-shelter', 'Tripulação saiu do abrigo.');
    return ok('Tripulação saiu do abrigo.');
  }

  return fail('Ação indisponível.');
}

/** Reject malformed and obsolete simulation states rather than silently manufacturing resources. */
export function normalizeGame(save: unknown): GameState {
  if (!save || typeof save !== 'object') throw new Error('Arquivo de simulação inválido.');
  const s = save as GameState;
  const template = createGame();
  function validShape(value: unknown, shape: unknown): boolean {
    if (shape === null) return value === null || typeof value === 'number' || typeof value === 'string';
    if (Array.isArray(shape)) return Array.isArray(value);
    if (shape && typeof shape === 'object') {
      return (
        !!value &&
        typeof value === 'object' &&
        !Array.isArray(value) &&
        Object.entries(shape).every(([key, v]) => validShape((value as Record<string, unknown>)[key], v))
      );
    }
    return typeof value === typeof shape && (typeof value !== 'number' || Number.isFinite(value));
  }

  if (
    !validShape(s, template) ||
    s.version !== 3 ||
    !['academy', 'orbit', 'lunar', 'complete', 'failed'].includes(s.phase) ||
    !['academy', 'orbit', 'habitat', 'canyon', 'greenhouse'].includes(s.region) ||
    !['clear', 'warning', 'active'].includes(s.storm) ||
    s.tick < 0 ||
    !Number.isInteger(s.tick) ||
    s.lunarTick < 0 ||
    !Number.isInteger(s.lunarTick) ||
    s.remainder < 0 ||
    s.remainder >= 1 ||
    s.health < 0 ||
    s.health > 100 ||
    s.cropGrowth < 0 ||
    s.cropGrowth > 180 ||
    s.academyBattery < 0 ||
    s.academyBattery > 10 ||
    s.pipBattery < 0 ||
    s.pipBattery > 1.5 ||
    s.pipTelemetryRangeM < 0 ||
    s.discoveryXp < 0 ||
    !Number.isInteger(s.discoveryXp) ||
    s.scoutScans < 0 ||
    !Number.isInteger(s.scoutScans)
  ) {
    throw new Error('Save inválido ou incompatível.');
  }

  if (
    (s.phase === 'academy' && s.region !== 'academy') ||
    (s.phase === 'orbit' && s.region !== 'orbit') ||
    (s.phase === 'lunar' && !['habitat', 'canyon', 'greenhouse'].includes(s.region)) ||
    (s.phase === 'lunar' && s.flags.expedition !== (s.region === 'canyon')) ||
    (s.phase === 'lunar' && !s.flags.landed) ||
    (s.phase === 'orbit' && s.flags.landed)
  ) {
    throw new Error('Fase ou região inconsistente no save.');
  }

  if (
    Object.values(s.resources).some((n) => n < 0) ||
    s.resources.battery > 12 ||
    s.resources.companionBattery > 2 ||
    s.resources.ice > 8 ||
    s.resources.parts > 2 ||
    s.resources.samples > 0.5 ||
    s.resources.processedIce > s.resources.deliveredIce ||
    s.resources.deliveredIce + s.resources.samples + s.resources.ice > 8 + 1e-8 ||
    Math.abs(s.resources.energyLossKwh - (s.resources.chargeLoss + s.resources.dischargeLoss)) > 1e-6
  ) {
    throw new Error('Valores de recursos inválidos ou fora de conservação.');
  }

  if (
    s.orbitAssisted !== true ||
    s.cargoCapacityKg !== CARGO_CAPACITY_KG ||
    s.cargoMassKg < 0 ||
    s.cargoMassKg > s.cargoCapacityKg ||
    s.loadoutCapacityKg !== LOADOUT_CAPACITY_KG ||
    s.loadoutMassKg < 0 ||
    s.loadoutMassKg > s.loadoutCapacityKg ||
    !s.selectedCargoIds.every((id) => typeof id === 'string' && !!ORBIT_CARGO_ITEMS[id]) ||
    !s.selectedLoadoutIds.every((id) => typeof id === 'string' && !!FIELD_LOCKER_ITEMS[id]) ||
    s.academyGenerationKw !== 20 ||
    (s.academyDemandKw !== 12 && s.academyDemandKw !== 38)
  ) {
    throw new Error('Orçamento de massa ou parâmetros de academia inválidos.');
  }

  if (
    !['follow', 'wait', 'recall'].includes(s.cometa.mode) ||
    !['academy', 'orbit', 'habitat', 'canyon', 'greenhouse'].includes(s.cometa.region) ||
    Math.abs(s.cometa.safePos.x) >= 100 ||
    Math.abs(s.cometa.safePos.z) >= 100 ||
    !Number.isInteger(s.cometa.petCount) ||
    s.cometa.petCount < 0 ||
    !Number.isInteger(s.cometa.sniffCount) ||
    s.cometa.sniffCount < 0 ||
    !Number.isInteger(s.cometa.beaconLookCount) ||
    s.cometa.beaconLookCount < 0 ||
    s.cometa.lifeSupportModel !== 'crew_aggregate_didactic'
  ) {
    throw new Error('Estado do buddy Cometa inválido.');
  }

  const installedAux = AUX_BAY_PORTS.filter((p) => s.auxBay.ports[p]).length;
  if (s.auxBay.installedCount !== installedAux) {
    throw new Error('Estado da baía de rede auxiliar inconsistente.');
  }

  if (s.fieldKit.slots.length !== FIELD_KIT_SLOTS) {
    throw new Error('Encaixes do kit modular inválidos.');
  }
  const seenPieces = new Set<FieldKitPieceId>();
  for (const slotPiece of s.fieldKit.slots) {
    if (slotPiece === null) continue;
    if (!FIELD_KIT_PIECES.includes(slotPiece) || seenPieces.has(slotPiece)) {
      throw new Error('Peças inválidas ou duplicadas nos encaixes do kit modular.');
    }
    seenPieces.add(slotPiece);
  }
  for (const piece of FIELD_KIT_PIECES) {
    const stockCount = s.fieldKit.stock[piece];
    const placedCount = seenPieces.has(piece) ? 1 : 0;
    if (!Number.isInteger(stockCount) || stockCount < 0 || stockCount + placedCount !== 1) {
      throw new Error('Estoque inconsistente do kit modular.');
    }
  }
  if (
    Math.abs(s.fieldKit.escrowKwh - seenPieces.size * FIELD_KIT_COST_KWH) > 1e-6 ||
    s.resources.energyUsed + 1e-6 < s.fieldKit.escrowKwh ||
    (s.fieldKit.lastPlacedSlot !== null &&
      (!Number.isInteger(s.fieldKit.lastPlacedSlot) ||
        s.fieldKit.lastPlacedSlot < 0 ||
        s.fieldKit.lastPlacedSlot >= FIELD_KIT_SLOTS))
  ) {
    throw new Error('Conservação de energia do kit modular violada.');
  }

  const validStatuses: readonly DiscoveryStatus[] = [
    'unavailable',
    'detectable',
    'observed',
    'investigating',
    'resolved',
    'deferred',
  ];
  for (const id of ['com03_unplugged_cable', 'canyon_ice_strata', 'solar_dust_attenuation'] as const) {
    const d = s.discoveries[id];
    if (
      d.id !== id ||
      !validStatuses.includes(d.status) ||
      !['fictional_abstraction', 'verified_telemetry'].includes(d.sourceKind)
    ) {
      throw new Error('Registro de descoberta de campo inválido.');
    }
  }

  if (
    !BEAT_IDS.includes(s.episode.currentBeatId) ||
    !s.episode.visitedBeats.every((b) => BEAT_IDS.includes(b)) ||
    !s.episode.skippedBeats.every((b) => BEAT_IDS.includes(b)) ||
    !['undecided', 'shed', 'keep_secondary'].includes(s.episode.choices.academyLoad) ||
    !['undecided', 'early_plant', 'deferred_plant'].includes(s.episode.choices.cropTiming) ||
    s.episode.dialogueHistory.length > 100
  ) {
    throw new Error('Estado de episódio narrativo inválido.');
  }

  if (
    !Number.isInteger(s.seed) ||
    !Number.isInteger(s.flags.academyStableTicks) ||
    s.flags.academyStableTicks < 0 ||
    !Number.isInteger(s.blackouts) ||
    s.blackouts < 0 ||
    !Number.isInteger(s.scoutRepairRemaining) ||
    !Number.isInteger(s.sampleProcessingRemaining) ||
    s.powerSupply < 0 ||
    s.powerDemand < 0 ||
    Object.values(s.modules).some(
      (mod) =>
        mod.integrity < 0 ||
        mod.integrity > 1 ||
        mod.repairRemaining < 0 ||
        !Number.isInteger(mod.repairRemaining),
    ) ||
    s.scoutRepairRemaining < 0 ||
    s.sampleProcessingRemaining < 0 ||
    s.log.length > 100 ||
    s.awarded.length > 100 ||
    !s.awarded.every((v) => typeof v === 'string') ||
    !s.log.every(
      (v) =>
        v &&
        typeof v.tick === 'number' &&
        Number.isFinite(v.tick) &&
        v.tick >= 0 &&
        Number.isInteger(v.tick) &&
        v.tick <= s.tick &&
        typeof v.kind === 'string' &&
        typeof v.text === 'string' &&
        (v.before === undefined || (typeof v.before === 'number' && Number.isFinite(v.before))) &&
        (v.after === undefined || (typeof v.after === 'number' && Number.isFinite(v.after))) &&
        (v.unit === undefined || typeof v.unit === 'string'),
    )
  ) {
    throw new Error('Dados inválidos no arquivo de save.');
  }

  return clone(s);
}

/**
 * Migrates legacy simulation snapshots (v1/v2) into strict v3 GameState without inventing missing reserves.
 */
export function migrateSimulationState(raw: unknown): GameState {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('Simulação ausente ou corrompida.');
  }
  const src = raw as Record<string, unknown>;
  const ver = src.version;
  if (ver === 3) {
    return normalizeGame(src);
  }
  if (ver !== 1 && ver !== 2) {
    throw new Error('Versão da simulação não suportada.');
  }

  const seed =
    typeof src.seed === 'number' && Number.isFinite(src.seed) ? Math.floor(src.seed) : 42;
  const template = createGame({ seed });
  const rawRes =
    src.resources && typeof src.resources === 'object'
      ? (src.resources as Record<string, unknown>)
      : {};
  const rawFlags =
    src.flags && typeof src.flags === 'object' ? (src.flags as Record<string, unknown>) : {};
  const rawMods =
    src.modules && typeof src.modules === 'object' ? (src.modules as Record<string, unknown>) : {};

  // Never manufacture primary finite reserves (`battery`, `potable`, `oxygen`, `food`, `ice`).
  const requiredPrimary = ['battery', 'potable', 'oxygen', 'food', 'ice'];
  for (const key of requiredPrimary) {
    if (typeof rawRes[key] !== 'number' || !Number.isFinite(rawRes[key])) {
      throw new Error(`Reserva obrigatória ausente no save legado (${key}).`);
    }
  }

  const chargeLoss = typeof rawRes.chargeLoss === 'number' ? rawRes.chargeLoss : 0;
  const dischargeLoss = typeof rawRes.dischargeLoss === 'number' ? rawRes.dischargeLoss : 0;

  const region: RegionId =
    src.region === 'academy' ||
    src.region === 'orbit' ||
    src.region === 'habitat' ||
    src.region === 'canyon' ||
    src.region === 'greenhouse'
      ? src.region
      : template.region;
  const phase: Phase =
    src.phase === 'academy' ||
    src.phase === 'orbit' ||
    src.phase === 'lunar' ||
    src.phase === 'complete' ||
    src.phase === 'failed'
      ? src.phase
      : template.phase;

  const landed =
    typeof rawFlags.landed === 'boolean'
      ? rawFlags.landed
      : phase === 'lunar' || phase === 'complete' || phase === 'failed';
  const cargo = typeof rawFlags.cargo === 'boolean' ? rawFlags.cargo : landed;
  const loadout = typeof rawFlags.loadout === 'boolean' ? rawFlags.loadout : false;
  const loadShed = typeof rawFlags.loadShed === 'boolean' ? rawFlags.loadShed : false;
  const planted = typeof rawFlags.planted === 'boolean' ? rawFlags.planted : false;
  const scoutRecruited =
    typeof rawFlags.scoutRecruited === 'boolean' ? rawFlags.scoutRecruited : false;
  const scoutRepaired =
    typeof rawFlags.scoutRepaired === 'boolean' ? rawFlags.scoutRepaired : scoutRecruited;

  const companionBattery =
    typeof rawRes.companionBattery === 'number' ? rawRes.companionBattery : 2;
  const anchor = REGION_SAFE_ANCHORS[region];
  const discoveries = createInitialDiscoveries();
  if (landed) {
    discoveries.solar_dust_attenuation.status = 'detectable';
  }
  if (region === 'canyon' || scoutRepaired || (typeof rawRes.deliveredIce === 'number' && rawRes.deliveredIce > 0)) {
    discoveries.com03_unplugged_cable.status = 'detectable';
    discoveries.canyon_ice_strata.status = 'detectable';
  }

  const migrated: GameState = {
    ...template,
    version: 3,
    seed,
    tick: typeof src.tick === 'number' ? src.tick : 0,
    remainder: typeof src.remainder === 'number' ? src.remainder : 0,
    phase,
    region,
    lunarTick: typeof src.lunarTick === 'number' ? src.lunarTick : 0,
    orbitAssisted: true,
    cargoCapacityKg: CARGO_CAPACITY_KG,
    cargoMassKg: cargo ? 40 : 0,
    selectedCargoIds: cargo ? [...DEFAULT_CARGO_IDS] : [],
    loadoutCapacityKg: LOADOUT_CAPACITY_KG,
    loadoutMassKg: loadout ? 15 : 0,
    selectedLoadoutIds: loadout ? [...DEFAULT_LOADOUT_IDS] : [],
    academyGenerationKw: 20,
    academyDemandKw: loadShed ? 12 : 38,
    resources: {
      ...template.resources,
      battery: rawRes.battery as number,
      potable: rawRes.potable as number,
      wastewater: typeof rawRes.wastewater === 'number' ? rawRes.wastewater : 2,
      oxygen: rawRes.oxygen as number,
      hydrogen: typeof rawRes.hydrogen === 'number' ? rawRes.hydrogen : 0,
      food: rawRes.food as number,
      ice: rawRes.ice as number,
      samples: typeof rawRes.samples === 'number' ? rawRes.samples : 0,
      deliveredIce: typeof rawRes.deliveredIce === 'number' ? rawRes.deliveredIce : 0,
      processedIce: typeof rawRes.processedIce === 'number' ? rawRes.processedIce : 0,
      crewWaterConsumed:
        typeof rawRes.crewWaterConsumed === 'number' ? rawRes.crewWaterConsumed : 0,
      crewOxygenConsumed:
        typeof rawRes.crewOxygenConsumed === 'number' ? rawRes.crewOxygenConsumed : 0,
      crewFoodConsumed:
        typeof rawRes.crewFoodConsumed === 'number' ? rawRes.crewFoodConsumed : 0,
      waterElectrolysed:
        typeof rawRes.waterElectrolysed === 'number' ? rawRes.waterElectrolysed : 0,
      generatedOxygen: typeof rawRes.generatedOxygen === 'number' ? rawRes.generatedOxygen : 0,
      generatedHydrogen:
        typeof rawRes.generatedHydrogen === 'number' ? rawRes.generatedHydrogen : 0,
      energyGenerated: typeof rawRes.energyGenerated === 'number' ? rawRes.energyGenerated : 0,
      energyUsed: typeof rawRes.energyUsed === 'number' ? rawRes.energyUsed : 0,
      energyCurtailed: typeof rawRes.energyCurtailed === 'number' ? rawRes.energyCurtailed : 0,
      chargeLoss,
      dischargeLoss,
      energyLossKwh: chargeLoss + dischargeLoss,
      recyclerLoss: typeof rawRes.recyclerLoss === 'number' ? rawRes.recyclerLoss : 0,
      cropWater: typeof rawRes.cropWater === 'number' ? rawRes.cropWater : 0,
      companionBattery,
      parts: typeof rawRes.parts === 'number' ? rawRes.parts : ver === 1 ? 2 : -1,
    },
    modules: {
      power: (rawMods.power as Module) ?? template.modules.power,
      water: (rawMods.water as Module) ?? template.modules.water,
      oxygen: (rawMods.oxygen as Module) ?? template.modules.oxygen,
      crop: (rawMods.crop as Module) ?? template.modules.crop,
    },
    flags: {
      diagnosed: Boolean(rawFlags.diagnosed),
      loadShed,
      academyStableTicks:
        typeof rawFlags.academyStableTicks === 'number' ? rawFlags.academyStableTicks : 0,
      cargo,
      landed,
      planted,
      harvested: Boolean(rawFlags.harvested),
      scoutRepaired,
      scoutRecruited,
      scoutStrandedOutOfCharge: scoutRecruited && companionBattery <= 0.1 + 1e-9,
      sampleDelivered: Boolean(rawFlags.sampleDelivered),
      stormSurvived: Boolean(rawFlags.stormSurvived),
      sheltered: Boolean(rawFlags.sheltered),
      loadout,
      expedition: typeof rawFlags.expedition === 'boolean' ? rawFlags.expedition : region === 'canyon',
      solarScanned: Boolean(rawFlags.solarScanned),
      waterScanned: Boolean(rawFlags.waterScanned),
    },
    academyBattery: typeof src.academyBattery === 'number' ? src.academyBattery : template.academyBattery,
    cropGrowth: typeof src.cropGrowth === 'number' ? src.cropGrowth : 0,
    scoutRepairRemaining: typeof src.scoutRepairRemaining === 'number' ? src.scoutRepairRemaining : 0,
    sampleProcessingRemaining:
      typeof src.sampleProcessingRemaining === 'number' ? src.sampleProcessingRemaining : 0,
    storm:
      src.storm === 'clear' || src.storm === 'warning' || src.storm === 'active'
        ? src.storm
        : 'clear',
    health: typeof src.health === 'number' ? src.health : 100,
    powerSupply: typeof src.powerSupply === 'number' ? src.powerSupply : 0,
    powerDemand: typeof src.powerDemand === 'number' ? src.powerDemand : 0,
    blackouts: typeof src.blackouts === 'number' ? src.blackouts : 0,
    cometa: {
      ...template.cometa,
      region,
      safeTargetId: anchor.targetId,
      safePos: { ...anchor.pos },
    },
    discoveries,
    episode: {
      ...template.episode,
      choices: {
        academyLoad: loadShed ? 'shed' : 'undecided',
        cropTiming: planted ? 'early_plant' : 'undecided',
        tone: {},
      },
    },
    log: Array.isArray(src.log) ? (src.log as Evidence[]) : [],
    awarded: Array.isArray(src.awarded) ? (src.awarded as string[]) : [],
  };
  migrated.episode.currentBeatId = getActiveEpisodeBeat(migrated);
  return normalizeGame(migrated);
}

export function getTelemetry(s: GameState) {
  return {
    tick: s.tick,
    lunarTick: s.lunarTick,
    phase: s.phase,
    region: s.region,
    orbitAssisted: s.orbitAssisted,
    academyGenerationKw: s.academyGenerationKw,
    academyDemandKw: s.academyDemandKw,
    battery: s.resources.battery,
    batteryCapacity: 12,
    powerSupply: s.powerSupply,
    powerDemand: s.powerDemand,
    energyLossKwh: s.resources.energyLossKwh,
    chargeLoss: s.resources.chargeLoss,
    dischargeLoss: s.resources.dischargeLoss,
    potable: s.resources.potable,
    wastewater: s.resources.wastewater,
    oxygen: s.resources.oxygen,
    hydrogen: s.resources.hydrogen,
    food: s.resources.food,
    ice: s.resources.ice,
    samples: s.resources.samples,
    parts: s.resources.parts,
    companionBattery: s.resources.companionBattery,
    scoutBattery: s.resources.companionBattery,
    scoutStrandedOutOfCharge: s.flags.scoutStrandedOutOfCharge,
    pipBattery: s.pipBattery,
    pipTelemetryRangeM: s.pipTelemetryRangeM,
    cargoMassKg: s.cargoMassKg,
    cargoCapacityKg: s.cargoCapacityKg,
    loadoutMassKg: s.loadoutMassKg,
    loadoutCapacityKg: s.loadoutCapacityKg,
    cropGrowth: s.cropGrowth,
    storm: s.storm,
    health: s.health,
    activeBeatId: getActiveEpisodeBeat(s),
    cometa: clone(s.cometa),
    auxBay: clone(s.auxBay),
    fieldKit: clone(s.fieldKit),
    modules: clone(s.modules),
  };
}

export function getObjectives(s: GameState): Objective[] {
  const f = s.flags;
  const m = s.modules;
  return [
    {
      id: 'diagnose',
      title: 'Investigar a queda no treino',
      description: 'Inspecione a bateria em queda e registre uma possível causa.',
      targetWorldId: 'academy-console',
      complete: f.diagnosed,
    },
    {
      id: 'balance',
      title: 'Equilibrar a carga da academia',
      description: 'Reduza a carga secundária e observe 15 segundos de recuperação.',
      targetWorldId: 'academy-console',
      complete: f.academyStableTicks >= 15,
    },
    {
      id: 'depart',
      title: 'Seguir para o treinador orbital',
      description: 'Conclua o ensaio e embarque rumo à órbita assistida.',
      targetWorldId: 'academy-launch',
      complete: s.phase !== 'academy',
    },
    {
      id: 'cargo',
      title: 'Fixar a carga dentro do orçamento',
      description: 'Selecione e prenda a carga respeitando o limite de 45 kg.',
      targetWorldId: 'cargo',
      complete: f.cargo,
    },
    {
      id: 'land',
      title: 'Alcançar a Base Aurora',
      description: 'Use a transferência lunar após assegurar a carga.',
      targetWorldId: 'lunar-transfer',
      complete: f.landed,
    },
    {
      id: 'power',
      title: 'Restaurar a rede elétrica',
      description: 'Repare o banco de baterias; observe geração e demanda.',
      targetWorldId: 'battery-bank',
      complete: m.power.connected,
    },
    {
      id: 'water',
      title: 'Restaurar o reciclador de água',
      description: 'Repare o reciclador e acompanhe os tanques de água potável e residual.',
      targetWorldId: 'water-recycler',
      complete: m.water.connected,
    },
    {
      id: 'oxygen',
      title: 'Restaurar a geração de oxigênio',
      description: 'Repare o eletrolisador. Produzir O₂ consome água e eletricidade.',
      targetWorldId: 'oxygen-generator',
      complete: m.oxygen.connected,
    },
    {
      id: 'crop',
      title: 'Iniciar o cultivo alimentar',
      description: 'Plante e alimente as luzes de cultivo por 180 segundos úteis.',
      targetWorldId: 'crop-bed',
      complete: f.planted,
    },
    {
      id: 'loadout',
      title: 'Preparar ferramentas de campo',
      description: 'Escolha os instrumentos no armário respeitando o limite de 18 kg.',
      targetWorldId: 'field-locker',
      complete: f.loadout,
    },
    {
      id: 'expedition',
      title: 'Explorar o cânion',
      description: 'Parta com suporte à vida ativo e reservas mínimas garantidas.',
      targetWorldId: 'expedition-gate',
      complete: f.expedition || f.scoutRecruited || f.sampleDelivered,
    },
    {
      id: 'scout',
      title: 'Reparar e recrutar Scout',
      description: 'Use 1 peça, 0,3 kWh e 5 segundos para reparar Scout e depois convide-o.',
      targetWorldId: 'damaged-scout',
      complete: f.scoutRecruited,
    },
    {
      id: 'sample',
      title: 'Trazer e processar gelo',
      description: 'Colete 0,5 kg de gelo finito e entregue na central para processamento.',
      targetWorldId: f.expedition ? 'ice-deposit' : 'mission-console',
      complete: f.sampleDelivered && s.resources.processedIce > 0,
    },
    {
      id: 'storm',
      title: 'Proteger a tripulação da tempestade',
      description: 'Abrigue a tripulação durante o alerta e atravesse o ciclo de radiação.',
      targetWorldId: 'habitat-shelter',
      complete: f.stormSurvived,
    },
    {
      id: 'harvest',
      title: 'Colher o alimento maduro',
      description: 'Retorne ao canteiro após 180 segundos alimentados com água.',
      targetWorldId: 'crop-bed',
      complete: f.harvested,
    },
  ];
}

export function getReport(s: GameState) {
  return {
    complete: s.phase === 'complete',
    safety: {
      health: s.health,
      stormSurvived: s.flags.stormSurvived,
      blackoutTicks: s.blackouts,
    },
    stability: {
      power: s.modules.power.connected,
      water: s.modules.water.connected,
      oxygen: s.modules.oxygen.connected,
      battery: s.resources.battery,
      potable: s.resources.potable,
      oxygenReserve: s.resources.oxygen,
      energyLossKwh: s.resources.energyLossKwh,
    },
    decisions: {
      loadShed: s.flags.loadShed,
      academyLoad: s.episode.choices.academyLoad,
      cropTiming: s.episode.choices.cropTiming,
      cargoMassKg: s.cargoMassKg,
      loadoutMassKg: s.loadoutMassKg,
      scoutRecruited: s.flags.scoutRecruited,
      scoutScans: s.scoutScans,
      sampleProcessed: s.resources.processedIce,
      cropHarvested: s.flags.harvested,
      auxPortsInstalled: AUX_BAY_PORTS.filter((p) => s.auxBay.ports[p]),
      fieldKitPlaced: s.fieldKit.slots.filter((p): p is FieldKitPieceId => p !== null),
      cometaEnabled: s.cometa.enabled,
      lifeSupportModel: s.cometa.lifeSupportModel,
    },
    discoveries: clone(s.discoveries),
    discoveryXp: s.discoveryXp,
    episode: {
      activeBeatId: getActiveEpisodeBeat(s),
      visitedBeats: [...s.episode.visitedBeats],
      skippedBeats: [...s.episode.skippedBeats],
      toneChoices: { ...s.episode.choices.tone },
    },
    understanding: {
      hypothesesRecorded: [
        s.flags.diagnosed ? 'carga na academia' : null,
        s.flags.solarScanned ? 'balanço elétrico' : null,
        s.flags.waterScanned ? 'balanço hídrico' : null,
      ].filter(Boolean),
      note: 'Essas observações registram ações e evidências da sessão; elas não validam aprendizagem.',
    },
    evidence: clone(s.log),
  };
}

/** Stable FNV-1a digest for deterministic replay comparisons, not a security hash. */
export function hashState(s: GameState): string {
  const text = JSON.stringify(s);
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}
