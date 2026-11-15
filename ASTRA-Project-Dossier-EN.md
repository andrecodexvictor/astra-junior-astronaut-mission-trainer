# ASTRA — Project dossier

*Independent prototype and product vision · 15 November 2026*

## What does ASTRA do, and how does it work?

ASTRA is an interactive space-exploration learning concept for an intended production audience of ages 7–12; that age fit has not yet been validated with learners. It is an experience in which a child becomes the astronaut and learns by making decisions about a lunar mission. The current independent browser prototype lets a player train at an Earth academy, travel in an assisted orbital cabin, and explore a fictional lunar outpost. The player repairs equipment, manages linked power, water and oxygen supplies, investigates a finite ice sample, grows food and seeks shelter from a fictional storm. Visual resource indicators, a journal and authored companion prompts make the consequences visible. A deterministic simulation accounts for resources and mission state; the 3D world presents those results and receives the player's actions.

The wider product vision makes the child the astronaut through a photo-inspired, original stylized identity and a customizable buddy: a human, dachshund, cat, turtle or robot. It imagines a personal base or home, wearable knowledge badges, voice and microphone interaction with an AI guide, a parent app and cooperative multiplayer. These are proposed production features, not capabilities demonstrated by the current prototype. Today PIP and Cometa provide authored offline interactions; no language model decides physical outcomes.

## Which tools, languages, hardware and software were used?

The playable demo is a static web application written in vanilla **TypeScript 5.9.3**, HTML and CSS, using **Babylon.js 9.35.0** core and loaders for 3D rendering and glTF/GLB assets. **Vite 7.3.8** builds it with **Node.js 24**, and **Vitest 4.1.12** runs unit tests. Python was used in procedural model generation and export; Blender was used parametrically in the earlier asset pipeline, without requiring manual Blender work for every model. The project also used OpenAI image generation for clearly labelled concept art, GPT-6.1 Terra and Codex for assisted development, design and documentation, and Git/GitHub for version control. The separate institutional website uses static HTML/CSS/JavaScript, with Sites hosting and an explicit Vercel configuration that publishes the versioned dist directory without a build step. Its Vercel institutional URL is https://astra-institutional.vercel.app/. Its owner-selected demo link points to Vercel; the link alone does not establish that its deployed revision matches the inspected repository.

Development and recorded checks used a managed Linux environment. The staged browser checks ran in Chromium with WebGL 2 through SwiftShader software rendering; no physical GPU was available for verification. To play locally, a user needs a WebGL 2-capable browser and can use a keyboard and mouse. Touch controls exist but have not been validated on an actual touch device. No VR headset, physical robot or other dedicated hardware product is required.

Deliverable preparation also uses Python, Pillow, python-pptx, ReportLab and python-docx for image optimization, editable PowerPoint, PDF and Word exports. Inkscape renders the original SVG identity for raster icon and document use. These are export tools, separate from the browser game runtime.

## The current journey

The demo covers five finite, connected regions: academy, orbital cabin, lunar habitat, canyon and greenhouse. Much of its current interface and narrative is in Portuguese. The player learns movement and interaction at the academy, selects cargo for the journey, and moves through a floor-assisted orbital cabin. This is an accessible game abstraction, not six-degree-of-freedom orbital flight.

At the fictional Aurora outpost, the player restores systems and reads their changing reserves. Power generation and demand are expressed in kW, while stored energy is measured in kWh. Water recycling and electrolysis depend on working equipment, power and available inputs. The player prepares a limited field loadout, repairs the Scout robot, investigates discoveries, carries a finite ice sample back for processing, and gives a crop power, water and time. During a recurring fictional storm, shelter and resource choices matter. Optional dachshund Cometa can follow, wait and respond to authored cues; these interactions do not create resources. PIP provides authored guidance and reminders.

The intended learning cycle is **observe → hypothesize → act → reflect**. The journal can record a hypothesis and evidence, and the player can compare conditions before and after an intervention. A transfer challenge is a design goal: the hypothesis is that reasoning about one situation may help a learner address another. Neither a recorded hypothesis nor a completed mission demonstrates learning or transfer; those outcomes need human study.

## How the simulation works

A pure simulation owns mission state and resource accounting independently of Babylon's rendering and character animations. Ordered, fixed one-second ticks each represent 0.01 mission hours. Commands have prerequisites and costs; missing inputs, limited storage, losses, hazards and failure affect the result. For example, electrolysis requires available water and power, and a repair consumes energy and time. Faster game time advances costs and hazards as well. Paused panels and hidden tabs pause mission time rather than silently catching up. Browser-local checkpoints support recovery; the save format is versioned and has migration paths. World interaction proximity is enforced by the presentation layer, while the simulation checks its own phase, region and resource prerequisites.

The mission is a designed abstraction, not a verified engineering model or astronaut procedure. Rates, capacities, crop yields, terrain and the repeating radiation storm are game assumptions. The authored companion, dialogue and animations cannot override accounting or produce resources by magic. See [science assumptions](../demo/SCIENCE_ASSUMPTIONS.md) and [handoff](../../HANDOFF.md) for the model and current scope.

