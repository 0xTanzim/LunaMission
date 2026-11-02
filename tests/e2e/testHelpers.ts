import { createHandler } from '@nextrush/adapter-bun';
import { createServerApp } from '@server/app';

/**
 * Creates an in-process NextRush test request dispatcher.
 */
export function createTestServerHandler() {
  const app = createServerApp();
  const rawHandler = createHandler(app);
  return (req: Request) => (rawHandler as any)(req, {} as any);
}

/**
 * Helper to dispatch JSON requests to the test NextRush server handler.
 */
export async function dispatchServerJson(
  handler: (req: Request) => Promise<Response>,
  path: string,
  method: 'GET' | 'POST' = 'POST',
  body?: unknown
): Promise<{ status: number; data: any }> {
  const url = path.startsWith('http') ? path : `http://localhost:3001${path}`;
  const init: RequestInit = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body !== undefined && method !== 'GET') {
    init.body = JSON.stringify(body);
  }
  const req = new Request(url, init);
  const res = await handler(req);
  const data = await res.json().catch(() => null);
  return { status: res.status, data };
}

/**
 * WCAG 2.1 relative luminance calculation (sRGB to linear to luminance).
 * Formula: L = 0.2126 * R + 0.7152 * G + 0.0722 * B
 */
export function calculateRelativeLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((val) => {
    const s = val / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * WCAG 2.1 contrast ratio between two [R, G, B] colors.
 * Formula: (L1 + 0.05) / (L2 + 0.05) where L1 >= L2.
 */
export function calculateWcagContrastRatio(
  rgbA: [number, number, number],
  rgbB: [number, number, number]
): number {
  const lumA = calculateRelativeLuminance(rgbA[0], rgbA[1], rgbA[2]);
  const lumB = calculateRelativeLuminance(rgbB[0], rgbB[1], rgbB[2]);
  const lighter = Math.max(lumA, lumB);
  const darker = Math.min(lumA, lumB);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Lightweight mock DOM element for canvas and rover controllers.
 */
export function createMockDomElement(width = 1280, height = 720): HTMLElement {
  const listeners: Record<string, ((e: any) => void)[]> = {};
  return {
    clientWidth: width,
    clientHeight: height,
    addEventListener: (event: string, fn: (e: any) => void) => {
      listeners[event] = listeners[event] || [];
      listeners[event].push(fn);
    },
    removeEventListener: (event: string, fn: (e: any) => void) => {
      if (listeners[event]) {
        listeners[event] = listeners[event].filter((l) => l !== fn);
      }
    },
    dispatchEvent: (event: { type: string }) => {
      const list = listeners[event.type] || [];
      list.forEach((fn) => fn(event));
      return true;
    },
    setPointerCapture: () => {},
    releasePointerCapture: () => {},
  } as unknown as HTMLElement;
}
