# ASTRA — Lunar Frontier demo

ASTRA is an independent Babylon.js exploration prototype. Train at an Earth academy, travel to a fictional lunar outpost, restore connected systems, investigate ice with Scout, grow food and shelter through a modeled storm. The game needs no account, API key or backend. It is not an official NASA submission or endorsed training.

The existing public demo is at https://astra-lunar-frontier-academy.andrevictorandrade.chatgpt.site. A separate [delivery-candidate repository](https://github.com/andrecodexvictor/astra-junior-astronaut-mission-trainer) preserves this project's history. The owner has also authorized a second public site; consult `docs/PUBLICATIONS.json` for the final version and publication status of both sites. A site URL does not establish competition eligibility.

## Run

Use Node 24 and npm:

```sh
git clone https://github.com/andrecodexvictor/astra-lunar-frontier.git
cd astra-lunar-frontier
npm ci
npm run check
npm run dev
```

Open the Vite URL in a WebGL 2 capable browser. `npm run build` produces static `dist/`. WASD/arrows move, mouse drag rotates the camera, Shift runs, Space jumps and E interacts. Tab opens objectives, J science, M the map and Esc pauses. On-screen controls expose actions; settings include larger text, reduced motion, quality and 3× mission time. Saves and checkpoints are local to the browser. Much of the in-game text is Portuguese.

## Current source

- Five finite regions, third-person movement and camera, PIP and repairable Scout; optional astronaut dachshund Cometa can follow or wait.
- Thirteen local GLBs: eight reused original models and five newly authored skinned character models with keyframed clips. An authored ten-beat episode connects dialogue, choices and actions to simulation state; character portraits are local SVGs.
- A 45 kg orbital cargo budget, 18 kg field loadout, three auxiliary ports and a restricted three-slot field kit. These are bounded mechanics, not freeform construction.
- Fixed one-second simulation ticks, kW/kWh and water accounting, electrolysis, ice processing, crop growth, a fictional storm, failure and checkpoint recovery. Simulation state is version 3 and the save envelope version 4, with migration paths for earlier envelopes.

Orbit is floor-assisted, not six-degree-of-freedom flight. The terrain and equipment are fictional; radiation, physiology and crop yield are simplified game models, not mission procedures. Freeform construction, vehicles, extra planets and an AI tutor are not implemented. See [science assumptions](docs/demo/SCIENCE_ASSUMPTIONS.md).

## Evidence and continuation

The initial Wave 3 CPU check recorded 64 passing unit tests across eight files. The final gate is tracked in [TEST_REPORT.md](TEST_REPORT.md); browser runs and their limitations are recorded in [E2E_REPORT.json](docs/demo/E2E_REPORT.json) and `docs/demo/evidence/`. A Chromium software-renderer run is useful evidence but does not establish hardware-GPU performance, accessibility or human playtest results. Run `npm run test:e2e` for the browser workflow and consult [browser instructions](docs/demo/BROWSER_SMOKE.md). Do not infer a pass from the script's presence.

Read [HANDOFF.md](HANDOFF.md) and [GEMINI.md](GEMINI.md) to continue. The eight labelled AI-generated [concept boards](docs/art/README.md) are design references, not gameplay captures. Browser captures in `docs/demo/captures/` are separate evidence and must be interpreted with the test report.

This repository includes 13 agent skills with sources and licenses documented in [the skill ledger](skills.lock.json). Original contributions are Apache-2.0; third-party assets and skills retain their own terms. See [AI disclosure](AI_USAGE.md), [asset manifest](public/assets/manifest.json), [prior work](docs/PRIOR_WORK.md), and [challenge review](docs/SPACE_APPS_COMPLIANCE.md). The earlier prototype and planning predate the event; preserved history does not become new work by moving repositories. Registration, applicable rules, reuse and the challenge resource list remain unresolved for any official entry. No NASA endorsement or eligibility is claimed.
