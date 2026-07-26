'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

// Corruption glyphs are deliberately *non-alphabetic*. Swapping a letter for
// another letter or a digit reads as a typo ("possibleR"); swapping it for a
// block or a technical symbol reads as what it is — signal interference over
// text that is still legible underneath.
const GLYPHS = '▓▒░█▚▞▙▟▛▜╳╱╲◆◇◈※#@%&§∎⌁¬|/\\<>=+*';

interface Segment {
  ch: string;
  corrupt: boolean;
}

interface Props {
  text: string;
  /** 0..1 — probability weight that any given glyph is currently wrong. */
  corruption?: number;
  className?: string;
  /** Types the text out one character at a time on mount. */
  typewriter?: boolean;
  typeSpeed?: number;
  /** RGB-split ghosts behind the text. */
  chromatic?: boolean;
  onComplete?: () => void;
}

/**
 * Text that is failing to be read correctly.
 *
 * Two independent effects: an optional typewriter reveal, and per-character
 * corruption that swaps glyphs on a ~70ms cadence. Corruption is deliberately
 * legible-as-intent: only a fraction of characters are ever wrong at once, the
 * replacements are unmistakable data-glyphs (never letters), and corrupted
 * characters are tinted so they read as interference rather than misspelling.
 * The underlying word stays recoverable at every frame.
 */
export function GlitchText({
  text,
  corruption = 0,
  className = '',
  typewriter = false,
  typeSpeed = 42,
  chromatic = false,
  onComplete,
}: Props) {
  const [revealed, setRevealed] = useState(typewriter ? 0 : text.length);
  const [segments, setSegments] = useState<Segment[]>(() =>
    text.split('').map((ch) => ({ ch, corrupt: false }))
  );
  const completedRef = useRef(false);

  // Typewriter.
  useEffect(() => {
    if (!typewriter) {
      setRevealed(text.length);
      return;
    }
    completedRef.current = false;
    setRevealed(0);
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setRevealed(i);
      if (i >= text.length) {
        window.clearInterval(id);
        if (!completedRef.current) {
          completedRef.current = true;
          onComplete?.();
        }
      }
    }, typeSpeed);
    return () => window.clearInterval(id);
  }, [text, typewriter, typeSpeed, onComplete]);

  // Glyph corruption.
  useEffect(() => {
    if (corruption <= 0.01) {
      setSegments(text.split('').map((ch) => ({ ch, corrupt: false })));
      return;
    }
    // Cap the fraction of simultaneously-wrong characters so the word never
    // dissolves into noise — it flickers, it doesn't break.
    const prob = Math.min(0.28, corruption * 0.2);
    const id = window.setInterval(() => {
      setSegments(
        text.split('').map((ch) => {
          if (ch === ' ') return { ch, corrupt: false };
          if (Math.random() < prob) {
            return { ch: GLYPHS[Math.floor(Math.random() * GLYPHS.length)], corrupt: true };
          }
          return { ch, corrupt: false };
        })
      );
    }, 70);
    return () => window.clearInterval(id);
  }, [text, corruption]);

  const shown = useMemo(() => segments.slice(0, revealed), [segments, revealed]);
  const plain = useMemo(() => shown.map((s) => s.ch).join(''), [shown]);

  const body = shown.map((s, i) =>
    s.corrupt ? (
      // Tinted cold-signal glyph — visibly "the feed is corrupting", not a typo.
      <span key={i} style={{ color: '#7fdcff', opacity: 0.9 }}>
        {s.ch}
      </span>
    ) : (
      <span key={i}>{s.ch}</span>
    )
  );

  if (!chromatic) {
    return <span className={className}>{body}</span>;
  }

  return (
    <span className={`relative inline-block ${className}`}>
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 select-none text-[#ff3b30] mix-blend-screen"
        style={{ transform: `translateX(${-0.5 - corruption * 2.5}px)`, opacity: 0.5 }}
      >
        {plain}
      </span>
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 select-none text-[#3bd6ff] mix-blend-screen"
        style={{ transform: `translateX(${0.5 + corruption * 2.5}px)`, opacity: 0.5 }}
      >
        {plain}
      </span>
      <span className="relative">{body}</span>
    </span>
  );
}
