import { describe, expect, it } from 'vitest';
import {
  applyAction,
  BEAT_IDS,
  createGame,
  getActiveEpisodeBeat,
  getObjectives,
  getReport,
  stepGame,
  type GameState,
} from '../../src/simulation';

function act(s: GameState, id: string, payload?: unknown) {
  const r = applyAction(s, id, payload);
  expect(r.ok, `${id}: ${r.message}`).toBe(true);
  return r.state;
}

function play(options: {
  disableOxygen?: boolean;
  cometaEnabled?: boolean;
  cropStrategy?: 'early_plant' | 'deferred_plant';
  visitAllBeats?: boolean;
} = {}) {
  const {
    disableOxygen = false,
    cometaEnabled = true,
    cropStrategy = 'early_plant',
    visitAllBeats = false,
  } = options;
  let s = createGame();
  if (!cometaEnabled) {
    s = act(s, 'toggleCometa', { enabled: false });
  }
  if (visitAllBeats) {
    s = act(s, 'advanceBeat', { beatId: 'arrival', toneChoice: 'curious' });
  } else {
    s = act(s, 'advanceBeat', { beatId: 'arrival', skipped: true });
  }
  s = act(s, 'diagnoseAcademy');
  s = act(s, 'shedLoad');
  s = stepGame(s, 15);
  s = act(s, 'travel', { region: 'orbit' });
  s = act(s, 'collectCargo');
  s = act(s, 'travel', { region: 'habitat' });
  s = stepGame(s, 60);
  for (const a of ['repairPower', 'repairWater', 'repairOxygen']) s = act(s, a);
  s = stepGame(s, 5);
  if (disableOxygen) {
    s = act(s, 'toggleOxygen');
    s = stepGame(s, 10);
    s = act(s, 'toggleOxygen');
  }
  s = act(s, 'chooseCropStrategy', { strategy: cropStrategy });
  if (cropStrategy === 'early_plant') {
    s = act(s, 'plantCrop');
  }
  s = act(s, 'chooseLoadout');
  s = act(s, 'travel', { region: 'canyon' });
  s = act(s, 'collectSample');
  s = act(s, 'repairCompanion');
  s = stepGame(s, 5);
  s = act(s, 'recruitCompanion');
  s = act(s, 'travel', { region: 'habitat' });
  s = act(s, 'deliverSample');
  s = act(s, 'shelter');
  s = stepGame(s, 380);
  if (cropStrategy === 'deferred_plant') {
    s = act(s, 'exitShelter');
    s = act(s, 'travel', { region: 'greenhouse' });
    s = act(s, 'plantCrop');
    s = stepGame(s, 180);
  }
  s = act(s, 'harvest');
  return stepGame(s, 1);
}

