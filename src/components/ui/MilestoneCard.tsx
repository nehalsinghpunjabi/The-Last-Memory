'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useRef, useState } from 'react';
import { MILESTONE_BY_ID, upstream, type Milestone } from '@/lib/history';
import { useArchive } from '@/lib/archiveStore';
import { CINEMA } from '@/animations/easing';

/**
 * The detail card — one milestone, in full.
 *
 * A right-anchored drawer (full-width on phones) that answers the three
 * questions every milestone must: what happened, why it mattered, and what it
 * made possible. The dependency links are clickable, so the card doubles as a
 * way to walk the whole lineage forwards and backwards. External evidence
 * (papers, official pages, an embeddable video where one exists) is linked or
 * embedded per the hybrid media policy; nothing here is required for the card
 * to be complete offline.
 */
export function MilestoneCard() {
  const id = useArchive((s) => s.milestoneId);
  const origin = useArchive((s) => s.origin);
  const open = useArchive((s) => s.openMilestone);
  const close = useArchive((s) => s.closeMilestone);
  const closeRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const milestone = id ? MILESTONE_BY_ID[id] : null;

  // ESC closes; focus moves to the close control when a card opens, and Tab is
  // confined to the dialog. Without the trap, tabbing walks straight out of an
  // `aria-modal` dialog into the controls behind it — the film's own transport
  // and the HUD — which is both a WCAG failure and a way to scrub the timeline
  // while a card is open.
  useEffect(() => {
    if (!milestone) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        close();
        return;
      }
      if (e.key !== 'Tab') return;
      const root = panelRef.current;
      if (!root) return;
      const focusable = root.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), iframe, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || !root.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    const t = window.setTimeout(() => closeRef.current?.focus(), 60);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.clearTimeout(t);
    };
  }, [milestone, close]);

  const go = useCallback((next: string) => open(next), [open]);

  const downstreamMs = milestone
    ? milestone.enabled.map((e) => MILESTONE_BY_ID[e]).filter(Boolean)
    : [];
  const upstreamMs = milestone
    ? upstream(milestone.id).map((u) => MILESTONE_BY_ID[u]).filter(Boolean)
    : [];

  const confidenceNote =
    milestone?.dateConfidence === 'approximate'
      ? 'approximate date'
      : milestone?.dateConfidence === 'disputed'
        ? 'disputed date'
        : null;

  return (
    <AnimatePresence>
      {milestone && (
        <motion.div
          key="milestone-backdrop"
          className="pointer-events-auto fixed inset-0 z-[60] flex justify-end bg-black/55 backdrop-blur-[2px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35, ease: CINEMA }}
          onClick={close}
        >
          <motion.div
            key={milestone.id}
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="milestone-title"
            // data-lenis-prevent: Lenis attaches a non-passive wheel listener to
            // the window and preventDefaults it, which swallows the gesture
            // before this panel's own overflow can consume it — so the timeline
            // froze correctly but the card could not be read past its first
            // screen. This opts the subtree out of Lenis entirely, restoring
            // native wheel/trackpad/touch scrolling inside the panel.
            data-lenis-prevent
            className="relative h-full w-full max-w-xl overflow-y-auto overscroll-contain border-l border-bone/12 bg-[#05070b]/95 px-7 py-8 shadow-2xl sm:px-9"
            // When the visitor selected an artifact in the world, the panel
            // grows out of that object's screen position — the record opening
            // from the thing itself. Opened from a list instead, it keeps the
            // neutral slide, because there is nothing on screen to grow from.
            initial={
              origin
                ? {
                    opacity: 0,
                    scale: 0.86,
                    x: origin.x - window.innerWidth * 0.75,
                    y: origin.y - window.innerHeight * 0.5,
                  }
                : { opacity: 0, x: 40, scale: 1 }
            }
            animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
            exit={{ opacity: 0, x: 40, scale: 0.98 }}
            transition={{ duration: 0.62, ease: CINEMA }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              ref={closeRef}
              type="button"
              onClick={close}
              className="absolute right-6 top-6 font-mono text-[10px] uppercase tracking-cinema text-bone/40 transition-colors duration-300 hover:text-bone/90"
              aria-label="Close"
            >
              Close ✕
            </button>

            <div className="flex items-baseline gap-3 pr-16">
              <span className="font-mono text-[11px] uppercase tracking-cinema text-signal/80">
                {milestone.date}
              </span>
              {confidenceNote && (
                <span className="font-mono text-[9px] uppercase tracking-wide2 text-bone/30">
                  ({confidenceNote})
                </span>
              )}
            </div>

            <h2
              id="milestone-title"
              className="mt-2 font-display text-3xl leading-tight text-bone sm:text-4xl"
            >
              {milestone.title}
            </h2>

            {(milestone.people.length > 0 || milestone.orgs.length > 0) && (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {milestone.people.map((p) => (
                  <span
                    key={p.name}
                    className="rounded-full border border-bone/15 px-2.5 py-1 font-mono text-[9px] uppercase tracking-wide2 text-bone/70"
                    title={p.role}
                  >
                    {p.name}
                  </span>
                ))}
                {milestone.orgs.map((o) => (
                  <span
                    key={o}
                    className="rounded-full border border-signal/20 px-2.5 py-1 font-mono text-[9px] uppercase tracking-wide2 text-signal/60"
                  >
                    {o}
                  </span>
                ))}
              </div>
            )}

            {milestone.image && <ArchivalPlate image={milestone.image} />}

            <Section label="What happened">{milestone.what}</Section>
            <Section label="Why it mattered">{milestone.why}</Section>

            {downstreamMs.length > 0 && (
              <div className="mt-6">
                <SectionLabel>This made possible</SectionLabel>
                <div className="mt-2 flex flex-col gap-1.5">
                  {downstreamMs.map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => go(d.id)}
                      className="group flex items-baseline gap-2 text-left"
                    >
                      <span className="font-mono text-[11px] text-gold/70 transition-transform duration-300 group-hover:translate-x-0.5">
                        →
                      </span>
                      <span className="font-display text-lg text-bone/80 transition-colors duration-300 group-hover:text-gold">
                        {d.title}
                      </span>
                      <span className="font-mono text-[9px] tracking-wide2 text-bone/30">
                        {d.date}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {upstreamMs.length > 0 && (
              <div className="mt-5">
                <SectionLabel>Built on</SectionLabel>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                  {upstreamMs.map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => go(u.id)}
                      className="font-mono text-[10px] uppercase tracking-wide2 text-bone/45 transition-colors duration-300 hover:text-signal/80"
                    >
                      ← {u.title}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {milestone.media?.youtube && (
              <div className="mt-6">
                <SectionLabel>Watch</SectionLabel>
                <div className="mt-2 aspect-video w-full overflow-hidden rounded border border-bone/12">
                  <iframe
                    className="h-full w-full"
                    src={`https://www.youtube-nocookie.com/embed/${milestone.media.youtube.id}`}
                    title={milestone.media.youtube.title}
                    loading="lazy"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
                <p className="mt-1 font-mono text-[9px] uppercase tracking-wide2 text-bone/30">
                  {milestone.media.youtube.channel}
                </p>
              </div>
            )}

            {milestone.papers.length > 0 && (
              <div className="mt-6">
                <SectionLabel>Papers</SectionLabel>
                <ul className="mt-2 space-y-2">
                  {milestone.papers.map((p) => (
                    <li key={p.url}>
                      <a
                        href={p.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group block"
                      >
                        <span className="font-display text-sm text-bone/85 transition-colors duration-300 group-hover:text-signal">
                          {p.title}
                        </span>
                        <span className="mt-0.5 block font-mono text-[9px] tracking-wide2 text-bone/35">
                          {p.authors} · {p.venue ?? p.year} ↗
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-6 border-t border-bone/10 pt-4">
              <SectionLabel>Sources</SectionLabel>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5">
                {milestone.sources.map((s) => (
                  <a
                    key={s.url}
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-[10px] tracking-wide2 text-bone/45 underline decoration-bone/20 underline-offset-2 transition-colors duration-300 hover:text-bone/85"
                  >
                    {s.label} ↗
                  </a>
                ))}
                {milestone.media?.link && (
                  <a
                    href={milestone.media.link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-[10px] tracking-wide2 text-signal/55 underline decoration-signal/20 underline-offset-2 transition-colors duration-300 hover:text-signal"
                  >
                    {milestone.media.link.label} ↗
                  </a>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * A verified archival image. Lazy, supplementary, and self-removing: if the
 * network is unavailable or the institution moves the file, the record simply
 * reads as it always did rather than showing a broken frame. Credit and licence
 * are always on screen, linked to the file page so the claim can be checked.
 */
function ArchivalPlate({ image }: { image: NonNullable<Milestone['image']> }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    <figure className="mt-6">
      <div className="overflow-hidden rounded border border-bone/12 bg-black/40">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={image.url}
          alt={image.alt}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          className="h-auto w-full opacity-90 mix-blend-screen"
        />
      </div>
      <figcaption className="mt-1.5 font-mono text-[9px] leading-relaxed tracking-wide2 text-bone/35">
        {image.credit} ·{' '}
        <a
          href={image.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="underline decoration-bone/20 underline-offset-2 hover:text-bone/70"
        >
          source ↗
        </a>{' '}
        ·{' '}
        <a
          href={image.licenseUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="underline decoration-bone/20 underline-offset-2 hover:text-bone/70"
        >
          {image.license}
        </a>
      </figcaption>
    </figure>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="font-mono text-[9px] uppercase tracking-cinema text-bone/35">{children}</div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-6">
      <SectionLabel>{label}</SectionLabel>
      <p className="mt-2 text-[15px] leading-relaxed text-bone/80">{children}</p>
    </div>
  );
}
