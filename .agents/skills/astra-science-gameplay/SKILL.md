---
name: astra-science-gameplay
description: Design and review ASTRA world interactions, scientific consequences, finite progression and recovery.
---
# ASTRA science and gameplay

Original project guidance, licensed under the repository Apache-2.0 license. This skill is not a transcription or adaptation of the restricted Stanestane bundle.

Read the actual simulation contracts, active goal and implementation status first. Use this for an engineering quest, dialogue consequence, progression reward, readiness report or resource UI. Load at most the other skills needed for the current batch.

## World action and evidence

For each quest record: a visible equipment condition, the player's inspectable evidence, available physical actions, resource/time costs, success and recoverable failure, and the observation recorded in the report. A dialogue choice can explain a plan; the player must perform the consequential task in the world. Quest completion reads authoritative state and emits its reward once. A repeated interaction must not duplicate inventory or XP.

Keep the initial route compact: safe demonstration, short independent repair, a conflicting demand, a protected return and a reflection. A branch needs either useful evidence, character context or a different feasible strategy. Do not inflate walking distance or repeat an identical repair to imply progression.

## Authoritative scientific model

Use named units and deterministic fixed ticks. Generation is kW; stored energy is kWh. Charging and discharging efficiencies are separate. Equipment consumes its required electricity/water before producing oxygen or crop growth; missing dependencies produce no output. Food grows over a declared accelerated game interval. Radiation is a qualitative operational hazard unless a sourced dose model is explicitly introduced. The scene is illustrative terrain unless dataset provenance proves otherwise.

No animation, dialogue, tutor, reward or companion changes resources outside the command/accounting API. Do not pause only one subsystem. Define what happens during dialogue, pause, hidden tab and reload; the initial demo should favor a completely paused simulation over surprise offline deaths. Consequences must be understandable before a failure, and a checkpoint must allow a new strategy.

## Learning and role-playing

Offer a real tradeoff with at least two feasible plans before scaling the world. Let a player inspect the result and revise it. Present short source-linked explanations and explicit game assumptions. A report shows actual actions, measurements and concepts; do not claim learning effectiveness from a score alone.

Use RPG progression for new tools, relationships and exploration permissions. Keep original characters and art. Do not import combat or competitive grinding from a genre skill. Never profile a child's identity or infer personality to tune persuasion. Treat autonomy, confidence and attachment as design hypotheses to evaluate with consented playtests.

## Exit evidence

Add or update deterministic tests for the changed invariant, missing-input and failure/retry case; manually verify one world interaction when a browser is available. Record implemented and unverified behavior separately. Read docs/skills/DESIGN_APPLICATION.md for the current bounded application.
