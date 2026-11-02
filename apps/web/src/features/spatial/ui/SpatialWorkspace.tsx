import { useEffect, useRef, useState } from 'react';
import { X, ChevronRight } from 'lucide-react';
import { useScenarioCommands, useScenarioModel } from '@/app/scenario/context/scenarioContext';
import { useScenarioState } from '@/app/state/useScenarioState';
import { CandidateRibbon } from '@/features/spatial/components/cards/CandidateRibbon';
import { WorkspaceDrawersOverlay } from '@/features/spatial/components/drawers/WorkspaceDrawersOverlay';
import { SiteIntelDrawer } from '@/features/spatial/components/drawers/SiteIntelDrawer';
import { useSiteIntelDrawer } from '@/features/spatial/hooks/useSiteIntelDrawer';
import { SpatialToolbar } from '@/features/spatial/components/toolbar/SpatialToolbar';
import { WorkspaceModals } from '@/features/spatial/components/panels/WorkspaceModals';
import { PassportDock } from '@/features/spatial/components/panels/PassportDock';
import { TemporalExplorerDock } from '@/features/spatial/components/panels/TemporalExplorerDock';
import { SpatialViewport } from '@/features/spatial/ui/SpatialViewport';
import { DEFAULT_SPATIAL_VIEW_MODE, spatialViewModeLabel, SpatialViewMode } from '@/features/spatial/model/spatialViewMode';
import { useSpatialPreferences } from '@/features/spatial/hooks/useSpatialPreferences';
import { useWorkspaceFullscreen } from '@/features/spatial/hooks/useWorkspaceFullscreen';
import { useCustomTargetManager } from '@/features/spatial/target/hooks/useCustomTargetManager';
import { CustomTargetCompareCard } from '@/features/spatial/target/CustomTargetCompareCard';
import { createCustomLandingTarget } from '@/domain/target/customTargetModel';
import type { SelenographicCoordinate } from '@/domain/coordinates/projection';

export interface SpatialWorkspaceProps {
  initialViewMode?: SpatialViewMode;
  initialPassportOpen?: boolean;
  onOpenMethodDetails: () => void;
  onNavigateHorizon?: () => void;
  onViewModeChange?: (mode: SpatialViewMode) => void;
}

/**
 * Height of the workspace above the map, at each breakpoint.
 *
 * The map is the workspace, so it takes the viewport minus the cockpit chrome rather than
 * a fixed 460/510/530px ladder. The floor keeps it usable on a short laptop screen; the
 * removable top end keeps it from becoming a letterbox on a tall monitor.
 */
const MAP_HEIGHT_CLASS =
  'h-[calc(100dvh-29rem)] sm:h-[calc(100dvh-27.5rem)] lg:h-[calc(100dvh-24rem)] xl:h-[calc(100dvh-21rem)] 2xl:h-[calc(100dvh-19rem)]';

const PASSPORT_HEIGHT_CLASS =
  'lg:h-[calc(100dvh-24rem)] xl:h-[calc(100dvh-21rem)] 2xl:h-[calc(100dvh-19rem)]';

/** The docked site-intel drawer matches the map frame's height ladder so an open drawer
 *  scrolls inside its dock instead of stretching the map row (and a closed dock collapses
 *  to zero height so hidden content can never reserve dead space below the map). */
const SITE_INTEL_DOCK_HEIGHT_CLASS =
  'lg:h-[calc(100dvh-24rem)] xl:h-[calc(100dvh-21rem)] 2xl:h-[calc(100dvh-19rem)]';

/** The passport is a dock on desktop and a bottom sheet below `lg`, where the map needs the width. */
const PASSPORT_SHEET_CLASS =
  'max-lg:fixed max-lg:inset-x-0 max-lg:bottom-0 max-lg:z-40 max-lg:max-h-[72dvh] max-lg:overflow-y-auto max-lg:rounded-t-[var(--lm-radius-lg)] max-lg:border-t max-lg:border-[var(--lm-color-border)] max-lg:bg-[var(--lm-color-canvas)] max-lg:p-2';

function oneLineMissionContext(
  siteName: string,
  epochIsoUtc: string,
  durationDays: number | undefined,
  mastHeightM: number,
): string {
  const epoch = epochIsoUtc.slice(0, 16).replace('T', ' ') + 'Z';
  const duration = typeof durationDays === 'number' ? `${durationDays} d` : 'window n/a';
  return `${siteName} · ${epoch} · ${duration} · mast ${mastHeightM.toFixed(0)} m · MOON_ME / DE421`;
}

