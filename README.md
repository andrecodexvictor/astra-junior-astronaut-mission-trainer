# ASTRA — Lunar Frontier

**An educational exploration RPG with a deterministic scientific outpost simulation, designed for Babylon.js.**

> Repository state: **research, specification and agent handoff only**. No playable build is included. This is not an official NASA submission, proof of eligibility or a claim of completed features.

ASTRA is pivoting from dialogue-led scenes toward a world-first adventure: travel through readable routes, investigate equipment and samples, restore original robotic companions, assemble a small field team and keep a lunar outpost alive. Short visual-novel scenes support the journey. Power, water, oxygen, food and radiation decisions remain consequential.

The inspiration is the exploration, party attachment and discovery loop of recent creature-collection RPGs. ASTRA uses original characters, robots, environments and systems; it does not reproduce Pokémon characters, maps, music or assets.

## Start here

| Document | Purpose |
|---|---|
| [Agent goal](GOAL.md) | Standalone execution brief, gates and definition of done |
| [Repository agent rules](AGENTS.md) | Ownership, integration and evidence requirements |
| [Game specification](docs/GAME_SPEC.md) | Gameplay, scientific rules, requirements and scope |
| [World bible](docs/WORLD_BIBLE.md) | Routes, companions, art, encounters and ten missions |
| [Babylon world architecture](docs/BABYLON_WORLD_ARCHITECTURE.md) | Engine decisions, verified examples, asset pipeline and budgets |
| [Space Apps rules review](docs/SPACE_APPS_COMPLIANCE.md) | Confirmed requirements, uncertainty and event timing |
| [Prior-work audit](docs/PRIOR_WORK.md) | Existing prototype provenance and limitations |
| [Execution backlog](docs/EXECUTION_BACKLOG.md) | Work packages and dependency order |
| [Design references](docs/DESIGN_REFERENCES.md) | Inspiration translated into original mechanics |
| [AI usage](AI_USAGE.md) | Current authoring disclosure and future asset obligations |
| [Submission draft](docs/SUBMISSION_TEMPLATE_EN.md) | English project-page draft; unimplemented claims remain placeholders |

Planning documents are in Portuguese for the team; this entry point and the submission draft are in English. Full project-page language and demo limits must be checked against the current 2026 submission guide before submission.

## Space Apps status

The relevant 2026 challenge is [Build a Junior Astronaut Mission Trainer](https://www.spaceappschallenge.org/2026/challenges/junior-astronaut-mission-trainer/). The official [participant terms](https://www.spaceappschallenge.org/legal/) require open availability/licensing and attribution. The organizers' [timing guidance](https://github.com/nasa/spaceapps/discussions/1827) warns against starting project work before the event.

The previous ASTRA prototype predates the event window. It is **not imported into this repository**, and its code, generated art and this pre-event planning must not be represented as newly produced hackathon work. Participation details and treatment of prior work remain unresolved. See the compliance review before starting a competition track.

A future independent product track may evolve the idea without claiming competition eligibility. Merely making a public GitHub repository does not submit a project to Space Apps.

## What exists elsewhere

An independently developed [legacy prototype](https://astra-lunar-frontier-academy.andrevictorandrade.chatgpt.site) exists. It is reference material, not this repository's runnable release or submission demo. Its source snapshot is recorded in [PRIOR_WORK.md](docs/PRIOR_WORK.md). Do not reuse it for a competition entry without resolving eligibility and attribution.

## Planned engineering baseline

Vite + TypeScript + modular Babylon.js; separate simulation, quest, companion, input, world-streaming and UI modules. WebGL 2 is the baseline, with WebGPU as progressive enhancement after parity testing. Real glTF animation, documented collision behavior, bounded regions and measured budgets take priority over a planet-sized map.

There is intentionally no `npm install` / `npm run dev` instruction yet: the application has not been scaffolded here. The execution goal requires the team to add and verify build, typecheck, unit, asset-audit and real-browser commands as part of its first implementation milestone.

## License and credits

Original repository contributions: [Apache 2.0](LICENSE). Engine and external resources must retain their own licenses and notices. NASA data usage and every imported asset require provenance; a blanket repository license does not relicense third-party content. AI assistance is disclosed in [AI_USAGE.md](AI_USAGE.md).
