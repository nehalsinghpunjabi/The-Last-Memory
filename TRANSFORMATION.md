# The Last Memory → a cinematic museum of AI history

The experience was transformed **in place**: same camera choreography, shaders,
transitions, particle systems, audio engine, scroll engine, and performance
work — but the dying AI now reconstructs the *real* history of artificial
intelligence rather than fictional human memories. Nothing was rebuilt; the
story was evolved and an interactive museum layer was added on top of the film.

## What changed, and what did not

Preserved untouched (behaviorally): the camera rail (`lib/cameraRail.ts`,
`coreRail.ts`, `CameraRig`), every shader (`shaders/*`), the scroll engine
(`scrollController`, `useScrollExperience`, `scrollState`), the audio synthesis
(`audio/engine.ts`, `voices`, `reverb`), grade/transition logic (`director.ts`),
the performance governor + adaptive DPR (`PerformanceGovernor`, `quality.ts`),
and PostFX. Chapter timeline slices (`start`/`end`) are unchanged, so the rail
stays valid.

Evolved: the narration and titles (`chapters.ts`), the boot/end/transcript copy,
and the "floating memories" (which now include glowing archival records —
papers, network diagrams, headlines).

Added (new, additive layers over the film): the sourced history dataset
(`lib/history/*`), an interactive milestone card, in-scene artifact markers, and
a full knowledge-graph explorer.

## The chronology decision

The film's scenes run birth → golden age → fall → solitude → ending. Real AI
history places its golden age (deep-learning boom, 2006–2023) *after* its winters
(1969–1993). Rather than reorder scenes (which would break the camera
choreography), the journey is framed as the dying AI's **non-linear memory** —
memories surface by emotional weight, not date. Every milestone is precisely
dated, and the knowledge-graph explorer presents the **true chronological
timeline**. So the felt journey stays emotional while the facts stay accurate.

Scene → era mapping (dates anchor every milestone):

| Scene | Era | Span |
| --- | --- | --- |
| prologue | The Last Archive (framing) | end of the archive |
| genesis | The Question | 1936–1956 |
| humanity | The First Believers | 1957–1973 |
| goldenAge | The Explosion | 2006–2023 |
| fall | The Winters | 1969–1993 |
| solitude | The Quiet Years | 1986–2006 |
| lastMemory | What They Made | 2017–2025 |
| reveal | Intelligence Beyond Itself | present |

## The interactive museum

Every era's real milestones are clickable. `ArchiveMarkers` fades in a list of
the current era's artifacts on the left as the camera drifts through it;
`MilestoneCard` opens the full record — date, people, organizations, what
happened, why it mattered, "this made possible →" links that walk the dependency
chain, the papers, and sources. `ArchiveExplorer` (opened from the HUD
"◇ EXPLORE TIMELINE" or the end card) is the knowledge graph: every milestone in
true chronological order, era by era, with the dependency chain drawn as edges
and the "main line" from Turing to modern agents emphasised.

## Historical integrity

Every date, person, paper, and claim is defined in `lib/history/milestones.ts`
and traces to a reputable source (arXiv/DOI, ACM/IEEE, Nature, official archives)
— see `HISTORY_SOURCES.md` for the full citation audit. No facts, dates, or
quotes are invented; approximate or disputed dates are flagged (`dateConfidence`)
and shown as such ("c. 1970"). The dependency edges are editorial connections
grounded in the standard historiography of the field, presented as a lineage
rather than claims of sole causation.

## Media policy (hybrid)

The experience is fully functional and offline with procedural visuals and
verified metadata as the primary layer. Where an official, embeddable resource
exists it is linked (or embedded, for official video); otherwise the card falls
back to procedural visuals and citation links. No copyrighted images or video
are scraped or hosted. The 3D experience remains the focus; external media is
optional supporting evidence.

## Verification

`npx tsc --noEmit` and `npm run build` pass. `npm run verify` renders all 8
chapters with zero shader/runtime errors. The interactive layer was checked
end-to-end (markers → card → dependency traversal → explorer), and the adaptive
performance governor still adapts under load (`scripts/probe-perf.mjs`). The full
screenplay and the historical record — with sources — are reproduced in the
screen-reader transcript (`StoryTranscript`).
