import React from 'react';
import { FileText, Layers, Telescope } from 'lucide-react';
import { FullscreenToggle } from './FullscreenToggle';
import { PassportPillButton } from './WorkspacePillButtons';
import { WorkspaceOverflowMenu, type WorkspaceMenuItem } from './WorkspaceOverflowMenu';
import {
  IconCustomTarget,
  IconFlyover,
  IconPinpoint,
} from '@/app/components/icons/lmIcons';
import { TOGGLE_STATE_ON_CLASS, TOOLBAR_BUTTON_IDLE_CLASS } from '@/features/spatial/config/spatialToolbarOptions';

/** Shape shared by every action button in this group; state classes are layered on top. */
const ACTION_CLASS =
  'flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded-[var(--lm-radius-sm)] transition-colors cursor-pointer min-h-7 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lm-color-focus)]';

export interface SpatialTimeGroupProps {
  is2D: boolean;
  isPinpointMode?: boolean;
  onTogglePinpointMode?: () => void;
  isFlyover: boolean;
  onToggleFlyover: () => void;
  onOpenCustomTargetStudio?: () => void;
  isSiteIntelOpen?: boolean;
  onToggleSiteIntel?: () => void;
  isFullscreenActive: boolean;
  onToggleFullscreen: () => void;
  onOpenComparisonModal?: () => void;
  onOpenMissionDossier?: () => void;
  isPassportOpen?: boolean;
  onTogglePassport?: () => void;
  passportTitle?: string;
  passportTestId?: string;
}

/**
 * Workspace controls, split by how often they are reached for.
 *
 * The `⋯` menu holds the tools an operator opens once a session — target studio, 3D pin,
 * flyover, comparison, dossier. The three controls that get used while reading the map —
 * site intel, the passport, fullscreen — stay in the row. Everything still carries its own
 * accessible name, and nothing is removed: it moved one click, not out of the product.
 */
export function SpatialTimeGroup({
  is2D,
  isPinpointMode = false,
  onTogglePinpointMode,
  isFlyover,
  onToggleFlyover,
  onOpenCustomTargetStudio,
  isSiteIntelOpen = false,
  onToggleSiteIntel,
  isFullscreenActive,
  onToggleFullscreen,
  onOpenComparisonModal,
  onOpenMissionDossier,
  isPassportOpen,
  onTogglePassport,
  passportTitle,
  passportTestId,
}: SpatialTimeGroupProps) {
  const rareItems: WorkspaceMenuItem[] = [];

  if (onOpenCustomTargetStudio) {
    rareItems.push({
      id: 'target-studio',
      label: 'Custom target studio',
      title: 'Open Custom Landing Target Studio (Specify Lat/Lon or LOLA coordinates)',
      testId: 'toolbar-target-studio',
      ariaLabel: 'Target Studio',
      icon: <IconCustomTarget />,
      onSelect: onOpenCustomTargetStudio,
      tone: 'warning',
    });
  }

  if (onTogglePinpointMode) {
    rareItems.push({
      id: 'pin-3d',
      label: isPinpointMode ? 'Click Moon to Pin' : 'Pin 3D',
      title: is2D
        ? '3D pin drop active in 3D Moon & Dual View'
        : isPinpointMode
          ? 'Click Moon sphere to drop pin'
          : 'Click to drop a pin anywhere on the 3D Moon sphere',
      testId: 'toolbar-pin-3d',
      ariaLabel: isPinpointMode ? 'Click Moon to Pin' : 'Pin 3D',
      icon: <IconPinpoint />,
      onSelect: onTogglePinpointMode,
      disabled: is2D,
      pressed: isPinpointMode,
    });
  }

  rareItems.push({
    id: 'flyover',
    label: isFlyover ? 'Stop flyover' : 'Flyover tour',
    title: is2D
      ? 'Flyover tour active in 3D Moon & Dual View'
      : isFlyover
        ? 'Stop crater flyover tour'
        : 'Start 360° crater flyover tour',
    testId: 'toggle-flyover',
    ariaLabel: isFlyover ? 'Stop Flyover' : 'Flyover Tour',
    icon: <IconFlyover />,
    onSelect: onToggleFlyover,
    disabled: is2D,
    pressed: isFlyover,
  });

  if (onOpenComparisonModal) {
    rareItems.push({
      id: 'compare-sites',
      label: 'Compare sites',
      title: 'Open Landing Site Comparison Navigator (NASA Space Apps 2026 Matrix)',
      testId: 'toolbar-compare-sites',
      ariaLabel: 'Compare Sites',
      icon: <Layers className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />,
      onSelect: onOpenComparisonModal,
    });
  }

  if (onOpenMissionDossier) {
    rareItems.push({
      id: 'mission-dossier',
      label: 'Mission dossier',
      title: 'Generate Executive Aerospace Mission Briefing (PDF/Markdown Dossier)',
      testId: 'toolbar-mission-dossier',
      ariaLabel: 'Mission Dossier',
      icon: <FileText className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />,
      onSelect: onOpenMissionDossier,
    });
  }

  return (
    <div
      data-group="time-workspace-controls"
      data-slot="time-workspace-controls"
      role="region"
      aria-label="Time & Workspace Controls"
      className="flex shrink-0 items-center gap-1.5"
    >
      {/* Slot 4: mission tools, collapsed into the overflow menu */}
      <div data-slot="mission-tools" className="flex shrink-0 items-center gap-1">
        <WorkspaceOverflowMenu items={rareItems} label="More workspace tools" />
      </div>

      {/* Slot 5: navigation and workspace panels, kept in the row */}
      <div data-slot="workspace-actions" className="flex shrink-0 items-center gap-1.5">
        {onToggleSiteIntel && (
          <button
            type="button"
            onClick={onToggleSiteIntel}
            data-testid="toolbar-site-intel"
            title="Toggle Site Intel & NASA Lunar Trek Reconnaissance Drawer (Key: I)"
            aria-label="Toggle Site Intel Drawer"
            aria-pressed={isSiteIntelOpen}
            aria-expanded={isSiteIntelOpen}
            className={`${ACTION_CLASS} ${isSiteIntelOpen ? TOGGLE_STATE_ON_CLASS : TOOLBAR_BUTTON_IDLE_CLASS}`}
          >
            <Telescope className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="hidden sm:inline">Site Intel</span>
          </button>
        )}

        {onTogglePassport && (
          <PassportPillButton
            isOpen={isPassportOpen ?? false}
            onToggle={onTogglePassport}
            title={passportTitle ?? 'Toggle Point Passport'}
            testId={passportTestId}
          />
        )}

        <FullscreenToggle isFullscreenActive={isFullscreenActive} onToggleFullscreen={onToggleFullscreen} />
      </div>
    </div>
  );
}
