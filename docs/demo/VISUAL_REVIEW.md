# Wave 3B visual review

Reviewed six fresh Chromium/SwiftShader screenshots in `fixture-captures/`. These are **staged valid saves and camera positions**, not captures proving a full mission walkthrough. `VISUAL_FIXTURE_REPORT.json` records their source, simulation hashes, renderer and viewport. Runtime application code remains `a239c95`; the fixture script is a separate verification tool. The older route captures 04–06 remain historical.

| Staged capture | Observed | Remaining limitation |
| --- | --- | --- |
| 01 academy | Astronaut, PIP and Cometa are separated; paved route and training stations visible; HUD readable. | World rendering is soft; distant labels cannot be approved for readability. |
| 02 habitat | Lunar ground, base equipment and a clear paved central path are present. | Overhead framing shows little horizon; this is not a cinematic base overview. |
| 03 habitat crew | Companion silhouettes and central console are visible; interaction prompt is readable. | No all-clip contact, face-animation or cinematic quality acceptance. |
| 04 canyon | Canyon station, Scout and three companions render; path and interaction prompt visible. | Static target label still says Scout is damaged after the prepared state recruited it; retain as a known wording issue. |
| 05 greenhouse | Plant rows, grow beds, glazed structure and warning UI visible. | Reduced resolution blurs fine geometry; structure/plant quality remains far below the concept boards. |
| 06 mobile | HUD reflows, movement/action controls and actor are visible at 390×844 CSS pixels. | Emulation is not a physical touch walkthrough; screen coverage and comfort need device playtesting. |

Economy rendering uses a 426×266 desktop world canvas and a 130×281 mobile canvas while CSS UI stays sharp. This audit approves neither high-quality performance nor parity with the reference art. Suits, machinery, terrain, portraits and lighting remain a prototype art pass. Ground contact, all authored animation clips, orbital framing, distant signs, navigation comfort and high-quality rendering require a hardware-GPU review. The simulation's passing CPU tests do not resolve these visual limitations.
