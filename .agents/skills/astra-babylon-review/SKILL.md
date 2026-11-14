---
name: astra-babylon-review
description: Review ASTRA Babylon rendering, authored models, locomotion, lifecycle and honest performance evidence.
---
# ASTRA Babylon review

Original project guidance, Apache-2.0. Read the locked Babylon version and actual files before choosing APIs. Babylon.js is the rendering/game-world engine; do not add Three.js or a second renderer to reproduce an existing feature.

## Scope and asset contract

For one finite region, define origin/axes/meters, player dimensions/speed, safe walkable routes, interactable anchors and a loading boundary. Measure the controller before final geometry. Keep world coordinates and quest IDs stable. Separate the authored plan from actual imported/runtime placement.

Prefer local licensed glTF/GLB models, AssetContainer ownership and reusable factories. Verify import scale, normals, materials, rig, animation groups and bounds with the real asset. For procedural fallback, build modular silhouettes with shared PBR materials and publish the fallback honestly. A concept image is not a mesh or a rig. Do not claim procedural geometry has the same detail as reference images.

## Animation and movement

The controller owns translation/collision. Exactly one system owns yaw. Avoid adding root-motion translation over an already moving controller. Test idle/walk/run/turn transitions, diagonal input, stopping, slopes and door clearance. Keep visual stride/bob separate from scientific time and physics. PIP follows with a bounded distance and recovery; it cannot obstruct a critical route. Rig retargeting requires a real bind-pose and bone-map check, not only matching clip names.

## Frame and lifecycle

One active render loop and a clearly owned simulation scheduler. No high-frequency React/state subscription loop is needed for this Vite/TypeScript demo. Cache materials and use instances where visual identity allows; texture sizes, shadow casters, light count, particles and resolution each need a budget. Test scene disposal: meshes/materials/textures/observers/input listeners/sounds and loading tasks must be owned and released or intentionally shared. Protect against a late async load attaching to a disposed scene.

Use native engine features before custom shaders or custom physics. Keep collision simple where it proves adequate; do not claim full rigid-body realism. Choose a pinned physics plugin only for a concrete unmet interaction and test its setup/failure path.

## Review evidence

Test rendering in a real WebGL/WebGPU browser if available. Capture scene/commit/browser/GPU/resolution/quality, a repeatable route, frame-time distribution and load/dispose counters. NullEngine tests prove API/scene logic, not visual fidelity or GPU speed. Do not report 60 fps from a single sample, headless software renderer or target budget. If no GPU/browser is available, complete the code and CPU checks, provide the exact manual route and mark visual/performance checks pending.
