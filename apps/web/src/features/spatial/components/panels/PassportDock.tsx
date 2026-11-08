import React, { useId, useState } from 'react';
import { ChevronDown, ExternalLink, HelpCircle, ShieldCheck } from 'lucide-react';
import {
  PassportCalculationModeSwitch,
  PassportEarthSection,
  PassportHorizonSummary,
  PassportSiteHeader,
  PassportSunSection,
} from '@/features/passport/ui';
import { useScenarioModel } from '@/app/scenario/context/scenarioContext';

export interface PassportSectionProps {
  title: string;
  /** What the section's numbers are, what they are not, and where they come from. */
  definition: string;
  /** One-line readout shown in the header while the section is collapsed, so collapsing never hides the answer entirely. */
  summary?: React.ReactNode;
  /** Whether the section body starts expanded. Only the dock's primary question opens by default. */
  defaultOpen?: boolean;
  children: React.ReactNode;
}

/**
 * One labelled group of the passport: a collapsible body plus its own expandable definition.
 *
 * Sections collapse because the docked panel is height-bound to the map — every section
 * permanently expanded forced three screens of internal scrolling. The collapsed header keeps
 * a one-line summary so the headline value never disappears behind a click.
 *
 * The definition is a disclosure on the section rather than a tooltip: an operator reading
 * a clearance value needs to know which observable it is in the same glance, and a
 * hover-only explanation does not exist for a keyboard or a touch user.
 */
export function PassportSection({ title, definition, summary, defaultOpen = false, children }: PassportSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultOpen);
  const [isDefinitionOpen, setIsDefinitionOpen] = useState(false);
  const bodyId = useId();
  const definitionId = useId();

  return (
    <section
      aria-label={title}
      data-testid={`passport-section-${title.toLowerCase().replace(/\s+/g, '-')}`}
      className="flex min-w-0 flex-col gap-2 border-t border-[var(--lm-color-border-subtle)] pt-2.5 first:border-t-0 first:pt-0"
    >
      <div className="flex min-w-0 items-center justify-between gap-2">
        <h3 className="min-w-0 flex-1">
          <button
            type="button"
            onClick={() => setIsExpanded((open) => !open)}
            aria-expanded={isExpanded}
            aria-controls={bodyId}
            className="flex min-h-6 w-full min-w-0 cursor-pointer items-center gap-1.5 rounded-[var(--lm-radius-xs)] text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lm-color-focus)]"
          >
            <ChevronDown
              className={`h-3.5 w-3.5 shrink-0 text-[var(--lm-color-text-muted)] transition-transform motion-safe:duration-150 ${isExpanded ? 'rotate-180' : ''}`}
              aria-hidden="true"
            />
            <span className="truncate text-[length:var(--lm-text-label)] font-semibold uppercase tracking-wider text-[var(--lm-color-text-secondary)]">
              {title}
            </span>
            {!isExpanded && summary !== undefined && (
              <span className="ml-auto shrink-0 truncate pl-2 font-mono text-[length:var(--lm-text-micro)] text-[var(--lm-color-text-muted)]">
                {summary}
              </span>
            )}
          </button>
        </h3>
        <button
          type="button"
          onClick={() => setIsDefinitionOpen((open) => !open)}
          aria-expanded={isDefinitionOpen}
          aria-controls={definitionId}
          aria-label={`Definition for ${title}`}
          className="flex min-h-6 shrink-0 cursor-pointer items-center gap-1 rounded-[var(--lm-radius-xs)] px-1.5 py-0.5 text-[length:var(--lm-text-micro)] text-[var(--lm-color-text-muted)] transition-colors hover:text-[var(--lm-color-text-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lm-color-focus)]"
        >
          <HelpCircle className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Definition</span>
          <ChevronDown
            className={`h-3 w-3 transition-transform motion-safe:duration-150 ${isDefinitionOpen ? 'rotate-180' : ''}`}
            aria-hidden="true"
          />
        </button>
      </div>

      {isDefinitionOpen && (
        <p
          id={definitionId}
          className="rounded-[var(--lm-radius-xs)] border border-[var(--lm-color-border-subtle)] bg-[var(--lm-color-surface)] p-2 text-[length:var(--lm-text-micro)] leading-relaxed text-[var(--lm-color-text-secondary)]"
        >
          {definition}
        </p>
      )}

      {isExpanded && (
        <div id={bodyId} className="flex min-w-0 flex-col gap-2.5">
          {children}
        </div>
      )}
    </section>
  );
}

export interface PassportDockProps {
  onOpenMethodDetails: () => void;
  onNavigateHorizon?: () => void;
  className?: string;
}

