import { useCallback, useEffect, useRef, useState } from 'react';

/** Safari's prefixed fullscreen members, which the standard DOM lib omits. */
type WebkitFullscreenDocument = Document & {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => void;
};

function exitFullscreen(documentRef: WebkitFullscreenDocument) {
  if (documentRef.exitFullscreen) {
    documentRef.exitFullscreen().catch(() => {});
  } else if (documentRef.webkitExitFullscreen) {
    documentRef.webkitExitFullscreen();
  }
}

/**
 * Browser fullscreen ownership for the spatial workspace, including the
 * in-page expansion used when an iframe policy rejects `requestFullscreen`.
 * Kept local to the workspace: no other view needs to know how large the
 * viewport is drawn.
 */
export function useWorkspaceFullscreen() {
  const workspaceRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isExpandedFallback, setIsExpandedFallback] = useState(false);
  const [showPassportOverlay, setShowPassportOverlay] = useState(false);

  // Synchronize the browser Fullscreen API with React state.
  useEffect(() => {
    function handleFullscreenChange() {
      const doc = document as WebkitFullscreenDocument;
      const isCurrentlyFullscreen =
        document.fullscreenElement === workspaceRef.current || doc.webkitFullscreenElement === workspaceRef.current;
      setIsFullscreen(Boolean(isCurrentlyFullscreen));
      if (!isCurrentlyFullscreen) {
        setIsExpandedFallback(false);
        setShowPassportOverlay(false);
      }
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Hotkeys in fullscreen: Escape closes overlay or leaves fullscreen; 'P' toggles passport overlay.
  useEffect(() => {
    if (!isFullscreen && !isExpandedFallback) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement)?.isContentEditable
      ) {
        return;
      }

      if (e.key === 'Escape') {
        if (showPassportOverlay) {
          setShowPassportOverlay(false);
          return;
        }
        if (isFullscreen) {
          exitFullscreen(document as WebkitFullscreenDocument);
        }
        if (isExpandedFallback) {
          setIsExpandedFallback(false);
        }
        return;
      }

      if ((e.key === 'p' || e.key === 'P') && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        setShowPassportOverlay((prev) => !prev);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen, isExpandedFallback, showPassportOverlay]);

  // Graceful fallback when the browser or an iframe policy denies the request.
  const toggleFullscreen = useCallback(async () => {
    if (isFullscreen || isExpandedFallback) {
      if (document.fullscreenElement) {
        try {
          await document.exitFullscreen();
        } catch {
          // The fullscreenchange listener already cleared React state.
        }
      }
      setIsFullscreen(false);
      setIsExpandedFallback(false);
      setShowPassportOverlay(false);
      return;
    }

    const elem = workspaceRef.current;
    if (!elem || !elem.requestFullscreen) {
      setIsExpandedFallback(true);
      return;
    }
    try {
      await elem.requestFullscreen();
      setIsFullscreen(true);
    } catch (err) {
      console.warn('Native Fullscreen API restricted by iframe policy; activating in-page expansion:', err);
      setIsExpandedFallback(true);
    }
  }, [isFullscreen, isExpandedFallback]);

  const togglePassportOverlay = useCallback(() => setShowPassportOverlay((v) => !v), []);
  const closePassportOverlay = useCallback(() => setShowPassportOverlay(false), []);

  return {
    workspaceRef,
    isFullscreen,
    isExpandedFallback,
    isActiveFullscreen: isFullscreen || isExpandedFallback,
    showPassportOverlay,
    toggleFullscreen,
    togglePassportOverlay,
    closePassportOverlay,
  };
}
