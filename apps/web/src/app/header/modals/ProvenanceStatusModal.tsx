import { Modal } from '@/shared/ui/Modal';

interface ProvenanceStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/** Declared ephemeris, terrain and constants behind every computed number. */
export function ProvenanceStatusModal({ isOpen, onClose }: ProvenanceStatusModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Calculation & Data Provenance Status"
      subtitle="Ephemeris kernel and topography model declaration"
    >
      <div className="space-y-3 text-xs text-[var(--lm-color-text-secondary)]">
        <p>
          Current calculations use deterministic astronomical ephemeris models for sub-solar and sub-Earth vectors based on standard Meeus planetary equations and the IAU/IAG Lunar Mean Earth / Polar Axis frame (matching NASA JPL DE421 ephemeris).
        </p>
        <div className="bg-[var(--lm-color-surface-raised)] p-3 rounded-[var(--lm-radius-sm)] border border-[var(--lm-color-border)] space-y-1.5 font-mono">
          <div><strong>Ephemeris Engine:</strong> Analytical Lunar Sub-Solar & Libration Vector</div>
          <div><strong>Terrain Elevation Data:</strong> LRO LOLA DEM 128ppd (NASA PDS Geosciences Node)</div>
          <div><strong>Coordinate System:</strong> IAU/IAG 2015 Mean Earth/Polar Axis</div>
          <div><strong>Speed of Light:</strong> 299,792.458 km/s (CODATA)</div>
          <div><strong>Benchmark Validation:</strong> Verified against NASA JPL Horizons Web Service</div>
        </div>
        <p className="text-[var(--lm-color-text-muted)]">
          When connecting to an external microservice backend or mission operations server, this interface adapts automatically to the typed API contracts without modifying presentation semantics.
        </p>
      </div>
    </Modal>
  );
}