/**
 * The right-hand Point Passport, organised into the four questions an operator actually
 * asks of a site: what is it, does it see the Sun, can it reach Earth, and what does the
 * terrain do to both.
 *
 * This is a reorganisation, not a new model: every value still comes from the same
 * passport sections, so provenance, availability states and the honesty caveats travel
 * with the numbers.
 */
export function PassportDock({ onOpenMethodDetails, onNavigateHorizon, className = '' }: PassportDockProps) {
  // Collapsed-header summaries read the same backend-computed model the sections render, so a
  // collapsed section still answers its headline question without duplicating any calculation.
  const { site, conditions } = useScenarioModel();
  const elevationSummary = `${site.code} · ${site.coordinates.elevationMeters >= 0 ? '+' : ''}${site.coordinates.elevationMeters.toFixed(0)} m`;
  const sunSummary = conditions.sunElevationDeg.kind === 'available'
    ? `Sun ${conditions.sunElevationDeg.value >= 0 ? '+' : ''}${conditions.sunElevationDeg.value.toFixed(2)}°`
    : undefined;
  const earthSummary = conditions.earthElevationDeg.kind === 'available'
    ? `Earth ${conditions.earthElevationDeg.value >= 0 ? '+' : ''}${conditions.earthElevationDeg.value.toFixed(2)}°`
    : undefined;

  return (
    <div
      className={`flex w-full min-w-0 flex-col gap-2.5 rounded-[var(--lm-radius-md)] border border-[var(--lm-color-border-subtle)] bg-[var(--lm-color-surface-raised)]/40 p-3 ${className}`}
      data-testid="point-passport-dock"
    >
      <div className="flex min-w-0 items-center justify-between gap-2 border-b border-[var(--lm-color-border-subtle)] pb-2">
        <h2 className="text-[length:var(--lm-text-h3)] font-semibold text-[var(--lm-color-text-primary)]">
          Point Passport
        </h2>
        <span className="rounded-[var(--lm-radius-xs)] border border-[var(--lm-color-border)] px-1.5 py-0.5 text-[length:var(--lm-text-micro)] uppercase tracking-wider text-[var(--lm-color-text-muted)]">
          Mission target
        </span>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--lm-color-border-subtle)] pb-2">
        <span className="text-[length:var(--lm-text-micro)] font-mono uppercase tracking-wider text-[var(--lm-color-text-muted)]">
          Horizon Model
        </span>
        <PassportCalculationModeSwitch />
      </div>

      <PassportSection
        title="Site Identity"
        summary={elevationSummary}
        definition="Which point this passport describes: catalogue code and published name, IAU MOON_ME coordinates, DEM elevation, and the observer mast that displaces the local horizon. Identity comes from the candidate registry — inspecting terrain on the map never changes it."
      >
        <PassportSiteHeader />
      </PassportSection>

      <PassportSection
        title="Illumination Intelligence"
        defaultOpen
        summary={sunSummary}
        definition="Geometric solar geometry at this point for the selected epoch: the Sun's elevation and azimuth above the reference horizon, and the visible fraction of the solar disk. Geometric solar access is not irradiance-weighted sunlight and is not generated electrical power."
      >
        <PassportSunSection />
      </PassportSection>

      <PassportSection
        title="Communications"
        summary={earthSummary}
        definition="Geometric Earth line-of-sight: elevation, azimuth, range and one-way light time. A clear geometric sightline does not prove radio link closure — RF link budget, antenna pointing and Deep Space Network scheduling are separate constraints."
      >
        <PassportEarthSection />
      </PassportSection>

      <PassportSection
        title="Terrain Intelligence"
        definition="The local terrain horizon mask and the signed clearance between each body's elevation and the mask toward its azimuth. Terrain-aware values use the LOLA DEM horizon; geometry-only values use a spherical horizon. The 360° horizon radar shows the same mask in every direction."
      >
        <PassportHorizonSummary onNavigateHorizon={onNavigateHorizon} />
      </PassportSection>

      <div className="flex items-center justify-between gap-2 border-t border-[var(--lm-color-border-subtle)] pt-2 text-[length:var(--lm-text-micro)] text-[var(--lm-color-text-muted)]">
        <span className="flex items-center gap-1.5 text-[var(--lm-color-success)]">
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
          <span>JPL Horizons Benchmark Verified</span>
        </span>
        <button
          type="button"
          onClick={onOpenMethodDetails}
          className="flex min-h-6 items-center gap-1 text-[var(--lm-color-text-secondary)] underline underline-offset-2 transition-colors hover:text-[var(--lm-color-text-primary)]"
        >
          <span>Method &amp; Provenance</span>
          <ExternalLink className="h-3 w-3" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
