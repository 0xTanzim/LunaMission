/**
 * One display name per site on the comparison surface.
 *
 * The site registry spells this summit `Malapert Mountain (Massif)` while the published
 * Artemis catalogue calls it `Malapert Massif`. A cohort chip, the picker option that adds
 * the site, the ranked row and the evidence trace must not read as different sites, so every
 * name the comparison surface renders goes through this table.
 *
 * The catalogue strings themselves are untouched — this only decides what the comparison
 * surface shows. Renaming a site at its source turns its row here into a no-op.
 */
const DISPLAY_NAME_BY_KNOWN_NAME: Readonly<Record<string, string>> = {
  'Malapert Mountain (Massif)': 'Malapert Mountain',
  'Malapert Massif': 'Malapert Mountain',
};

export function siteDisplayName(name: string | null | undefined, fallback: string): string {
  if (name === null || name === undefined || name.trim() === '') return fallback;
  return DISPLAY_NAME_BY_KNOWN_NAME[name] ?? name;
}
