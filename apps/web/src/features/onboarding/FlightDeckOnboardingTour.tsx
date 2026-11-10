import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, ArrowRight, ArrowLeft, Check, Sparkles } from 'lucide-react';
import { ONBOARDING_TOUR_STEPS, type OnboardingTourStep } from './onboardingTourSteps';

interface FlightDeckOnboardingTourProps {
  isOpen: boolean;
  onClose: () => void;
  steps?: OnboardingTourStep[];
  onNavigateProjection?: (proj: 'explore' | 'analyze' | 'compare') => void;
}

export const FlightDeckOnboardingTour: React.FC<FlightDeckOnboardingTourProps> = ({
  isOpen,
  onClose,
  steps = ONBOARDING_TOUR_STEPS,
  onNavigateProjection,
}) => {
  const [stepIdx, setStepIdx] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const currentStep = steps[stepIdx] ?? steps[0];

  useEffect(() => {
    if (!isOpen || !currentStep?.projection) return;
    onNavigateProjection?.(currentStep.projection);
  }, [isOpen, currentStep?.projection, onNavigateProjection]);

  const updateTargetBounds = useCallback(() => {
    if (!isOpen || !currentStep) return;
    const el = document.querySelector(currentStep.targetSelector);
    if (el) {
      setTargetRect(el.getBoundingClientRect());
    } else {
      setTargetRect(null);
    }
  }, [isOpen, currentStep]);

  useEffect(() => {
    updateTargetBounds();
    window.addEventListener('resize', updateTargetBounds);
    window.addEventListener('scroll', updateTargetBounds, true);
    return () => {
      window.removeEventListener('resize', updateTargetBounds);
      window.removeEventListener('scroll', updateTargetBounds, true);
    };
  }, [updateTargetBounds]);

  // Handle Escape key dismissal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !currentStep) return null;

  const isFirst = stepIdx === 0;
  const isLast = stepIdx === steps.length - 1;

  const handleNext = () => {
    if (isLast) {
      try {
        window.localStorage?.setItem('lunamission_tour_completed', 'true');
      } catch {
        // ignore storage errors
      }
      onClose();
    } else {
      setStepIdx((prev) => Math.min(prev + 1, steps.length - 1));
    }
  };

  const handlePrev = () => {
    setStepIdx((prev) => Math.max(prev - 1, 0));
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Flight Deck Interactive Tour"
      data-testid="flight-deck-tour-overlay"
      className="fixed inset-0 z-50 overflow-hidden"
      onClick={(e) => {
        if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
          onClose();
        }
      }}
    >
      {/* Target Element Halo Spotlight */}
      {targetRect && (
        <div
          data-testid="tour-spotlight-halo"
          className="absolute border-2 border-[var(--lm-color-sun)] rounded-lg pointer-events-none transition-all duration-200 shadow-[0_0_0_9999px_rgba(0,0,0,0.75)] ring-4 ring-[var(--lm-color-sun)]/20"
          style={{
            top: Math.max(0, targetRect.top - 4),
            left: Math.max(0, targetRect.left - 4),
            width: targetRect.width + 8,
            height: targetRect.height + 8,
          }}
        />
      )}

      {/* Floating Tour Card */}
      <div
        ref={cardRef}
        data-testid="tour-popover-card"
        className="absolute z-10 w-full max-w-sm sm:max-w-md bg-[var(--lm-color-surface)] border border-[var(--lm-color-border-strong)] rounded-[var(--lm-radius-lg)] shadow-[var(--lm-shadow-popover)] p-4 sm:p-5 flex flex-col gap-3 left-1/2 -translate-x-1/2 bottom-8 sm:bottom-12 pointer-events-auto"
      >
        <div className="flex items-center justify-between gap-2 border-b border-[var(--lm-color-border-subtle)] pb-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <span className="p-1 rounded bg-[var(--lm-color-sun)]/10 text-[var(--lm-color-sun)]">
              <Sparkles size={14} />
            </span>
            <span className="font-mono text-xs font-bold text-[var(--lm-color-sun)] bg-[var(--lm-color-sun)]/15 px-2 py-0.5 rounded border border-[var(--lm-color-sun)]/30 uppercase">
              {currentStep.badge}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-[var(--lm-color-text-secondary)] font-semibold">
              Step {stepIdx + 1} of {steps.length}
            </span>
            <button
              type="button"
              onClick={onClose}
              aria-label="Skip Tour"
              data-testid="tour-skip-button"
              className="p-1 rounded text-[var(--lm-color-text-secondary)] hover:text-[var(--lm-color-text-primary)] hover:bg-[var(--lm-color-surface-raised)] transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="space-y-1">
          <h3 className="text-sm font-bold text-[var(--lm-color-text-primary)]">{currentStep.title}</h3>
          <p className="text-xs leading-relaxed text-[var(--lm-color-text-secondary)]">
            {currentStep.description}
          </p>
        </div>

        {/* Step indicator dots */}
        <div className="flex items-center justify-center gap-1.5 py-1">
          {steps.map((s, idx) => (
            <span
              key={s.id}
              className={`h-1.5 rounded-full transition-all ${
                idx === stepIdx
                  ? 'w-5 bg-[var(--lm-color-sun)]'
                  : 'w-1.5 bg-[var(--lm-color-border-strong)]'
              }`}
            />
          ))}
        </div>

        {/* Navigation Actions */}
        <div className="flex items-center justify-between gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-mono text-[var(--lm-color-text-muted)] hover:text-[var(--lm-color-text-primary)] transition-colors cursor-pointer"
          >
            Exit Tour [Esc]
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrev}
              disabled={isFirst}
              aria-label="Previous Tour Step"
              data-testid="tour-prev-button"
              className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-mono rounded border transition-colors min-h-[32px] cursor-pointer ${
                isFirst
                  ? 'opacity-40 cursor-not-allowed border-[var(--lm-color-border-subtle)] text-[var(--lm-color-text-muted)]'
                  : 'border-[var(--lm-color-border)] bg-[var(--lm-color-surface-raised)] text-[var(--lm-color-text-primary)] hover:border-[var(--lm-color-border-strong)]'
              }`}
            >
              <ArrowLeft size={13} />
              <span>Back</span>
            </button>
            <button
              type="button"
              onClick={handleNext}
              aria-label={isLast ? 'Finish Tour' : 'Next Tour Step'}
              data-testid="tour-next-button"
              className="inline-flex items-center gap-1 px-3.5 py-1.5 text-xs font-mono font-bold rounded bg-[var(--lm-color-sun)] text-[var(--lm-color-canvas)] hover:opacity-90 transition-opacity min-h-[32px] shadow-sm cursor-pointer"
            >
              <span>{isLast ? 'Finish' : 'Next'}</span>
              {isLast ? <Check size={13} /> : <ArrowRight size={13} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
