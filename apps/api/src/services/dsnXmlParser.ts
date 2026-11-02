/**
 * Pure TypeScript NASA DSN XML Feed Parser
 *
 * Parses the raw NASA Deep Space Network (DSN) live XML feed (https://eyes.nasa.gov/dsn/data/dsn.xml)
 * with zero external dependencies and zero npm packages.
 *
 * Handles XML quirks:
 * 1. <station .../> self-closing sibling tags followed by <dish> tags
 * 2. dataRate="NaN" and non-numeric numbers
 * 3. Empty windSpeed="" attributes
 * 4. Negative spacecraft IDs and range indicators (-1)
 * 5. Multiple child <upSignal>, <downSignal>, and <target> elements
 */

export interface DsnParsedSignal {
  active: boolean;
  signalType: string;
  dataRateBps: number;
  frequencyHz: number;
  band: string;
  powerDbmOrKw: number;
  spacecraft: string;
  spacecraftId: string;
}

export interface DsnParsedTarget {
  name: string;
  id: string;
  uplegRangeKm: number;
  downlegRangeKm: number;
  roundTripLightTimeSec: number;
}

export interface DsnParsedDish {
  dishName: string;
  azimuthDeg: number;
  elevationDeg: number;
  windSpeedKmh: number | null;
  isMspa: boolean;
  isArray: boolean;
  isDdor: boolean;
  activity: string;
  upSignals: DsnParsedSignal[];
  downSignals: DsnParsedSignal[];
  targets: DsnParsedTarget[];
}

export interface DsnParsedStation {
  id: 'gdscc' | 'mdscc' | 'cdscc';
  friendlyName: string;
  timeUtcMs: number;
  timeZoneOffsetMs: number;
  dishes: DsnParsedDish[];
}

export interface DsnFeedSnapshot {
  timestampMs: number;
  stations: DsnParsedStation[];
}

function parseAttributes(attrStr: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const attrRegex = /([a-zA-Z0-9_]+)="([^"]*)"/g;
  let match: RegExpExecArray | null;
  while ((match = attrRegex.exec(attrStr)) !== null) {
    attrs[match[1]] = match[2];
  }
  return attrs;
}

function parseSignal(attrs: Record<string, string>): DsnParsedSignal {
  const numDataRate = Number(attrs.dataRate);
  const numFreq = Number(attrs.frequency);
  const numPower = Number(attrs.power);

  return {
    active: attrs.active === 'true',
    signalType: attrs.signalType || 'none',
    dataRateBps: Number.isFinite(numDataRate) ? numDataRate : 0,
    frequencyHz: Number.isFinite(numFreq) ? numFreq : 0,
    band: attrs.band || '',
    powerDbmOrKw: Number.isFinite(numPower) ? numPower : 0,
    spacecraft: attrs.spacecraft || '',
    spacecraftId: attrs.spacecraftID || attrs.spacecraftId || '',
  };
}

function parseTarget(attrs: Record<string, string>): DsnParsedTarget {
  const upleg = Number(attrs.uplegRange);
  const downleg = Number(attrs.downlegRange);
  const rtlt = Number(attrs.rtlt);

  return {
    name: attrs.name || '',
    id: attrs.id || '',
    uplegRangeKm: Number.isFinite(upleg) ? upleg : -1,
    downlegRangeKm: Number.isFinite(downleg) ? downleg : -1,
    roundTripLightTimeSec: Number.isFinite(rtlt) ? rtlt : -1,
  };
}

/**
 * Parses raw DSN XML document into a typed DsnFeedSnapshot.
 */
export function parseDsnXml(xml: string): DsnFeedSnapshot {
  if (!xml || typeof xml !== 'string' || !xml.includes('<')) {
    return { timestampMs: Date.now(), stations: [] };
  }

  const stations: DsnParsedStation[] = [];
  let currentStation: DsnParsedStation | null = null;
  let timestampMs = Date.now();

  const tsMatch = xml.match(/<timestamp>(\d+)<\/timestamp>/);
  if (tsMatch) {
    const parsedTs = Number(tsMatch[1]);
    if (Number.isFinite(parsedTs)) timestampMs = parsedTs;
  }

  // Matches either self-closing station or dish tag (with optional closing tag and inner content)
  const tagRegex = /<(station|dish)\s+([^>]*?)(?:\/>|>([\s\S]*?)<\/dish>)/g;
  let match: RegExpExecArray | null;

  while ((match = tagRegex.exec(xml)) !== null) {
    const tagName = match[1];
    const attrStr = match[2];
    const innerContent = match[3];
    const attrs = parseAttributes(attrStr);

    if (tagName === 'station') {
      const rawId = (attrs.name || 'gdscc').toLowerCase();
      const stationId: 'gdscc' | 'mdscc' | 'cdscc' =
        rawId === 'mdscc' ? 'mdscc' : rawId === 'cdscc' ? 'cdscc' : 'gdscc';

      currentStation = {
        id: stationId,
        friendlyName: attrs.friendlyName || attrs.name || stationId,
        timeUtcMs: Number(attrs.timeUTC) || timestampMs,
        timeZoneOffsetMs: Number(attrs.timeZoneOffset) || 0,
        dishes: [],
      };
      stations.push(currentStation);
    } else if (tagName === 'dish' && currentStation) {
      const upSignals: DsnParsedSignal[] = [];
      const downSignals: DsnParsedSignal[] = [];
      const targets: DsnParsedTarget[] = [];

      if (innerContent) {
        const childRegex = /<(upSignal|downSignal|target)\s+([^>]*?)\/>/g;
        let cm: RegExpExecArray | null;
        while ((cm = childRegex.exec(innerContent)) !== null) {
          const cType = cm[1];
          const cAttrs = parseAttributes(cm[2]);
          if (cType === 'upSignal') {
            upSignals.push(parseSignal(cAttrs));
          } else if (cType === 'downSignal') {
            downSignals.push(parseSignal(cAttrs));
          } else if (cType === 'target') {
            targets.push(parseTarget(cAttrs));
          }
        }
      }

      const numAz = Number(attrs.azimuthAngle);
      const numEl = Number(attrs.elevationAngle);
      const rawWind = attrs.windSpeed ? attrs.windSpeed.trim() : '';
      const numWind = rawWind !== '' && !isNaN(Number(rawWind)) ? Number(rawWind) : null;

      currentStation.dishes.push({
        dishName: attrs.name || '',
        azimuthDeg: Number.isFinite(numAz) ? numAz : 0,
        elevationDeg: Number.isFinite(numEl) ? numEl : 0,
        windSpeedKmh: numWind,
        isMspa: attrs.isMSPA === 'true',
        isArray: attrs.isArray === 'true',
        isDdor: attrs.isDDOR === 'true',
        activity: attrs.activity || 'Standby',
        upSignals,
        downSignals,
        targets,
      });
    }
  }

  return { timestampMs, stations };
}
