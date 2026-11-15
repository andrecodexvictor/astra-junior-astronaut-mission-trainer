# ASTRA presentation rendering

The v4 renderer preserves the slide copy, narration, timing and source references in the v3 JSON files. It requires this project checkout, the `astra-institutional` checkout with its English-localized artwork and logo, Inkscape, and the Python dependencies used by the v3 renderer. The default paths expect both checkouts under `/workspace`.

```sh
python scripts/build-pitch-v4.py \
  --art-dir /workspace/sites/astra-institutional/art/english \
  --brand-svg /workspace/sites/astra-institutional/dist/assets/brand/astra-lockup-dark.svg \
  --output-dir /workspace/artifacts/ASTRA-Project-Package-2026-11-15/decks
```

Concept art is mapped from each v3 artwork's original filename to `<stem>-en.png` in `--art-dir`. Prototype captures remain the original Portuguese interface. PPTX slide notes carry narration and source IDs; the separate narration Markdown and HTML viewers accompany each deck.
