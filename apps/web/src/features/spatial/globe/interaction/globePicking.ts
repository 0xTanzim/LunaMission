import * as THREE from 'three';
import { CandidateSite } from '@/domain/sites/candidateSite';
import { getSiteById } from '@/domain/sites/catalog';

/** Drag distance below which a pointer-up counts as a click rather than an OrbitControls rotation. */
const CLICK_MAX_TRAVEL_PX = 8;

export interface MarkerPickingHandlers {
  /** Fired once per new site under the cursor. */
  onHoverEnter: (site: CandidateSite) => void;
  /** Fired once when the cursor leaves the site it entered. */
  onHoverExit: (siteId: string) => void;
  onHoverCursorChange: (isPointer: boolean) => void;
  onPick: (site: CandidateSite) => void;
}

export interface MarkerPickingController {
  attach: () => void;
  detach: () => void;
}

/**
 * Translates pointer events on the WebGL canvas into candidate-site hover and
 * selection. Hover is tracked here rather than in React state so the handlers
 * never read a stale value: the scene outlives every render.
 */
export function createMarkerPickingController(
  container: HTMLDivElement,
  dom: HTMLCanvasElement,
  camera: THREE.PerspectiveCamera,
  hitTargets: THREE.Object3D[],
  handlers: MarkerPickingHandlers,
): MarkerPickingController {
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let hoveredSiteId: string | null = null;
  let isDown = false;
  let downX = 0;
  let downY = 0;

  let cachedRect: DOMRect | null = null;

  function updateCachedRect(): DOMRect {
    cachedRect = container.getBoundingClientRect();
    return cachedRect;
  }

  function siteUnderPointer(clientX: number, clientY: number): CandidateSite | null {
    const rect = cachedRect ?? updateCachedRect();
    if (rect.width <= 0 || rect.height <= 0) return null;
    pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(hitTargets, false);
    if (hits.length === 0) return null;

    const hitObject = hits[0].object;
    const siteId = hitObject.userData.siteId ?? hitObject.parent?.userData?.siteId;
    if (!siteId) return null;
    return getSiteById(siteId) ?? null;
  }

  function onPointerDown(event: PointerEvent) {
    if (event.button !== 0) return;
    isDown = true;
    downX = event.clientX;
    downY = event.clientY;
    updateCachedRect();
  }

  function onPointerUp(event: PointerEvent) {
    if (!isDown) return;
    isDown = false;

    const travelled = Math.hypot(event.clientX - downX, event.clientY - downY);
    if (travelled >= CLICK_MAX_TRAVEL_PX) return;

    const site = siteUnderPointer(event.clientX, event.clientY);
    if (site) handlers.onPick(site);
  }

  function onPointerCancel() {
    isDown = false;
  }

  let lastHoverTime = 0;

  function onPointerMove(event: PointerEvent) {
    // When dragging to orbit or pan, skip raycasting to keep 60fps silky smooth
    if (isDown) return;
    const now = Date.now();
    if (now - lastHoverTime < 25) return;
    lastHoverTime = now;

    const site = siteUnderPointer(event.clientX, event.clientY);

    if (!site) {
      if (hoveredSiteId !== null) {
        handlers.onHoverExit(hoveredSiteId);
        hoveredSiteId = null;
      }
      handlers.onHoverCursorChange(false);
      return;
    }

    if (site.id !== hoveredSiteId) {
      if (hoveredSiteId !== null) handlers.onHoverExit(hoveredSiteId);
      hoveredSiteId = site.id;
      handlers.onHoverEnter(site);
    }
    handlers.onHoverCursorChange(true);
  }

  function onPointerLeave() {
    isDown = false;
    if (hoveredSiteId !== null) {
      handlers.onHoverExit(hoveredSiteId);
      hoveredSiteId = null;
    }
    handlers.onHoverCursorChange(false);
  }

  return {
    attach: () => {
      dom.addEventListener('pointerdown', onPointerDown);
      dom.addEventListener('pointerup', onPointerUp);
      dom.addEventListener('pointercancel', onPointerCancel);
      dom.addEventListener('pointermove', onPointerMove);
      dom.addEventListener('pointerleave', onPointerLeave);
    },
    detach: () => {
      dom.removeEventListener('pointerdown', onPointerDown);
      dom.removeEventListener('pointerup', onPointerUp);
      dom.removeEventListener('pointercancel', onPointerCancel);
      dom.removeEventListener('pointermove', onPointerMove);
      dom.removeEventListener('pointerleave', onPointerLeave);
    },
  };
}
