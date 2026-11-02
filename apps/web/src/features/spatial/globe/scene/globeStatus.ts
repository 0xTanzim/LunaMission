/**
 * Lifecycle status of the 3D globe. `textureError` and `unsupported` are kept
 * distinct because they offer different affordances: the model still renders
 * without LROC imagery, while a missing WebGL context cannot render 3D at all.
 */
export type GlobeStatus =
  | { kind: 'loading' }
  | { kind: 'ready' }
  | { kind: 'textureError'; message: string }
  | { kind: 'contextLost' }
  | { kind: 'unsupported' };