describe('mission objectives', () => {
  it.each([false, true])('completes with oxygen toggle %s', (toggle) => {
    const s = play({ disableOxygen: toggle });
    expect(s.phase).toBe('complete');
    expect(getObjectives(s).every((o) => o.complete)).toBe(true);
    expect(getReport(s).understanding.note).toContain('não validam');
    expect(applyAction(s, 'harvest').ok).toBe(false);
  });

  it('gates launch until life support and tools are ready', () => {
    const s = createGame();
    expect(applyAction(s, 'launchExpedition').ok).toBe(false);
    expect(getObjectives(s).find((o) => o.id === 'balance')?.complete).toBe(false);
  });

  it('supports both early_plant and deferred_plant winning strategies with distinct telemetry', () => {
    const early = play({ cropStrategy: 'early_plant' });
    const deferred = play({ cropStrategy: 'deferred_plant' });
    expect(early.phase).toBe('complete');
    expect(deferred.phase).toBe('complete');
    expect(getReport(early).decisions.cropTiming).toBe('early_plant');
    expect(getReport(deferred).decisions.cropTiming).toBe('deferred_plant');
    expect(deferred.lunarTick).toBeGreaterThan(early.lunarTick);
    expect(deferred.resources.energyUsed).not.toBeCloseTo(early.resources.energyUsed, 3);
  });

  it('completes identically with Cometa enabled or disabled without affecting completion', () => {
    const withCometa = play({ cometaEnabled: true, visitAllBeats: true });
    const withoutCometa = play({ cometaEnabled: false, visitAllBeats: false });
    expect(withCometa.phase).toBe('complete');
    expect(withoutCometa.phase).toBe('complete');
    expect(withoutCometa.cometa.enabled).toBe(false);
    expect(withCometa.cometa.enabled).toBe(true);
    expect(withCometa.resources.potable).toBeCloseTo(withoutCometa.resources.potable, 6);
    expect(withCometa.resources.oxygen).toBeCloseTo(withoutCometa.resources.oxygen, 6);
    expect(withCometa.resources.food).toBeCloseTo(withoutCometa.resources.food, 6);
  });

  it('prioritizes storm warning beat dynamically and prevents tone choices from altering physics', () => {
    let s = createGame();
    const beforeResources = structuredClone(s.resources);
    for (const beatId of BEAT_IDS) {
      s = act(s, 'recordDialogueTone', { beatId, tone: 'analytical', choiceLabel: 'Teste' });
    }
    expect(s.resources).toEqual(beforeResources);

    s = act(s, 'diagnoseAcademy');
    s = act(s, 'shedLoad');
    s = stepGame(s, 15);
    s = act(s, 'travel', { region: 'orbit' });
    s = act(s, 'collectCargo');
    s = act(s, 'travel', { region: 'habitat' });
    for (const a of ['repairPower', 'repairWater', 'repairOxygen']) s = act(s, a);
    s = stepGame(s, 5);
    // Advance until lunarTick === 180 (storm warning) before finishing scout/harvest.
    s = stepGame(s, 175);
    expect(s.storm).toBe('warning');
    expect(getActiveEpisodeBeat(s)).toBe('warning');
    expect(s.episode.currentBeatId).toBe('warning');
  });
});

it('supports a paced mission with realistic walking delays and a forecast return window', () => {
  let s = createGame();
  s = act(s, 'diagnoseAcademy');
  s = act(s, 'shedLoad');
  s = stepGame(s, 15);
  s = act(s, 'travel', { region: 'orbit' });
  s = act(s, 'collectCargo');
  s = act(s, 'travel', { region: 'habitat' });
  s = stepGame(s, 60);
  for (const repair of ['repairPower', 'repairWater', 'repairOxygen']) {
    s = act(s, repair);
    s = stepGame(s, 5);
    s = stepGame(s, 10);
  }
  s = stepGame(s, 20);
  s = act(s, 'travel', { region: 'greenhouse' });
  s = act(s, 'plantCrop');
  s = act(s, 'travel', { region: 'habitat' });
  s = stepGame(s, 15);
  s = act(s, 'chooseLoadout');
  s = act(s, 'travel', { region: 'canyon' });
  s = stepGame(s, 25);
  s = act(s, 'repairCompanion');
  s = stepGame(s, 5);
  s = act(s, 'recruitCompanion');
  s = stepGame(s, 10);
  s = act(s, 'collectSample');
  s = stepGame(s, 25);
  s = act(s, 'travel', { region: 'habitat' });
  s = act(s, 'deliverSample');
  s = stepGame(s, 15);
  expect(s.storm).toBe('warning');
  expect(s.lunarTick).toBeLessThan(300);
  s = act(s, 'shelter');
  s = stepGame(s, 380 - s.lunarTick);
  expect(s.flags.stormSurvived).toBe(true);
  s = act(s, 'exitShelter');
  s = stepGame(s, 20);
  s = act(s, 'travel', { region: 'greenhouse' });
  s = act(s, 'harvest');
  s = stepGame(s, 1);
  expect(s.phase).toBe('complete');
  expect(s.health).toBe(100);
  expect(s.resources.potable).toBeGreaterThan(2);
  expect(s.resources.oxygen).toBeGreaterThan(0.2);
});
