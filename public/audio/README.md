# Audio

**This folder is intentionally empty.**

The entire score of THE LAST MEMORY is synthesised in the browser at runtime by
[`src/audio/engine.ts`](../../src/audio/engine.ts). There are no `.mp3`, `.wav`
or `.ogg` files to download, which means:

- the experience starts instantly, with no audio buffering
- it works completely offline
- the score reacts continuously to scroll position instead of crossfading
  between fixed loops
- the repository is a few hundred kilobytes instead of a few hundred megabytes

## How the generative score works

| Voice     | Synthesis                                                        | Role                                        |
| --------- | ---------------------------------------------------------------- | ------------------------------------------- |
| **Drone** | 4 detuned oscillators → resonant lowpass → slow filter LFO         | The machine's own hum. Never resolves.      |
| **Piano** | 2-operator FM (2.004 ratio) with a struck envelope + body filter   | The human element. Generative, in-scale.    |
| **Noise** | Looping pink noise → bandpass, plus one-shot resampled bursts      | Data failing to decode.                     |
| **Space** | Procedural convolution reverb (7.5s IR) + a 0.9–2.3s feedback line | Room size. Grows as the universe empties.   |

Chapter beds are defined as data in
[`src/lib/chapters.ts`](../../src/lib/chapters.ts) (`audio: { drone, droneGain,
pianoGain, noiseGain, scale }`) and cross-faded continuously — the last 25% of
each chapter is already blending into the next.

Notes are scheduled on the **audio clock** with a 600ms lookahead, not on
`requestAnimationFrame`, so a dropped frame never produces a dropped note.

## Replacing it with recorded stems

If you would rather score this with real music:

1. Run `npm run gen:audio` — this writes correctly named 16-bit WAV placeholders
   into this folder, one per chapter (`prologue.wav`, `genesis.wav`,
   `humanity.wav`, `golden-age.wav`, `fall.wav`, `solitude.wav`,
   `last-memory.wav`, `reveal.wav`).
2. Replace each file with your own recording, keeping the filename.
3. In `src/audio/engine.ts`, swap the `DroneVoice`/`PianoVoice` construction for
   `AudioBufferSourceNode`s loaded from these paths, and drive their gains from
   the same `applyBed()` cross-fade logic. The routing (dry / reverb / echo
   sends), the ducking and the `powerDown()` behaviour all stay as they are.

Keep the loops seamless and at least 30 seconds long — a listener can stop
scrolling anywhere, and a short loop makes the stillness of Chapter V feel
cheap rather than vast.

## Licensing note

Because nothing here is sampled or recorded, the shipping score carries no
third-party rights. If you swap in stems, make sure you actually have the
licence for them before deploying.
