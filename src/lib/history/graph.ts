/**
 * The knowledge graph — derived, not authored.
 *
 * Nodes and edges come straight from MILESTONES and their `enabled` links, so
 * there is exactly one source of truth for the dependency chain. The graph is
 * the *chronological* spine of the experience (laid out by year), independent
 * of the emotional order in which scenes surface the same milestones.
 */

import { MILESTONES, MILESTONE_BY_ID } from './milestones';
import type { GraphEdge, GraphNode } from './types';

export interface HistoryGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

/**
 * The canonical "main line" the user should be able to trace end to end —
 * Turing’s question to today’s agents. Used by the explorer to emphasise the
 * through-line; every id here exists in MILESTONES.
 */
export const SPINE: string[] = [
  'turing-machine',
  'turing-test',
  'dartmouth',
  'perceptron',
  'backprop',
  'lenet',
  'deep-belief-nets',
  'alexnet',
  'seq2seq',
  'transformer',
  'gpt1',
  'gpt3',
  'chatgpt',
  'gpt4',
  'agentic',
];

let cached: HistoryGraph | null = null;

/** Build (and memoise) the node/edge graph from the milestone dependency links. */
export function buildGraph(): HistoryGraph {
  if (cached) return cached;

  const nodes: GraphNode[] = MILESTONES.map((m) => ({
    id: m.id,
    title: m.title,
    year: m.year,
    chapter: m.chapter,
    out: [],
    in: [],
  }));
  const byId = new Map(nodes.map((n) => [n.id, n]));

  const edges: GraphEdge[] = [];
  for (const m of MILESTONES) {
    for (const targetId of m.enabled) {
      const target = byId.get(targetId);
      const source = byId.get(m.id);
      if (!target || !source) {
        // A dangling link is a data bug, not a runtime one — surface it in dev
        // and skip the edge so the graph still renders.
        if (process.env.NODE_ENV !== 'production') {
          // eslint-disable-next-line no-console
          console.warn(`[history] milestone "${m.id}" enables unknown id "${targetId}"`);
        }
        continue;
      }
      edges.push({ from: m.id, to: targetId });
      source.out.push(targetId);
      target.in.push(m.id);
    }
  }

  cached = { nodes, edges };
  return cached;
}

/** True when an edge lies on the emphasised spine (both endpoints consecutive). */
export function isSpineEdge(from: string, to: string): boolean {
  const i = SPINE.indexOf(from);
  return i >= 0 && SPINE[i + 1] === to;
}

/** Milestones grouped by year, ascending — the chronological reading order. */
export function chronological(): GraphNode[] {
  return buildGraph().nodes.slice().sort((a, b) => a.year - b.year || a.title.localeCompare(b.title));
}

/** Direct downstream milestone ids for a given milestone (what it enabled). */
export function downstream(id: string): string[] {
  return MILESTONE_BY_ID[id]?.enabled.filter((e) => MILESTONE_BY_ID[e]) ?? [];
}

/** Direct upstream milestone ids (what enabled this one). */
export function upstream(id: string): string[] {
  return MILESTONES.filter((m) => m.enabled.includes(id)).map((m) => m.id);
}
