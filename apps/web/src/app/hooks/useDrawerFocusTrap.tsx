import { useEffect, useRef, type RefObject } from 'react';

export interface UseDrawerFocusTrapOptions {
  isOpen: boolean;
  onClose: () => void;
  autoFocusRef?: RefObject<HTMLElement | null>;
}

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]):not([disabled])';

/**
 * Custom hook providing strict WCAG 2.1 AA (SC 2.1.2 & 2.4.3) focus containment
 * for modal slide-over drawers.
 */
export function useDrawerFocusTrap<T extends HTMLElement = HTMLElement>({
  isOpen,
  onClose,
  autoFocusRef,
}: UseDrawerFocusTrapOptions) {
  const containerRef = useRef<T>(null);

  useEffect(() => {
    if (!isOpen) return;

    const previousActiveElement =
      typeof document !== 'undefined' ? (document.activeElement as HTMLElement | null) : null;

    // Immediately focus initial target (close button or first focusable element)
    const focusInitial = () => {
      if (autoFocusRef?.current) {
        autoFocusRef.current.focus();
      } else if (containerRef.current) {
        const focusable = containerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
        focusable[0]?.focus();
      }
    };

    focusInitial();
    const rafId = typeof requestAnimationFrame !== 'undefined'
      ? requestAnimationFrame(focusInitial)
      : null;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === 'Tab' && containerRef.current) {
        const focusable = containerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
        if (focusable.length === 0) {
          e.preventDefault();
          return;
        }

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        // If focus has leaked or is currently outside drawer, redirect into drawer
        if (!containerRef.current.contains(document.activeElement)) {
          e.preventDefault();
          if (e.shiftKey) {
            last.focus();
          } else {
            first.focus();
          }
          return;
        }

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      if (rafId !== null && typeof cancelAnimationFrame !== 'undefined') {
        cancelAnimationFrame(rafId);
      }
      window.removeEventListener('keydown', handleKeyDown);
      previousActiveElement?.focus?.();
    };
  }, [isOpen, onClose, autoFocusRef]);

  return { containerRef };
}
