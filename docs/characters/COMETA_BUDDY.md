# Cometa — proposed astronaut buddy

**Status: proposed, unimplemented; name provisional.** Implementation is required by the owner for the next character goal; optional means the player may disable or leave the buddy at a safe location. Cometa is an optional real brown-and-tan dachshund character, additional to the robot companions PIP and Scout. This is gameplay fiction, not a claim that NASA flew a dog in this suit or mission.

Cometa has an elongated body, short legs and floppy ears inside a clear pressure helmet. An ivory-and-orange four-legged pressure suit has four boots, a tail sleeve and a low pack. Keep the animal recognizably dachshund-shaped, the silhouette legible at the game camera, and all ears and suit parts clear of the helmet during motion. The suit is fictional; do not imply an untested real-world design is safe. Use original visual design and licensed references. See [character animation specification](../animation/CHARACTER_ANIMATION_SPEC.md) for the production contract; no GLB or clips are supplied here.

Cometa offers companionship, follows or waits, can be recalled to a safe reachable location, responds to a gentle pet, and may point toward a beacon already visible to the player. The point is a presentation cue, not a supernatural sensor or smell through vacuum; it discovers no hidden resource. The player retains agency, can ignore or disable the companion, and can complete the main route and all essential missions without Cometa. No animation, bark, cue or pet creates resources or changes mission truth. Robots retain their own capabilities and accounting.

For future implementation, route planning must use dog-sized collision clearance, ramps and reachable surfaces, with no harm, no forced long jumps and safe recall or wait when separated. The independent collision controller owns position and yaw; visual quadruped animation follows it. Route tests must cover blocked paths, separation, stairs/ramps, arrival, region changes and player jumps. Do not teleport into obstacles or hazards; validate a safe destination and fall back to waiting. Visibility, accommodation and controls require playtesting.

Life-support costs must be explicitly modeled and accounted for before any per-actor claim; alternatively the design must explicitly include Cometa in the crew aggregate until a per-actor model is implemented and tested. No extra free oxygen, water or food may be implied. Pause, save and reload must preserve or safely reconstruct optional status, region, safe position, mode and target without duplicating events or resource effects. The existing save and runtime do not yet implement this contract.

Art and engineering acceptance remain pending: real four-paw contact and gait phase in the authored clips, restrained spine, boot grounding, independent skeleton per instance, clear helmet/ears, route and recall tests, accounting, pause/reload, visual capture and real browser GPU performance. All proposed budgets and asset paths are planning targets, not measurements or evidence of completion.

Core authoring targets are Idle, Walk, Trot, TurnLeft, TurnRight, Stop, Sit, Wait and Recall. Later encounter targets are Sniff (pressurized areas only), WagTail, ReceivePet, LookAtBeacon and WatchRepair. These are proposed, not exported clips; the concept turnaround, pose board and lunar hero communicate appearance and target poses only.

## Visual source

Open [the original turnaround](../art/03-cometa-turnaround.png) and [the concept guide](../art/README.md). They are AI-generated art targets with visible labels, not GLB/rig/animation deliverables. Keep ears inside the helmet, the body low and long, and the optional party behavior separate from the required implementation goal.

## Authored introduction and relationship beat

Introduce Cometa in the safe Earth academy, with a short handler/mentor scene before mission preparation. The protagonist can offer a gloved hand and select Follow or Wait; PIP explains the visible cue. Cometa’s tail/attention response recognizes the interaction, with optional captioned sound. Later the lunar airlock repeats the same wait/recall mechanic in context. This is an original narrative beat to implement, not a scene already present. The choice is reversible, nonjudgmental and not a quiz; leaving the buddy in a safe hub does not block progress or imply abandonment.
