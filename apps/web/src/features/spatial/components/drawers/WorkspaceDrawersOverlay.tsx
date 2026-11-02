import React from 'react';
import { PassportDrawer } from '@/features/spatial/components/panels/PassportDrawer';
import { SiteIntelDrawer } from '@/features/spatial/components/drawers/SiteIntelDrawer';
import type { CandidateSite } from '@/domain/sites/candidateSite';
import type { CelestialGeometryResult } from '@/domain/celestial/geometryResult';
import type { IntelDrawerTab } from '@/features/spatial/hooks/useSiteIntelDrawer';

export interface WorkspaceDrawersOverlayProps {
  isPassportOpen: boolean;
  onClosePassport: () => void;
  onOpenMethodDetails: () => void;
  isSiteIntelOpen: boolean;
  onCloseSiteIntel: () => void;
  siteIntelActiveTab: IntelDrawerTab;
  selectedSite: CandidateSite;
  conditions: CelestialGeometryResult;
  suppressSiteIntel?: boolean;
}

/**
 * Shared non-conflicting drawer overlays (Point Passport & Site Intel).
 */
export function WorkspaceDrawersOverlay({
  isPassportOpen,
  onClosePassport,
  onOpenMethodDetails,
  isSiteIntelOpen,
  onCloseSiteIntel,
  siteIntelActiveTab,
  selectedSite,
  conditions,
  suppressSiteIntel = false,
}: WorkspaceDrawersOverlayProps) {
  const isOverlayMode = typeof window !== 'undefined' ? window.innerWidth < 1024 : false;

  return (
    <>
      {isPassportOpen && (
        <PassportDrawer onClose={onClosePassport} onOpenMethodDetails={onOpenMethodDetails} />
      )}
      {!suppressSiteIntel && (
        <>
          {isSiteIntelOpen && isOverlayMode && (
            <div
              data-testid="site-intel-backdrop"
              onClick={onCloseSiteIntel}
              aria-hidden="true"
              className="fixed inset-0 bg-[var(--lm-color-canvas)]/60 backdrop-blur-xs z-30 lg:hidden transition-opacity duration-200"
            />
          )}
          <SiteIntelDrawer
            site={selectedSite}
            isOpen={isSiteIntelOpen}
            onClose={onCloseSiteIntel}
            sunElevationDeg={conditions.sunElevationDeg}
            sunAzimuthDeg={conditions.sunAzimuthDeg}
            earthElevationDeg={conditions.earthElevationDeg}
            earthAzimuthDeg={conditions.earthAzimuthDeg}
            initialTab={siteIntelActiveTab}
            mode="overlay"
          />
        </>
      )}
    </>
  );
}
