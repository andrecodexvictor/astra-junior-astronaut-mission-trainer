# Science and provenance

ASTRA is a fictional educational prototype. Its systems illustrate relationships and tradeoffs; they are not an engineering specification, medical guidance, validated training or a prediction of lunar operations. The learning sequence invites inspection, hypothesis, intervention and comparison of evidence, but has not been evaluated in a learning study.

## Simulation boundaries

The pure simulation in `src/simulation/index.ts` uses ordered one-second ticks, each representing 0.01 mission hours. Power is in kW and stored energy in kWh; battery charging and discharging each use 90% efficiency. Crew water use, 80% recycling, recycler loss and electrolysis in an ideal 8:1 oxygen-to-hydrogen mass ratio are recorded. A finite 8 kg ice deposit supplies a 0.5 kg sample and processing moves delivered ice into water. Equipment repairs take modeled time and energy. Crop irrigation, delayed growth and biological yield are simplified; there is no complete ecological mass model. Storm timing and shelter are fictional abstractions, not radiation forecasts or dose calculations. `docs/demo/SCIENCE_ASSUMPTIONS.md` gives assumptions and caveats; source code is authoritative for current implementation.

Terrain and outpost geography are authored fiction. The NASA Earth image is context, not lunar terrain data. Crew safety, animal care, thermal control, atmospheric pressure and engineering margins are not fully modeled. Cometa's behavior is fictional; her actions do not generate resources. Do not treat play as real mission procedures.

## Sources and assets

- NASA/Goddard Space Flight Center Scientific Visualization Studio, Reto Stockli, NASA Earth Observatory and Terra/MODIS: [Blue Marble](https://svs.gsfc.nasa.gov/2915/). The source PNG was converted to a same-resolution JPEG; credits, source URL and hash are in `public/science/earth-provenance.json`. [NASA media guidelines](https://www.nasa.gov/nasa-brand-center/images-and-media/) apply. No endorsement is implied.
- NASA references for life support, Moon facts, radiation and plant research are background candidates listed with URLs in `docs/research/SCIENCE_SOURCE_CANDIDATES.json`; they do not validate the chosen game rates. LOLA is listed as a candidate, not used as measured terrain here.
- The manifest `public/assets/manifest.json` records eight reused original parametric GLBs and five later original skinned, keyframed character GLBs, their hashes, authorship and rights. The original model authoring scripts are retained in `tools/models/`. The concepts in `docs/art/` are labelled AI-generated references and are not runtime game screenshots.
- Original contributions are Apache-2.0. Dependencies, vendored skills, NASA imagery and other third-party material retain their respective licenses or usage terms; consult `LICENSE`, `NOTICE`, `skills.lock.json` and asset manifests. `AI_USAGE.md` describes assistance and known review limitations.

The [challenge page](https://www.spaceappschallenge.org/2026/challenges/junior-astronaut-mission-trainer/) and legal endpoint returned errors in the documented review environment; the full official challenge Resources list was not verified. Blue Marble's NASA origin does not establish that it is on that list or establish Global Award eligibility. Confirm the live official sources and local rules independently before any submission.

## Prior work and evidence

The independent ASTRA prototype and planning predate the event, and existing assets were reused with provenance. The preserved Git history and `docs/PRIOR_WORK.md` document this; a new repository or publication does not make that work newly created. Automated tests and audits examine specific implementation properties; real-browser visual, accessibility and device evidence, and human learning evidence, must be assessed separately. Use `TEST_REPORT.md` for current recorded results.
