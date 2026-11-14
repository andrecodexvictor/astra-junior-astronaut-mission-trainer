# Test report — independent demo v0.2

Execution date: 2026-11-14. Authoring environment: Linux x86_64, Node v24.22.1, npm 11.9.0. No browser version, GPU, device frame rate or human playtime is available; those fields are **not measured**. Exact implementation reference and final check output are recorded in `ACCEPTANCE.json`.

## Executed checks

- Clean `npm ci --no-audit --no-fund`: dependency install from the committed lockfile succeeded.
- `npm run typecheck`: strict TypeScript passes.
- `npm test`: 25 tests in 6 files pass. Covers fixed ticks/10–144 simulated FPS, stable hashes/replay, fractional save remainder, energy and electrolysis accounting, repair costs/time, dependency gates, two successful sequences, a paced mission with walking delays, storm failure/recovery, save corruption, clock pause, controller motion/gravity, obstacle/target reachability and real GLB template reuse in Babylon NullEngine.
- `npm run audit:assets`: eight GLBs validated by Khronos glTF Validator with zero errors and zero warnings; local buffers, bounds, expected animation pivots, nine asset hashes and provenance checked.
- `npm run audit:skills`: 13 skills, 21 skill files and 3 license sources; 25 SHA-256 hashes pass.
- `npm run build`: Vite production build succeeds. Direct Babylon imports reduced the observed main chunk from approximately 7.67 MB to 1.76 MB minified (about 454 kB gzip) in this environment. Vite still reports its 1.6 MB chunk warning; the warning was not hidden or treated as a runtime failure. This is a bundling measurement, not a GPU result.
- Dependency audit identified development-tool advisories in the initial Vite/Vitest pins. They were updated to Vite 7.3.8 and Vitest 4.1.12 with an exact lockfile; the final `npm audit` reports zero known vulnerabilities across all dependencies.
- `git diff --check`: no whitespace errors. Source/data JSON and local documentation links audited before publishing.

The time-shifted pure mission test models a 60-second setup delay and walking intervals. It reaches shelter at lunar tick 230, 70 ticks before the active storm, and completes with positive reserves. These are scripted simulation results, not observed human navigation times. The NullEngine test instantiates/disposes the robot three times; it does not certify the entire scene lifecycle over 20 transitions.

## Explicitly pending

`npm run test:e2e` intentionally exits 2 and reports pending. The managed authoring environment did not provide the required real-browser control capability; no browser was installed as a workaround. There was no Chrome/WebGL rendering, screenshot comparison, actual keyboard focus walk, physical device profiling, touch walkthrough or human study. Unit and NullEngine checks must not be presented as any of those.

Run `docs/demo/BROWSER_SMOKE.md` in the clone. Prioritize initial camera/actor visibility, all required paths and portals, repair timing, shelter movement/clock separation, save/reload in each phase, corrupt/storage-denied behavior, full success/failure/retry and 20 region transitions. Record commit, browser, GPU, viewport and trace. The six reference games and provided concept images are creative targets, not verified visual parity.

## Known limitations

Orbital movement is floor assisted; physics 6DoF is absent. Collision covers selected large footprints, not every mesh. PIP/Scout use simple cosmetic following rather than robust navigation. Body animation uses transform pivots, not a skeletal rig. Construction, rover, a mass budget, companion abilities, full NPC portraits/close-ups, combat and later planets are absent. Some technical evidence messages are English. Crop yield, time scales, risk and geography are disclosed game abstractions; no complete biomass/physiological/radiation model is claimed. Desktop keyboard/mouse is the target; touch exploration is not implemented. The full 20–30 minute slice and broader 35 requirements remain only partially accepted.
