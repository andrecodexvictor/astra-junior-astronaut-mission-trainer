import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { episode01Beats } from '../../src/app/catalogue';
import {
  decodeSave,
  loadSavedFile,
  newSave,
  persistSavedFile,
  SAVE_KEY,
  snapshot,
  type StorageLike,
} from '../../src/app/save';
import {
  applyAction,
  BEAT_IDS,
  CARGO_CAPACITY_KG,
  createGame,
  DEFAULT_CARGO_IDS,
  DEFAULT_LOADOUT_IDS,
  FIELD_LOCKER_ITEMS,
  LOADOUT_CAPACITY_KG,
  ORBIT_CARGO_ITEMS,
  stepGame,
} from '../../src/simulation';
import {
  buildCometaRuntimeState,
  computeAuxVisualState,
  computeMassSelection,
  computeUniformPaused,
  computeVirtualStickAxes,
  getDiscoveryStatusLabel,
  getEpisodeBeatDisplay,
  getScienceProvenanceBadge,
  isPressurizedArea,
  shouldPersistOnBackground,
  shouldShowTouchControls,
  shouldUpdateMarkup,
  stabilizePortraitIds,
} from '../../src/main';
import {
  getCadetPalette,
  getSpeakerMeta,
  PORTRAIT_IDS,
  renderPortraitSvg,
} from '../../src/presentation/portraits';

function makeMemoryStorage(initial: Record<string, string> = {}): StorageLike & {
  dump: () => Record<string, string>;
} {
  const map = new Map<string, string>(Object.entries(initial));
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => {
      map.set(key, value);
    },
    dump: () => Object.fromEntries(map.entries()),
  };
}

