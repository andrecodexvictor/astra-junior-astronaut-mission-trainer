# ASTRA — Future APIs, datasets and learning resources

**Updated:** 15 November 2026

**Purpose:** implementation roadmap for the browser game, institutional project description and future agent handoff.

**Language:** English, consistent with the project's submission materials.

This is the proposed resource stack for ASTRA, not a claim that every integration is implemented. The seven entries in the first table come from the official challenge Resources excerpt supplied by the project owner. Their destinations and relevant documentation were reviewed separately. The challenge page itself was not independently captured during this review. Listing a resource does not establish eligibility, endorsement or permission to reuse every associated asset.

Challenge: [Build a Junior Astronaut Mission Trainer — Resources](https://www.spaceappschallenge.org/2026/challenges/junior-astronaut-mission-trainer/?tab=resources).

## 1. What the project actually uses today

The current demo uses Babylon.js, TypeScript and a deterministic local simulation. Its scientific references are static; it does **not** currently consume live DONKI, OSDR, RadLab or Mars Trek data. Its repeatable radiation event is fictional, its engineering rates are didactic assumptions, and its lunar terrain is procedural rather than a measured elevation model.

Current use includes NASA explanations of lunar gravity, life support, radiation, plant growth and microgravity, plus a locally packaged NASA Blue Marble Earth image. Implementation paths and limits are recorded in [NASA data and usage](https://github.com/andrecodexvictor/astra-junior-astronaut-mission-trainer/blob/main/docs/delivery/NASA_DATA_AND_USAGE_EN.md), the [source registry](https://github.com/andrecodexvictor/astra-junior-astronaut-mission-trainer/blob/main/public/science/nasa-data-registry.json) and [Earth-image provenance](https://github.com/andrecodexvictor/astra-junior-astronaut-mission-trainer/blob/main/public/science/earth-provenance.json).

Priority definitions:

- **P1 — next data-connected release:** complete the lunar learning loop with a small, reproducible source bundle.
- **P2 — enrichment:** add curated research, measurement comparisons, museum media and measured lunar terrain after the core works.
- **P3 — expansion:** Mars and additional destinations; optional daily discovery content.

## 2. All seven resources listed in the supplied challenge excerpt

| Resource | What it provides | Planned use in ASTRA | Access and priority |
| --- | --- | --- | --- |
| [NASA Open APIs](https://api.nasa.gov/) | A catalog and access gateway for several services; not one dataset. | Discover supported services and manage a key where the chosen service requires one. Select DONKI and optional APOD deliberately rather than connecting every API. | Some gateway services use a NASA API key. Individual services have different access rules. **P1 infrastructure/reference; not an integration itself.** |
| [DONKI — Space Weather Database](https://ccmc.gsfc.nasa.gov/tools/DONKI/) | Solar-flare, coronal-mass-ejection and other space-weather event records and analyses. | A documented historical solar event becomes a replayable shelter/communications mission. An optional later mode can show recent events separately from the campaign. | Current CCMC endpoint returned JSON without a key in the limited probe. Gateway authentication can differ. **P1, planned.** |
| [NASA Open Science Data Repository — OSDR](https://osdr.nasa.gov/bio/repo/) | Space-biology research datasets, experiment metadata and associated files. | Curated plant-growth and astronaut-health evidence cards; museum exhibits; source-grounded PIP/buddy explanations. | Public search and data access; inspect each study and file's terms. **P2, planned.** |
| [RadLab — Radiation Dosimetry Database](https://visualization.osdr.nasa.gov/radlab/gui/data-api/) | Radiation measurements with instrument, spacecraft and time context. | A terminal where players compare measured radiation environments and learn why measurement context matters. | A small API query returned JSON without a key. Preserve instrument metadata and units. **P2, planned.** |
| [Mars Trek](https://trek.nasa.gov/mars/) | Mars imagery, mapped products and terrain exploration; published map layers have service metadata. | Future Mars site selection, terrain references and a small preprocessed surface region. | Public portal and documented map services; inspect each layer's capabilities and conditions. **P3, planned.** |
| [CSA resources for STEM and youth organizations](https://www.asc-csa.gc.ca/eng/youth-educators/resources-stem-and-youth-organizations.asp) | Free bilingual English/French educational tools and activities. **Not an API.** | Educator pilot materials, museum activities and mission debriefs adapted for ASTRA's age range. | Read/reference online; reproduction depends on the item and applicable terms. **P1 content, planned.** |
| [CSA food production toolkit](https://www.asc-csa.gc.ca/eng/youth-educators/toolkits/food-production/) | Food, nutrition, plant-production activities and related educational media. **Not an API.** | Greenhouse missions: choose lighting and water allocation, inspect crops and connect the result to nutrition and remote communities on Earth. | Curate appropriate activities and verify media permissions. Some activities target Grades 6–9 and require adaptation for younger players. **P1 content, planned.** |

The Open APIs portal and DONKI are separate inventory entries because the challenge lists both; they must not be counted as two independent scientific datasets for the same event.

## 3. API integration references and examples

### 3.1 DONKI: historical events before live scenarios

- Overview: <https://ccmc.gsfc.nasa.gov/tools/DONKI/>
- Current API documentation: <https://ccmc.gsfc.nasa.gov/DONKI/api/>
- Verified small request: <https://ccmc.gsfc.nasa.gov/DONKI/WS/get/FLR?startDate=2024-05-10&endDate=2024-05-10>
- CCMC publication policy: <https://ccmc.gsfc.nasa.gov/publication-policy/>

Start with solar-flare records (`FLR`); consider solar energetic particles (`SEP`) and CME records only after their meaning and relationships are understood. Store event identifiers, original timestamps, instruments and source links. A versioned design rule maps a selected event into a **qualitative educational scenario**.

A flare classification or CME record is not a direct measurement of a lunar astronaut's radiation dose. Do not convert it into invented mSv values, a real EVA safety instruction or a medical prediction. DONKI describes research/prototyping information; the game must not present it as an operational warning service.

### 3.2 OSDR: curated studies, not unfiltered scientific files

- Repository: <https://osdr.nasa.gov/bio/repo/>
- NASA API overview: <https://www.nasa.gov/osdr-api/>
- Biological Data API documentation: <https://visualization.osdr.nasa.gov/biodata/api/>
- Verified search example: <https://osdr.nasa.gov/osdr/data/search?term=plants>
- Repository overview: <https://science.nasa.gov/biological-physical/data/osdr/>
- FAQ: <https://science.nasa.gov/reference/osdr-faq/>

An ingestion job searches candidate studies. A human-reviewed content record then retains accession/study identifiers, organism, experimental conditions, findings, limitations and a short age-appropriate explanation. Ship selected excerpts and metadata rather than large raw experiment files.

Plant, animal or cell findings do not automatically establish human physiological rates. PIP can explain a study's limits; the game must not use a single experiment as a universal nutrition, health or crop-production model.

### 3.3 RadLab: measurements with context

- Query documentation: <https://visualization.osdr.nasa.gov/radlab/gui/data-api/>
- API base: <https://visualization.osdr.nasa.gov/radlab/api/>
- Verified bounded example: <https://visualization.osdr.nasa.gov/radlab/api/?spacecraft=ISS&instrument=DosTel&timestamp%3E=2022-04-01T23%3A00&timestamp%3C=2022-04-01T23%3A05&absorbed_dose_rate&format=json>

The API supports field selection, time constraints and formats including JSON and CSV. The example returned timestamp, instrument identifiers, absorbed-dose-rate values, instruments and spacecraft. A response value without its documented unit and instrument context is not sufficient for gameplay use.

The documentation illustrates absorbed dose rate in microgray per hour. Preserve the specific product's units; **gray and sievert are not interchangeable**. ISS measurements must not be presented as measured conditions at ASTRA's lunar base. Initially use curated comparisons in a science terminal, while the campaign's radiation hazard remains qualitative.

### 3.4 Mars Trek: map services and offline terrain production

- Portal: <https://trek.nasa.gov/mars/>
- Official WMTS API guide: <https://trek.nasa.gov/tiles/apidoc/trekAPI.html?body=mars>
- General Trek service documentation: <https://trek.nasa.gov/tiles/apidoc/>

Use each selected layer's `GetCapabilities` and metadata to determine its actual endpoint, tile matrix, coordinate reference system, bounds and format. Trek is not a universal REST endpoint that returns an arbitrary ready-to-play 3D level.

For a future Mars region: select a documented site; obtain an actual elevation product; crop and resample offline; build a visual heightfield and a simpler collision mesh; package local assets and attribution. A hillshade or RGB image tile is **not** an elevation raster. Mission structures and traversal adjustments remain authored game design.

## 4. Supporting NASA resources: science, media and worldbuilding

These sources support the project but were not all present in the seven-item excerpt. Keep that distinction in submission descriptions.

| Source and links | ASTRA use | Status / limits |
| --- | --- | --- |
| [Moon facts](https://science.nasa.gov/moon/facts/) and [Moon by the Numbers](https://science.nasa.gov/moon/by-the-numbers/) | Lunar environment, gravity explanations and reference cards. | **Referenced today.** The source's lunar gravity is 1.624 m/s²; the demo rounds to 1.62 and adjusts controls for play. |
| [NASA ECLSS](https://www.nasa.gov/reference/environmental-control-and-life-support-systems-eclss/) | Explain interconnected water, oxygen and electrical systems. | **Referenced today.** The project's equipment rates, storage and efficiencies remain declared assumptions. |
| [Space radiation](https://www.nasa.gov/hrp/hazard-space-radiation/) and [protection at the Moon](https://science.nasa.gov/science-research/heliophysics/how-nasa-will-protect-astronauts-from-space-radiation-at-the-moon/) | Shelter decisions and radiation explanations. | **Referenced today.** Not operational procedures or a dose model. |
| [VEGGIE](https://science.nasa.gov/mission/veggie/) | Plant-growth context and greenhouse design questions. | **Referenced today.** Game growth time and yield are compressed/invented. |
| [What is microgravity?](https://www.nasa.gov/learning-resources/for-kids-and-students/what-is-microgravity-grades-5-8/) | Orbital training explanations. | **Referenced today.** Neutral buoyancy and assisted controls are not full microgravity simulations. |
| [NASA SVS Blue Marble](https://svs.gsfc.nasa.gov/2915/) | Earth globe/background texture. | **Packaged today.** Static observation mosaic; not AI art, live weather or a terrain-height product. Credits and transformations are recorded locally. |
| [NASA Image and Video Library](https://images.nasa.gov/), [API base](https://images-api.nasa.gov/) and [official API PDF](https://images.nasa.gov/docs/images.nasa.gov_api_docs.pdf) | Museum exhibits, short terminal videos, briefing imagery and contextual source cards. | **P2, planned.** Public search returned JSON. Curate and cache selected items; verify credits, rights, captions and suitability individually. |
| [CGI Moon Kit](https://svs.gsfc.nasa.gov/4720/) | Lunar visualization maps and a documented introduction to LROC/LOLA-derived assets. | **P2, planned.** Distinguish color maps from displacement/elevation data and preserve transformations. |
| [Moon Trek](https://trek.nasa.gov/moon/) | Select a plausible lunar region and inspect mapped products. | **P2, planned.** Use appropriate layer documentation; current terrain is still fictional. |
| [Planetary Data System](https://pds.nasa.gov/) and its [Geosciences Node](https://pds-geosciences.wustl.edu/) | Obtain a specific documented LRO/LOLA elevation product and its labels/metadata when needed. | **P2, planned.** The university-hosted Geosciences Node is a PDS node. Choose a product before promising resolution or accuracy. |
| [NASA Technical Reports Server](https://ntrs.nasa.gov/) | Deeper engineering references for authors and tutor source selection. | **P2, optional.** Use public reports; technical publications still require interpretation and age adaptation. |
| [NASA 3D Resources](https://science.nasa.gov/3d-resources/) | Engineering reference and possible optimized museum models. | **P2, optional.** Verify each asset's rights, performance and attribution; no blanket claim that these models are already in the game. |
| [APOD current API](https://science.nasa.gov/wp-json/wp/v2/apod-basic) and [current guide](https://api.nasa.gov/assets/files/apod/APOD-APIs-and-RSS-info.pdf) | Optional curated discovery card or museum feature. | **P3, optional.** Some media are copyrighted by third parties; content can be video or an iframe rather than an image. |

NASA Image Library API examples:

- Search: <https://images-api.nasa.gov/search?q=moon&media_type=image&page_size=1>
- Asset files: `https://images-api.nasa.gov/asset/{nasa_id}`
- Metadata: `https://images-api.nasa.gov/metadata/{nasa_id}`
- Captions: `https://images-api.nasa.gov/captions/{nasa_id}`

The last three are **documented templates**, not links to a specific selected asset. Library imagery does not provide lunar elevation by itself.

## 5. Important service changes: avoid obsolete integration plans

The [NASA API portal notice](https://api.nasa.gov/assets/html/header.html) currently states:

1. **APOD has a new API.** The legacy APOD API is scheduled to be archived on **1 December 2026**. New work should use the Science NASA endpoint and its current guide.
2. **The Mars Rover Photos API has been archived.** Do not build a new dependency on the old rover-photo route merely because an older resource description mentions it. Use curated Image Library material or documented mission/PDS products where appropriate.
3. **The old Earth API has been archived and replaced by Earthdata GIBS.** ASTRA does not need that additional integration for its current static Earth texture; evaluate GIBS separately if an Earth-observation activity is scoped.

DONKI's [official overview](https://ccmc.gsfc.nasa.gov/tools/DONKI/) also describes its 2026 move from the old `kauai.ccmc.gsfc.nasa.gov` host to `ccmc.gsfc.nasa.gov`. Use the current host in new adapters.

For the new APOD API, the current guide documents:

- A small page: <https://science.nasa.gov/wp-json/wp/v2/apod-basic?page=1&per_page=5>
- One date using the **YYMMDD path format**: <https://science.nasa.gov/wp-json/wp/v2/apod-basic/140918>
- Range parameters: `date_from=YYMMDD` and `date_to=YYMMDD`; `per_page` is capped at 25 according to the guide.

The single-date example was checked and returned `2014-09-18`. An earlier probe with the legacy-style `?date=YYYY-MM-DD` returned HTTP 200 but a different date. **A successful HTTP response is not proof that an old parameter still works.**

NASA gateway rate-limit guidance: [authentication and quotas](https://api.nasa.gov/assets/html/authentication.html). Published defaults are 1,000 requests/hour per key; `DEMO_KEY` has 30/hour/IP and 50/day/IP. Limits vary by service. These numbers must not be applied automatically to independent OSDR, RadLab, Trek or Image Library services. Do not ship a shared demo key as the production strategy.

## 6. How the integrations fit the game

### Data flow

1. A server-side or build-time ingestion tool reads an approved source using bounded requests, timeouts and retry/backoff.
2. It stores a raw snapshot, retrieval time, source identifier and checksum.
3. A reviewed adapter validates fields, timestamps and units and produces a small normalized record.
4. A versioned mission package includes that record, its sources, the educational interpretation and declared simplifications.
5. Babylon.js renders the scene; the deterministic game simulation owns resource accounting and consequences.

**Do not call external APIs every frame or make connectivity necessary to finish a campaign mission.** Cache approved media and scenarios locally. Show whether content is an archived observation, a recent observation, a didactic adaptation or fictional worldbuilding. Recent data should display its observation and retrieval times; an old cached event must not look live.

For PIP and the customizable companion, the planned approach is retrieval from a reviewed NASA/CSA knowledge collection, with source IDs and authored offline fallback. This is not a claim that NASA trained, approved or endorsed a model. Tutor output cannot mutate oxygen, water, energy, quest completion or the scientific simulation.

### Future application services — proposed, not implemented

These are internal ASTRA capabilities, not NASA APIs. Final providers and endpoint names have not been selected.

| Capability | Purpose and boundary |
| --- | --- |
| Science catalog and scenario snapshots | Deliver approved references and immutable event packages; core missions retain offline copies. |
| Grounded tutor | Return a short hint/explanation with source IDs, confidence and fallback status; no game-state authority. |
| Speech recognition and speech synthesis | Optional voice input/output for PIP and the companion; text remains available and voice is user-initiated. |
| Photo-based avatar/companion generation | Optional transformation into ASTRA's consistent original art style. A provider, consent, retention/deletion policy and moderation flow remain to be designed. |
| Guardian settings and progress | Future access controls and learning evidence; distinguish planned controls from current capabilities. |
| Multiplayer | A later authenticated, moderated system; independent of the anonymous public demo. |

No LLM, speech or image-generation vendor is committed by this inventory. Do not place provider secrets in browser code or send child photos, voice or identity to scientific data services.

## 7. Provenance and reuse requirements

Each adopted dataset, event or media item should retain:

- Stable source/study/event/asset ID, title and original URL.
- Observation/publication time, retrieval time and the ingestion version.
- Instrument, location/spacecraft and experimental context when applicable.
- Units and quantity definitions; for terrain, projection, horizontal resolution, vertical reference and height units.
- Original checksum and all crop, conversion, resampling, compression or interpretation steps.
- Credit, rights/usage notes and any third-party restrictions.
- The mission/content IDs that use it and a clear label for observation, adaptation or fiction.

Reuse references:

- [NASA images and media guidelines](https://www.nasa.gov/nasa-brand-center/images-and-media/)
- [CSA terms and conditions](https://www.asc-csa.gc.ca/eng/terms.asp)
- [CCMC publication policy](https://ccmc.gsfc.nasa.gov/publication-policy/)

NASA branding is not a blanket permission or an endorsement. Current ASTRA concept artwork uses original ASTRA patches and visible **“Generated by SI · AI-generated art”** disclosure. Actual NASA photographs should carry their real credits and must not be mislabeled as generated artwork. Keep references and copied material distinguishable from original game assets.

## 8. Recommended delivery sequence

1. **Source bundle:** curate a small set of ECLSS, Moon, radiation, VEGGIE and CSA cards with explicit source IDs and age-appropriate text. Preserve the existing offline learning loop.
2. **First actual API feature:** ingest one historical DONKI event, ship its snapshot and build a deterministic shelter mission around a declared qualitative mapping. Test offline replay and source visibility.
3. **Museum and terminals:** add a few rights-reviewed NASA Image Library items with captions and optional short videos. This supports discovery without replacing world interactions with long menus.
4. **Research enrichment:** select one suitable OSDR plant study and one RadLab comparison with units and context. Review the interpretation before release.
5. **Measured lunar region:** adopt one documented elevation product, record preprocessing and preserve a procedural fallback. Keep authored geometry and educational abstractions visible in documentation.
6. **Later expansion:** Mars Trek terrain and optional APOD discovery. Voice, photo companions, guardian services and multiplayer require separate implementation and validation goals.

Acceptance for any new integration: correct schema and units; provenance and attribution; bounded requests; stale/error handling; local fallback; no secret exposure; deterministic replay where it affects a mission; browser testing. No API should be added merely to increase the number of integrations.

## 9. Verification performed for this inventory

On 15 November 2026, limited anonymous requests returned HTTP 200 and JSON for current CCMC DONKI flare records, OSDR plant search, a bounded RadLab dosimetry query, Image Library search and the new APOD service. The APOD single-date route was also checked against its documented date format. Current API notices, authentication guidance, APOD guide, Image Library API PDF, Trek API guide, CSA terms and NASA 3D resource page were accessible during review.

These are endpoint/documentation checks, **not completed game integrations**, performance/load tests, guaranteed future availability, browser CORS checks or validation of a scientific game model. Research findings and the implemented demo baseline are intentionally kept separate.

Machine-readable probe evidence: [API resource verification](https://github.com/andrecodexvictor/astra-junior-astronaut-mission-trainer/blob/main/docs/delivery/API_RESOURCE_VERIFICATION_2026-11-15.json).
