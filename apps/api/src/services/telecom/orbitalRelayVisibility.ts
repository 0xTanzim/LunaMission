/**
 * Orbital relay visibility — explicitly UNSUPPORTED in this repository.
 *
 * Relay access is a different observable from direct-to-Earth geometry: it needs the relay
 * spacecraft's own state (an orbit-determination solution or trajectory/ephemeris kernel plus
 * its frame and epoch), the vehicle→relay→ground geometry, and the relay's transponder /
 * pointing / scheduling model. None of those products exists in this repository: the only
 * ephemeris source present is the JPL Horizons topocentric adapter for the Sun and Earth as
 * seen from a lunar surface site.
 *
 * Therefore this module returns an explicit `unsupported` result that names the missing
 * product, and it emits **no pass windows at all** (`passWindows: null`). Synthesising
 * plausible-looking pass times from an assumed circular orbit, an assumed period, or a
 * nominal LRO repeat cycle would be fabrication — the mission planner would have no way to
 * tell an invented pass from a computed one.
 *
 * If a relay state/ephemeris product is ever added, this module must be replaced by a real
 * visibility solver (Rolle's-theorem event splitting against the relay trajectory), not
 * patched to return estimates.
 */

import { z } from 'zod';

/** Relays referenced by Plan.md § 5 Pillar B.5. Membership here implies no data availability. */
export const orbitalRelayIdEnum = z.enum(['lro', 'lunarPathfinder']);
export type OrbitalRelayId = z.infer<typeof orbitalRelayIdEnum>;

export const orbitalRelayVisibilityRequestSchema = z
  .object({
    siteId: z.string().min(1, 'siteId is required'),
    /** Free-form so an unregistered relay produces an explicit, named refusal. */
    relayId: z.string().min(1, 'relayId is required'),
    startEpochMs: z.number().finite(),
    endEpochMs: z.number().finite(),
  })
  .refine((request) => request.endEpochMs > request.startEpochMs, {
    message: 'endEpochMs must be strictly greater than startEpochMs',
    path: ['endEpochMs'],
  });
export type OrbitalRelayVisibilityRequest = z.infer<typeof orbitalRelayVisibilityRequestSchema>;

export interface MissingRelayProduct {
  /** Stable identifier of the absent data product. */
  productId: string;
  description: string;
  /** Inputs a real relay solver would require before any pass time could be computed. */
  requiredInputs: string[];
}

export type OrbitalRelayUnsupportedReasonCode =
  | 'missing_relay_state_ephemeris'
  | 'unknown_relay_id';

export interface OrbitalRelayVisibilityResult {
  status: 'unsupported';
  /** States the observable that was refused, so it cannot be mistaken for DTE geometry. */
  observable: 'orbital_relay_physical_visibility';
  label: string;
  siteId: string;
  relayId: string;
  reasonCode: OrbitalRelayUnsupportedReasonCode;
  /** Human-readable reason, including the product required to close the gap. */
  reason: string;
  missingProduct: MissingRelayProduct;
  /** Null by design: no placeholder, synthetic or nominal pass times are ever emitted. */
  passWindows: null;
  passWindowCount: null;
  nextPassEpochMs: null;
  caveats: string[];
}

interface RelayCatalogueEntry {
  relayId: OrbitalRelayId;
  displayName: string;
  missingProduct: MissingRelayProduct;
}

const REQUIRED_RELAY_INPUTS: string[] = [
  'Relay trajectory state: orbit-determination state vectors or an SPK/SPICE kernel with its epoch and reference frame (MOON_ME vs MOON_PA must be resolved explicitly).',
  'Relay attitude / antenna field-of-regard model, including any gimbal or body-occlusion limits.',
  'Vehicle-to-relay and relay-to-ground link parameters (band, transmit power, antenna gain, data rate) for a link-budget assessment.',
  'Relay service schedule or ground-segment allocation, since physical relay visibility is not equivalent to allocated relay availability.',
];