describe('authored SVG portraits', () => {
  it('renders crisp inline SVGs for every cast member without legacy robot-face text or external URLs', () => {
    for (const id of PORTRAIT_IDS) {
      const svg = renderPortraitSvg(id, { size: 'md' });
      const meta = getSpeakerMeta(id);
      expect(meta.name.length).toBeGreaterThan(0);
      expect(svg).toContain('<svg');
      expect(svg).toContain('viewBox="0 0 120 120"');
      expect(svg).toContain(`data-portrait="${id}"`);
      expect(svg).toContain('role="img"');
      expect(svg).not.toContain('⌒');
      expect(svg).not.toContain('·‿·');
      expect(svg).not.toMatch(/(?:href|src)=["']https?:\/\//i);
    }
  });

  it('keeps closed pressurized helmets on Cadet and Cometa and reflects Cadet appearance customization', () => {
    const cadetA = renderPortraitSvg('cadet', {
      appearance: { suitAccent: 'emerald', visorTone: 'cyan', skinTone: 'deep' },
      size: 'lg',
    });
    const cadetB = renderPortraitSvg('cadet', {
      appearance: { suitAccent: 'cobalt', visorTone: 'gold', skinTone: 'fair' },
      size: 'lg',
    });
    const cometaSvg = renderPortraitSvg('cometa', { size: 'lg', status: 'active' });

    expect(cadetA).toContain('data-helmet="closed"');
    expect(cometaSvg).toContain('data-helmet="closed"');
    expect(cadetA).toContain('data-suit-accent="emerald"');
    expect(cadetA).toContain('data-visor-tone="cyan"');
    expect(cadetA).toContain('data-skin-tone="deep"');

    const palA = getCadetPalette({ suitAccent: 'emerald', visorTone: 'cyan', skinTone: 'deep' });
    const palB = getCadetPalette({ suitAccent: 'cobalt', visorTone: 'gold', skinTone: 'fair' });
    expect(cadetA).toContain(palA.accentFill);
    expect(cadetA).toContain(palA.visorTint);
    expect(cadetA).toContain(palA.skinFill);
    expect(cadetB).toContain(palB.accentFill);
    expect(cadetB).toContain(palB.visorTint);
    expect(cadetB).toContain(palB.skinFill);
    expect(cadetA).not.toBe(cadetB);
  });

  it('generates unique gradient/defs IDs per SVG render and supports decorative/offline states', () => {
    const first = renderPortraitSvg('pip', { decorative: true, status: 'offline' });
    const second = renderPortraitSvg('pip', { decorative: false, status: 'warning' });
    const firstId = first.match(/id="(p\d+-bg)"/)?.[1];
    const secondId = second.match(/id="(p\d+-bg)"/)?.[1];

    expect(firstId).toBeTruthy();
    expect(secondId).toBeTruthy();
    expect(firstId).not.toBe(secondId);
    expect(first).toContain('aria-hidden="true"');
    expect(second).toContain('role="img"');
  });
});

describe('Episode 01 UX, choices, and backlog helpers', () => {
  it('defines all 10 beats with valid speakers and handles optional skip vs mandatory repair guard', () => {
    expect(BEAT_IDS).toHaveLength(10);
    for (const id of BEAT_IDS) {
      const beat = episode01Beats[id];
      expect(beat).toBeDefined();
      expect(beat.lines.length).toBeGreaterThanOrEqual(1);
      for (const line of beat.lines) {
        expect(PORTRAIT_IDS).toContain(line.portraitId);
        expect(line.speaker.trim().length).toBeGreaterThan(0);
        expect(line.line.trim().length).toBeGreaterThan(0);
      }
    }

    let state = createGame();
    const initialBeat = getEpisodeBeatDisplay(state);
    expect(initialBeat.beat.id).toBe('arrival');
    expect(initialBeat.canSkip).toBe(true);

    // Non-optional tone recording logs backlog history without creating physical resources.
    const batteryBefore = state.academyBattery;
    const toneRes = applyAction(state, 'recordDialogueTone', {
      beatId: 'arrival',
      tone: 'curious',
      choiceLabel: 'Vamos ler os medidores primeiro.',
    });
    expect(toneRes.ok).toBe(true);
    state = toneRes.state;
    expect(state.academyBattery).toBe(batteryBefore);
    expect(state.episode.dialogueHistory.at(-1)?.beatId).toBe('arrival');
    expect(state.episode.choices.tone.arrival).toBe('curious');

    // After diagnosis, active beat is mandatory 'trial' (not skippable in UI, physical stability still required).
    state = applyAction(state, 'diagnoseAcademy').state;
    const trialBeat = getEpisodeBeatDisplay(state);
    expect(trialBeat.beat.id).toBe('trial');
    expect(trialBeat.canSkip).toBe(false);
    const earlyLaunch = applyAction(state, 'finishAcademy');
    expect(earlyLaunch.ok).toBe(false);

    // Progress cleanly through academy/orbit -> lunar habitat ('aurora' beat, optional skip never repairs hardware).
    state = applyAction(state, 'shedLoad').state;
    state = stepGame(state, 15);
    state = applyAction(state, 'finishAcademy').state;
    state = applyAction(state, 'collectCargo').state;
    state = applyAction(state, 'land').state;

    const auroraDisplay = getEpisodeBeatDisplay(state);
    expect(auroraDisplay.beat.id).toBe('aurora');
    expect(auroraDisplay.canSkip).toBe(true);
    const skipAurora = applyAction(state, 'advanceBeat', { beatId: 'aurora', skipped: true });
    expect(skipAurora.ok).toBe(true);
    expect(skipAurora.state.episode.skippedBeats).toContain('aurora');
    expect(skipAurora.state.modules.power.integrity).toBeLessThan(0.8);
    expect(skipAurora.state.modules.power.connected).toBe(false);

    // Disabling Cometa (optional buddy) never blocks lunar progression or power repair.
    const disabledCometa = applyAction(skipAurora.state, 'toggleCometa', { enabled: false });
    expect(disabledCometa.ok).toBe(true);
    expect(disabledCometa.state.cometa.enabled).toBe(false);
    const powerRepair = applyAction(disabledCometa.state, 'repairPower');
    expect(powerRepair.ok).toBe(true);
  });

  it('flags dynamic storm priority override only outside shelter in lunar phase', () => {
    let state = createGame();
    state = applyAction(state, 'diagnoseAcademy').state;
    state = applyAction(state, 'shedLoad').state;
    state = stepGame(state, 15);
    state = applyAction(state, 'finishAcademy').state;
    state = applyAction(state, 'collectCargo').state;
    state = applyAction(state, 'land').state;

    state.storm = 'warning';
    state.flags.sheltered = false;
    expect(getEpisodeBeatDisplay(state).stormOverride).toBe(true);

    state.flags.sheltered = true;
    expect(getEpisodeBeatDisplay(state).stormOverride).toBe(false);
  });
});

describe('cargo budgets, pressurized safety, aux visuals, and science provenance', () => {
  it('computes orbit 45 kg cargo and 18 kg field locker selection budgets accurately', () => {
    const defaultCargo = computeMassSelection(DEFAULT_CARGO_IDS, ORBIT_CARGO_ITEMS, CARGO_CAPACITY_KG);
    expect(defaultCargo.overLimit).toBe(false);
    expect(defaultCargo.massKg).toBeLessThanOrEqual(CARGO_CAPACITY_KG);
    expect(defaultCargo.remainingKg).toBe(CARGO_CAPACITY_KG - defaultCargo.massKg);

    const allCargo = computeMassSelection(Object.keys(ORBIT_CARGO_ITEMS), ORBIT_CARGO_ITEMS, CARGO_CAPACITY_KG);
    expect(allCargo.overLimit).toBe(true);
    expect(allCargo.remainingKg).toBeLessThan(0);

    const defaultLocker = computeMassSelection(DEFAULT_LOADOUT_IDS, FIELD_LOCKER_ITEMS, LOADOUT_CAPACITY_KG);
    expect(defaultLocker.overLimit).toBe(false);
    expect(defaultLocker.massKg).toBeLessThanOrEqual(LOADOUT_CAPACITY_KG);
  });

  it('evaluates pressurized status, Cometa runtime state, aux visual kW, and provenance badges', () => {
    const state = createGame();
    expect(isPressurizedArea(state)).toBe(true);
    state.region = 'habitat';
    state.flags.sheltered = false;
    expect(isPressurizedArea(state)).toBe(false);
    state.flags.sheltered = true;
    expect(isPressurizedArea(state)).toBe(true);
    state.region = 'canyon';
    expect(isPressurizedArea(state)).toBe(false);
    state.region = 'greenhouse';
    expect(isPressurizedArea(state)).toBe(true);

    const cometaState = buildCometaRuntimeState(state, 'sniff');
    expect(cometaState.pressurized).toBe(true);
    expect(cometaState.lastCue).toBe('sniff');

    state.modules.power.connected = true;
    state.modules.power.enabled = true;
    state.modules.power.integrity = 1;
    state.auxBay.ports.power = true;
    state.fieldKit.slots = ['relay_mast', 'sensor_pylon', 'thermal_shield'];
    const auxVis = computeAuxVisualState(state);
    expect(auxVis.auxSolarKw).toBeCloseTo(0.8, 5);
    expect(auxVis.stormShieldActive).toBe(true);

    expect(getScienceProvenanceBadge('verified_telemetry').kind).toBe('verified');
    expect(getScienceProvenanceBadge('fictional_abstraction').kind).toBe('fiction');
    expect(getScienceProvenanceBadge('didactic_hypothesis').kind).toBe('hypothesis');
    expect(getDiscoveryStatusLabel('investigating')).toContain('Sonda');
  });
});

describe('touch controls, uniform pause, and defensive Save v4 loading', () => {
  it('applies radial deadzone and clamps diagonal touch stick magnitude to 1', () => {
    expect(computeVirtualStickAxes(2, 2, 50, 0.2)).toEqual({ x: 0, z: 0 });
    expect(computeVirtualStickAxes(Number.NaN, 10, 50)).toEqual({ x: 0, z: 0 });
    const diag = computeVirtualStickAxes(50, 50, 50, 0.2);
    expect(Math.hypot(diag.x, diag.z)).toBeLessThanOrEqual(1.0001);
    expect(diag.x).toBeGreaterThan(0.6);
    expect(diag.z).toBeGreaterThan(0.6);

    expect(shouldShowTouchControls('on', false, 1440)).toBe(true);
    expect(shouldShowTouchControls('off', true, 390)).toBe(false);
    expect(shouldShowTouchControls('auto', false, 1280)).toBe(false);
    expect(shouldShowTouchControls('auto', true, 1280)).toBe(true);
    expect(shouldShowTouchControls('auto', false, 800)).toBe(true);
  });

  it('computes uniform pause identically across modals, hidden tab, transitions, and active play', () => {
    expect(
      computeUniformPaused({
        started: true,
        menu: null,
        transitioning: false,
        hidden: false,
        phase: 'lunar',
      }),
    ).toBe(false);

    expect(
      computeUniformPaused({
        started: false,
        menu: null,
        transitioning: false,
        hidden: false,
        phase: 'academy',
      }),
    ).toBe(true);

    expect(
      computeUniformPaused({
        started: true,
        menu: 'station',
        transitioning: false,
        hidden: false,
        phase: 'lunar',
      }),
    ).toBe(true);

    expect(
      computeUniformPaused({
        started: true,
        menu: null,
        transitioning: false,
        hidden: true,
        phase: 'lunar',
      }),
    ).toBe(true);
  });

  it('migrates legacy v3 saves, recovers cleanly from corrupted storage, and leaves unrelated keys untouched', () => {
    const v3Base = snapshot(createGame());
    const v3Save = {
      version: 3,
      current: v3Base,
      checkpoint: v3Base,
      settings: { quality: 'low', speed: 2, largeText: true, reducedMotion: false },
    };

    const storageWithV3 = makeMemoryStorage({
      [SAVE_KEY]: JSON.stringify(v3Save),
      'unrelated-app-key': 'keep-me',
    });
    const loadedV3 = loadSavedFile(storageWithV3);
    expect(loadedV3.ok).toBe(true);
    if (loadedV3.ok) {
      expect(loadedV3.migratedFromVersion).toBe(3);
      expect(loadedV3.file.version).toBe(4);
      expect(loadedV3.file.settings.largeText).toBe(true);
      expect(loadedV3.file.settings.quality).toBe('low');
    }
    expect(storageWithV3.dump()['unrelated-app-key']).toBe('keep-me');

    const corruptedStorage = makeMemoryStorage({
      [SAVE_KEY]: '{broken-json',
      'unrelated-app-key': 'still-here',
    });
    const recovered = loadSavedFile(corruptedStorage);
    expect(recovered.ok).toBe(false);
    if (!recovered.ok) {
      expect(recovered.reason).toBe('corrupted');
      expect(recovered.message.length).toBeGreaterThan(0);
    }
    expect(corruptedStorage.dump()['unrelated-app-key']).toBe('still-here');

    const saveV4 = newSave({ cometaEnabled: false });
    const throwingStorage: StorageLike = {
      getItem: () => null,
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
    };
    const warn = persistSavedFile(saveV4, throwingStorage);
    expect(warn.ok).toBe(false);
    if (!warn.ok) {
      expect(warn.reason).toBe('blocked');
      expect(warn.message.length).toBeGreaterThan(0);
    }
    expect(decodeSave(JSON.stringify(saveV4)).cometa.enabled).toBe(false);
  });

  it('keeps CSS offline-only, free of legacy robot-face rules, and >=44px touch targets across mobile/coarse selectors', () => {
    const css = readFileSync('src/presentation/style.css', 'utf8');
    expect(css).not.toContain('robot-face');
    expect(css).not.toMatch(/url\(["']?https?:\/\//i);

    const blocks = [...css.matchAll(/\.(?:touch-btn|touch-action)\s*\{([^}]*)\}/g)];
    expect(blocks.length).toBeGreaterThanOrEqual(4);
    for (const match of blocks) {
      const body = match[1];
      for (const dim of [...body.matchAll(/min-(?:width|height)\s*:\s*(\d+)px/g)]) {
        expect(Number(dim[1])).toBeGreaterThanOrEqual(44);
      }
    }

    const mobileSection = css.slice(css.indexOf('@media (max-width: 800px)'));
    expect(mobileSection).toMatch(/\.side-tools button[\s\S]*?min-height:\s*44px/);
    expect(mobileSection).toMatch(/\.mission-links \.text-button[\s\S]*?min-height:\s*44px/);
  });

  it('provides an inline SVG favicon, blocks unstarted background saves, and stabilizes HUD markup across ticks', () => {
    const html = readFileSync('index.html', 'utf8');
    expect(html).toContain('<link');
    expect(html).toContain('rel="icon"');
    expect(html).toContain('data:image/svg+xml,');
    expect(html).not.toMatch(/href=["']https?:\/\//i);

    expect(shouldPersistOnBackground(false)).toBe(false);
    expect(shouldPersistOnBackground(true)).toBe(true);

    const firstPip = stabilizePortraitIds(
      renderPortraitSvg('pip', { size: 'sm', decorative: true }),
      'hud-pip',
    );
    const secondPip = stabilizePortraitIds(
      renderPortraitSvg('pip', { size: 'sm', decorative: true }),
      'hud-pip',
    );
    expect(firstPip).toBe(secondPip);
    expect(firstPip).toContain('id="hud-pip-bg"');
    expect(firstPip).toContain('url(#hud-pip-bg)');

    const cache = new Map<string, string>();
    expect(shouldUpdateMarkup(cache, 'pip', firstPip)).toBe(true);
    expect(shouldUpdateMarkup(cache, 'pip', secondPip)).toBe(false);
    expect(shouldUpdateMarkup(cache, 'pip', `${secondPip}<!--updated-->`)).toBe(true);
  });
});
