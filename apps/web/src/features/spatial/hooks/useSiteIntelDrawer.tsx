import { useCallback, useEffect, useState } from 'react';

export type IntelDrawerTab = 'all' | 'imagery' | 'telemetry' | 'science';

export interface UseSiteIntelDrawerOptions {
  initialOpen?: boolean;
  initialTab?: IntelDrawerTab;
  enableKeyboardShortcut?: boolean;
  overlayBreakpointPx?: number;
}

export interface UseSiteIntelDrawerReturn {
  isOpen: boolean;
  activeTab: IntelDrawerTab;
  isOverlayMode: boolean;
  widthPx: number;
  openDrawer: (tab?: IntelDrawerTab) => void;
  closeDrawer: () => void;
  toggleDrawer: () => void;
  setActiveTab: (tab: IntelDrawerTab) => void;
}

/**
 * Controller hook for the left-side planetary Site Intel Drawer.
 * Handles drawer visibility, tab selection, responsive overlay mode, and 'I' hotkey.
 */
export function useSiteIntelDrawer({
  initialOpen = false,
  initialTab = 'all',
  enableKeyboardShortcut = true,
  overlayBreakpointPx = 1024,
}: UseSiteIntelDrawerOptions = {}): UseSiteIntelDrawerReturn {
  const [isOpen, setIsOpen] = useState(initialOpen);
  const [activeTab, setActiveTab] = useState<IntelDrawerTab>(initialTab);
  const [isOverlayMode, setIsOverlayMode] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < overlayBreakpointPx;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mediaQuery = window.matchMedia(`(max-width: ${overlayBreakpointPx - 1}px)`);
    const handler = (e: MediaQueryListEvent | MediaQueryList) => {
      setIsOverlayMode(e.matches);
    };
    handler(mediaQuery);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, [overlayBreakpointPx]);

  const openDrawer = useCallback((tab?: IntelDrawerTab) => {
    if (tab) setActiveTab(tab);
    setIsOpen(true);
  }, []);

  const closeDrawer = useCallback(() => {
    setIsOpen(false);
  }, []);

  const toggleDrawer = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  useEffect(() => {
    if (!enableKeyboardShortcut) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore when focused inside text inputs, textareas, or contenteditables
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }

      if (e.key === 'i' || e.key === 'I') {
        if (!e.metaKey && !e.ctrlKey && !e.altKey) {
          e.preventDefault();
          setIsOpen((prev) => !prev);
        }
      } else if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enableKeyboardShortcut, isOpen]);

  const widthPx = isOpen ? (isOverlayMode ? 0 : 440) : 0;

  return {
    isOpen,
    activeTab,
    isOverlayMode,
    widthPx,
    openDrawer,
    closeDrawer,
    toggleDrawer,
    setActiveTab,
  };
}
