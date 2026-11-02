import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidth?: string;
}

export function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'max-w-2xl',
}: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    previouslyFocusedRef.current = document.activeElement as HTMLElement | null;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();
    return () => {
      document.body.style.overflow = 'unset';
      previouslyFocusedRef.current?.focus?.();
      previouslyFocusedRef.current = null;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-[var(--lm-color-canvas)]/75 backdrop-blur-xs"
      onClick={(e) => {
        if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
          onClose();
        }
      }}
    >
      <div
        ref={modalRef}
        className={`w-full ${maxWidth} bg-[var(--lm-color-surface)] border border-[var(--lm-color-border)] rounded-[var(--lm-radius-lg)] shadow-[var(--lm-shadow-popover)] overflow-hidden flex flex-col my-auto`}
      >
        <div className="flex items-start justify-between p-4 sm:p-5 border-b border-[var(--lm-color-border-subtle)] bg-[var(--lm-color-surface-raised)]/50">
          <div>
            <h2 id="modal-title" className="text-base sm:text-lg font-semibold text-[var(--lm-color-text-primary)]">
              {title}
            </h2>
            {subtitle && (
              <p className="text-xs sm:text-sm text-muted mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="tap-target shrink-0 p-1.5 rounded-[var(--lm-radius-sm)] text-muted hover:text-[var(--lm-color-text-primary)] hover:bg-[var(--lm-color-surface-raised)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 sm:p-6 overflow-y-auto max-h-[calc(85vh-8rem)] text-sm text-[var(--lm-color-text-secondary)]">
          {children}
        </div>
      </div>
    </div>
  );
}
