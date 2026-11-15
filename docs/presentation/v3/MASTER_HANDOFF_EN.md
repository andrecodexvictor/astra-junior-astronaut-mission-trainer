# ASTRA — Institutional pitch and website handoff

## Mission

Present ASTRA to NASA Space Apps hackathon judges and prospective education partners. The player is the astronaut: the child makes decisions in a consequential space-science adventure. Do not turn the presentation into a direct-to-parent product advertisement. The problem is making engineering trade-offs tangible without oversimplifying the science or overwhelming a young learner.

## Delivered format

The English main pitch has 30 slides, 6 seconds each, for 180 seconds. Its six acts are hook, problem, solution, differentiator, proof and ask. The Portuguese elevator pitch is the requested language exception: six slides, 5 seconds each, for 30 seconds. Both have editable text, speaker notes, automatic advances, PDF and standalone HTML editions. The MP4 is a silent timing reference, not a recorded spoken pitch. Rehearse the supplied narration before recording.

The English institutional website tells the same story separately from the Babylon.js demo. It has no login, tracking, forms, microphone or uploads. Its small resource-choice interaction is an editorial illustration, not the deterministic game simulation. Public downloads and full slide viewers belong in the judges' pack.

## Art direction

Use the approved ASTRA game world: a compact expressive astronaut, PIP, the dachshund buddy, modular lunar architecture, warm habitat lighting and legible engineering. Keep the child, companion and surroundings in coherent scenes. The main direction is integrated full-scene backgrounds with a restrained dark veil, generous text spacing, warm orange for agency and cyan for information. Do not use real-world family photography, domestic scenes, generic stock imagery or detached HUD fragments. Preserve the game context when showing actual captures; never relabel concept art as shipped graphics.

Use original compositions, characters and assets. References to exploration games inform agency, discovery and world readability; they do not authorize copying their characters, UI, music or source. Show technical details only when they help the judging argument. Avoid decorative card grids, excessive badges and tiny prose.

## Content and product boundaries

The current demo has a finite Babylon.js world, deterministic resource accounting, graphical survival bars and authored offline companions/reminders. Recorded evidence includes 67 CPU unit tests and 16 staged Chromium checks with software rendering. The complete browser route was not accepted; physical-GPU performance and learning outcomes with people remain pending. These records do not certify a fully completed game or educational effectiveness.

Production concepts include photo-inspired avatars in ASTRA's art style, a customizable buddy species or human form, conversational AI and voice, wearable knowledge badges, a personal home base, parental supervision and later multiplayer. These require separate design, engineering, consent and evaluation. Do not depict them as current services or claim an AI companion treats loneliness, attention difficulties or replaces human relationships.

## Evidence and ask

The official challenge statement concerns life support, radiation shielding, power and food production. Water and oxygen are connected parts of life support. Simulation quantities are teaching assumptions with documented units, not operational NASA specifications. NASA science references support explanations; a NASA-grounded tutor is planned, not an existing validated agent.

The 33-study Wang et al. meta-analysis concerns digital game-based STEM education generally. It does not establish ASTRA outcomes. The proposed next step is a supervised educator pilot measuring whether learners can explain a decision and apply it to a new scenario, alongside usability and appropriate safeguarding evaluation. No pilot enrollment, partner contract, pricing, NASA partnership or submission is asserted.

## Design thinking and ergonomics

Use two audience lenses: judges need fast evidence of challenge fit and feasibility; children need agency, understandable feedback and a reason to investigate. The design hypothesis is that a meaningful mission can connect an abstract concept to an observable consequence. Prototype a short complete loop, observe learners, test explanation and transfer, and revise from evidence.

Keep one main message per slide, concise headlines and a readable hierarchy. The website uses native buttons, keyboard focus, semantic headings, progressive disclosure, responsive layouts, reduced-motion support and redundant text feedback. Color communicates emphasis rather than being the sole indicator. Contrast and mobile crop decisions need real browser and assistive-technology review before claiming accessibility conformance.

## Rebuild

The handoff kit preserves the required directory layout. Install scripts/requirements-export.txt in an isolated Python environment and run python3 scripts/build-pitch-v3.py --output-dir ./output. Required libraries are Pillow, python-pptx and ReportLab; the kit includes Liberation Sans fonts and their license. The website is buildless: publish institutional/dist/ or serve it with a static HTTP server. Keep its deployment identity only when updating the existing hosted Site; create a new identity for an intentionally separate deployment.

## Verification and remaining review

VERIFICATION.json records counts, notes, durations, PDF pages, embedded HTML frames, editable text and hyperlinks. The integrator inspected contact sheets and critical rendered slides. PowerPoint desktop rendering and a spoken rehearsal were not available. Managed browser QA was unavailable because the required CUA tool was not exposed; static website checks do not substitute for a real desktop/mobile session. Do not report these pending checks as passed.

Pre-existing concept art includes NASA graphics on fictional uniforms. The prior competition review records restrictions on NASA graphics in generated competition media; review this before official submission. Keep AI labels and asset attribution. This work includes documented pre-event material, and a new repository does not change its origin. The indexed challenge brief was verified on 15 November 2026; the complete current submission guide, exact challenge resource list, media compliance and team eligibility still require confirmation. The requested Portuguese elevator is supplied; verify language requirements for the actual submission. No official submission was performed.
