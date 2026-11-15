# Portuguese full pitch — v5

The owner explicitly requested a Portuguese version of the full 30-slide deck, using the approved institutional website art. This is a separate three-minute deliverable; the English pitch and Portuguese 30-second elevator are preserved.

The six stages are hook, problem, solution, differentiator, proof and ask, with five slides per stage. Every slide lasts six seconds. Copy, narration and source IDs are authored in [PITCH_PT.json](PITCH_PT.json); [Portuguese source notes](SOURCES_PT.md) distinguish current evidence, production concepts and proposed validation.

```sh
python scripts/build-pitch-pt.py \
  --site-dir /workspace/sites/astra-institutional \
  --output-dir /workspace/artifacts/ASTRA-Pitch-PT-30-Slides-v5
```

The script reuses the existing PDF/PPTX/HTML exporter, bundled Liberation Sans fonts and approved logo. It uses the exact landing-page WebP files where available and approved presentation PNGs from the institutional checkout otherwise. It does not regenerate characters, call image services or change the live website. Raster artwork retains original embedded English text; presentation copy and narration are Portuguese.

Outputs include PDF, editable timed PowerPoint, offline timed HTML, slide images, narration, a contact sheet and an asset-hash/layout verification report. The current implementation/vision boundary and AI-art disclosure are retained. Verification of these artifacts does not establish game learning outcomes or hackathon eligibility.
