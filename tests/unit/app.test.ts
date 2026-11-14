import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { episode01Beats } from '../../src/app/catalogue';
import { MissionClock } from '../../src/app/clock';
import {
  decodeSave,
  loadSavedFile,
  newSave,
  persistSavedFile,
  SAVE_KEY,
  snapshot,
  type StorageLike,
} from '../../src/app/save';
import { applyAction, BEAT_IDS, createGame, hashState, stepGame } from '../../src/simulation';

describe('mission integration', () => {
  it('produces identical ticks across render schedules and explicitly pauses background time', () => {
    const a = new MissionClock();
    const b = new MissionClock();
    a.reset(0);
    b.reset(0);
    let sa = newSave().current.simulation;
    let sb = newSave().current.simulation;
    for (let t = 50; t <= 10000; t += 50) sa = stepGame(sa, a.advance(t, false));
    for (const t of [10, 230, 400, 1000, 1900, 3500, 10000]) sb = stepGame(sb, b.advance(t, false));
    expect(sa.tick).toBe(10);
    expect(sb.tick).toBe(sa.tick);
    expect(sa.academyBattery).toBe(sb.academyBattery);
    expect(a.advance(60000, true)).toBe(0);
    expect(a.advance(61000, false)).toBe(1);
    expect(a.advance(62000, false, Number.NaN)).toBe(0);
  });

  it('round trips the full v4 snapshot including cadetAppearance, cometa, uiPrefs, auxBay, and fieldKit', () => {
    const f = newSave({
      cadetAppearance: { suitAccent: 'cyan', visorTone: 'slate', skinTone: 'deep' },
    });
    let sim = stepGame(applyAction(f.current.simulation, 'diagnoseAcademy').state, 2.5);
    sim = applyAction(sim, 'shedLoad').state;
    sim = stepGame(sim, 15);
    sim = applyAction(sim, 'finishAcademy').state;
    sim = applyAction(sim, 'collectCargo').state;
    sim = applyAction(sim, 'land').state;
    sim = applyAction(sim, 'repairPower').state;
    sim = stepGame(sim, 5);
    sim = applyAction(sim, 'installAuxPort', { port: 'power' }).state;
    sim = applyAction(sim, 'installFieldKitPiece', { pieceId: 'relay_mast', slot: 1 }).state;
    sim = applyAction(sim, 'setCometaMode', { mode: 'wait' }).state;

    f.current = snapshot(sim);
    f.cometa = structuredClone(f.current.cometa!);
    f.uiPrefs.compactHud = true;

    const before = hashState(f.current.simulation);
    const copy = decodeSave(JSON.stringify(f));
    expect(copy.version).toBe(4);
    expect(hashState(copy.current.simulation)).toBe(before);
    expect(copy.cadetAppearance).toEqual({ suitAccent: 'cyan', visorTone: 'slate', skinTone: 'deep' });
    expect(copy.cometa.mode).toBe('wait');
    expect(copy.uiPrefs.compactHud).toBe(true);
    expect(copy.current.simulation.auxBay.ports.power).toBe(true);
    expect(copy.current.simulation.fieldKit.slots).toEqual([null, 'relay_mast', null]);
    expect(copy.checkpoint.simulation.tick).toBe(0);

    copy.current = snapshot(copy.checkpoint.simulation);
    expect(copy.current.simulation.resources).toEqual(f.checkpoint.simulation.resources);
  });

  it('migrates valid v1, v2, and v3 saves cleanly to v4 without inventing missing reserves', () => {
    const base = createGame();
    // Build a legacy v2-shaped simulation object as shipped in SaveFile v3.
    const legacySimV2 = {
      version: 2,
      seed: base.seed,
      tick: 20,
      remainder: 0.5,
      phase: 'orbit',
      region: 'orbit',
      lunarTick: 0,
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
        recyclerLoss: 0,
        cropWater: 0,
        companionBattery: 2,
        parts: 2,
      },
      modules: base.modules,
      flags: {
        diagnosed: true,
        loadShed: true,
        academyStableTicks: 15,
        cargo: false,
        landed: false,
        planted: false,
        harvested: false,
        scoutRepaired: false,
        scoutRecruited: false,
        sampleDelivered: false,
        stormSurvived: false,
        sheltered: false,
        loadout: false,
        expedition: false,
        solarScanned: false,
        waterScanned: false,
      },
      academyBattery: 7.2,
      cropGrowth: 0,
      scoutRepairRemaining: 0,
      sampleProcessingRemaining: 0,
      storm: 'clear',
      health: 100,
      powerSupply: 0,
      powerDemand: 0,
      blackouts: 0,
      log: [{ tick: 1, kind: 'diagnosis', text: 'Legado' }],
      awarded: ['diagnosis'],
    };

    const v3Raw = JSON.stringify({
      version: 3,
      current: { simulation: legacySimV2 },
      checkpoint: { simulation: legacySimV2 },
      settings: { quality: 'low', reducedMotion: true, largeText: false, speed: 3 },
    });
    const migratedV3 = decodeSave(v3Raw);
    expect(migratedV3.version).toBe(4);
    expect(migratedV3.current.simulation.phase).toBe('orbit');
    expect(migratedV3.settings.speed).toBe(3);
    expect(migratedV3.cometa.region).toBe('orbit');

    const v2Raw = JSON.stringify({
      version: 2,
      current: { simulation: legacySimV2 },
      checkpoint: { simulation: legacySimV2 },
    });
    expect(decodeSave(v2Raw).version).toBe(4);

    const v1Raw = JSON.stringify({
      version: 1,
      simulation: {
        ...legacySimV2,
        version: 1,
      },
    });
    const migratedV1 = decodeSave(v1Raw);
    expect(migratedV1.version).toBe(4);
    expect(migratedV1.current.simulation.resources.battery).toBe(8);

    // Legacy save with negative or missing primary reserves must STILL be rejected.
    const corruptV3 = JSON.stringify({
      version: 3,
      current: {
        simulation: { ...legacySimV2, resources: { ...legacySimV2.resources, battery: -1 } },
      },
      checkpoint: { simulation: legacySimV2 },
    });
    expect(() => decodeSave(corruptV3)).toThrow();
  });

  it('rejects damaged and incompatible saves and handles blocked storage safely', () => {
    const f = newSave();
    f.current.simulation.resources.battery = -1;
    expect(() => decodeSave(JSON.stringify(f))).toThrow();
    expect(() => decodeSave('{}')).toThrow();
    expect(() => decodeSave('{corrupt')).toThrow();
    expect(() => decodeSave(JSON.stringify({ ...f, version: 99 }))).toThrow();
    const wrong = newSave();
    wrong.current.simulation.region = 'canyon';
    expect(() => decodeSave(JSON.stringify(wrong))).toThrow();

    const blockedStorage: StorageLike = {
      getItem() {
        throw new Error('SecurityError');
      },
      setItem() {
        throw new Error('QuotaExceededError');
      },
    };
    const loadBlocked = loadSavedFile(blockedStorage);
    expect(loadBlocked.ok).toBe(false);
    if (!loadBlocked.ok) expect(loadBlocked.reason).toBe('blocked');
    const writeBlocked = persistSavedFile(newSave(), blockedStorage);
    expect(writeBlocked.ok).toBe(false);

    const store = new Map<string, string>([['astra-independent-demo-v3', '{broken json']]);
    const corruptedRead = loadSavedFile({
      getItem: (k) => store.get(k) ?? null,
      setItem: (k, v) => {
        store.set(k, v);
      },
    });
    expect(corruptedRead.ok).toBe(false);
    if (!corruptedRead.ok) expect(corruptedRead.reason).toBe('corrupted');

    // Valid persistence writes to SAVE_KEY cleanly.
    const okWrite = persistSavedFile(newSave(), {
      getItem: (k) => store.get(k) ?? null,
      setItem: (k, v) => {
        store.set(k, v);
      },
    });
    expect(okWrite.ok).toBe(true);
    expect(store.has(SAVE_KEY)).toBe(true);
  });

  it('provides complete 10-beat Episode 01 dialogue catalogue and didactic science audit JSONs', () => {
    expect(Object.keys(episode01Beats)).toEqual([...BEAT_IDS]);
    for (const id of BEAT_IDS) {
      const beat = episode01Beats[id];
      expect(beat.lines.length).toBeGreaterThanOrEqual(2);
      expect(beat.lines.length).toBeLessThanOrEqual(3);
      expect(beat.historyLabel.length).toBeGreaterThan(0);
      expect(beat.toneChoices.length).toBeGreaterThanOrEqual(2);
    }
    const assumptions = JSON.parse(readFileSync('public/science/assumptions.json', 'utf8'));
    const sources = JSON.parse(readFileSync('public/science/sources.json', 'utf8'));
    expect(assumptions.classification).toBe('didactic_hypothesis');
    expect(assumptions.crew_aggregate.includes_optional_cometa_when_active).toBe(true);
    expect(assumptions.orbit.six_dof_implemented).toBe(false);
    expect(sources.parameterProvenance).toBe('didactic_hypothesis');
  });
});