## NASA concepts and data

Four connected challenge themes organize the experience:

1. **Power and energy:** generation, demand, battery storage and the costs of operating equipment.
2. **Life support and water:** recycling, potable water, oxygen and the inputs needed for electrolysis.
3. **Radiation and shelter:** a warning and a need to seek protection during a fictional storm.
4. **Plants and food:** a crop needs water, power and time, connecting food production to other systems.

NASA sources inform these relationships and some reference values. The game uses lunar gravity of approximately 1.62 m/s², based on NASA's published 1.624 m/s², with an adjusted jump speed for play. NASA ECLSS informs the life-support relationships; NASA's radiation resources inform the shelter concept; and NASA VEGGIE informs the crop concept. Their real-world descriptions do not validate ASTRA's invented game rates, protection or yields. The cabin uses NASA's explanation of microgravity as context, while movement remains floor-assisted.

The Earth texture is an actual satellite-derived **NASA Blue Marble** mosaic, converted by the project to JPEG and credited to NASA/Goddard Space Flight Center Scientific Visualization Studio, Reto Stöckli, NASA Earth Observatory and Terra/MODIS. It is neither AI-generated nor a live feed. Lunar terrain, canyon and ice deposits are fictional: no LRO LOLA elevation model is integrated. [NASA data and usage](NASA_DATA_AND_USAGE_EN.md) and the [source registry](../../public/science/nasa-data-registry.json) distinguish actual media, reference values, conceptual sources and assumptions. NASA provenance alone does not establish that a resource is on the challenge's official list, or confer endorsement or eligibility.

## Production vision and privacy

The future experience is conceived around a child acting as the astronaut, supported by an emotionally engaging companion and an evolving home base. Photo-inspired identity, selectable human or animal/robot buddies, wearable knowledge badges, AI voice, microphone input, a parent app and multiplayer are visualized or described in production materials. They require future implementation and evaluation. The present demo does not upload photos, record a microphone, create child accounts or call an external AI service. Gameplay requires no account, API key or server-side service; saves stay in the browser. PIP and Cometa are authored offline characters, not AI tutors.

The current UI provides keyboard controls and focus, on-screen controls and text-based information alongside graphical indicators. Keyboard focus, movement and pause were observed in the software browser. Touch-device behavior, a comprehensive accessibility review, and usability with children and educators remain unverified; their presence in code is not proof of accessibility for every user.

## Assets, authorship and rights

The demo contains thirteen original GLB models: eight reused from earlier ASTRA work and five newer skinned, keyframed characters. They are fictional assets, not scans of mission hardware. Original project contributions are Apache-2.0; third-party material retains its own terms. The separate institutional site's code is MIT licensed, which does not grant rights to third-party marks or artwork. The institutional identity is original AI-generated SVG artwork. AI-generated concept illustrations carry the owner-requested “Generated by SI” label together with explicit “AI-generated art” disclosure and are design references, not gameplay captures or NASA photographs. The refreshed production concepts use original ASTRA patches after removal of NASA insignia; earlier revisions contained third-party NASA identifiers and remain disclosed in the history. No permission, partnership or endorsement is implied. See [AI usage](../../AI_USAGE.md), [NOTICE](../../NOTICE), the [asset inventory](../../public/assets/manifest.json), and the institutional [media credits](https://astra-mission-odyssey.andrevictorandrade.chatgpt.site/science-and-art.html).

## Verification and current limits

The latest recorded CPU gate reports **67 passing unit tests in nine files**. Thirteen GLBs passed validation with zero errors and warnings. A separate staged visual audit reports **16 passing checks and seven captures** in Chromium using SwiftShader. These prepared states are useful evidence for the checks performed, but they do not prove a complete navigable mission. The full browser route remains failed/incomplete: 25 assertions passed before the radiation gate rejected the route in the slow software-rendered run. Physical-GPU performance, complete end-to-end navigation, real-device touch, accessibility and human learning outcomes remain pending. The institutional site's recorded checks include HTTP access, while browser QA was not performed. Consult the [test report](../../TEST_REPORT.md), [acceptance record](../../ACCEPTANCE.json), and [publication record](../PUBLICATIONS.json) for scope and revisions.

ASTRA incorporates prototype assets and planning created before the event; the actual history and dates are preserved. The owner selected independent demo development on 14 November 2026. This is not an official NASA submission, NASA training, or a claim of competition eligibility. Any future entry needs independent confirmation of the current rules, prior-work treatment and official challenge resource list.

## Public links and source

- [Owner-selected playable demo](https://astra-junior-mission-trainer.vercel.app/) — external deployment; its exact source revision has not been verified here.
- [Institutional site](https://astra-mission-odyssey.andrevictorandrade.chatgpt.site) and [institutional source](https://github.com/andrecodexvictor/astra-institutional).
- [Mission trainer source](https://github.com/andrecodexvictor/astra-junior-astronaut-mission-trainer) and [earlier ASTRA repository](https://github.com/andrecodexvictor/astra-lunar-frontier).
- [Local README and run instructions](../../README.md), [prior work](../PRIOR_WORK.md), and [publication history](../PUBLICATIONS.json).
