/**
 * LunaMission icon set — one place that fixes the size and stroke weight of every
 * interface icon, so navigation, toolbar and card chrome draw from the same pen.
 *
 * Built on the `lucide-react` dependency the repository already ships (the spatial
 * toolbar and header modules use it directly). Icon glyphs stand in for emoji
 * pictographs, which rendered at inconsistent sizes and stroke weights and were
 * announced verbatim by screen readers.
 *
 * Rules enforced here:
 * - 16px optical size everywhere it is not overridden explicitly.
 * - 1.75 stroke weight everywhere, so mixed icons read as one family.
 * - Decorative by default (`aria-hidden`); the surrounding control owns the name.
 */
import {
  Activity,
  BookMarked,
  ChevronDown,
  FileText,
  GitCompare,
  Map as MapIcon,
  MapPin,
  Menu,
  Moon,
  Orbit,
  Radar,
  Satellite,
  Target,
  X,
  type LucideIcon,
} from 'lucide-react';

/** Default optical size in CSS pixels. */
export const LM_ICON_SIZE = 16;

/** Single stroke weight for every icon in the product. */
export const LM_ICON_STROKE = 1.75;

export interface LmIconProps {
  /** Extra positional classes (colour, margins). Sizing stays with the icon. */
  className?: string;
  /** Override only where the layout genuinely needs a larger mark. */
  size?: number;
}

function createLmIcon(Glyph: LucideIcon, displayName: string) {
  function LmIcon({ className = '', size = LM_ICON_SIZE }: LmIconProps) {
    return (
      <Glyph
        size={size}
        strokeWidth={LM_ICON_STROKE}
        aria-hidden="true"
        focusable="false"
        className={`shrink-0 ${className}`}
      />
    );
  }
  LmIcon.displayName = displayName;
  return LmIcon;
}

/* Primary navigation destinations */
export const IconSiteMap = createLmIcon(MapIcon, 'IconSiteMap');
export const IconAnalyze = createLmIcon(Radar, 'IconAnalyze');
export const IconCompare = createLmIcon(GitCompare, 'IconCompare');
export const Icon3DLab = createLmIcon(Orbit, 'Icon3DLab');
export const IconCesiumGlobe = createLmIcon(Moon, 'IconCesiumGlobe');

/* Workspace and telemetry controls */
export const IconSeismic = createLmIcon(Activity, 'IconSeismic');
export const IconPassport = createLmIcon(BookMarked, 'IconPassport');
export const IconDossier = createLmIcon(FileText, 'IconDossier');
export const IconCustomTarget = createLmIcon(MapPin, 'IconCustomTarget');
export const IconPinpoint = createLmIcon(Target, 'IconPinpoint');
export const IconFlyover = createLmIcon(Satellite, 'IconFlyover');

/* Disclosures and dismissals */
export const IconChevronDown = createLmIcon(ChevronDown, 'IconChevronDown');
export const IconMenu = createLmIcon(Menu, 'IconMenu');
export const IconClose = createLmIcon(X, 'IconClose');
