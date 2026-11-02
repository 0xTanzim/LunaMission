import React from 'react';

export interface ApolloStationRecord {
  stationCode: string;
  mission: string;
  location: string;
  coordinates: string;
  operationalPeriod: string;
}

export const APOLLO_SEISMIC_STATIONS: ApolloStationRecord[] = [
  { stationCode: 'S11', mission: 'Apollo 11', location: 'Mare Tranquillitatis', coordinates: '0.67°N, 23.47°E', operationalPeriod: 'Jul 1969 – Aug 1969 (21 days)' },
  { stationCode: 'S12', mission: 'Apollo 12', location: 'Oceanus Procellarum', coordinates: '3.01°S, 23.42°W', operationalPeriod: 'Nov 1969 – Sep 1977 (7.8 yrs)' },
  { stationCode: 'S14', mission: 'Apollo 14', location: 'Fra Mauro', coordinates: '3.64°S, 17.47°W', operationalPeriod: 'Feb 1971 – Sep 1977 (6.6 yrs)' },
  { stationCode: 'S15', mission: 'Apollo 15', location: 'Hadley-Apennine', coordinates: '26.13°N, 3.63°E', operationalPeriod: 'Jul 1971 – Sep 1977 (6.2 yrs)' },
  { stationCode: 'S16', mission: 'Apollo 16', location: 'Descartes Highlands', coordinates: '8.97°S, 15.50°E', operationalPeriod: 'Apr 1972 – Sep 1977 (5.4 yrs)' },
];

interface ApolloSeismicDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

export const ApolloSeismicDrawer: React.FC<ApolloSeismicDrawerProps> = ({
  isOpen,
  onClose,
  className = '',
}) => {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Apollo Passive Seismic Experiment Geological Context"
      data-testid="apollo-seismic-drawer"
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--lm-color-canvas)]/80 backdrop-blur-sm ${className}`}
    >
      <div className="bg-[var(--lm-color-surface)] border border-[var(--lm-color-border)]/80 rounded-xl max-w-2xl w-full p-5 shadow-2xl flex flex-col gap-4 font-mono text-xs max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--lm-color-border-subtle)] pb-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-[var(--lm-color-text-primary)] uppercase tracking-wider">
              Apollo Passive Seismic Experiment (PSE)
            </span>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-[var(--lm-color-info-surface)] text-[var(--lm-color-info)] border border-[var(--lm-color-info-border)] font-bold">
              DOI: 10.7914/SN/XA_1969
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Apollo Seismic Context Drawer"
            className="text-[var(--lm-color-text-muted)] hover:text-[var(--lm-color-text-primary)] font-bold text-sm px-2 py-1 rounded bg-[var(--lm-color-surface-strong)] hover:bg-[var(--lm-color-surface-strong)] cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Scientific Context Summary */}
        <div className="flex flex-col gap-2 text-[var(--lm-color-text-secondary)] text-[11px] leading-relaxed">
          <p>
            The Apollo Lunar Surface Experiment Package (ALSEP) seismic network operated on the lunar nearside between 1969 and 1977, providing humanity's first empirical seismological record of an extraterrestrial planetary body (Nunn et al., 2022).
          </p>
        </div>

        {/* 5 Historical Stations */}
        <div className="flex flex-col gap-2">
          <span className="text-[var(--lm-color-text-muted)] font-bold uppercase text-[11px] tracking-wider">
            Nearside Seismic Stations (Network Code XA):
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {APOLLO_SEISMIC_STATIONS.map((st) => (
              <div key={st.stationCode} className="bg-[var(--lm-color-canvas)]/80 p-2.5 rounded border border-[var(--lm-color-border-subtle)] flex flex-col">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[var(--lm-color-info)]">{st.stationCode} ({st.mission})</span>
                  <span className="text-[11px] text-[var(--lm-color-text-muted)]">{st.coordinates}</span>
                </div>
                <span className="text-[var(--lm-color-text-secondary)] text-[11px]">{st.location}</span>
                <span className="text-[var(--lm-color-text-muted)] text-[11px] mt-1">{st.operationalPeriod}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Event Classification */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <div className="bg-[var(--lm-color-canvas)] p-2.5 rounded border border-[var(--lm-color-border-subtle)] flex flex-col gap-1">
            <span className="text-[var(--lm-color-warning)] font-bold text-[11px] uppercase">Deep Moonquakes</span>
            <span className="text-[var(--lm-color-text-muted)] text-[11px]">700–1200 km depth. Modulated by Earth-Moon tidal stress with ~27.3-day period.</span>
          </div>
          <div className="bg-[var(--lm-color-canvas)] p-2.5 rounded border border-[var(--lm-color-border-subtle)] flex flex-col gap-1">
            <span className="text-[var(--lm-color-danger)] font-bold text-[11px] uppercase">Shallow Moonquakes</span>
            <span className="text-[var(--lm-color-text-muted)] text-[11px]">50–220 km depth. Tectonic thrust faulting (Mb 3.6–5.8). Shaking persists for hours.</span>
          </div>
          <div className="bg-[var(--lm-color-canvas)] p-2.5 rounded border border-[var(--lm-color-border-subtle)] flex flex-col gap-1">
            <span className="text-[var(--lm-color-series-b)] font-bold text-[11px] uppercase">Artificial Impacts</span>
            <span className="text-[var(--lm-color-text-muted)] text-[11px]">Saturn IVB boosters and LM ascent stages used as seismic calibration sources.</span>
          </div>
        </div>

        {/* South-Polar Geotechnical Relevance & Citations */}
        <div className="bg-[var(--lm-color-info-surface)] border border-[var(--lm-color-info-border)] p-3 rounded-lg flex flex-col gap-1.5">
          <span className="text-[var(--lm-color-info)] font-bold text-[11px] uppercase">
            South-Polar Geotechnical Relevance (Artemis / CLPS)
          </span>
          <p className="text-[var(--lm-color-info)] text-[11px] leading-relaxed italic">
            "Recent mapping (Watters et al., 2024) indicates active lobate thrust fault scarps intersect candidate Artemis landing regions near Shackleton and de Gerlache. Shallow moonquake shaking represents a plausible trigger for regolith landslides and boulder displacement along steep crater scarps."
          </p>
        </div>

        {/* Scientific Evidence Boundary Notice */}
        <div className="p-2.5 bg-[var(--lm-color-canvas)] border border-[var(--lm-color-border-subtle)] rounded text-[11px] text-[var(--lm-color-text-muted)] leading-normal">
          Evidence Notice: All historical Apollo seismic stations were situated on the nearside. LunaMission presents this data as geological research context; no speculative south-polar seismic prediction score is computed.
        </div>
      </div>
    </div>
  );
};
