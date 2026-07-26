/**
 * The real history of Artificial Intelligence — the factual backbone.
 *
 * This is the single source of truth for every historical claim the experience
 * presents. The scene cards, the archive markers, and the knowledge-graph
 * explorer all read from `MILESTONES`. Nothing here is invented: every record
 * is traceable to the sources listed on it, and where a date is approximate or
 * disputed it is flagged rather than faked (see HISTORY_SOURCES.md for the full
 * citation audit).
 *
 * The dependency chain — "what this breakthrough directly made possible" — is
 * encoded on each milestone as `enabled: string[]` (ids of later milestones).
 * The graph module derives the visible node/edge DAG from those links.
 */

import type { ChapterId } from '@/lib/chapters';

export type DateConfidence = 'exact' | 'approximate' | 'disputed';

export interface Person {
  name: string;
  /** Optional short role/affiliation note, e.g. "Princeton, 1936". */
  role?: string;
}

export interface PaperRef {
  title: string;
  authors: string;
  year: number;
  /** Journal / conference / publisher. */
  venue?: string;
  /** Canonical URL — arXiv abstract, DOI, or official page. */
  url: string;
}

export interface SourceRef {
  label: string;
  url: string;
}

/**
 * An archival image, used only where the licence is unambiguous and verified.
 *
 * The experience is procedural and offline-first by design, so this is always
 * supplementary: it lazy-loads, it is never required for the record to be
 * complete, and it removes itself silently if it fails to load. Nothing here is
 * scraped or re-hosted — each entry points at the institution's own copy and
 * carries its credit and licence on screen.
 */
export interface ArchivalImage {
  url: string;
  alt: string;
  credit: string;
  license: string;
  licenseUrl: string;
  /** The file/description page, so a reader can check the licence themselves. */
  sourceUrl: string;
}

export interface MediaRef {
  /** An official, embeddable video (YouTube id) — used only where the channel
   *  is the primary source (DeepMind, OpenAI, SRI, universities). Optional. */
  youtube?: { id: string; title: string; channel: string };
  /** A primary link out (official blog, demo page, museum archive). */
  link?: { label: string; url: string };
}

export interface Milestone {
  id: string;
  title: string;
  /** Human-readable date string as shown in the UI ("1943", "c. 1960", "Nov 30, 2022"). */
  date: string;
  /** Numeric year used for chronological layout in the knowledge graph. */
  year: number;
  dateConfidence: DateConfidence;
  /** Which scene/era this memory surfaces in (scene order is emotional, not chronological). */
  chapter: ChapterId;

  people: Person[];
  orgs: string[];
  papers: PaperRef[];

  /** What happened — one or two sentences, factual. */
  what: string;
  /** Why it mattered — the significance. */
  why: string;
  /** ids of milestones this one DIRECTLY enabled (the dependency chain). */
  enabled: string[];

  sources: SourceRef[];
  media?: MediaRef;
  /** Present only where the licence has been individually verified. */
  image?: ArchivalImage;
}

/** A derived graph node (see graph.ts). */
export interface GraphNode {
  id: string;
  title: string;
  year: number;
  chapter: ChapterId;
  /** Downstream milestone ids (from `enabled`). */
  out: string[];
  /** Upstream milestone ids (reverse of `enabled`). */
  in: string[];
}

export interface GraphEdge {
  from: string;
  to: string;
}
