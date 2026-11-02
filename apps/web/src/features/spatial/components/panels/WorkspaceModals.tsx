import React from 'react';
import { CandidateSite } from '@/domain/sites/candidateSite';
import { SiteComparisonMatrixModal } from '@/features/spatial/components/SiteComparisonMatrixModal';
import { CustomTargetStudioModal } from '@/features/spatial/target/CustomTargetStudioModal';
import { UseCustomTargetManagerResult } from '@/features/spatial/target/hooks/useCustomTargetManager';
import { MissionDossierModal } from '@/features/dossier/ui/MissionDossierModal';

export interface WorkspaceModalsProps {
  isComparisonModalOpen: boolean;
  onCloseComparison: () => void;
  isDossierOpen: boolean;
  onCloseDossier: () => void;
  selectedSite: CandidateSite;
  epochMs: number;
  onSelectSite: (site: CandidateSite) => void;
  targetManager: UseCustomTargetManagerResult;
}

export function WorkspaceModals({
  isComparisonModalOpen,
  onCloseComparison,
  isDossierOpen,
  onCloseDossier,
  selectedSite,
  epochMs,
  onSelectSite,
  targetManager,
}: WorkspaceModalsProps) {
  const custom = targetManager.customTarget;
  const targetName = custom ? custom.name : selectedSite.name;
  const catalogId = custom ? undefined : selectedSite.id;
  const latitudeDeg = custom ? custom.latitudeDeg : selectedSite.coordinates.latitudeDeg;
  const longitudeDeg = custom ? custom.longitudeDeg : selectedSite.coordinates.longitudeDeg;
  const elevationKm = custom ? custom.elevationKm : selectedSite.coordinates.elevationMeters / 1000;

  return (
    <>
      <SiteComparisonMatrixModal
        isOpen={isComparisonModalOpen}
        onClose={onCloseComparison}
        selectedSiteId={selectedSite.id}
        onSelectSite={onSelectSite}
      />
      <CustomTargetStudioModal
        isOpen={targetManager.isStudioOpen}
        onClose={targetManager.closeStudio}
        onSaveTarget={targetManager.saveTarget}
        initialTarget={targetManager.customTarget}
      />
      <MissionDossierModal
        isOpen={isDossierOpen}
        onClose={onCloseDossier}
        targetName={targetName}
        catalogId={catalogId}
        latitudeDeg={latitudeDeg}
        longitudeDeg={longitudeDeg}
        elevationKm={elevationKm}
        epochMs={epochMs}
      />
    </>
  );
}
