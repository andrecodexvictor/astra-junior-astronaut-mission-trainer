# NASA data and usage

ASTRA is a fictional educational prototype. Its sources ground concepts and a small number of reference values; they do not validate its fictional rates, engineering design, learning outcomes or operational procedures. The [machine-readable registry](../../public/science/nasa-data-registry.json) records the references, project paths and limits. These are static reference values, not a live NASA API or feed.

## References and implementation

- [NASA Science: Moon by the Numbers](https://science.nasa.gov/moon/by-the-numbers/) gives lunar surface gravity as 1.624 m/s², Earth surface gravity as 9.80665 m/s² and lunar equatorial radius as 1,737.5 km. The game uses 1.62 m/s² for lunar movement, with jump speed adjusted to 2.4 m/s for controls. Its terrain and biomechanics are fictional.
- [NASA ECLSS](https://www.nasa.gov/reference/environmental-control-and-life-support-systems-eclss/) describes interconnected life-support functions, including the use of electricity to split water into oxygen and hydrogen. ASTRA turns those relationships into choices about water, power and oxygen. Its rates, recovery, capacities and losses are didactic assumptions, not NASA specifications.
- [NASA's space radiation overview](https://www.nasa.gov/hrp/hazard-space-radiation/) and [lunar radiation protection discussion](https://science.nasa.gov/science-research/heliophysics/how-nasa-will-protect-astronauts-from-space-radiation-at-the-moon/) inform the shelter concept. The repeatable fictional storm is neither a forecast nor a radiation-dose model.
- [NASA VEGGIE](https://science.nasa.gov/mission/veggie/) informs the plant-growth concept. ASTRA's growth time, irrigation and yield are invented for play, not NASA-validated rates.
- [NASA's microgravity explanation](https://www.nasa.gov/learning-resources/for-kids-and-students/what-is-microgravity-grades-5-8/) provides context for orbit; the assisted movement does not model full orbital physics.
- [NASA's CGI Moon Kit and LRO LOLA](https://svs.gsfc.nasa.gov/4720/) are possible future sources. No LOLA map or measured elevation model is integrated: the lunar landscape, canyon and ice deposits are fictional.

The four challenge themes are power and energy, life support and water, radiation and shelter, and plants and food. Their simulation dynamics are hypotheses created for gameplay. The source registry does not change game accounting.

## Earth image and creative assets

The institutional website’s Earth image at `science/earth.jpg` is a static satellite-observation mosaic derived from [NASA SVS Blue Marble](https://svs.gsfc.nasa.gov/2915/), not AI-generated imagery. Credit: NASA/Goddard Space Flight Center Scientific Visualization Studio; Reto Stockli; NASA Earth Observatory; Terra/MODIS. The source PNG was converted to a 2048 × 1024 RGB JPEG by the project; the site copy is byte-identical to the game's `public/assets/textures/earth.jpg`. SHA-256: `312c89088b2e1f50607d449c5f69e2735df03b0f8889e9b2b958c0dfed6fc887`. See the game's `public/science/earth-provenance.json` for the source download and transformation. The image is not live weather or a live satellite feed. Consult [NASA image and media guidelines](https://www.nasa.gov/nasa-brand-center/images-and-media/) for reuse; no NASA endorsement is implied.

Any AI-generated artwork must be explicitly labelled as AI-generated wherever presented. Do not label the NASA Earth mosaic as AI-generated or represent AI artwork as a NASA photograph. The game's `docs/art/` concepts are AI-generated references, not runtime screenshots.

NASA origin alone does not establish inclusion on the current official challenge resources list or Global Award eligibility. Check the live challenge resources and applicable rules independently.
