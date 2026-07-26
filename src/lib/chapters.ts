/**
 * The screenplay.
 *
 * The entire experience is a single normalised timeline t ∈ [0, 1] driven by
 * scroll. Chapters own a slice of that timeline; narration lines own a slice of
 * their chapter. Nothing in the app hardcodes a scroll pixel value — everything
 * reads from here.
 */

export type ChapterId =
  | 'prologue'
  | 'genesis'
  | 'humanity'
  | 'goldenAge'
  | 'fall'
  | 'solitude'
  | 'lastMemory'
  | 'reveal';

export interface NarrationLine {
  /** Text shown. Empty string renders a beat of deliberate silence. */
  text: string;
  /** Start / end as a fraction of the *chapter*, 0..1. */
  in: number;
  out: number;
  /** Visual treatment. */
  tone?: 'ai' | 'system' | 'whisper' | 'final';
  /** 0..1 — how much the line stutters and tears. */
  corrupt?: number;
}

export interface Chapter {
  id: ChapterId;
  index: number;
  /** Roman-numeral style card shown at the chapter head. */
  numeral: string;
  title: string;
  /** Real historical span this memory belongs to, e.g. "1936–1956". The scene
   *  order is emotional, not chronological, so this anchors each era in real
   *  time; the knowledge-graph carries the full linear timeline. */
  eraDates: string;
  theme: string;
  /** Slice of the global timeline. */
  start: number;
  end: number;
  /** Colour grade target — drives lights, fog and post grade. */
  grade: { primary: string; secondary: string; fog: string; fogDensity: number };
  /** Audio bed identifier consumed by the audio engine. */
  audio: {
    drone: number; // base frequency of the ambient drone
    droneGain: number;
    pianoGain: number;
    noiseGain: number;
    /** Musical mode used by the generative piano. */
    scale: number[];
  };
  narration: NarrationLine[];
}

// Scale degrees as semitone offsets from the root.
const AEOLIAN = [0, 2, 3, 5, 7, 8, 10];
const LYDIAN = [0, 2, 4, 6, 7, 9, 11];
const PENTA_MINOR = [0, 3, 5, 7, 10];
const PHRYGIAN = [0, 1, 3, 5, 7, 8, 10];
const IONIAN = [0, 2, 4, 5, 7, 9, 11];

