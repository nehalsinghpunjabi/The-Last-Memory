/**
 * The AI-history knowledge base. Import from here.
 *
 *   import { MILESTONES, milestonesForChapter, buildGraph } from '@/lib/history';
 */

export type {
  Milestone,
  Person,
  PaperRef,
  SourceRef,
  MediaRef,
  DateConfidence,
  GraphNode,
  GraphEdge,
} from './types';

export { MILESTONES, MILESTONE_BY_ID, milestonesForChapter } from './milestones';
export {
  buildGraph,
  chronological,
  downstream,
  upstream,
  isSpineEdge,
  SPINE,
  type HistoryGraph,
} from './graph';
