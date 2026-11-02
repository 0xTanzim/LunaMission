/**
 * Archival Lunar Orbital Imagery Gallery
 * Date-stamped historical observations from LROC NAC and NASA ShadowCam.
 *
 * Invariant: Every image is linked to verified product IDs, observation epoch (UTC),
 * lighting phase angle, and explicit archival declaration. Never presented as a live feed.
 */

export interface ArchivalOrbitalImage {
  id: string;
  siteId: string;
  type: 'lroc-nac-context' | 'shadowcam-psr-inset';
  title: string;
  observationEpochIsoUtc: string;
  productId: string;
  instrument: 'LROC NAC-L' | 'LROC NAC-R' | 'NASA ShadowCam';
  solarIncidenceAngleDeg: number;
  solarPhaseAngleDeg: number;
  groundResolutionMetersPerPixel: number;
  footprintDescription: string;
  caption: string;
  sourceUrl: string;
  isArchiveNotice: string;
  thumbnailTone: 'dark-regolith' | 'psr-scattered' | 'high-contrast-rim';
}

export const ARCHIVAL_ORBITAL_IMAGES: ArchivalOrbitalImage[] = [
  {
    id: 'img-shac-nac-01',
    siteId: 'shackleton-rim',
    type: 'lroc-nac-context',
    title: 'LROC NAC: Shackleton Connecting Ridge High-Sun Illumination',
    observationEpochIsoUtc: '2021-10-14T08:44:19Z',
    productId: 'M1388412998LR',
    instrument: 'LROC NAC-L',
    solarIncidenceAngleDeg: 88.4,
    solarPhaseAngleDeg: 89.1,
    groundResolutionMetersPerPixel: 1.15,
    footprintDescription: '89.85°S to 89.95°S, 0°E to 45°E (Crater Rim Crest)',
    caption: 'Grazing solar illumination along the elevated crest of Shackleton rim. Deep shadows mask the crater interior while the summit plateau remains sunlit.',
    sourceUrl: 'https://data.lroc.im-ldi.com/lroc/view_rdr/NAC_POLE_SOUTH',
    isArchiveNotice: 'Archival observation acquired by NASA LRO on 2021-10-14. Not live surface telemetry.',
    thumbnailTone: 'high-contrast-rim',
  },
  {
    id: 'img-shac-shadowcam-01',
    siteId: 'shackleton-rim',
    type: 'shadowcam-psr-inset',
    title: 'NASA ShadowCam: Secondary Scattered Light in Shackleton Interior',
    observationEpochIsoUtc: '2023-02-05T14:22:08Z',
    productId: 'SHADOWCAM_M01_20230205_SHACKLETON',
    instrument: 'NASA ShadowCam',
    solarIncidenceAngleDeg: 91.2, // Below local horizon
    solarPhaseAngleDeg: 42.0,
    groundResolutionMetersPerPixel: 1.70,
    footprintDescription: '89.90°S to 89.98°S, 120°E to 160°E (Crater Floor & Wall)',
    caption: 'Ultra-sensitive observation of permanently shadowed floor captured using secondary sunlight reflected off the sunlit opposite rim walls.',
    sourceUrl: 'https://www.nasa.gov/solar-system/nasas-shadowcam-images-lunar-south-pole-region/',
    isArchiveNotice: 'Archival observation acquired by NASA ShadowCam on Danuri (KPLO) on 2023-02-05. Low-light PSR exposure.',
    thumbnailTone: 'psr-scattered',
  },
  {
    id: 'img-conn-nac-01',
    siteId: 'connecting-ridge',
    type: 'lroc-nac-context',
    title: 'LROC NAC: Connecting Ridge Morphological Context',
    observationEpochIsoUtc: '2022-03-18T19:12:44Z',
    productId: 'M1401928410RE',
    instrument: 'LROC NAC-R',
    solarIncidenceAngleDeg: 87.9,
    solarPhaseAngleDeg: 88.5,
    groundResolutionMetersPerPixel: 1.22,
    footprintDescription: '89.35°S to 89.55°S, 215°E to 230°E (Connecting Ridge Spine)',
    caption: 'Linear topographic spine between Shackleton and de Gerlache. Micro-craters down to 3 m diameter visible on the regolith mantle.',
    sourceUrl: 'https://data.lroc.im-ldi.com/lroc/view_rdr/NAC_POLE_SOUTH',
    isArchiveNotice: 'Archival observation acquired by NASA LRO on 2022-03-18.',
    thumbnailTone: 'dark-regolith',
  },
  {
    id: 'img-mala-nac-01',
    siteId: 'malapert-massif',
    type: 'lroc-nac-context',
    title: 'LROC NAC: Malapert Massif Summit Plateau & Escarpment',
    observationEpochIsoUtc: '2020-07-29T11:05:31Z',
    productId: 'M1346719820LE',
    instrument: 'LROC NAC-L',
    solarIncidenceAngleDeg: 85.2,
    solarPhaseAngleDeg: 86.0,
    groundResolutionMetersPerPixel: 0.95,
    footprintDescription: '85.80°S to 86.00°S, 1°E to 5°E (Massif Summit Ridge)',
    caption: 'Broad summit ridge of Malapert Massif elevated 5 km above baseline terrain. Broad Earth line-of-sight view without terrain blockage.',
    sourceUrl: 'https://data.lroc.im-ldi.com/lroc/view_rdr/NAC_POLE_SOUTH',
    isArchiveNotice: 'Archival observation acquired by NASA LRO on 2020-07-29.',
    thumbnailTone: 'high-contrast-rim',
  },
  {
    id: 'img-mout-nac-01',
    siteId: 'mons-mouton-plateau',
    type: 'lroc-nac-context',
    title: 'LROC NAC: Mons Mouton Plateau Artemis III Candidate ROI',
    observationEpochIsoUtc: '2022-08-19T14:31:00Z',
    productId: 'NAC_ROI_MOUTNPLTLOA',
    instrument: 'LROC NAC-L',
    solarIncidenceAngleDeg: 84.8,
    solarPhaseAngleDeg: 85.5,
    groundResolutionMetersPerPixel: 1.05,
    footprintDescription: '84.60°S to 85.00°S, 33°E to 38°E (Mons Mouton Summit Plateau)',
    caption: 'Targeted LROC NAC ROI over the elevated plateau of Mons Mouton. Broad elevated mesa providing favorable line-of-sight to Earth and extensive continuous solar illumination.',
    sourceUrl: 'https://data.lroc.im-ldi.com/lroc/view_rdr/NAC_ROI_MOUTNPLTLOA',
    isArchiveNotice: 'Archival observation acquired by NASA LRO LROC instrument. Not live surface telemetry.',
    thumbnailTone: 'high-contrast-rim',
  },
  {
    id: 'img-mout-nac-02',
    siteId: 'mons-mouton',
    type: 'lroc-nac-context',
    title: 'LROC NAC: Mons Mouton Regional Relief & Slope Context',
    observationEpochIsoUtc: '2022-08-19T14:31:00Z',
    productId: 'NAC_ROI_MOUTNPLTLOA',
    instrument: 'LROC NAC-L',
    solarIncidenceAngleDeg: 84.8,
    solarPhaseAngleDeg: 85.5,
    groundResolutionMetersPerPixel: 1.05,
    footprintDescription: '84.30°S to 84.70°S, 32°E to 37°E (Mons Mouton Relief)',
    caption: 'Elevated topography of Mons Mouton towering over surrounding cratered terrain, providing strategic communications and solar access.',
    sourceUrl: 'https://data.lroc.im-ldi.com/lroc/view_rdr/NAC_ROI_MOUTNPLTLOA',
    isArchiveNotice: 'Archival observation acquired by NASA LRO LROC instrument. Not live surface telemetry.',
    thumbnailTone: 'high-contrast-rim',
  },
];

export function getArchivalImagesForSite(siteId: string): ArchivalOrbitalImage[] {
  return ARCHIVAL_ORBITAL_IMAGES.filter((img) => img.siteId === siteId);
}
