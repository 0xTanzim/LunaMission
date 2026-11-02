import React from 'react';
import { Camera, ExternalLink, ShieldCheck } from 'lucide-react';
import type { ArchivalOrbitalImage } from '@/domain/sites/imageryGallery';
import { getLrocQuickMapUrl } from '@/domain/sites/nasaTrekUrls';

export interface IntelImageryTabProps {
  siteImages: ArchivalOrbitalImage[];
  latitudeDeg: number;
  longitudeDeg: number;
}

export function IntelImageryTab({ siteImages, latitudeDeg, longitudeDeg }: IntelImageryTabProps) {
  const quickMapUrl = getLrocQuickMapUrl(latitudeDeg, longitudeDeg);

  return (
    <div className="flex flex-col gap-3 p-3 text-xs font-mono">
      <div className="flex items-center justify-between text-[11px] text-[var(--lm-color-text-muted)] border-b border-[var(--lm-color-border-subtle)] pb-1.5">
        <span className="flex items-center gap-1.5 text-[var(--lm-color-info)] font-semibold">
          <Camera className="w-3.5 h-3.5" />
          <span>High-Resolution Orbital Reconnaissance</span>
        </span>
        <a
          href={quickMapUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-[11px] text-[var(--lm-color-text-muted)] hover:text-[var(--lm-color-info)] underline underline-offset-2 transition-colors"
        >
          <span>LROC QuickMap</span>
          <ExternalLink className="w-2.5 h-2.5" />
        </a>
      </div>

      {siteImages.length === 0 ? (
        <div className="p-3 bg-[var(--lm-color-surface)]/60 border border-[var(--lm-color-border-subtle)] rounded text-[var(--lm-color-text-muted)] text-[11px] font-sans">
          <p>No individual targeted LROC NAC/ShadowCam sub-frames cataloged for this benchmark.</p>
          <p className="mt-1 text-[11px] text-[var(--lm-color-text-muted)]">
            Regional base mapping is provided by the LROC WAC and LOLA global mosaics.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {siteImages.map((img) => (
            <div
              key={img.id}
              className="flex flex-col gap-2 p-2.5 bg-[var(--lm-color-surface-strong)]/50 border border-[var(--lm-color-border-subtle)] rounded shadow-sm"
            >
              <div className="flex items-start justify-between gap-1.5">
                <span className="text-[11px] font-semibold text-[var(--lm-color-text-primary)] font-sans">
                  {img.title}
                </span>
                <span className="text-[11px] uppercase px-1.5 py-0.5 rounded bg-[var(--lm-color-info-surface)] text-[var(--lm-color-info)] border border-[var(--lm-color-info-border)] font-mono shrink-0">
                  {img.instrument}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-1.5 text-[11px] bg-[var(--lm-color-canvas)]/30 p-1.5 rounded border border-[var(--lm-color-text-primary)]/5">
                <div>
                  <span className="text-[var(--lm-color-text-muted)] block">PRODUCT ID</span>
                  <span className="text-[var(--lm-color-text-secondary)] select-all font-semibold">{img.productId}</span>
                </div>
                <div>
                  <span className="text-[var(--lm-color-text-muted)] block">OBSERVATION (UTC)</span>
                  <span className="text-[var(--lm-color-text-secondary)]">{img.observationEpochIsoUtc.replace('T', ' ')}</span>
                </div>
                <div>
                  <span className="text-[var(--lm-color-text-muted)] block">RESOLUTION</span>
                  <span className="text-[var(--lm-color-text-secondary)]">{img.groundResolutionMetersPerPixel.toFixed(2)} m/px</span>
                </div>
                <div>
                  <span className="text-[var(--lm-color-text-muted)] block">SOLAR PHASE</span>
                  <span className="text-[var(--lm-color-text-secondary)]">{img.solarPhaseAngleDeg.toFixed(1)}°</span>
                </div>
              </div>

              <p className="text-[11px] font-sans text-[var(--lm-color-text-secondary)] leading-relaxed">
                {img.caption}
              </p>

              <div className="flex items-center justify-between text-[11px] font-sans pt-1.5 border-t border-[var(--lm-color-border-subtle)]/80 text-[var(--lm-color-warning)]/90">
                <span>{img.isArchiveNotice}</span>
                <a
                  href={img.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[var(--lm-color-text-muted)] hover:text-[var(--lm-color-text-primary)] transition-colors"
                >
                  <span>PDS Source</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