/**
 * Composition shell for the spatial workspace flight deck.
 *
 * Reading order is the order an operator works in: which mission (one line), what the map
 * shows (the map, filling the viewport), what the selected point is (docked passport),
 * then when (collapsible temporal explorer) and where else (candidate ribbon).
 */
export function SpatialWorkspace({
  initialViewMode = DEFAULT_SPATIAL_VIEW_MODE, initialPassportOpen = false,
  onOpenMethodDetails, onNavigateHorizon, onViewModeChange,
}: SpatialWorkspaceProps) {
  const [viewMode, setViewMode] = useState<SpatialViewMode>(initialViewMode);
  const [isDualPassportOpen, setIsDualPassportOpen] = useState(initialPassportOpen);
  // The docked passport is open on desktop; on a phone it starts closed so the map owns the
  // first screen. Both are the same preference, so one toggle serves both layouts.
  const [isStaticPassportOpen, setIsStaticPassportOpen] = useState(
    () => typeof window === 'undefined' || window.innerWidth >= 1024,
  );
  const [isComparisonModalOpen, setIsComparisonModalOpen] = useState(false);
  const [isDossierOpen, setIsDossierOpen] = useState(false);
  const siteIntel = useSiteIntelDrawer();
  const { selectSite } = useScenarioCommands();
  const { site: selectedSite, conditions, epochMs, epochIsoUtc } = useScenarioModel();
  const { state } = useScenarioState();
  const targetManager = useCustomTargetManager(selectedSite, epochMs, typeof window !== 'undefined' ? window.localStorage : null);
  const {
    preferences, toggleLayer, setLayerOpacity, setLayerBlendMode, selectCameraPreset, selectScientificMapMode, setIntelDrawerWidthPx,
  } = useSpatialPreferences();
  const { workspaceRef, isActiveFullscreen, showPassportOverlay, toggleFullscreen, togglePassportOverlay, closePassportOverlay } = useWorkspaceFullscreen();

  const handleViewModeChange = (mode: SpatialViewMode) => {
    setViewMode(mode);
    if (mode !== 'dual') setIsDualPassportOpen(false);
    onViewModeChange?.(mode);
  };

  useEffect(() => {
    const handleActivate3D = () => { setViewMode('globe3d'); setIsDualPassportOpen(false); onViewModeChange?.('globe3d'); };
    window.addEventListener('lm-activate-3d-moon', handleActivate3D);
    return () => window.removeEventListener('lm-activate-3d-moon', handleActivate3D);
  }, [onViewModeChange]);

  useEffect(() => { if (initialViewMode) setViewMode(initialViewMode); }, [initialViewMode]);

  // Resizing from desktop down to tablet/phone turns the docked passport into a fixed bottom
  // sheet, which then covers the workspace toolbar. Close it on that transition so the map and
  // its controls keep the first screen, matching how a phone starts — and restore it when the
  // window crosses back up, so a temporary narrow window doesn't look like the panel vanished.
  const wasStaticPassportOpenRef = useRef(isStaticPassportOpen);
  wasStaticPassportOpenRef.current = isStaticPassportOpen;
  const passportAutoClosedRef = useRef(false);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mql = window.matchMedia('(max-width: 1023px)');
    const handleChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        if (wasStaticPassportOpenRef.current) {
          passportAutoClosedRef.current = true;
          setIsStaticPassportOpen(false);
        }
      } else if (passportAutoClosedRef.current) {
        passportAutoClosedRef.current = false;
        setIsStaticPassportOpen(true);
      }
    };
    mql.addEventListener('change', handleChange);
    return () => mql.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    if (!isDualPassportOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsDualPassportOpen(false); };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDualPassportOpen]);

  const handleTogglePassportOverlay = () => {
    if (!showPassportOverlay && siteIntel.isOpen) siteIntel.closeDrawer();
    togglePassportOverlay();
  };
  const handleToggleDualPassport = () => {
    if (!isDualPassportOpen && siteIntel.isOpen) siteIntel.closeDrawer();
    setIsDualPassportOpen((v) => !v);
  };
  const handleToggleSiteIntel = () => {
    if (!siteIntel.isOpen) {
      if (showPassportOverlay) closePassportOverlay();
      if (isDualPassportOpen) setIsDualPassportOpen(false);
    }
    siteIntel.toggleDrawer();
  };
  const handleOpenSiteIntel = () => {
    if (showPassportOverlay) closePassportOverlay();
    if (isDualPassportOpen) setIsDualPassportOpen(false);
    siteIntel.openDrawer();
  };
  // Opening the passport dismisses the site-intel drawer; the two docks fight for the same
  // map width, and the passport's own render is suppressed while site intel is open — without
  // this, the toolbar toggle looks dead whenever the intel drawer happens to be open.
  const handleToggleStaticPassport = () => {
    if (!isStaticPassportOpen && siteIntel.isOpen) siteIntel.closeDrawer();
    setIsStaticPassportOpen((v) => !v);
  };

  const handleUseAsCustomTarget = (coord: SelenographicCoordinate) => {
    targetManager.saveTarget(
      createCustomLandingTarget({ latitudeDeg: coord.latitudeDeg, longitudeDeg: coord.longitudeDeg }),
    );
  };

  const toolbar = (
    <SpatialToolbar
      viewMode={viewMode} onViewModeChange={handleViewModeChange} preferences={preferences}
      onToggleLayer={toggleLayer} onCameraPresetChange={selectCameraPreset} isFullscreenActive={isActiveFullscreen}
      onToggleFullscreen={toggleFullscreen} onOpenComparisonModal={() => setIsComparisonModalOpen(true)}
      onOpenMissionDossier={() => setIsDossierOpen(true)} onOpenCustomTargetStudio={() => targetManager.openStudio()}
      isPinpointMode={targetManager.isPinpointMode} onTogglePinpointMode={targetManager.togglePinpoint}
      isSiteIntelOpen={siteIntel.isOpen} onToggleSiteIntel={handleToggleSiteIntel}
      onSelectScientificMapMode={selectScientificMapMode}
      isPassportOpen={isActiveFullscreen ? showPassportOverlay : (viewMode === 'dual' ? isDualPassportOpen : isStaticPassportOpen)}
      onTogglePassport={isActiveFullscreen ? handleTogglePassportOverlay : (viewMode === 'dual' ? handleToggleDualPassport : handleToggleStaticPassport)}
      passportTitle={isActiveFullscreen ? 'Toggle Point Passport overlay in fullscreen (Key: P)' : (viewMode === 'dual' ? 'Toggle Point Passport overlay' : 'Toggle Point Passport panel')}
      passportTestId={viewMode === 'dual' ? 'dual-passport-toggle' : 'static-passport-toggle'}
    />
  );

  const viewport = (
    <div className="relative w-full h-full min-h-0 flex-1 flex flex-col">
      <SpatialViewport
        viewMode={viewMode} preferences={preferences}
        onToggleLayer={toggleLayer} onLayerOpacityChange={setLayerOpacity} onLayerBlendChange={setLayerBlendMode}
        onCameraPresetChange={selectCameraPreset} onSelectScientificMapMode={selectScientificMapMode}
        onGlobeFallbackTo2D={() => handleViewModeChange('map2d')} customTarget={targetManager.customTarget}
        onUseAsCustomTarget={handleUseAsCustomTarget}
        isPinpointMode={targetManager.isPinpointMode} onPinpointCustomTarget={targetManager.saveTarget}
        isFullscreen={isActiveFullscreen} isPassportOpen={isActiveFullscreen ? showPassportOverlay : isDualPassportOpen}
        onOpenSiteIntel={handleOpenSiteIntel}
      />
      {targetManager.customTarget && targetManager.evaluation && targetManager.deltas && (
        <div className="absolute bottom-3 left-3 z-20 max-w-sm pointer-events-auto">
          <CustomTargetCompareCard
            target={targetManager.customTarget} evaluation={targetManager.evaluation} deltas={targetManager.deltas}
            onClearTarget={targetManager.clearTarget} onEditTarget={() => targetManager.openStudio(targetManager.customTarget)}
          />
        </div>
      )}
    </div>
  );

  const ribbon = (
    <CandidateRibbon selectedCustomTargetId={targetManager.customTarget?.id} onSelectCustomTarget={targetManager.setCustomTarget} onOpenMissionDossier={() => setIsDossierOpen(true)} />
  );
  const modals = (
    <WorkspaceModals isComparisonModalOpen={isComparisonModalOpen} onCloseComparison={() => setIsComparisonModalOpen(false)} isDossierOpen={isDossierOpen} onCloseDossier={() => setIsDossierOpen(false)} selectedSite={selectedSite} epochMs={epochMs} onSelectSite={(s) => selectSite(s.id)} targetManager={targetManager} />
  );

  // Fullscreen must never replace this element. requestFullscreen() targets the node behind
  // workspaceRef; rendering a different tree for fullscreen unmounted that node, so the browser
  // dropped the session and fired fullscreenchange, which reverted the state immediately. One
  // persistent node, toggled by class.
  const shellClass = isActiveFullscreen
    ? 'fixed inset-0 z-50 w-screen h-screen overflow-hidden rounded-none border-none bg-[var(--lm-color-canvas)] p-3 sm:p-5 flex flex-col gap-3'
    : 'flex w-full min-w-0 flex-col gap-3 rounded-[var(--lm-radius-lg)] border border-[var(--lm-color-border-subtle)] bg-[var(--lm-color-surface)] p-3 sm:p-4';
  const mapFrameClass = isActiveFullscreen
    ? 'relative w-full flex-1 min-h-0 rounded-[var(--lm-radius-md)] overflow-hidden border border-[var(--lm-color-border-subtle)] bg-[var(--lm-color-canvas)] flex flex-col'
    : `relative w-full ${MAP_HEIGHT_CLASS} min-h-[420px] rounded-[var(--lm-radius-md)] overflow-hidden border border-[var(--lm-color-border-subtle)] bg-[var(--lm-color-canvas)] flex flex-col`;

  return (
    <section
      ref={workspaceRef}
      aria-label={isActiveFullscreen ? 'Spatial Workspace Fullscreen' : 'Spatial Workspace'}
      className={shellClass}
    >
      <header
        aria-label="Spatial workspace controls"
        className="flex min-w-0 flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-[var(--lm-color-border-subtle)] pb-2.5 shrink-0"
      >
        {/* Flight-console layout: row A is the title left and the mission context right on one
            baseline; row B is the full-width control strip, left-aligned so its groups pack
            contiguously instead of stranding a pair at the row's left edge. On phones the
            context wraps to its own line so it never truncates beside the title. */}
        <div className="flex min-w-0 items-center gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--lm-color-text-primary)] font-mono whitespace-nowrap">
            Spatial Workspace
          </h2>
          {isActiveFullscreen && (
            <span className="px-2 py-0.5 rounded-[var(--lm-radius-xs)] bg-[var(--lm-color-selected-site)]/15 border border-[var(--lm-color-selected-site)]/40 text-[11px] font-mono text-[var(--lm-color-selected-site)] font-medium whitespace-nowrap">
              Fullscreen Active
            </span>
          )}
          <span className="hidden min-w-0 truncate font-mono text-[length:var(--lm-text-micro)] text-[var(--lm-color-text-muted)] lg:inline">
            [{spatialViewModeLabel(viewMode)}]
          </span>
        </div>
        <span
          data-testid="spatial-mission-context"
          className="min-w-0 max-w-full max-md:order-last max-md:basis-full truncate font-mono text-[length:var(--lm-text-micro)] text-[var(--lm-color-text-secondary)]"
          title={oneLineMissionContext(selectedSite.name, epochIsoUtc, state?.missionEpoch?.durationDays, state?.observerMastHeightM ?? 2)}
        >
          {oneLineMissionContext(selectedSite.name, epochIsoUtc, state?.missionEpoch?.durationDays, state?.observerMastHeightM ?? 2)}
        </span>
        <div className="order-last basis-full w-full min-w-0">
          {toolbar}
        </div>
      </header>

      {/* Flight Deck Main Body: map first, passport docked beside it */}
      <div className={`flex flex-col lg:flex-row gap-3 items-stretch w-full min-w-0 relative${isActiveFullscreen ? ' flex-1 min-h-0' : ''}`}>
        {siteIntel.isOpen && siteIntel.isOverlayMode && (
          <div data-testid="site-intel-backdrop" onClick={siteIntel.closeDrawer} aria-hidden="true" className="fixed inset-0 bg-[var(--lm-color-canvas)]/60 backdrop-blur-xs z-30 lg:hidden transition-opacity duration-200" />
        )}
        {siteIntel.isOpen || siteIntel.isOverlayMode ? (
          <div
            data-testid="spatial-left-drawer-dock"
            aria-hidden={!siteIntel.isOpen}
            style={siteIntel.isOpen && !siteIntel.isOverlayMode ? { width: `${preferences.intelDrawerWidthPx}px` } : undefined}
            className={`shrink-0 overflow-hidden transition-[width,opacity] duration-150 ease-in-out flex flex-col ${siteIntel.isOpen ? `w-full ${SITE_INTEL_DOCK_HEIGHT_CLASS} opacity-100 pointer-events-auto` : 'w-0 h-0 opacity-0 pointer-events-none invisible'}`}
          >
            <div className="flex h-full w-full min-h-0 min-w-0 flex-col">
              <SiteIntelDrawer site={selectedSite} isOpen={siteIntel.isOpen} onClose={siteIntel.closeDrawer} sunElevationDeg={conditions.sunElevationDeg} sunAzimuthDeg={conditions.sunAzimuthDeg} earthElevationDeg={conditions.earthElevationDeg} earthAzimuthDeg={conditions.earthAzimuthDeg} initialTab={siteIntel.activeTab} mode={siteIntel.isOverlayMode ? 'overlay' : 'docked'} width={preferences.intelDrawerWidthPx} onWidthChange={setIntelDrawerWidthPx} />
            </div>
          </div>
        ) : (
          /* Collapsed rail (task 3.1): a 48 px strip that keeps the intel affordance on
             screen; click or Enter re-expands. Rendered on desktop only — mobile keeps
             the toolbar toggle. */
          <div
            data-testid="spatial-left-drawer-rail"
            className={`hidden lg:flex shrink-0 w-12 flex-col items-center gap-3 py-3 border-r border-[var(--lm-color-border-subtle)] bg-[var(--lm-color-surface)]/60 ${SITE_INTEL_DOCK_HEIGHT_CLASS}`}
          >
            <button
              type="button"
              onClick={() => siteIntel.openDrawer()}
              aria-expanded="false"
              aria-label="Open Site Intel drawer"
              className="flex-1 flex flex-col items-center justify-center gap-2 px-1 w-full text-[length:var(--lm-text-micro)] font-mono uppercase tracking-widest text-[var(--lm-color-text-secondary)] hover:text-[var(--lm-color-selected-site)] hover:bg-[var(--lm-color-surface-raised)] rounded-[var(--lm-radius-xs)] min-h-[120px] cursor-pointer focus-visible:outline-2 focus-visible:outline-[var(--lm-color-selected-site)]"
            >
              <ChevronRight className="w-4 h-4" aria-hidden="true" />
              <span style={{ writingMode: 'vertical-rl' }}>Site Intel</span>
            </button>
          </div>
        )}

        <div data-testid="spatial-viewport-container" className={`${viewMode === 'dual' ? 'lg:col-span-12' : 'lg:col-span-7'} flex-1 min-w-0 w-full flex flex-col gap-4`}>
          <div className={mapFrameClass}>
            {viewport}
            <WorkspaceDrawersOverlay
              isPassportOpen={isActiveFullscreen ? showPassportOverlay : viewMode === 'dual' && isDualPassportOpen}
              onClosePassport={isActiveFullscreen ? closePassportOverlay : () => setIsDualPassportOpen(false)}
              onOpenMethodDetails={onOpenMethodDetails} isSiteIntelOpen={siteIntel.isOpen} onCloseSiteIntel={siteIntel.closeDrawer} siteIntelActiveTab={siteIntel.activeTab} selectedSite={selectedSite} conditions={conditions} suppressSiteIntel={true} />
          </div>
        </div>

        {viewMode !== 'dual' && (
          <div
            data-testid="spatial-static-passport-column"
            aria-hidden={!isStaticPassportOpen || siteIntel.isOpen}
            className={`min-w-0 flex flex-col transition-[width,opacity] duration-300 ease-in-out lg:col-span-5 ${isStaticPassportOpen && !siteIntel.isOpen ? `w-full lg:w-[380px] xl:w-[420px] shrink-0 opacity-100 pointer-events-auto ${PASSPORT_SHEET_CLASS}` : 'w-0 shrink-0 opacity-0 overflow-hidden pointer-events-none invisible'}`}
          >
            <div className={`flex h-full w-full flex-col lg:w-[380px] xl:w-[420px] ${PASSPORT_HEIGHT_CLASS} lg:overflow-y-auto`}>
              <div className="mb-1 flex items-center justify-between lg:hidden">
                <span className="text-[length:var(--lm-text-label)] font-semibold uppercase tracking-wider text-[var(--lm-color-text-secondary)]">
                  Point Passport
                </span>
                <button
                  type="button"
                  onClick={() => setIsStaticPassportOpen(false)}
                  aria-label="Close Point Passport panel"
                  className="flex min-h-7 min-w-7 cursor-pointer items-center justify-center rounded-[var(--lm-radius-xs)] text-[var(--lm-color-text-muted)] hover:text-[var(--lm-color-text-primary)]"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
              <PassportDock onOpenMethodDetails={onOpenMethodDetails} onNavigateHorizon={onNavigateHorizon} />
            </div>
          </div>
        )}
      </div>

      <TemporalExplorerDock />
      {ribbon}
      {modals}
    </section>
  );
}
