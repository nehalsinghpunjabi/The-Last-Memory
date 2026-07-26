/**
 * Signals.
 *
 * A "signal" is any value that changes every frame — scene weight, decay,
 * reveal. Passing these as plain numbers would force a React re-render at 60fps
 * for the entire scene graph, so components accept either a number (constant)
 * or a getter (live), and resolve it inside their own `useFrame`.
 *
 * This is the one convention that keeps the whole experience at zero React
 * renders during playback.
 */

export type Signal<T = number> = T | (() => T);

export function read<T>(signal: Signal<T> | undefined, fallback: T): T {
  if (signal === undefined) return fallback;
  return typeof signal === 'function' ? (signal as () => T)() : signal;
}

export const readNumber = (signal: Signal<number> | undefined, fallback = 0): number =>
  read(signal, fallback);
