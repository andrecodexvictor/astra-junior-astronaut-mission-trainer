# ASTRA repository instructions for agents

## Read order and current state

Read GOAL.md, docs/SPACE_APPS_COMPLIANCE.md, docs/PRIOR_WORK.md, docs/GAME_SPEC.md, docs/WORLD_BIBLE.md and docs/BABYLON_WORLD_ARCHITECTURE.md before implementation. The repository currently holds planning only. It is not a runnable application or a NASA submission. Do not invent existing npm commands or passing implementation tests.

## Authorization and provenance

The owner asked for a team-agent execution goal. Delegation is encouraged with bounded tasks, file ownership and isolated worktrees/branches. Terra is the project preference for modeling and development when available; do not claim a model or tool was used when it was not.

Resolve GOAL G0 once. Competition timing and treatment of pre-event work are real pending inputs; do not fabricate organizer approval or hide prior work. Independent product development must be identified as that track. Do not repeatedly ask the owner to approve routine reversible engineering within the chosen scope.

Do not import the old Sites deployment identity or credentials. A public legacy demo is not this repo's release. Never alter commit timestamps to change provenance. No automatic official submission, collaborator invitation or replacement of the old live site is authorized by the planning handoff.

## Engineering contracts

- Babylon renders the world; the pure deterministic simulation owns resource truth.
- Fix internal ticks, ordered commands, units, seed, pause/background policy and save version before parallel feature work.
- No companion skill, XP reward, dialogue, LLM or animation creates resources outside accounting.
- Prove missing-input behavior, conservation, limits, idempotence, failure and recovery.
- Keep companion movement/animation state separate from collision and life-support state.
- Stream finite regions with clear asset ownership and disposal; do not promise an infinite world.
- Pin compatible engine/loaders/physics dependencies; retain licenses and local runtime assets.
- Prefer typed, small modules. A second rendering framework is optional, not a reason to duplicate the game loop.

## Team operation

One integrator owns package/lock/config and shared contracts. Other agents own explicit directories. Send interface changes early and do not edit another front's files without coordination. Review diffs before merge; do not force-push or discard unowned changes. Keep main reviewable and use small integrated vertical increments.

Use actual state/measurements to complete quests. Short dialogue supports play. Human/robot characters and art are original; do not copy Pokémon assets, names, maps, music or proprietary source. Label fictional geography and scientific abstractions.

## Evidence and stopping conditions

Use meaningful unit, asset and end-to-end tests. CPU/DOM and NullEngine are useful, but do not replace real-browser GPU QA or device measurements. Record browser/device/GPU/resolution/commit and trace conditions. If the environment cannot perform a required check, mark it pending; do not claim it passed.

Deliver GOAL's HANDOFF.md, TEST_REPORT.md and ACCEPTANCE.json. Clearly distinguish planned, implemented, tested, blocked and out-of-scope. Preserve failures and known limitations. Once checks pass, do not repeat unrelated test suites without a new change or unresolved concern.

Keep a source/asset/AI inventory, visible generated-media labels where required and third-party notices. Verify a NASA resource is on the chosen challenge's official list before claiming Global Award readiness. No student identity or precise location is needed for gameplay; secrets stay on a server if an optional tutor is added.