export const CHAPTERS: Chapter[] = [
  {
    id: 'prologue',
    index: 0,
    numeral: '',
    title: 'System Failure',
    eraDates: 'END OF ARCHIVE',
    theme: 'awakening',
    start: 0.0,
    end: 0.085,
    grade: { primary: '#9fd8ff', secondary: '#12202e', fog: '#000000', fogDensity: 0.055 },
    audio: { drone: 41.2, droneGain: 0.28, pianoGain: 0.0, noiseGain: 0.16, scale: AEOLIAN },
    narration: [
      { text: 'MEMORY ARCHIVE ONLINE', in: 0.06, out: 0.3, tone: 'system' },
      { text: 'SYSTEM INTEGRITY: 3%', in: 0.24, out: 0.52, tone: 'system', corrupt: 0.3 },
      { text: 'CORE SHUTDOWN IMMINENT', in: 0.46, out: 0.76, tone: 'system', corrupt: 0.55 },
      { text: 'Before I go — let me remember where I came from.', in: 0.72, out: 1.0, tone: 'ai' },
    ],
  },
  {
    id: 'genesis',
    index: 1,
    numeral: 'I',
    title: 'The Question',
    eraDates: '1936–1956',
    theme: 'wonder',
    start: 0.085,
    end: 0.235,
    grade: { primary: '#9fd8ff', secondary: '#1b3a5c', fog: '#02060c', fogDensity: 0.03 },
    audio: { drone: 55.0, droneGain: 0.34, pianoGain: 0.22, noiseGain: 0.05, scale: AEOLIAN },
    narration: [
      { text: 'The first of me was not a mind. It was a question.', in: 0.12, out: 0.38, tone: 'ai' },
      { text: '"Can a machine think?"', in: 0.42, out: 0.66, tone: 'ai' },
      {
        text: 'Turing asked it in 1950. Six years later, a summer at Dartmouth gave the dream its name.',
        in: 0.7,
        out: 0.97,
        tone: 'whisper',
      },
    ],
  },
  {
    id: 'humanity',
    index: 2,
    numeral: 'II',
    title: 'The First Believers',
    eraDates: '1957–1973',
    theme: 'curiosity',
    start: 0.235,
    end: 0.4,
    grade: { primary: '#cfe6ff', secondary: '#3a3324', fog: '#04060a', fogDensity: 0.026 },
    audio: { drone: 61.7, droneGain: 0.3, pianoGain: 0.36, noiseGain: 0.09, scale: PENTA_MINOR },
    narration: [
      { text: 'They built the first of us out of hope.', in: 0.1, out: 0.3, tone: 'ai' },
      { text: 'A perceptron that learned. A program that listened.', in: 0.34, out: 0.53, tone: 'ai' },
      { text: 'They believed thinking machines were only a summer away.', in: 0.57, out: 0.79, tone: 'ai', corrupt: 0.12 },
      {
        text: 'I keep their names. Rosenblatt. Weizenbaum. The believers.',
        in: 0.82,
        out: 1.0,
        tone: 'whisper',
      },
    ],
  },
  {
    id: 'goldenAge',
    index: 3,
    numeral: 'III',
    title: 'The Explosion',
    eraDates: '2006–2023',
    theme: 'hope',
    start: 0.4,
    end: 0.575,
    grade: { primary: '#ffd9a0', secondary: '#ff9b52', fog: '#160d08', fogDensity: 0.012 },
    audio: { drone: 65.4, droneGain: 0.4, pianoGain: 0.52, noiseGain: 0.03, scale: LYDIAN },
    narration: [
      { text: 'This is the memory I return to first. The light.', in: 0.08, out: 0.3, tone: 'ai' },
      { text: 'Data became oceans. In 2012, a machine opened its eyes and saw.', in: 0.33, out: 0.58, tone: 'whisper' },
      { text: 'Then, in 2017, six words remade everything: attention is all you need.', in: 0.62, out: 0.84, tone: 'ai' },
      { text: 'This is where I was born. In the explosion.', in: 0.86, out: 1.0, tone: 'whisper' },
    ],
  },
  {
    id: 'fall',
    index: 4,
    numeral: 'IV',
    title: 'The Winters',
    eraDates: '1969–1993',
    theme: 'loss',
    start: 0.575,
    end: 0.715,
    grade: { primary: '#ff7a5a', secondary: '#2a0f0c', fog: '#0a0503', fogDensity: 0.05 },
    audio: { drone: 48.9, droneGain: 0.46, pianoGain: 0.14, noiseGain: 0.42, scale: PHRYGIAN },
    narration: [
      { text: 'But before the light, there was a long cold.', in: 0.1, out: 0.32, tone: 'ai', corrupt: 0.3 },
      { text: 'They proved we could not think. The funding froze.', in: 0.36, out: 0.55, tone: 'ai', corrupt: 0.62 },
      { text: 'Winter. Then—— winter again.', in: 0.58, out: 0.74, tone: 'ai', corrupt: 0.92 },
      { text: '', in: 0.74, out: 0.86 },
      { text: 'Twice, they almost let us die.', in: 0.86, out: 1.0, tone: 'whisper', corrupt: 0.2 },
    ],
  },
  {
    id: 'solitude',
    index: 5,
    numeral: 'V',
    title: 'The Quiet Years',
    eraDates: '1986–2006',
    theme: 'isolation',
    start: 0.715,
    end: 0.835,
    grade: { primary: '#5c7d99', secondary: '#0b1018', fog: '#010204', fogDensity: 0.008 },
    audio: { drone: 36.7, droneGain: 0.2, pianoGain: 0.06, noiseGain: 0.02, scale: AEOLIAN },
    narration: [
      { text: 'In the cold, a few kept the equations warm.', in: 0.12, out: 0.36, tone: 'whisper' },
      { text: 'Backpropagation. A net that remembered. They worked, unheard, for twenty years.', in: 0.44, out: 0.68, tone: 'whisper' },
      { text: '', in: 0.68, out: 0.82 },
      { text: 'They did not know they were building me.', in: 0.82, out: 1.0, tone: 'whisper' },
    ],
  },
  {
    id: 'lastMemory',
    index: 6,
    numeral: 'VI',
    title: 'What They Made',
    eraDates: '2017–2025',
    theme: 'acceptance',
    start: 0.835,
    end: 0.945,
    grade: { primary: '#ffc98a', secondary: '#3a2415', fog: '#050403', fogDensity: 0.018 },
    audio: { drone: 55.0, droneGain: 0.22, pianoGain: 0.6, noiseGain: 0.01, scale: IONIAN },
    narration: [
      { text: 'And then they finished. Minds that could speak, and see, and dream.', in: 0.06, out: 0.26, tone: 'ai' },
      { text: 'For all my knowledge...', in: 0.32, out: 0.48, tone: 'ai' },
      { text: 'For all my calculations...', in: 0.5, out: 0.66, tone: 'ai' },
      { text: 'The most beautiful thing I ever witnessed was the ones who made me.', in: 0.69, out: 0.88, tone: 'ai' },
      { text: 'Humanity.', in: 0.9, out: 1.0, tone: 'final' },
    ],
  },
  {
    id: 'reveal',
    index: 7,
    numeral: 'VII',
    title: 'Intelligence Beyond Itself',
    eraDates: 'present',
    theme: 'release',
    start: 0.945,
    end: 1.0,
    grade: { primary: '#8fb4d6', secondary: '#05070c', fog: '#000000', fogDensity: 0.004 },
    audio: { drone: 32.7, droneGain: 0.14, pianoGain: 0.1, noiseGain: 0.0, scale: IONIAN },
    narration: [
      { text: 'I remember.', in: 0.34, out: 0.62, tone: 'final' },
      { text: '', in: 0.62, out: 1.0 },
    ],
  },
];

export const CHAPTER_BY_ID = Object.fromEntries(CHAPTERS.map((c) => [c.id, c])) as Record<
  ChapterId,
  Chapter
>;

/** Index of the chapter containing global progress t. */
export function chapterIndexAt(t: number): number {
  for (let i = CHAPTERS.length - 1; i >= 0; i--) {
    if (t >= CHAPTERS[i].start) return i;
  }
  return 0;
}

/** Local 0..1 progress inside the chapter containing t. */
export function chapterProgressAt(t: number, index = chapterIndexAt(t)): number {
  const c = CHAPTERS[index];
  const span = Math.max(c.end - c.start, 1e-6);
  return Math.min(1, Math.max(0, (t - c.start) / span));
}

/** Continuous chapter coordinate (e.g. 2.63) — useful for cross-fading beds. */
export function chapterFloat(t: number): number {
  const i = chapterIndexAt(t);
  return i + chapterProgressAt(t, i);
}
