import { useEffect, useRef } from 'react';
import { useScenarioState } from './useScenarioState';

export function useScenarioUrlSync() {
  const { state, setPrimarySite, setProjection, setMastHeight, setLaunchSlip } = useScenarioState();
  const isHydratedRef = useRef(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Initial URL Hydration
  useEffect(() => {
    if (typeof window === 'undefined' || isHydratedRef.current) return;
    isHydratedRef.current = true;

    const params = new URLSearchParams(window.location.search);
    const siteParam = params.get('site');
    const projParam = params.get('proj');
    const mastParam = params.get('mast');
    const slipParam = params.get('slip');

    if (siteParam) setPrimarySite(siteParam);
    if (projParam === 'explore' || projParam === 'analyze' || projParam === 'compare') {
      setProjection(projParam);
    }
    if (mastParam) {
      const parsedMast = parseFloat(mastParam);
      if (parsedMast === 1.0 || parsedMast === 2.0 || parsedMast === 5.0 || parsedMast === 10.0) {
        setMastHeight(parsedMast);
      }
    }
    if (slipParam) {
      const parsedSlip = parseFloat(slipParam);
      if (!isNaN(parsedSlip) && parsedSlip >= 0 && parsedSlip <= 28) {
        setLaunchSlip(parsedSlip);
      }
    }
  }, [setPrimarySite, setProjection, setMastHeight, setLaunchSlip]);

  // 2. State-to-URL Serialization (debounced 200ms)
  useEffect(() => {
    if (typeof window === 'undefined' || !isHydratedRef.current) return;

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    debounceTimerRef.current = setTimeout(() => {
      const params = new URLSearchParams();
      params.set('proj', state.activeProjection);
      params.set('site', state.primarySiteId);
      params.set('mast', state.observerMastHeightM.toString());
      if (state.launchSlipOffsetDays > 0) {
        params.set('slip', state.launchSlipOffsetDays.toFixed(1));
      }
      if (state.comparisonSiteId) {
        params.set('compareSite', state.comparisonSiteId);
      }

      const newUrl = `${window.location.pathname}?${params.toString()}`;
      window.history.replaceState(null, '', newUrl);
    }, 200);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [
    state.activeProjection,
    state.primarySiteId,
    state.observerMastHeightM,
    state.launchSlipOffsetDays,
    state.comparisonSiteId,
  ]);
}
