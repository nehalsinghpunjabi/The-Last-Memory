/** Shared easing curves. Used by GSAP, Framer Motion and CSS alike. */

/** The house curve: fast out, very long settle. Reads as "heavy but smooth". */
export const CINEMA: [number, number, number, number] = [0.16, 1, 0.3, 1];
export const CINEMA_CSS = 'cubic-bezier(0.16, 1, 0.3, 1)';

/** Slow start and slow end — for anything the audience is meant to watch. */
export const HOLD: [number, number, number, number] = [0.65, 0, 0.35, 1];
export const HOLD_CSS = 'cubic-bezier(0.65, 0, 0.35, 1)';

/** Text: arrives with intent, leaves without ceremony. */
export const TEXT_IN: [number, number, number, number] = [0.22, 1, 0.36, 1];
export const TEXT_OUT: [number, number, number, number] = [0.4, 0, 1, 1];

/** GSAP string equivalents. */
export const GSAP_EASE = {
  cinema: 'power3.out',
  hold: 'power2.inOut',
  fall: 'expo.in',
  settle: 'expo.out',
} as const;
