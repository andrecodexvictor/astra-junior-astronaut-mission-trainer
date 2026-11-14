import { describe, expect, it } from 'vitest';
import {
  applyAction,
  createGame,
  hashState,
  normalizeGame,
  stepGame,
  type Action,
  type GameState,
} from '../../src/simulation';

function act(s: GameState, id: string, payload?: unknown) {
  const r = applyAction(s, id, payload);
  expect(r.ok, `${id}: ${r.message}`).toBe(true);
  return r.state;
}

function lunar() {
  let s = createGame();
  s = act(s, 'diagnoseAcademy');
  s = act(s, 'shedLoad');
  s = stepGame(s, 15);
  s = act(s, 'finishAcademy');
  s = act(s, 'collectCargo');
  return act(s, 'land');
}

function repaired() {
  let s = lunar();
  for (const id of ['repairPower', 'repairWater', 'repairOxygen']) s = act(s, id);
  return stepGame(s, 5);
}

describe('fixed simulation', () => {
  it('conserves electrolysis mass, ice transfers, and electrical energy including 90% losses', () => {
    let s = repaired();
    s = stepGame(s, 100);
    expect(s.resources.generatedOxygen + s.resources.generatedHydrogen).toBeCloseTo(
      s.resources.waterElectrolysed,
      9,
    );
    expect(s.resources.energyLossKwh).toBeCloseTo(
      s.resources.chargeLoss + s.resources.dischargeLoss,
      9,
    );
    expect(
      s.resources.battery +
        s.resources.energyUsed +
        s.resources.chargeLoss +
        s.resources.dischargeLoss +
        s.resources.energyCurtailed,
    ).toBeCloseTo(8 + s.resources.energyGenerated, 8);
    s = act(s, 'chooseLoadout');
    s = act(s, 'launchExpedition');
    s = act(s, 'collectSample');
    expect(s.resources.ice + s.resources.samples).toBeCloseTo(8);
    s = act(s, 'returnExpedition');
    s = act(s, 'deliverSample');
    s = stepGame(s, 10);
    expect(s.resources.ice + s.resources.deliveredIce).toBeCloseTo(8);
    expect(s.resources.processedIce).toBe(0.5);
  });

  it('requires time and pays repair costs once', () => {
    let s = lunar();
    const before = s.resources.battery;
    s = act(s, 'repairPower');
    expect(s.resources.battery).toBeCloseTo(before - 0.2);
    expect(applyAction(s, 'repairPower').ok).toBe(false);
    s = stepGame(s, 4);
    expect(s.modules.power.connected).toBe(false);
    s = stepGame(s, 1);
    expect(s.modules.power.connected).toBe(true);
  });

  it('is deterministic across tick chunking and save/reload', () => {
    const s = repaired();
    const a = stepGame(s, 12.5);
    const b = stepGame(normalizeGame(JSON.parse(JSON.stringify(stepGame(s, 4.25)))), 8.25);
    expect(hashState(a)).toBe(hashState(b));
    expect(() => normalizeGame({ ...s, version: 1 })).toThrow();
    expect(() => normalizeGame({ ...s, version: 2 })).toThrow();
    expect(() => normalizeGame({ ...s, resources: { ...s.resources, battery: -1 } })).toThrow();
  });

  it('gives a warning and makes an unsheltered full storm fatal', () => {
    let s = repaired();
    s = stepGame(s, 175);
    expect(s.storm).toBe('warning');
    s = stepGame(s, 200);
    expect(s.phase).toBe('failed');
  });

  it('replays ordered actions without duplicate awards', () => {
    let s = repaired();
    const actions = ['scanSolar', 'toggleOxygen', 'toggleOxygen', 'scanSolar'];
    let a = s;
    let b = normalizeGame(JSON.parse(JSON.stringify(s)));
    for (const action of actions) {
      a = act(a, action);
      b = act(b, action);
    }
    expect(hashState(a)).toBe(hashState(b));
    expect(a.awarded.filter((id) => id === 'scan-solar')).toHaveLength(1);
    expect(a.awarded.filter((id) => id === 'toggle-oxygen')).toHaveLength(1);
    expect(a.modules.oxygen.enabled).toBe(true);
  });

  it('fails with depleted reserves and leaves checkpoint unchanged', () => {
    const checkpoint = lunar();
    const failing = structuredClone(checkpoint);
    failing.resources.oxygen = 0;
    const failed = stepGame(failing, 700);
    expect(failed.phase).toBe('failed');
    expect(normalizeGame(checkpoint).phase).toBe('lunar');
    expect(checkpoint.resources.oxygen).toBe(0.5);
  });

  it('enforces causal academy blackout choice (keep_secondary drains vs shed recovers)', () => {
    let s = createGame();
    s = act(s, 'diagnoseAcademy');
    s = act(s, 'chooseAcademyLoad', { choice: 'keep_secondary' });
    expect(s.academyDemandKw).toBe(38);
    expect(s.academyGenerationKw).toBe(20);
    s = stepGame(s, 40);
    expect(s.academyBattery).toBe(0);
    expect(s.flags.academyStableTicks).toBe(0);
    expect(applyAction(s, 'finishAcademy').ok).toBe(false);

    // Recovery remains possible even after battery reaches 0 kWh.
    s = act(s, 'chooseAcademyLoad', { choice: 'shed' });
    expect(s.academyDemandKw).toBe(12);
    s = stepGame(s, 15);
    expect(s.flags.academyStableTicks).toBe(15);
    expect(s.academyBattery).toBeCloseTo(1.2, 6);
    s = act(s, 'finishAcademy');
    expect(s.phase).toBe('orbit');
  });

  it('enforces orbit cargo & field locker mass budgets while preserving orbitAssisted', () => {
    let s = createGame();
    s = act(s, 'diagnoseAcademy');
    s = act(s, 'shedLoad');
    s = stepGame(s, 15);
    s = act(s, 'finishAcademy');
    expect(s.orbitAssisted).toBe(true);

    // Overweight cargo (> 45 kg) fails without mutating cargo flag.
    const overweightCargo = applyAction(s, 'collectCargo', {
      itemIds: ['solar_cells', 'water_filter', 'tool_spares', 'heavy_ballast'],
    });
    expect(overweightCargo.ok).toBe(false);
    expect(overweightCargo.state.flags.cargo).toBe(false);

    s = act(s, 'collectCargo', { itemIds: ['solar_cells', 'water_filter', 'tool_spares'] });
    expect(s.cargoMassKg).toBe(36);
    expect(s.cargoCapacityKg).toBe(45);
    s = act(s, 'land');

    // Overweight field locker (> 18 kg) fails cleanly.
    const overweightLocker = applyAction(s, 'chooseLoadout', {
      itemIds: ['diagnostic_multimeter', 'ice_corer', 'repair_kit', 'auxiliary_drill'],
    });
    expect(overweightLocker.ok).toBe(false);
    expect(overweightLocker.state.flags.loadout).toBe(false);

    s = act(s, 'chooseLoadout', {
      itemIds: ['diagnostic_multimeter', 'ice_corer', 'repair_kit', 'thermal_blanket'],
    });
    expect(s.loadoutMassKg).toBe(18);
    expect(s.loadoutCapacityKg).toBe(18);
  });

  it('supports Scout field scans, out-of-charge stranding, rescue recharge, and PIP telemetry state', () => {
    let s = repaired();
    s = act(s, 'chooseLoadout');
    s = act(s, 'launchExpedition');
    s = act(s, 'repairCompanion');
    s = stepGame(s, 5);
    s = act(s, 'recruitCompanion');

    const iceBefore = s.resources.ice;
    // 5 scans of 0.4 kWh drain Scout from 2.0 kWh to 0.0 kWh (<= 0.1 -> stranded)
    for (let i = 0; i < 5; i++) {
      s = act(s, 'dispatchScoutScan', { target: 'ice' });
    }
    expect(s.scoutScans).toBe(5);
    expect(s.resources.ice).toBe(iceBefore); // never creates or consumes ice
    expect(s.resources.companionBattery).toBeCloseTo(0, 6);
    expect(s.flags.scoutStrandedOutOfCharge).toBe(true);
    expect(applyAction(s, 'dispatchScoutScan').ok).toBe(false);

    // Even returning to powered habitat keeps Scout stranded until rescued with rechargeScout.
    s = act(s, 'returnExpedition');
    s = stepGame(s, 5);
    expect(s.flags.scoutStrandedOutOfCharge).toBe(true);

    const batBeforeRescue = s.resources.battery;
    s = act(s, 'rechargeScout');
    expect(s.flags.scoutStrandedOutOfCharge).toBe(false);
    expect(s.resources.companionBattery).toBeCloseTo(0.5, 6);
    expect(s.resources.battery).toBeCloseTo(batBeforeRescue - 0.5, 6);
    expect(
      s.resources.battery +
        s.resources.energyUsed +
        s.resources.chargeLoss +
        s.resources.dischargeLoss +
        s.resources.energyCurtailed,
    ).toBeCloseTo(8 + s.resources.energyGenerated, 8);

    // PIP low battery narrows range without softlocking hints.
    s.pipBattery = 0.05;
    s = stepGame(s, 1);
    expect(s.pipTelemetryRangeM).toBeGreaterThanOrEqual(15);
    expect(applyAction(s, 'scanSolar').ok).toBe(true);
  });

  it('runs field discovery loop without creating resources and tags fictional abstractions', () => {
    let s = repaired();
    s = act(s, 'chooseLoadout');
    s = act(s, 'launchExpedition');

    const snapshotResources = structuredClone(s.resources);
    s = act(s, 'inspectEvidence', { id: 'com03_unplugged_cable' });
    expect(s.discoveries.com03_unplugged_cable.status).toBe('observed');
    s = act(s, 'runFieldProbe', { id: 'com03_unplugged_cable' });
    expect(s.discoveries.com03_unplugged_cable.status).toBe('investigating');
    expect(s.resources.battery).toBeCloseTo(snapshotResources.battery - 0.05, 6);

    // Wrong classification rejects gently and keeps investigating.
    const wrong = applyAction(s, 'classifyDiscovery', {
      id: 'com03_unplugged_cable',
      classification: 'verified_telemetry',
    });
    expect(wrong.ok).toBe(false);
    expect(wrong.state.discoveries.com03_unplugged_cable.status).toBe('investigating');

    s = act(s, 'classifyDiscovery', {
      id: 'com03_unplugged_cable',
      classification: 'fictional_abstraction',
    });
    expect(s.discoveries.com03_unplugged_cable.status).toBe('resolved');
    expect(s.discoveryXp).toBe(25);
    // Repeat is idempotent (no duplicated XP or energy cost).
    s = act(s, 'classifyDiscovery', {
      id: 'com03_unplugged_cable',
      classification: 'fictional_abstraction',
    });
    expect(s.discoveryXp).toBe(25);
    expect(s.resources.ice).toBe(snapshotResources.ice);
    expect(s.resources.potable).toBe(snapshotResources.potable);
    expect(s.resources.oxygen).toBe(snapshotResources.oxygen);
    expect(s.resources.food).toBe(snapshotResources.food);
  });

  it('enforces Cometa pressurized-only sniff and zero resource creation', () => {
    // Academy is pressurized -> sniff allowed.
    let s = createGame();
    const resAcademy = structuredClone(s.resources);
    s = act(s, 'petCometa');
    s = act(s, 'cometaSniff');
    s = act(s, 'cometaLookBeacon');
    expect(s.cometa.petCount).toBe(1);
    expect(s.cometa.sniffCount).toBe(1);
    expect(s.cometa.beaconLookCount).toBe(1);
    expect(s.resources).toEqual(resAcademy);

    // Orbit is NOT pressurized -> sniff strictly rejected.
    s = act(s, 'diagnoseAcademy');
    s = act(s, 'shedLoad');
    s = stepGame(s, 15);
    s = act(s, 'finishAcademy');
    expect(applyAction(s, 'cometaSniff').ok).toBe(false);

    // Lunar habitat exterior is vacuum -> rejected even with caller payload overrides;
    // sheltered or greenhouse -> allowed; canyon -> NEVER allowed.
    s = act(s, 'collectCargo');
    s = act(s, 'land');
    expect(s.region).toBe('habitat');
    expect(s.flags.sheltered).toBe(false);
    expect(applyAction(s, 'cometaSniff').ok).toBe(false);
    expect(applyAction(s, 'cometaSniff', { targetId: 'battery-bank' }).ok).toBe(false);
    expect(
      applyAction(s, 'cometaSniff', {
        pressurized: true,
        area: 'airlock',
        targetId: 'greenhouse-door',
      }).ok,
    ).toBe(false);
    expect(
      applyAction(s, 'cometaSniff', {
        pressurized: true,
        area: 'shelter',
        targetId: 'habitat-shelter',
      }).ok,
    ).toBe(false);

    // Only accepted in habitat when actually sheltered inside the simulation state.
    s = act(s, 'shelter');
    expect(s.flags.sheltered).toBe(true);
    s = act(s, 'cometaSniff');
    expect(s.cometa.sniffCount).toBe(2);
    s = act(s, 'exitShelter');
    expect(
      applyAction(s, 'cometaSniff', {
        pressurized: true,
        area: 'airlock',
        targetId: 'greenhouse-door',
      }).ok,
    ).toBe(false);

    s = act(s, 'travel', { region: 'greenhouse' });
    s = act(s, 'cometaSniff');
    expect(s.cometa.sniffCount).toBe(3);
    s = act(s, 'travel', { region: 'habitat' });

    for (const id of ['repairPower', 'repairWater', 'repairOxygen']) s = act(s, id);
    s = stepGame(s, 5);
    s = act(s, 'chooseLoadout');
    s = act(s, 'launchExpedition');
    expect(applyAction(s, 'cometaSniff').ok).toBe(false);
    expect(applyAction(s, 'cometaSniff', { pressurized: true }).ok).toBe(false);
  });

  it('supports 3-port auxBay and 3-piece fieldKit with conservation, overlap guard, and full undo refund', () => {
    let s = lunar();
    // Cannot install aux port before main module is connected.
    expect(applyAction(s, 'installAuxPort', { port: 'power' }).ok).toBe(false);

    for (const id of ['repairPower', 'repairWater', 'repairOxygen']) s = act(s, id);
    s = stepGame(s, 5);

    const baselineTick = stepGame(s, 1);
    expect(baselineTick.powerSupply).toBeCloseTo(5, 6);

    s = act(s, 'installAuxPort', { port: 'power' });
    expect(applyAction(s, 'installAuxPort', { port: 'power' }).ok).toBe(false);
    const boostedTick = stepGame(s, 1);
    expect(boostedTick.powerSupply).toBeCloseTo(5.5, 6);

    // Disabling or removing stops ghost bonus.
    s = act(s, 'removeAuxPort', { port: 'power' });
    expect(applyAction(s, 'removeAuxPort', { port: 'power' }).ok).toBe(false);
    expect(stepGame(s, 1).powerSupply).toBeCloseTo(5, 6);

    // Field kit: 3 slots, overlap prevention, duplicate prevention, measurable effects, full undo refund.
    s = act(s, 'installFieldKitPiece', { pieceId: 'relay_mast', slot: 0 });
    expect(s.pipTelemetryRangeM).toBe(55);
    expect(applyAction(s, 'installFieldKitPiece', { pieceId: 'thermal_shield', slot: 0 }).ok).toBe(false);
    expect(applyAction(s, 'installFieldKitPiece', { pieceId: 'relay_mast', slot: 1 }).ok).toBe(false);

    s = act(s, 'installFieldKitPiece', { pieceId: 'thermal_shield', slot: 1 });
    s = act(s, 'installFieldKitPiece', { pieceId: 'sensor_pylon', slot: 2 });
    const afterKitTick = stepGame(s, 1);
    expect(afterKitTick.powerSupply).toBeCloseTo(5.3, 6);
    expect(afterKitTick.powerDemand).toBeCloseTo(1.1 + 0.7 + 1.1, 6);

    // Undo refunds cost and stock cleanly without duplicating battery or parts even near battery cap.
    let beforeUndo = afterKitTick;
    beforeUndo = act(beforeUndo, 'undoFieldKit');
    beforeUndo = act(beforeUndo, 'undoFieldKit');
    beforeUndo = act(beforeUndo, 'undoFieldKit');
    expect(applyAction(beforeUndo, 'undoFieldKit').ok).toBe(false);
    expect(beforeUndo.fieldKit.escrowKwh).toBe(0);
    expect(beforeUndo.fieldKit.stock).toEqual({
      relay_mast: 1,
      thermal_shield: 1,
      sensor_pylon: 1,
    });
    expect(
      beforeUndo.resources.battery +
        beforeUndo.resources.energyUsed +
        beforeUndo.resources.chargeLoss +
        beforeUndo.resources.dischargeLoss +
        beforeUndo.resources.energyCurtailed,
    ).toBeCloseTo(8 + beforeUndo.resources.energyGenerated, 8);
  });

  it('localizes all player-facing simulation logs and messages to PT-BR with zero English or dot-decimal leaks', () => {
    const messages: string[] = [];
    const runTracked = (
      state: ReturnType<typeof createGame>,
      action: Action,
      payload?: unknown,
      expectOk = true,
    ) => {
      const res = applyAction(state, action, payload);
      expect(res.ok, `${action} should ${expectOk ? 'succeed' : 'fail'}: ${res.message}`).toBe(
        expectOk,
      );
      messages.push(res.message);
      return res.state;
    };

    let s = createGame();
    s = runTracked(s, 'diagnoseAcademy');
    s = runTracked(s, 'advanceBeat', { beatId: 'arrival', speaker: 'Reyes', line: 'Comece pela leitura.' });
    s = runTracked(s, 'recordDialogueTone', { beatId: 'trial', tone: 'analitico', choiceLabel: 'Medir demanda' });
    s = runTracked(s, 'chooseAcademyLoad', { choice: 'keep_secondary' });
    s = runTracked(s, 'chooseAcademyLoad', { choice: 'shed' });
    s = stepGame(s, 15);
    s = runTracked(s, 'finishAcademy');
    s = runTracked(s, 'collectCargo');
    s = runTracked(s, 'land');

    // Failure & success messages across auxBay, fieldKit, discoveries, Cometa, and Scout.
    s = runTracked(s, 'installAuxPort', { port: 'power' }, false);
    s = runTracked(s, 'repairPower');
    s = runTracked(s, 'repairWater');
    s = runTracked(s, 'repairOxygen');
    s = stepGame(s, 5);

    s = runTracked(s, 'installAuxPort', { port: 'power' });
    s = runTracked(s, 'installAuxPort', { port: 'power' }, false);
    s = runTracked(s, 'removeAuxPort', { port: 'power' });
    s = runTracked(s, 'installAuxPort', { port: 'water' });
    s = runTracked(s, 'installAuxPort', { port: 'o2' });

    s = runTracked(s, 'installFieldKitPiece', { pieceId: 'relay_mast', slot: 0 });
    s = runTracked(s, 'installFieldKitPiece', { pieceId: 'thermal_shield', slot: 1 });
    s = runTracked(s, 'installFieldKitPiece', { pieceId: 'sensor_pylon', slot: 2 });
    s = runTracked(s, 'undoFieldKit');

    s = runTracked(s, 'scanSolar');
    s = runTracked(s, 'scanWater');
    s = runTracked(s, 'chooseCropStrategy', { strategy: 'early_plant' });
    s = runTracked(s, 'plantCrop');

    s = runTracked(s, 'inspectEvidence', { id: 'solar_dust_attenuation' });
    s = runTracked(s, 'runFieldProbe', { id: 'solar_dust_attenuation' });
    s = runTracked(s, 'classifyDiscovery', {
      id: 'solar_dust_attenuation',
      classification: 'verified_telemetry',
    });

    s = runTracked(s, 'petCometa');
    s = runTracked(s, 'cometaLookBeacon', { targetId: 'mission-console' });
    s = runTracked(s, 'cometaSniff', { pressurized: true, area: 'airlock', targetId: 'greenhouse-door' }, false);
    s = runTracked(s, 'setCometaMode', { mode: 'wait' });
    s = runTracked(s, 'setCometaMode', { mode: 'follow' });
    s = runTracked(s, 'toggleCometa', { enabled: false });
    s = runTracked(s, 'toggleCometa', { enabled: true });

    s = runTracked(s, 'chooseLoadout');
    s = runTracked(s, 'launchExpedition');
    s = runTracked(s, 'inspectEvidence', { id: 'com03_unplugged_cable' });
    s = runTracked(s, 'runFieldProbe', { id: 'com03_unplugged_cable' });
    s = runTracked(s, 'classifyDiscovery', {
      id: 'com03_unplugged_cable',
      classification: 'fictional_abstraction',
    });
    s = runTracked(s, 'deferDiscovery', { id: 'canyon_ice_strata' });

    s = runTracked(s, 'collectSample');
    s = runTracked(s, 'repairCompanion');
    s = stepGame(s, 5);
    s = runTracked(s, 'recruitCompanion');
    s = runTracked(s, 'dispatchScoutScan', { target: 'beacon' });
    s = runTracked(s, 'dispatchScoutScan', { target: 'solar' });
    s = runTracked(s, 'dispatchScoutScan', { target: 'ice' });
    s = runTracked(s, 'dispatchScoutScan', { target: 'beacon' });
    s = runTracked(s, 'dispatchScoutScan', { target: 'beacon' }); // strands Scout at 0.0 kWh
    s = runTracked(s, 'dispatchScoutScan', { target: 'beacon' }, false);
    s = runTracked(s, 'rechargeScout');

    s = runTracked(s, 'returnExpedition');
    s = runTracked(s, 'deliverSample');
    s = runTracked(s, 'shelter');
    s = runTracked(s, 'cometaSniff');
    s = stepGame(s, 380);

    const leakedEnglishOrIdPattern =
      /\b(beaconId|academy-console|mission-console|survey-beacon|habitat-shelter|greenhouse-door|battery-bank|crop-bed|clear|warning|active|beacon|ice|power|water|o2|relay_mast|thermal_shield|sensor_pylon|fictional_abstraction|verified_telemetry|com03_unplugged_cable|canyon_ice_strata|solar_dust_attenuation|academy|orbit|canyon|greenhouse|Radiation forecast|Battery is falling|Repair started|module repair completed|Expedition launched|Returned to the habitat|Harvest added food|Shelter protected|Trial battery)\b/;
    const dotDecimalUnitPattern = /\d+\.\d+\s*(?:kWh|kW|kg)\b/;

    const allPlayerText = [...s.log.map((entry) => entry.text), ...messages];
    expect(allPlayerText.length).toBeGreaterThan(25);
    for (const text of allPlayerText) {
      expect(text, `English/ID leak in: ${text}`).not.toMatch(leakedEnglishOrIdPattern);
      expect(text, `Dot decimal leak in: ${text}`).not.toMatch(dotDecimalUnitPattern);
    }
  });
});