export const ORBITAL_RELAY_CATALOGUE: readonly RelayCatalogueEntry[] = [
  {
    relayId: 'lro',
    displayName: 'Lunar Reconnaissance Orbiter (LRO)',
    missingProduct: {
      productId: 'lro-state-ephemeris',
      description:
        'No LRO trajectory/state product is present in this repository. The ephemeris source ' +
        'register contains only topocentric Sun/Earth products from JPL Horizons for a lunar ' +
        'surface site, so LRO position relative to a surface site at a given epoch is unknown.',
      requiredInputs: REQUIRED_RELAY_INPUTS,
    },
  },
  {
    relayId: 'lunarPathfinder',
    displayName: 'ESA Lunar Pathfinder',
    missingProduct: {
      productId: 'lunar-pathfinder-state-ephemeris',
      description:
        'No ESA Lunar Pathfinder trajectory/state product is present in this repository, so ' +
        'its position relative to a lunar surface site at a given epoch is unknown.',
      requiredInputs: REQUIRED_RELAY_INPUTS,
    },
  },
];

const UNREGISTERED_RELAY_PRODUCT: MissingRelayProduct = {
  productId: 'orbital-relay-state-ephemeris',
  description:
    'The requested relay is not in the known relay catalogue and no relay state/ephemeris ' +
    'product is present in this repository, so no relay geometry can be evaluated.',
  requiredInputs: REQUIRED_RELAY_INPUTS,
};

export const RELAY_VISIBILITY_CAVEATS: readonly string[] = [
  'Relay access does not inherit direct-to-Earth geometry: it depends on the relay orbit and ' +
    'the joint vehicle–relay–ground geometry, neither of which is computed here.',
  'No pass windows, pass durations or next-pass epochs are returned. Absent relay data is ' +
    'reported as `unsupported`, never as zero passes or as a nominal repeat cycle.',
  'Physical relay visibility is not the same as link closure; a relay link budget would need ' +
    'the relay transponder and antenna parameters in addition to geometry.',
];

/**
 * Returns an explicit `unsupported` relay-visibility result naming the missing data product.
 * Never throws for a well-formed request; a malformed request raises a `ZodError`.
 */
export function evaluateOrbitalRelayVisibility(
  request: OrbitalRelayVisibilityRequest,
): OrbitalRelayVisibilityResult {
  const parsed = orbitalRelayVisibilityRequestSchema.parse(request);
  const relayIdNormalized = parsed.relayId.trim().toLowerCase();
  const entry = ORBITAL_RELAY_CATALOGUE.find(
    (candidate) => candidate.relayId.toLowerCase() === relayIdNormalized,
  );

  const isKnown = entry !== undefined;
  const missingProduct = entry ? entry.missingProduct : UNREGISTERED_RELAY_PRODUCT;
  const reasonCode: OrbitalRelayUnsupportedReasonCode = isKnown
    ? 'missing_relay_state_ephemeris'
    : 'unknown_relay_id';
  const relayName = entry ? entry.displayName : `relay "${parsed.relayId}"`;

  return {
    status: 'unsupported',
    observable: 'orbital_relay_physical_visibility',
    label: 'Orbital relay visibility — unsupported: relay state/ephemeris product is missing',
    siteId: parsed.siteId,
    relayId: parsed.relayId,
    reasonCode,
    reason:
      `Cannot evaluate ${relayName} visibility for site "${parsed.siteId}" over ` +
      `${new Date(parsed.startEpochMs).toISOString()} .. ` +
      `${new Date(parsed.endEpochMs).toISOString()}: required product ` +
      `"${missingProduct.productId}" is not available. ${missingProduct.description}`,
    missingProduct,
    passWindows: null,
    passWindowCount: null,
    nextPassEpochMs: null,
    caveats: [...RELAY_VISIBILITY_CAVEATS],
  };
}
