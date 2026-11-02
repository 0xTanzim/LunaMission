import type { TopocentricTrajectory } from '@luna/contracts';
import { formatHorizonsDateUtc } from '../utils/timeUtils';
export { LUNAR_SPHERE_RADIUS_METERS, computeObserverRadiusMeters, computeLocalEnuAngles, type LocalEnuAngles } from './enuGeometry';
import { horizonsClient as defaultHorizonsClient, HorizonsClient } from './horizonsClient';

/**
 * Standard IAU Lunar Reference Sphere Radius (MOON_ME datum).
 * R_MOON = 1,737,400.0 meters. (Flattening f = 0.0).
 */
export interface TopocentricTrajectoryQuery {
  target: 'Sun' | 'Earth';
  latitudeDeg: number;
  longitudeDeg: number;
  elevationMeters: number;
  mastHeightMeters?: number;
  startTime: Date;
  stopTime: Date;
  stepSize?: string;
  siteId?: string;
}

export interface DualEphemerisQuery {
  latitudeDeg: number;
  longitudeDeg: number;
  elevationMeters: number;
  mastHeightMeters?: number;
  startTime: Date;
  stopTime: Date;
  stepSize?: string;
  siteId?: string;
}

export class TopocentricEphemerisService {
  private client: HorizonsClient;

  constructor(client: HorizonsClient = defaultHorizonsClient) {
    this.client = client;
  }

  /**
   * Retrieves high-precision topocentric ephemeris trajectory for a celestial target.
   */
  async getTopocentricTrajectory(query: TopocentricTrajectoryQuery): Promise<TopocentricTrajectory> {
    const targetCommand = query.target === 'Sun' ? '10' : '399';
    const mastHeightMeters = query.mastHeightMeters ?? 2.0;

    const startTimeUtc = formatHorizonsDateUtc(query.startTime);
    const stopTimeUtc = formatHorizonsDateUtc(query.stopTime);

    return this.client.queryTrajectory({
      targetCommand,
      latitudeDeg: query.latitudeDeg,
      longitudeDeg: query.longitudeDeg,
      elevationMeters: query.elevationMeters,
      mastHeightMeters,
      startTimeUtc,
      stopTimeUtc,
      stepSize: query.stepSize ?? '10m',
      siteId: query.siteId,
    });
  }

  /**
   * Concurrently queries topocentric trajectories for both Sun and Earth.
   */
  async getDualTopocentricTrajectories(query: DualEphemerisQuery): Promise<{
    sun: TopocentricTrajectory;
    earth: TopocentricTrajectory;
  }> {
    const [sun, earth] = await Promise.all([
      this.getTopocentricTrajectory({ ...query, target: 'Sun' }),
      this.getTopocentricTrajectory({ ...query, target: 'Earth' }),
    ]);

    return { sun, earth };
  }
}

export const topocentricEphemerisService = new TopocentricEphemerisService();
