# ASTRA — Lunar Frontier demo

A public, independent and disposable Babylon.js prototype for a scientific exploration RPG. Start at the Earth academy, reach a fictional lunar outpost, restore interdependent systems, repair and recruit Scout, bring back ice, grow food and protect the crew through a storm. No account, API key or backend is required.

**Play the public demo:** https://astra-lunar-frontier-academy.andrevictorandrade.chatgpt.site

This repository now contains executable source, eight local GLB models and a deterministic simulation. It is **not an official NASA submission**. Browser/GPU acceptance and human playtesting are still pending; passing Node tests does not certify the visual result.

## Run

Use Node 24 and npm:

```sh
git clone https://github.com/andrecodexvictor/astra-lunar-frontier.git
cd astra-lunar-frontier
npm ci
npm run check
npm run dev
```

Open the Vite address in Chrome with WebGL 2. `npm run build` produces a static `dist/` directory for public hosting. There is no authentication in the application. The existing public Site now serves this demo (Sites version 4). Its previous prototype remains in the Site source history; see [publication record](docs/SITE_RELEASE.md).

WASD/arrows move, mouse drag rotates the camera, Shift runs, Space jumps and E inspects nearby equipment. Tab opens objectives; J opens science; M opens the region map; Esc pauses. Reading panels, hidden tabs and a closed game freeze mission time. Settings provide larger text, reduced decorative motion, lower resolution and an explicit 3× mission clock. Saving is local to this browser, including a full checkpoint.

## Current scope

- Five finite streamed regions: academy, assisted orbital cabin, Aurora habitat, ice canyon and greenhouse.
- Original local glTF models, articulated procedural gait, third-person camera, selective obstacle collision, PIP follower and Scout recruitment.
- Fixed one-second ticks; kW/kWh, charge/discharge losses, water recycling losses, electrolysis mass accounting, delayed repairs, ice processing, crop growth, radiation warning, failure/retry and evidence export.
- Short authored dialogue, proximity interactions, a local science journal, reference links, observable objectives and a mission report.
- **13 local agent skills**: 10 permissive upstream skills and 3 original ASTRA guides, with pinned commits, licenses and file hashes.

The orbital cabin currently uses floor-assisted movement, not six-degree-of-freedom physics. The terrain is authored fiction, not measured lunar geography. Crop biomass and safety are disclosed abstractions. Freeform construction, vehicles, team abilities, a mass-budget manifest, skeletal animation, combat, additional planets and AI chat are not implemented.

## Continue with Gemini

Read [GEMINI.md](GEMINI.md), then give the agent [MASTER_GOAL.md](MASTER_GOAL.md). It directs bounded batches, preserves the working slice, and uses skills under `.agents/skills/`. Current evidence is in [TEST_REPORT.md](TEST_REPORT.md), [ACCEPTANCE.json](ACCEPTANCE.json), and [HANDOFF.md](HANDOFF.md). The next gate is actual Chrome traversal and visual profiling before enlarging the world.

The design draws original principles from Space Engineers, Subnautica, Pokémon, Scrap Mechanic, Journey to the Savage Planet and Deliver Us The Moon. See [design pillars](docs/demo/DESIGN_PILLARS.md); no proprietary assets, characters, maps or music are copied.

## Checks and documentation

`npm run check` runs TypeScript, unit/integration tests, glTF/provenance audit, skill audit and production build. `npm run test:e2e` deliberately reports **pending** with exit status 2 until real browser evidence is supplied; it is not a passing browser suite. Follow [the browser walkthrough](docs/demo/BROWSER_SMOKE.md).

- [Game specification](docs/GAME_SPEC.md), [world bible](docs/WORLD_BIBLE.md), [Babylon research](docs/BABYLON_WORLD_ARCHITECTURE.md)
- [Implemented science assumptions](docs/demo/SCIENCE_ASSUMPTIONS.md), [level design](docs/demo/LEVEL_DESIGN.md)
- [Skill sources and licenses](docs/skills/SOURCE_REVIEW.md), [local skill guide](docs/skills/README.md)
- [NASA rules review and unresolved official items](docs/SPACE_APPS_COMPLIANCE.md)
- [Prior-work provenance](docs/PRIOR_WORK.md), [AI disclosure](AI_USAGE.md), [asset manifest](public/assets/manifest.json)

Original contributions are Apache-2.0. Vendored skills keep their Apache/MIT licenses and notices; NASA imagery keeps its usage terms. The Stanestane Noncommercial bundle is bibliography only, not vendored or relicensed. No endorsement by NASA or any referenced game company is implied.
