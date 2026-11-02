/**
 * Deterministic collision avoidance engine for candidate site labels on the 2D polar map.
 */

import { CandidateSite } from '@/domain/sites/candidateSite';
import { projectLatLon } from '@/domain/coordinates/projection';
import {
  BoundingBox,
  CandidateLabelMode,
  PlacedCandidateLabel,
  boxesOverlap,
  radialAngleFromPole,
  offsetAlongAngle,
  clampBadgeAnchor,
  badgeText,
  badgeWidthFor,
  LEADER_LENGTH_PX,
  TAG_OFFSET_HOVERED_PX,
  TAG_OFFSET_PX,
  TAG_OFFSET_SECONDARY_PX,
  CODE_PILL_ZOOM,
  FULL_LABEL_ZOOM,
} from './candidatePinGeometry';

/**
 * Deterministic, priority-based collision avoidance for candidate site labels.
 *
 * Priority order:
 * 1. Selected candidate site badge (reserved first, never occluded).
 * 2. Hovered candidate preview tag (reserved second).
 * 3. Compared sites (reserved third).
 * 4. Remaining unselected sites sorted by Artemis III priority and catalog order.
 *
 * If a secondary site's label collides with any higher-priority bounding box,
 * it attempts a secondary radial offset, and if still colliding, collapses to
 * a clean marker dot ('none') without shifting the true geographic coordinate.
 */
