import { useEffect, useState, type RefObject } from 'react';

/**
 * Rendered CSS pixels per SVG viewBox unit for the map surface.
 *
 * The polar map always fits its pane (`preserveAspectRatio="xMidYMid meet"`), so the
 * scale is `min(width, height) / viewBoxSize`. Hit targets inside the SVG are measured
 * in viewBox units and would otherwise shrink with the pane; this value lets the
 * overlays keep a WCAG 2.2 SC 2.5.8 target size in CSS pixels at every breakpoint.
 *
 * Returns 1 before the first measurement (and where `ResizeObserver` is unavailable,
 * e.g. server rendering or jsdom), which resolves to today's generous hit radii.
 */
export function useSvgCssPerUnit(
  ref: RefObject<SVGSVGElement | null>,
  viewBoxSize: number,
): number {
  const [cssPerUnit, setCssPerUnit] = useState(1);

  useEffect(() => {
    const element = ref.current;
    if (!element || typeof ResizeObserver === 'undefined') return;

    const measure = () => {
      const rect = element.getBoundingClientRect();
      const scale = Math.min(rect.width, rect.height) / viewBoxSize;
      if (Number.isFinite(scale) && scale > 0) setCssPerUnit(scale);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref, viewBoxSize]);

  return cssPerUnit;
}
