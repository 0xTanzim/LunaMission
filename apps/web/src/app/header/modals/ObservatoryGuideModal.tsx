import { Modal } from '@/shared/ui/Modal';

interface ObservatoryGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/** Workflow, integrity rules and colour conventions, as static reference text. */
export function ObservatoryGuideModal({ isOpen, onClose }: ObservatoryGuideModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="LunaMission Scientific Observatory Guide"
      subtitle="Scientific methodology, workflow conventions, and interpretation standards"
    >
      <div className="space-y-4">
        <section>
          <h3 className="text-sm font-semibold text-[var(--lm-color-text-primary)] mb-1">
            Primary Workflow
          </h3>
          <p className="text-xs leading-relaxed text-[var(--lm-color-text-secondary)]">
            <strong>Select a candidate site → Choose a UTC epoch → Inspect local geometry and evidence → Compare sites → Understand limitations and provenance.</strong>
          </p>
        </section>

        <section className="bg-[var(--lm-color-surface-raised)] p-3 rounded-[var(--lm-radius-sm)] border border-[var(--lm-color-border)]">
          <h3 className="text-xs font-semibold text-[var(--lm-color-sun)] uppercase tracking-wider mb-1">
            Scientific Integrity Rules
          </h3>
          <ul className="text-xs text-[var(--lm-color-text-secondary)] space-y-1.5 list-disc list-inside">
            <li>
              <strong>Geometric Visibility ≠ Radio Link:</strong> Line of sight to Earth indicates geometric horizon clearance only. Successful RF communications require link margin, antenna pointing, and DSN ground station scheduling.
            </li>
            <li>
              <strong>Theoretical Light-Time ≠ Latency:</strong> Calculated as <code className="font-mono text-[var(--lm-color-text-primary)]">t = d / c</code> in vacuum (~1.21 to 1.35 s). Does not include ground routing or protocol framing.
            </li>
            <li>
              <strong>Geometry-only vs Terrain-aware:</strong> Geometry-only compares against a 1,737.4 km mean lunar sphere. Terrain-aware uses LRO LOLA DEM 128ppd profiles to evaluate topographic rim shielding and horizon dip.
            </li>
            <li>
              <strong>Global UTC State:</strong> All calculations synchronize directly to Coordinated Universal Time (UTC) without local browser timezone offset.
            </li>
          </ul>
        </section>

        <section>
          <h3 className="text-sm font-semibold text-[var(--lm-color-text-primary)] mb-1">
            Color Token Standards
          </h3>
          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            <div className="flex items-center gap-2 p-2 rounded bg-[var(--lm-color-canvas)] border border-[var(--lm-color-border-subtle)]">
              <span className="w-3 h-3 rounded-full bg-[var(--lm-color-sun)] shrink-0" />
              <span>Solar Gold: Sun direction &amp; geometric solar-disk visibility</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded bg-[var(--lm-color-canvas)] border border-[var(--lm-color-border-subtle)]">
              <span className="w-3 h-3 rounded-full bg-[var(--lm-color-earth)] shrink-0" />
              <span>Earth Blue: Earth direction &amp; geometric line-of-sight</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded bg-[var(--lm-color-canvas)] border border-[var(--lm-color-border-subtle)]">
              <span className="w-3 h-3 rounded-full bg-[var(--lm-color-selected-site)] shrink-0" />
              <span>Teal: Selected candidate site</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded bg-[var(--lm-color-canvas)] border border-[var(--lm-color-border-subtle)]">
              <span className="w-3 h-3 rounded-full bg-[var(--lm-color-data-demo)] shrink-0" />
              <span>Purple: Demonstration data indicator</span>
            </div>
          </div>
        </section>
      </div>
    </Modal>
  );
}
