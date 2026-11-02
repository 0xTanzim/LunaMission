import { useEffect, useState } from 'react';
import type { ScientificMapLayerMode } from '@/features/spatial/model/spatialPreferences';
import {
  renderScientificMapRaster,
  type RasterCoverage,
} from '@/features/spatial/map/layers/lolaRasterGenerator';

export type BaseRasterStatus = 'preparing' | 'ready' | 'empty' | 'error';

export interface BaseRasterState {
  /** The base layer this state describes, so a stale raster is never shown under a new base. */
  mode: ScientificMapLayerMode;
  status: BaseRasterStatus;
  url: string | null;
  coverage: RasterCoverage | null;
  /** Why the render failed. Present only for `status: 'error'`. */
  message?: string;
}

const INITIAL_STATE: BaseRasterState = {
  mode: 'topography',
  status: 'preparing',
  url: null,
  coverage: null,
};

/**
 * Renders the base-layer raster and reports its own state.
 *
 * The generator is a synchronous canvas paint, so the honest states are: preparing
 * (the paint has not run yet), ready (a URL exists), empty (the layer has no raster —
 * the albedo base) and error (the canvas could not be read, e.g. no 2D context). A
 * failure is surfaced rather than papered over with a blank disc.
 */
export function useBaseRaster(mode: ScientificMapLayerMode, resolution = 380): BaseRasterState {
  const [state, setState] = useState<BaseRasterState>(INITIAL_STATE);

  useEffect(() => {
    let cancelled = false;
    setState((previous) =>
      previous.mode === mode && previous.status === 'ready' ? previous : { mode, status: 'preparing', url: null, coverage: null },
    );

    try {
      const result = renderScientificMapRaster(mode, resolution);
      if (cancelled) return;
      setState(
        result.url === null
          ? { mode, status: 'empty', url: null, coverage: result.coverage }
          : { mode, status: 'ready', url: result.url, coverage: result.coverage },
      );
    } catch (error) {
      if (cancelled) return;
      setState({
        mode,
        status: 'error',
        url: null,
        coverage: null,
        message: error instanceof Error ? error.message : 'The base-layer raster renderer failed.',
      });
    }

    return () => {
      cancelled = true;
    };
  }, [mode, resolution]);

  return state;
}