export function resolveCandidateLabelPlacements({
  sites,
  selectedSite,
  hoveredSite,
  comparedSiteIds = [],
  zoom,
}: {
  sites: CandidateSite[];
  selectedSite: CandidateSite;
  hoveredSite: CandidateSite | null;
  comparedSiteIds?: readonly string[];
  zoom: number;
}): Map<string, PlacedCandidateLabel> {
  const results = new Map<string, PlacedCandidateLabel>();
  const occupiedBoxes: BoundingBox[] = [];

  // 1. Reserve Selected Site Badge & Marker Disc
  const selectedPos = projectLatLon(
    selectedSite.coordinates.latitudeDeg,
    selectedSite.coordinates.longitudeDeg
  );
  const selectedAngle = radialAngleFromPole(selectedPos);
  const selectedBadgeAnchor = clampBadgeAnchor(offsetAlongAngle(selectedPos, selectedAngle, LEADER_LENGTH_PX));
  const selectedText = badgeText(selectedSite);
  const selectedWidth = badgeWidthFor(selectedText);

  const selectedBadgeBox: BoundingBox = {
    minX: selectedBadgeAnchor.x - selectedWidth / 2 - 2,
    maxX: selectedBadgeAnchor.x + selectedWidth / 2 + 2,
    minY: selectedBadgeAnchor.y - 11,
    maxY: selectedBadgeAnchor.y + 11,
  };
  occupiedBoxes.push(selectedBadgeBox);

  // Reserve area around selected marker pin
  occupiedBoxes.push({
    minX: selectedPos.x - 14,
    maxX: selectedPos.x + 14,
    minY: selectedPos.y - 14,
    maxY: selectedPos.y + 14,
  });

  results.set(selectedSite.id, {
    siteId: selectedSite.id,
    labelMode: 'full',
    tagPos: selectedBadgeAnchor,
    labelText: selectedText,
    box: selectedBadgeBox,
  });

  // 2. Reserve Hovered Site Tag (if not selected)
  if (hoveredSite && hoveredSite.id !== selectedSite.id) {
    const hPos = projectLatLon(hoveredSite.coordinates.latitudeDeg, hoveredSite.coordinates.longitudeDeg);
    const hAngle = radialAngleFromPole(hPos);
    const hTag = offsetAlongAngle(hPos, hAngle, TAG_OFFSET_HOVERED_PX);
    const hText = hoveredSite.code;
    const hBox: BoundingBox = {
      minX: hTag.x - 18,
      maxX: hTag.x + 18,
      minY: hTag.y - 8,
      maxY: hTag.y + 8,
    };
    occupiedBoxes.push(hBox);

    results.set(hoveredSite.id, {
      siteId: hoveredSite.id,
      labelMode: 'code',
      tagPos: hTag,
      labelText: hText,
      box: hBox,
    });
  }

  // At low regional zoom (< 1.15), keep the map uncluttered: unselected pins are marker dots only
  if (zoom < CODE_PILL_ZOOM) {
    for (const site of sites) {
      if (site.id !== selectedSite.id && site.id !== hoveredSite?.id) {
        const pos = projectLatLon(site.coordinates.latitudeDeg, site.coordinates.longitudeDeg);
        results.set(site.id, {
          siteId: site.id,
          labelMode: 'none',
          tagPos: pos,
          labelText: site.code,
          box: { minX: pos.x - 4, maxX: pos.x + 4, minY: pos.y - 4, maxY: pos.y + 4 },
        });
      }
    }
    return results;
  }

  // 3. Prioritize remaining unselected candidates
  const unselectedSites = sites.filter(
    (s) => s.id !== selectedSite.id && s.id !== hoveredSite?.id
  );

  unselectedSites.sort((a, b) => {
    const aComp = comparedSiteIds.includes(a.id) ? 1 : 0;
    const bComp = comparedSiteIds.includes(b.id) ? 1 : 0;
    if (aComp !== bComp) return bComp - aComp;

    const aArtemis = a.priority.includes('Artemis') ? 1 : 0;
    const bArtemis = b.priority.includes('Artemis') ? 1 : 0;
    if (aArtemis !== bArtemis) return bArtemis - aArtemis;

    return 0;
  });

  for (const site of unselectedSites) {
    const pos = projectLatLon(site.coordinates.latitudeDeg, site.coordinates.longitudeDeg);
    const angle = radialAngleFromPole(pos);

    // Try full label at high zoom (>= 2.2) if room permits
    const tryFull = zoom >= FULL_LABEL_ZOOM;
    const text = tryFull ? badgeText(site) : site.code;
    const width = tryFull ? badgeWidthFor(text) : 34;

    // Test standard offset
    const tag1 = offsetAlongAngle(pos, angle, TAG_OFFSET_PX);
    const box1: BoundingBox = {
      minX: tag1.x - width / 2,
      maxX: tag1.x + width / 2,
      minY: tag1.y - 7,
      maxY: tag1.y + 7,
    };

    const collides1 = occupiedBoxes.some((occ) => boxesOverlap(box1, occ));

    if (!collides1) {
      occupiedBoxes.push(box1);
      results.set(site.id, {
        siteId: site.id,
        labelMode: tryFull ? 'full' : 'code',
        tagPos: tag1,
        labelText: text,
        box: box1,
      });
      continue;
    }

    // Try secondary extended offset with compact code text
    const codeWidth = 34;
    const tag2 = offsetAlongAngle(pos, angle, TAG_OFFSET_SECONDARY_PX);
    const box2: BoundingBox = {
      minX: tag2.x - codeWidth / 2,
      maxX: tag2.x + codeWidth / 2,
      minY: tag2.y - 7,
      maxY: tag2.y + 7,
    };

    const collides2 = occupiedBoxes.some((occ) => boxesOverlap(box2, occ));

    if (!collides2) {
      occupiedBoxes.push(box2);
      results.set(site.id, {
        siteId: site.id,
        labelMode: 'code',
        tagPos: tag2,
        labelText: site.code,
        box: box2,
      });
    } else {
      // Suppress label rather than clutter or overlap
      results.set(site.id, {
        siteId: site.id,
        labelMode: 'none',
        tagPos: pos,
        labelText: site.code,
        box: { minX: pos.x - 4, maxX: pos.x + 4, minY: pos.y - 4, maxY: pos.y + 4 },
      });
    }
  }

  return results;
}
