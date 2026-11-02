import React, { useRef, useState, useEffect, useCallback } from 'react';
import type { CandidateSite } from '@/domain/sites/candidateSite';
import type { ResultAvailability } from '@/domain/celestial/availability';
import type { TopocentricAzimuthDeg, TopocentricElevationDeg } from '@/domain/coordinates/frames';
import { getArchivalImagesForSite } from '@/domain/sites/imageryGallery';
import { getScientificSiteInvestigation } from '@/domain/sites/siteInvestigationRegistry';
import { siteCatalogClient } from '@/domain/services/siteCatalogClient';
import type { ScientificSiteInvestigation } from '@/domain/sites/scientificSiteInvestigation';
import { useDrawerFocusTrap } from '@/app/hooks/useDrawerFocusTrap';
import {
  INTEL_DRAWER_MIN_WIDTH_PX,
  INTEL_DRAWER_MAX_WIDTH_PX,
  clampIntelDrawerWidth,
} from '@/features/spatial/model/spatialPreferences';
import { IntelHeader } from './intel/IntelHeader';
import { IntelImageryTab } from './intel/IntelImageryTab';
import { IntelTelemetryTab } from './intel/IntelTelemetryTab';
import { IntelScienceTab } from './intel/IntelScienceTab';
import type { IntelDrawerTab } from '@/features/spatial/hooks/useSiteIntelDrawer';

export interface SiteIntelDrawerProps {
  site: CandidateSite;
  isOpen: boolean;
  onClose: () => void;
  sunElevationDeg: ResultAvailability<TopocentricElevationDeg>;
  sunAzimuthDeg: ResultAvailability<TopocentricAzimuthDeg>;
  earthElevationDeg: ResultAvailability<TopocentricElevationDeg>;
  earthAzimuthDeg: ResultAvailability<TopocentricAzimuthDeg>;
  rangeKm?: number;
  lightTimeSeconds?: number;
  activeTab?: IntelDrawerTab;
  initialTab?: IntelDrawerTab;
  onTabChange?: (tab: IntelDrawerTab) => void;
  mode?: 'docked' | 'overlay' | 'auto';
  /** Docked panel width in CSS px (resizable 320–560, task 3.1). */
  width?: number;
  /** Called on pointer drag and Arrow keys from the resize handle. */
  onWidthChange?: (widthPx: number) => void;
  className?: string;
}

const TABS: { id: IntelDrawerTab; label: string }[] = [
  { id: 'all', label: 'All Intel' },
  { id: 'imagery', label: 'Imagery' },
  { id: 'telemetry', label: 'Live Telemetry' },
  { id: 'science', label: 'Terrain & Science' },
];

