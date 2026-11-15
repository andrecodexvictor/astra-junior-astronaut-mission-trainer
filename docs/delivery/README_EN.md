# ASTRA — Junior Astronaut Mission Trainer

ASTRA is an independent, playable lunar exploration prototype built with Babylon.js. A cadet travels from an Earth academy to a fictional lunar outpost, investigates interconnected systems, prepares a field expedition and responds to a storm. It is a delivery candidate inspired by the [2026 Junior Astronaut Mission Trainer challenge](https://www.spaceappschallenge.org/2026/challenges/junior-astronaut-mission-trainer/); it is not an official submission or NASA-endorsed training.

> This file is intended to be copied to the repository root as `README.md`. Paths below are repository-root paths. The in-game narrative and much of the interface are currently in Portuguese.

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