it('rejects inconsistent regions, counters and malformed evidence in saves', () => {
  const s = repaired();
  expect(() => normalizeGame({ ...s, region: 'orbit' })).toThrow();
  expect(() => normalizeGame({ ...s, flags: { ...s.flags, expedition: true } })).toThrow();
  expect(() => normalizeGame({ ...s, blackouts: -1 })).toThrow();
  expect(() => normalizeGame({ ...s, scoutRepairRemaining: 1.5 })).toThrow();
  expect(() =>
    normalizeGame({ ...s, log: [{ tick: 0, kind: 'x', text: 'x', before: Infinity }] }),
  ).toThrow();
  expect(() => normalizeGame({ ...s, log: [{ tick: s.tick + 1, kind: 'x', text: 'x' }] })).toThrow();
});

it('normalizes fractional frame schedules at the same integer duration', () => {
  const initial = repaired();
  const reference = stepGame(initial, 10);
  for (const fps of [10, 30, 60, 144]) {
    let s = initial;
    for (let i = 0; i < fps * 10; i++) s = stepGame(s, 1 / fps);
    expect(s.remainder, `${fps} fps`).toBe(0);
    expect(hashState(s), `${fps} fps`).toBe(hashState(reference));
    expect(() => normalizeGame(JSON.parse(JSON.stringify(s)))).not.toThrow();
  }
});
