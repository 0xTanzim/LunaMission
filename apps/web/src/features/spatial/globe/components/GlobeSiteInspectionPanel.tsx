import React, { useState } from 'react';
import { CandidateSite } from '@/domain/sites/candidateSite';
import { ResultAvailability } from '@/domain/celestial/availability';
import { TopocentricElevationDeg } from '@/domain/coordinates/frames';
import { availableValue } from '@/shared/formatting/availability';
import { getArchivalImagesForSite } from '@/domain/sites/imageryGallery';
import { getScientificSiteInvestigation } from '@/domain/sites/siteInvestigationRegistry';
import { InspectionHeader } from './inspection/InspectionHeader';
import { InspectionNavTabs, InspectionTabId } from './inspection/InspectionNavTabs';
import { InspectionOverviewSection } from './inspection/InspectionOverviewSection';
import { InspectionTopographySection } from './inspection/InspectionTopographySection';
import { InspectionGeologySection } from './inspection/InspectionGeologySection';
import { InspectionIlluminationSection } from './inspection/InspectionIlluminationSection';
import { InspectionVolatilesSection } from './inspection/InspectionVolatilesSection';
import { InspectionConstraintsSection } from './inspection/InspectionConstraintsSection';
import { InspectionImagerySection } from './inspection/InspectionImagerySection';

export interface GlobeSiteInspectionPanelProps {
  site: CandidateSite;
  epochIsoUtc: string;
  sunElevationDeg?: number;
  sunAzimuthDeg?: number;
  earthElevationDeg?: ResultAvailability<TopocentricElevationDeg>;
  earthDistanceKm?: number;
  lightTimeSeconds?: number;
  isCompact?: boolean;
  onClose?: () => void;
  onEnterLocalInspection?: () => void;
  currentMode?: 'regional' | 'overview' | 'inspection' | 'global';
}

export function GlobeSiteInspectionPanel({
  site,
  sunElevationDeg = -1.29,
  earthElevationDeg,
  isCompact = false,
  onEnterLocalInspection,
  currentMode = 'overview',
}: GlobeSiteInspectionPanelProps) {
  const [activeTab, setActiveTab] = useState<InspectionTabId>('all');
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    overview: true,
    topography: true,
    geology: false,
    illumination: false,
    volatiles: false,
    mission: false,
    imagery: false,
  });

  const scientificData = getScientificSiteInvestigation(site.id, site.code);
  const siteImages = getArchivalImagesForSite(site.id);

  const toggleSection = (id: string) => {
    setOpenSections((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const earthElevVal = earthElevationDeg !== undefined ? availableValue(earthElevationDeg) : 1.1;
  const isEarthVisible = earthElevVal !== null && earthElevVal > 0;

  const handleExportDossier = () => {
    if (!scientificData) return;
    const jsonBlob = new Blob([JSON.stringify(scientificData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(jsonBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lunamission-${scientificData.id}-dossier.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSelectTab = (tab: InspectionTabId) => {
    setActiveTab(tab);
    if (tab === 'topo') setOpenSections((prev) => ({ ...prev, topography: true }));
    if (tab === 'geology') setOpenSections((prev) => ({ ...prev, geology: true }));
    if (tab === 'illum') setOpenSections((prev) => ({ ...prev, illumination: true }));
    if (tab === 'volatiles') setOpenSections((prev) => ({ ...prev, volatiles: true }));
    if (tab === 'mission') setOpenSections((prev) => ({ ...prev, mission: true }));
  };

  return (
    <aside
      className={`bg-[var(--lm-color-surface)]/95 backdrop-blur-md border border-[var(--lm-color-border)] rounded-[var(--lm-radius-md)] shadow-2xl flex flex-col pointer-events-auto transition-all duration-200 max-h-[calc(100dvh-5rem)] ${
        isCompact ? 'w-80' : 'w-96'
      }`}
      aria-label="Scientific Candidate Site Inspection Panel"
    >
      <InspectionHeader
        site={site}
        scientificData={scientificData}
        currentMode={currentMode}
        onEnterLocalInspection={onEnterLocalInspection}
        onExportDossier={handleExportDossier}
      />

      <InspectionNavTabs activeTab={activeTab} onSelectTab={handleSelectTab} />

      <div className="flex flex-col divide-y divide-[var(--lm-color-border-subtle)] flex-1 min-h-0 overflow-y-auto">
        {(activeTab === 'all' || activeTab === 'topo') && (
          <InspectionOverviewSection
            site={site}
            scientificData={scientificData}
            isOpen={openSections.overview}
            onToggle={() => toggleSection('overview')}
          />
        )}

        {(activeTab === 'all' || activeTab === 'topo') && (
          <InspectionTopographySection
            site={site}
            scientificData={scientificData}
            isOpen={openSections.topography}
            onToggle={() => toggleSection('topography')}
          />
        )}

        {(activeTab === 'all' || activeTab === 'geology') && (
          <InspectionGeologySection
            scientificData={scientificData}
            isOpen={openSections.geology}
            onToggle={() => toggleSection('geology')}
          />
        )}

        {(activeTab === 'all' || activeTab === 'illum') && (
          <InspectionIlluminationSection
            scientificData={scientificData}
            sunElevationDeg={sunElevationDeg}
            isOpen={openSections.illumination}
            onToggle={() => toggleSection('illumination')}
          />
        )}

        {(activeTab === 'all' || activeTab === 'volatiles') && (
          <InspectionVolatilesSection
            scientificData={scientificData}
            isOpen={openSections.volatiles}
            onToggle={() => toggleSection('volatiles')}
          />
        )}

        {(activeTab === 'all' || activeTab === 'mission') && (
          <InspectionConstraintsSection
            scientificData={scientificData}
            isEarthVisible={isEarthVisible}
            earthElevVal={earthElevVal}
            isOpen={openSections.mission}
            onToggle={() => toggleSection('mission')}
          />
        )}

        <InspectionImagerySection
          siteImages={siteImages}
          isOpen={openSections.imagery}
          onToggle={() => toggleSection('imagery')}
        />
      </div>
    </aside>
  );
}