function exportDossier(siteId: string, data: ScientificSiteInvestigation | null) {
  if (!data) return;
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `lunamission-${siteId}-planetary-dossier.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function SiteIntelDrawer({
  site, isOpen, onClose, sunElevationDeg, sunAzimuthDeg, earthElevationDeg, earthAzimuthDeg,
  rangeKm = 384400, lightTimeSeconds = 1.28, activeTab: controlledTab, initialTab = 'all',
  onTabChange, mode = 'auto', width = 440, onWidthChange, className = '',
}: SiteIntelDrawerProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const scrollPosRef = useRef<number>(0);
  const prevSiteIdRef = useRef<string>(site.id);
  const [internalTab, setInternalTab] = useState<IntelDrawerTab>(initialTab);
  const activeTab = controlledTab ?? internalTab;

  const handleSelectTab = useCallback((tab: IntelDrawerTab) => {
    setInternalTab(tab);
    onTabChange?.(tab);
  }, [onTabChange]);

  const { containerRef: drawerRef } = useDrawerFocusTrap<HTMLElement>({
    isOpen, onClose, autoFocusRef: closeButtonRef,
  });

  const localInvestigation = getScientificSiteInvestigation(site.id, site.code);
  const [dynamicInvestigation, setDynamicInvestigation] = useState<ScientificSiteInvestigation | null>(null);

  useEffect(() => {
    let active = true;
    setDynamicInvestigation(null);
    void siteCatalogClient.fetchSiteDetail(site.id).then((res) => {
      if (active && res.investigation) setDynamicInvestigation(res.investigation);
    }).catch(() => {});
    return () => { active = false; };
  }, [site.id]);

  const activeInvestigation = dynamicInvestigation ?? localInvestigation;

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    scrollPosRef.current = e.currentTarget.scrollTop;
  };

  useEffect(() => {
    if (prevSiteIdRef.current !== site.id) {
      prevSiteIdRef.current = site.id;
      scrollPosRef.current = 0;
      if (panelRef.current) panelRef.current.scrollTop = 0;
    }
  }, [site.id]);

  useEffect(() => {
    if (isOpen && panelRef.current && scrollPosRef.current > 0) {
      panelRef.current.scrollTop = scrollPosRef.current;
    }
  }, [isOpen]);

  const handleTabKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); handleSelectTab(TABS[(index + 1) % TABS.length].id); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); handleSelectTab(TABS[(index - 1 + TABS.length) % TABS.length].id); }
  };

  const siteImages = getArchivalImagesForSite(site.id);

  // Resize handle (task 3.1): pointer drag + Arrow keys in 16 px steps. The drawer is on
  // the LEFT, so dragging the handle right (positive dx) widens the panel. The handle is
  // docked-mode only — in overlay mode the panel owns the viewport edge.
  const dragStateRef = useRef<{ startX: number; startWidth: number } | null>(null);
  const isDocked = mode === 'docked';

  const commitWidth = useCallback(
    (next: number) => onWidthChange?.(clampIntelDrawerWidth(next)),
    [onWidthChange],
  );

  const onHandlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    dragStateRef.current = { startX: e.clientX, startWidth: width };
    e.currentTarget.setPointerCapture(e.pointerId);
  }, [width]);

  const onHandlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragStateRef.current;
    if (!drag) return;
    commitWidth(drag.startWidth + (e.clientX - drag.startX));
  }, [commitWidth]);

  const onHandlePointerEnd = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    dragStateRef.current = null;
    e.currentTarget.releasePointerCapture?.(e.pointerId);
  }, []);

  const onHandleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); commitWidth(width + 16); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); commitWidth(width - 16); }
    else if (e.key === 'Home') { e.preventDefault(); commitWidth(INTEL_DRAWER_MIN_WIDTH_PX); }
    else if (e.key === 'End') { e.preventDefault(); commitWidth(INTEL_DRAWER_MAX_WIDTH_PX); }
  }, [commitWidth, width]);

  const widthStyle = isDocked && isOpen ? { width: `${width}px` } : undefined;
  const overlayWidthClass = mode === 'overlay' ? 'max-w-[calc(100vw-2rem)] w-full' : '';

  const modeClasses = mode === 'docked'
    ? `relative shrink-0 overflow-hidden transition-[width,opacity] duration-150 ease-in-out ${isOpen ? `opacity-100 pointer-events-auto border-r border-[var(--lm-color-border)]` : 'w-0 opacity-0 pointer-events-none border-r-0 border-transparent invisible'}`
    : mode === 'overlay'
    ? `absolute top-0 left-0 bottom-0 z-30 ${overlayWidthClass} transition-transform duration-300 ease-out ${isOpen ? 'translate-x-0 pointer-events-auto' : '-translate-x-full pointer-events-none invisible'}`
    : `transition-[width,transform,opacity] duration-300 ease-out lg:relative lg:shrink-0 lg:overflow-hidden ${isOpen ? 'w-full sm:w-[440px] lg:w-[440px] opacity-100 pointer-events-auto border-r border-[var(--lm-color-border)] translate-x-0' : 'w-0 lg:w-0 opacity-0 pointer-events-none border-r-0 border-transparent -translate-x-full lg:translate-x-0 invisible'} absolute lg:static top-0 left-0 bottom-0 z-30 lg:z-auto`;

  return (
    <aside
      ref={drawerRef}
      role="dialog"
      aria-modal={isOpen ? 'true' : undefined}
      aria-label="Planetary Site Intel Drawer"
      aria-hidden={!isOpen}
      inert={!isOpen ? true : undefined}
      style={widthStyle}
      className={`h-full flex flex-col bg-[var(--lm-color-surface)]/98 backdrop-blur-md shadow-2xl text-left ${modeClasses} ${className}`}
    >
      {isDocked && isOpen && (
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label={`Resize intelligence drawer (Arrow keys, ${INTEL_DRAWER_MIN_WIDTH_PX}–${INTEL_DRAWER_MAX_WIDTH_PX} pixels)`}
          aria-valuemin={INTEL_DRAWER_MIN_WIDTH_PX}
          aria-valuemax={INTEL_DRAWER_MAX_WIDTH_PX}
          aria-valuenow={clampIntelDrawerWidth(width)}
          tabIndex={0}
          onPointerDown={onHandlePointerDown}
          onPointerMove={onHandlePointerMove}
          onPointerUp={onHandlePointerEnd}
          onPointerCancel={onHandlePointerEnd}
          onKeyDown={onHandleKeyDown}
          className="absolute top-0 right-0 bottom-0 z-40 w-1.5 cursor-col-resize shrink-0 bg-transparent hover:bg-[var(--lm-color-selected-site)]/40 focus-visible:bg-[var(--lm-color-selected-site)]/60 focus-visible:outline-2 focus-visible:outline-[var(--lm-color-selected-site)]"
        />
      )}
      <div className={`w-full ${overlayWidthClass} h-full flex flex-col shrink-0 min-h-0`}>
        <IntelHeader
          site={site}
          onClose={onClose}
          onExportDossier={() => exportDossier(site.id, activeInvestigation)}
          closeButtonRef={closeButtonRef}
          source="nextrush_server"
        />

        <div role="tablist" aria-label="Site Intel categories" className="flex items-center px-3 border-b border-[var(--lm-color-border-subtle)] bg-[var(--lm-color-surface-strong)]/20 shrink-0 overflow-x-auto gap-1">
          {TABS.map((tab, idx) => {
            const isSelected = activeTab === tab.id;
            const displayLabel = tab.id === 'imagery' ? `Imagery (${siteImages.length})` : tab.label;
            return (
              <button
                key={tab.id}
                role="tab"
                id={`intel-tab-${tab.id}`}
                aria-selected={isSelected}
                aria-controls={`intel-panel-${tab.id}`}
                tabIndex={isSelected ? 0 : -1}
                type="button"
                onClick={() => handleSelectTab(tab.id)}
                onKeyDown={(e) => handleTabKeyDown(e, idx)}
                className={`px-3 py-2 text-[11px] font-mono border-b-2 transition-colors cursor-pointer whitespace-nowrap focus-visible:ring-2 focus-visible:ring-[var(--lm-color-info)] focus:outline-none min-h-[36px] ${isSelected ? 'border-[var(--lm-color-selected-site)] text-[var(--lm-color-text-primary)] font-semibold' : 'border-transparent text-[var(--lm-color-text-secondary)] hover:text-[var(--lm-color-text-primary)]'}`}
              >
                {displayLabel}
              </button>
            );
          })}
        </div>

        <div
          ref={panelRef}
          role="tabpanel"
          id={`intel-panel-${activeTab}`}
          aria-labelledby={`intel-tab-${activeTab}`}
          tabIndex={0}
          onScroll={handleScroll}
          className="flex-1 min-h-0 overflow-y-auto divide-y divide-[var(--lm-color-border-subtle)] focus-visible:ring-1 focus-visible:ring-[var(--lm-color-info)] focus:outline-none"
        >
          {(activeTab === 'all' || activeTab === 'imagery') && (
            <IntelImageryTab siteImages={siteImages} latitudeDeg={site.coordinates.latitudeDeg} longitudeDeg={site.coordinates.longitudeDeg} />
          )}
          {(activeTab === 'all' || activeTab === 'telemetry') && (
            <IntelTelemetryTab sunElevationDeg={sunElevationDeg} sunAzimuthDeg={sunAzimuthDeg} earthElevationDeg={earthElevationDeg} earthAzimuthDeg={earthAzimuthDeg} rangeKm={rangeKm} lightTimeSeconds={lightTimeSeconds} />
          )}
          {(activeTab === 'all' || activeTab === 'science') && (
            <IntelScienceTab scientificData={activeInvestigation} />
          )}
        </div>
      </div>
    </aside>
  );
}
