/**
 * Public surface of the passport feature.
 *
 * Other features import from here and nowhere else (see the feature-boundary rule in
 * `domain/__tests__/domainBoundaries.test.ts`). The spatial workspace docks the same passport
 * sections the standalone Point Passport renders, so those four are re-exported rather than
 * reached into — reaching into `components/summary/*` would let one feature depend on another
 * feature's internal layout.
 */

export { PointPassport, type PointPassportProps } from './PointPassport';
export { LocalSkyInspectorModal } from './LocalSkyInspectorModal';

export { PassportCalculationModeSwitch } from '../components/summary/PassportCalculationModeSwitch';
export { PassportSiteHeader } from '../components/summary/PassportSiteHeader';
export { PassportSunSection } from '../components/summary/PassportSunSection';
export { PassportEarthSection } from '../components/summary/PassportEarthSection';
export { PassportHorizonSummary } from '../components/summary/PassportHorizonSummary';
