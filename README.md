# ASTRA — Junior Astronaut Mission Trainer

ASTRA is an independent, playable lunar exploration prototype built with Babylon.js. A cadet travels from an Earth academy to a fictional lunar outpost, investigates interconnected systems, prepares a field expedition and responds to a storm. It is a delivery candidate inspired by the [2026 Junior Astronaut Mission Trainer challenge](https://www.spaceappschallenge.org/2026/challenges/junior-astronaut-mission-trainer/); it is not an official submission or NASA-endorsed training.

The in-game narrative and much of the interface are currently in Portuguese. This repository preserves the independent demo history; its runtime differs only in the public source link and delivery label.

Public candidate site: https://astra-mission-trainer.andrevictorandrade.chatgpt.site

Original demo: https://github.com/andrecodexvictor/astra-lunar-frontier — its public site remains separate. Exact publication revisions are in `docs/PUBLICATIONS.json`.

## Run locally

Requires Node.js 24 and npm:

```sh
git clone https://github.com/andrecodexvictor/astra-junior-astronaut-mission-trainer.git
cd astra-junior-astronaut-mission-trainer
npm ci
npm run dev
```

Open the Vite URL in a WebGL 2 capable browser. `npm run build` creates the static `dist/` output. No account, API key or server-side service is needed for gameplay. WASD or arrow keys move, mouse drag rotates the camera, Shift runs, Space jumps and E interacts. Tab opens objectives, J the science journal, M the map and Esc pauses; on-screen controls also expose actions. Save data is local to the browser.

## Explore and learn

- **Train and travel:** practice at the academy, prepare cargo in the assisted orbital cabin and reach the fictional Aurora habitat. Orbit movement is floor-assisted, not six-degree-of-freedom simulation.
- **Operate the base:** repair power and life-support systems, compare kW and kWh, recycle water and use electrolysis while watching resource balances and costs.
- **Investigate:** equip a limited field loadout, repair Scout, inspect discoveries and transport a finite ice sample for processing. The journal records hypotheses and evidence; the player can compare conditions before and after an intervention.
- **Protect the crew and grow food:** manage shelter during an artificial storm and give the crop power, water and time. An optional astronaut dachshund, Cometa, follows or waits; her interactions do not create resources.

Five finite authored regions, a deterministic fixed-tick simulation, local checkpoints, mission evidence and character animation assets are present in source. The models and lunar geography are fictional. Game rates, radiation safety and crop yields are simplified for play; this is not operational astronaut instruction or a validated engineering or educational model. See `docs/delivery/SCIENCE_AND_PROVENANCE.md` and `docs/demo/SCIENCE_ASSUMPTIONS.md`.

## Verification and scope

The repository contains unit tests, asset audits and a Chrome DevTools Protocol browser test script. See `TEST_REPORT.md` and `ACCEPTANCE.json` for the actual results and commit tested; the presence of scripts alone is not a passing result. Browser visual quality, accessibility, real-device touch behavior, performance and human learning outcomes require their own recorded evidence. The expanded game described in `GOAL.md` remains a goal, not a claim of completion.

```sh
npm run check
npm run test:e2e
```

## Provenance and challenge status

This project builds on an earlier ASTRA prototype and planning from before the event; the real Git history and dates are preserved. Eight original GLBs were reused and five animated character GLBs were added. Original contributions are Apache-2.0; third-party materials retain their own terms. `NOTICE`, `AI_USAGE.md`, `public/assets/manifest.json` and `docs/PRIOR_WORK.md` provide credits and disclosures. NASA Blue Marble imagery is used with attribution; its presence does not establish that it appears on the challenge's resource list.

Registration, local rules, treatment of prior work, the current submission guide and the challenge's exact resource list need human confirmation. No eligibility, award readiness or official submission is claimed. See `docs/SPACE_APPS_COMPLIANCE.md`, `docs/delivery/SUBMISSION_DRAFT_EN.md` and `docs/delivery/VERSION_HISTORY.md`.

## Institutional presentation

[Public English institutional landing](https://astra-mission-odyssey.andrevictorandrade.chatgpt.site) · [Judges’ pack and downloads](https://astra-mission-odyssey.andrevictorandrade.chatgpt.site/downloads.html). The main pitch is English, 30 slides / 180 seconds; the requested Portuguese elevator is six slides / 30 seconds. Terra implemented the first version and the integrator reviewed it. Copy remains provisional until the owner provides the final pitch. [Delivery verification](docs/presentation/v3/DELIVERY_REPORT_EN.json), [handoff](docs/presentation/v3/MASTER_HANDOFF_EN.md) and [repository dates](docs/presentation/v3/REPOSITORY_DATES_EN.md) preserve the exact scope and pending checks.

## Downloads

[Baixe o pacote completo, os slides, as artes e a demo por links HTTPS públicos](docs/presentation/DOWNLOADS.md).

## NASA data and AI media transparency

The [institutional site’s NASA data section](https://astra-mission-odyssey.andrevictorandrade.chatgpt.site/#nasa-data) distinguishes real NASA satellite media, numerical reference values, scientific concepts and fictional gameplay assumptions. The [structured NASA data registry](public/science/nasa-data-registry.json) records exact values, units, source URLs and how each source relates to the implementation. The genuine Blue Marble Earth texture remains separately credited and is not AI-generated. See [NASA data usage](docs/delivery/NASA_DATA_AND_USAGE_EN.md).

Concept images are visibly marked **AI-generated art**. AI-created SVG identity work and AI-assisted procedural models, portraits and world composition are disclosed separately from NASA media and actual staged gameplay captures. [Public media credits](https://astra-mission-odyssey.andrevictorandrade.chatgpt.site/science-and-art.html), [AI_USAGE.md](AI_USAGE.md) and the asset inventories provide the provenance. The [institutional source repository](https://github.com/andrecodexvictor/astra-institutional) is separate from this game.
