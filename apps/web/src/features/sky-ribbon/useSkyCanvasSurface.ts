import { useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';

/**
 * Canvas surface sizing for the sky panels: tracks the container width, keeps the
 * backing store at device-pixel resolution for crisp sub-degree tick labels, and
 * re-measures on resize/zoom. SSR-safe — effects never run during static render,
 * so `widthPx` stays 0 and panels skip drawing.
 */

const MIN_WIDTH_PX = 240;
const MAX_PIXEL_RATIO = 3;

export interface SkyCanvasSurface {
  readonly containerRef: RefObject<HTMLDivElement | null>;
  readonly canvasRef: RefObject<HTMLCanvasElement | null>;
  readonly widthPx: number;
  readonly heightPx: number;
  readonly pixelRatio: number;
  readonly renderVersion: number;
}

function readPixelRatio(): number {
  if (typeof window === 'undefined') return 1;
  const ratio = window.devicePixelRatio;
  if (typeof ratio !== 'number' || !Number.isFinite(ratio)) return 1;
  return Math.min(MAX_PIXEL_RATIO, Math.max(1, ratio));
}

export function useSkyCanvasSurface(heightPx: number): SkyCanvasSurface {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [widthPx, setWidthPx] = useState(0);
  const [pixelRatio, setPixelRatio] = useState(1);
  const [renderVersion, setRenderVersion] = useState(0);

  useEffect(() => {
    let rafId: number | null = null;

    const measure = () => {
      const container = containerRef.current;
      if (!container) return;
      const measured = container.getBoundingClientRect().width;
      const nextWidth = Math.max(MIN_WIDTH_PX, Math.round(measured || 0));
      const nextRatio = readPixelRatio();

      const canvas = canvasRef.current;
      if (canvas) {
        const targetWidth = Math.round(nextWidth * nextRatio);
        const targetHeight = Math.round(heightPx * nextRatio);
        // Only assign canvas.width / canvas.height if changed,
        // because assigning canvas.width clears and resets the 2D context.
        if (canvas.width !== targetWidth) canvas.width = targetWidth;
        if (canvas.height !== targetHeight) canvas.height = targetHeight;
      }

      setWidthPx((prev) => (prev !== nextWidth ? nextWidth : prev));
      setPixelRatio((prev) => (prev !== nextRatio ? nextRatio : prev));
      setRenderVersion((v) => v + 1);
    };

    measure();

    const container = containerRef.current;
    if (container && typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(() => {
        if (rafId !== null) cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(measure);
      });
      observer.observe(container);
      return () => {
        if (rafId !== null) cancelAnimationFrame(rafId);
        observer.disconnect();
      };
    }
    if (typeof window !== 'undefined') {
      const onResize = () => {
        if (rafId !== null) cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(measure);
      };
      window.addEventListener('resize', onResize);
      return () => {
        if (rafId !== null) cancelAnimationFrame(rafId);
        window.removeEventListener('resize', onResize);
      };
    }
    return undefined;
  }, [heightPx]);

  return { containerRef, canvasRef, widthPx, heightPx, pixelRatio, renderVersion };
}

/**
 * Acquires a 2D context whose user-space units are CSS pixels. Returns null in
 * environments without canvas support (SSR, jsdom-less tests).
 */
export function prepareSkyContext(
  canvas: HTMLCanvasElement | null,
  widthPx: number,
  heightPx: number,
  pixelRatio: number,
): CanvasRenderingContext2D | null {
  if (!canvas || widthPx <= 0 || heightPx <= 0) return null;
  const targetWidth = Math.round(widthPx * pixelRatio);
  const targetHeight = Math.round(heightPx * pixelRatio);
  if (canvas.width !== targetWidth) canvas.width = targetWidth;
  if (canvas.height !== targetHeight) canvas.height = targetHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  ctx.clearRect(0, 0, widthPx, heightPx);
  return ctx;
}
