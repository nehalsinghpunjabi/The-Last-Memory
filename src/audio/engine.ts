import { CHAPTERS, chapterIndexAt, chapterProgressAt } from '@/lib/chapters';
import { clamp, lerp, smoothstep } from '@/utils/math';
import { createGlitchImpulse, createImpulseResponse } from './reverb';
import { DroneVoice, NoiseVoice, PianoVoice, midiToFreq } from './voices';

/**
 * Scene-based audio director.
 *
 * The engine holds one instance of each voice and *crossfades their parameters*
 * as the timeline moves — no stopping and starting, no seams. Chapter beds are
 * interpolated continuously from the screenplay in lib/chapters.ts, so changing
 * the story changes the score.
 *
 * A lookahead scheduler places generative piano notes on the audio clock rather
 * than the animation clock, so notes stay rock-steady even if the GPU stutters.
 */

const LOOKAHEAD = 0.6; // seconds of notes scheduled ahead of the playhead
const TICK_MS = 120;

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private dry!: GainNode;
  private wet!: GainNode;
  private reverb!: ConvolverNode;
  private glitchReverb!: ConvolverNode;
  private glitchSend!: GainNode;
  private echoDelay!: DelayNode;
  private echoFeedback!: GainNode;
  private echoSend!: GainNode;
  private panner!: StereoPannerNode;

  private drone!: DroneVoice;
  private piano!: PianoVoice;
  private noise!: NoiseVoice;

  private timer: number | null = null;
  private nextNoteTime = 0;
  private noteIndex = 0;
  private enabled = true;
  private targetMaster = 0.9;

  // Live state written by the render loop.
  private progress = 0;
  private corruption = 0;
  private exposure = 1;

  get ready() {
    return this.ctx !== null;
  }

  get contextState() {
    return this.ctx?.state ?? 'closed';
  }

  /** Must be called from a user gesture. Idempotent. */
  async init(): Promise<void> {
    if (this.ctx) {
      await this.resume();
      return;
    }
    type WithWebkit = typeof window & { webkitAudioContext?: typeof AudioContext };
    const Ctor = window.AudioContext ?? (window as WithWebkit).webkitAudioContext;
    if (!Ctor) return;

    let ctx: AudioContext;
    try {
      ctx = new Ctor({ latencyHint: 'interactive' });
    } catch {
      // No audio device, or the context was refused. The film plays silent.
      return;
    }
    this.ctx = ctx;

    this.master = ctx.createGain();
    this.master.gain.value = 0;
    this.master.connect(ctx.destination);

    // Subtle stereo movement for the whole bed.
    this.panner = ctx.createStereoPanner();
    this.panner.connect(this.master);

    this.dry = ctx.createGain();
    this.dry.gain.value = 0.72;
    this.dry.connect(this.panner);

    this.reverb = ctx.createConvolver();
    this.reverb.buffer = createImpulseResponse(ctx, 7.5, 2.6, 0.5);
    this.wet = ctx.createGain();
    this.wet.gain.value = 0.55;
    this.reverb.connect(this.wet).connect(this.panner);

    this.glitchReverb = ctx.createConvolver();
    this.glitchReverb.buffer = createGlitchImpulse(ctx);
    this.glitchSend = ctx.createGain();
    this.glitchSend.gain.value = 0;
    this.glitchSend.connect(this.glitchReverb).connect(this.panner);

    // "Distant echoes" — a long, filtered feedback line.
    this.echoDelay = ctx.createDelay(4);
    this.echoDelay.delayTime.value = 1.35;
    this.echoFeedback = ctx.createGain();
    this.echoFeedback.gain.value = 0.42;
    const echoTone = ctx.createBiquadFilter();
    echoTone.type = 'lowpass';
    echoTone.frequency.value = 1400;
    this.echoSend = ctx.createGain();
    this.echoSend.gain.value = 0.3;
    this.echoSend.connect(this.echoDelay);
    this.echoDelay.connect(echoTone).connect(this.echoFeedback).connect(this.echoDelay);
    echoTone.connect(this.reverb);

    this.drone = new DroneVoice(ctx);
    this.piano = new PianoVoice(ctx);
    this.noise = new NoiseVoice(ctx);

    // Routing: drone is mostly dry, piano lives in the reverb, noise is close.
    this.drone.output.connect(this.dry);
    this.drone.output.connect(this.reverb);
    this.piano.output.connect(this.dry);
    this.piano.output.connect(this.reverb);
    this.piano.output.connect(this.echoSend);
    this.noise.output.connect(this.dry);
    this.noise.output.connect(this.glitchSend);

    await this.resume();

    this.nextNoteTime = ctx.currentTime + 0.2;
    this.timer = window.setInterval(() => this.scheduler(), TICK_MS);

    this.master.gain.setTargetAtTime(this.enabled ? this.targetMaster : 0, ctx.currentTime, 1.2);
    this.applyBed(true);
  }

  async resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      try {
        await this.ctx.resume();
      } catch {
        /* autoplay policy — the user will try again */
      }
    }
  }

  setEnabled(v: boolean) {
    this.enabled = v;
    if (!this.ctx) return;
    this.master.gain.cancelScheduledValues(this.ctx.currentTime);
    this.master.gain.setTargetAtTime(v ? this.targetMaster : 0, this.ctx.currentTime, 0.45);
  }

  /** Called every frame from the render loop. Cheap: only param targets. */
  update(progress: number, corruption: number, exposure: number) {
    this.progress = clamp(progress);
    this.corruption = clamp(corruption);
    this.exposure = clamp(exposure);
    if (!this.ctx) return;
    this.applyBed(false);
  }

  private applyBed(immediate: boolean) {
    if (!this.ctx) return;
    const t = this.progress;
    const i = chapterIndexAt(t);
    const local = chapterProgressAt(t, i);
    const a = CHAPTERS[i];
    const b = CHAPTERS[Math.min(i + 1, CHAPTERS.length - 1)];

    // Cross-fade the last 25% of every chapter into the next bed.
    const blend = local > 0.75 ? (local - 0.75) / 0.25 : 0;
    const mix = <K extends keyof typeof a.audio>(k: K) =>
      lerp(a.audio[k] as number, b.audio[k] as number, blend);

    const glide = immediate ? 0.1 : 2.4;
    const decay = this.exposure;
    // A held silence around the "Humanity." beat — the bed ducks to almost
    // nothing so the last word lands into stillness, then breathes back for the
    // reveal. Faster glide so the dip actually reads as a beat, not a slow fade.
    const rev = this.reverence(t);
    const revGlide = immediate ? 0.1 : 0.9;

    this.drone.setFrequency(mix('drone'), glide);
    this.drone.setGain(mix('droneGain') * decay * rev, revGlide);
    this.drone.setBrightness(lerp(0.2, 1, this.warmth(t)) * decay, glide);
    this.drone.setInstability(this.corruption);

    this.piano.setGain(mix('pianoGain') * decay * rev, revGlide);
    this.noise.setGain((mix('noiseGain') + this.corruption * 0.35) * decay, immediate ? 0.1 : 0.9);
    this.noise.setCharacter(this.corruption);

    const now = this.ctx.currentTime;
    this.glitchSend.gain.setTargetAtTime(this.corruption * 0.6, now, 0.4);
    this.wet.gain.setTargetAtTime(lerp(0.4, 0.85, this.emptiness(t)) * decay, now, 1.2);
    this.echoSend.gain.setTargetAtTime(lerp(0.18, 0.62, this.emptiness(t)), now, 1.2);
    this.echoDelay.delayTime.setTargetAtTime(lerp(0.9, 2.3, this.emptiness(t)), now, 2);
    this.panner.pan.setTargetAtTime(Math.sin(now * 0.07) * 0.22, now, 1);
    this.master.gain.setTargetAtTime(
      this.enabled ? this.targetMaster * decay * lerp(1, rev, 0.6) : 0,
      now,
      revGlide
    );
  }

  /**
   * Reverence dip. Returns a gain multiplier that falls to near-silence across
   * the held "Humanity." beat (global ~0.93) and its trailing pause, then eases
   * back for the reveal. Keeps a thin thread of tone rather than cutting dead,
   * which reads as stillness instead of a dropout.
   */
  private reverence(t: number) {
    const dip = smoothstep(0.928, 0.945, t) * (1 - smoothstep(0.963, 0.985, t));
    return 1 - dip * 0.84;
  }

  /** 0 = cold machine, 1 = warm human. Peaks in the Golden Age. */
  private warmth(t: number) {
    if (t < 0.24) return 0.12;
    if (t < 0.4) return lerp(0.12, 0.5, (t - 0.24) / 0.16);
    if (t < 0.575) return lerp(0.5, 1, (t - 0.4) / 0.175);
    if (t < 0.715) return lerp(1, 0.25, (t - 0.575) / 0.14);
    if (t < 0.835) return 0.1;
    return lerp(0.1, 0.85, (t - 0.835) / 0.165);
  }

  /** 0 = full room, 1 = the universe is empty. */
  private emptiness(t: number) {
    if (t < 0.575) return 0.25;
    if (t < 0.715) return lerp(0.25, 0.7, (t - 0.575) / 0.14);
    if (t < 0.835) return 1;
    return lerp(1, 0.55, (t - 0.835) / 0.165);
  }

  /* ---------------------------------------------------------------- *
   * Generative piano scheduler
   * ---------------------------------------------------------------- */
  private scheduler() {
    const ctx = this.ctx;
    if (!ctx || !this.enabled) return;
    if (ctx.state !== 'running') return;

    const i = chapterIndexAt(this.progress);
    const chapter = CHAPTERS[i];
    const scale = chapter.audio.scale;
    // The score slows as the machine dies, and stops entirely through the held
    // "Humanity." silence so no note starts into the pause.
    const rev = this.reverence(this.progress);
    const density =
      lerp(1.5, 3.6, this.warmth(this.progress)) * (1 - this.emptiness(this.progress) * 0.55) * rev;
    const step = Math.max(0.55, 2.6 / Math.max(0.2, density));

    while (this.nextNoteTime < ctx.currentTime + LOOKAHEAD) {
      const at = this.nextNoteTime;

      if (chapter.audio.pianoGain > 0.02) {
        // Root drifts slowly downward across the film — the machine cooling.
        const root = 60 - Math.floor(this.progress * 9);
        const octave = 12 * (Math.random() < 0.32 ? 1 : Math.random() < 0.5 ? 0 : -1);
        const degree = scale[Math.floor(Math.random() * scale.length)];
        const midi = root + degree + octave;

        const velocity = 0.18 + Math.random() * 0.3 * lerp(0.4, 1, this.warmth(this.progress));
        this.piano.play(at, {
          freq: midiToFreq(midi),
          velocity,
          duration: lerp(3.2, 7.5, this.emptiness(this.progress)),
          brightness: lerp(0.7, 2.1, this.warmth(this.progress)),
          detuneCents: (Math.random() - 0.5) * 12 - this.corruption * 55,
        });

        // Occasional interval — two notes make a relationship.
        if (Math.random() < 0.34) {
          const partner = scale[Math.floor(Math.random() * scale.length)];
          this.piano.play(at + 0.06 + Math.random() * 0.12, {
            freq: midiToFreq(root + partner + octave + 12),
            velocity: velocity * 0.55,
            duration: 4,
            brightness: 1.1,
          });
        }
      }

      // Corruption artefacts ride on the same clock.
      if (this.corruption > 0.06) {
        const bursts = Math.floor(this.corruption * 5);
        for (let b = 0; b < bursts; b++) {
          if (Math.random() < 0.65) {
            this.noise.burst(at + Math.random() * step, this.corruption);
          }
        }
      }

      this.noteIndex++;
      // Humanised timing — never metronomic.
      this.nextNoteTime += step * (0.72 + Math.random() * 0.7);
    }
  }

  /** One-shot UI/system blip. */
  blip(freq = 880, duration = 0.09, gain = 0.05) {
    const ctx = this.ctx;
    if (!ctx || !this.enabled) return;
    const at = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(gain, at + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, at + duration);
    osc.connect(g).connect(this.dry);
    osc.start(at);
    osc.stop(at + duration + 0.02);
  }

  /** The power-down. A long, falling glide into silence. */
  powerDown(seconds = 6) {
    const ctx = this.ctx;
    if (!ctx) return;
    const now = ctx.currentTime;
    this.drone.setFrequency(18, seconds);
    this.drone.setGain(0.0001, seconds);
    this.piano.setGain(0.0001, seconds * 0.6);
    this.noise.setGain(0.0001, seconds * 0.4);
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setTargetAtTime(0, now + seconds * 0.4, seconds / 4);
  }

  dispose() {
    if (this.timer !== null) window.clearInterval(this.timer);
    this.timer = null;
    this.drone?.dispose();
    this.noise?.dispose();
    this.ctx?.close();
    this.ctx = null;
  }
}

let singleton: AudioEngine | null = null;

export function getAudioEngine(): AudioEngine {
  if (!singleton) singleton = new AudioEngine();
  return singleton;
}
