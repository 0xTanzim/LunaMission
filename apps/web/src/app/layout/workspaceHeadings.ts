/**
 * Page-level headings for the three workspace projections.
 *
 * The first thing on screen has to say what the screen is for and what to do next:
 * the control strip below it is dense scientific instrumentation, and without this
 * line an operator arriving cold meets "TARGET SITE / START EPOCH / SLIP" with no
 * statement of the job. Titles reuse the navigation vocabulary so the highlighted
 * step and the heading never disagree.
 */
export type WorkspaceProjection = 'explore' | 'analyze' | 'compare';

export interface WorkspaceHeading {
  /** The page's `h1`. Matches the active navigation destination. */
  title: string;
  /** One sentence: what to do here, in the operator's terms. */
  orientation: string;
}

export const WORKSPACE_HEADINGS: Record<WorkspaceProjection, WorkspaceHeading> = {
  explore: {
    title: 'Site Map',
    orientation: 'Pick a landing site, then read its sunlight across the selected dates.',
  },
  analyze: {
    title: 'Analyze',
    orientation:
      'Read the 360° sky ribbon and the Sun/Earth event timeline for the site and epoch above.',
  },
  compare: {
    title: 'Compare',
    orientation:
      'Compare candidate sites side by side on the same epoch, mast height and visibility criteria.',
  },
};
