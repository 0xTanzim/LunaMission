import type { TopocentricEphemerisPoint } from '@luna/contracts';

export interface ColumnIndexMap {
  date: number;
  azimuth: number;
  elevation: number;
  azimuthRate: number;
  elevationRate: number;
  angularDiameter: number;
  range: number;
  rangeRate: number;
}

const REQUIRED_COLUMN_PATTERNS: Record<keyof ColumnIndexMap, RegExp> = {
  date: /date/i,
  azimuth: /^azi/i,
  elevation: /^elev/i,
  azimuthRate: /daz.*cose/i,
  elevationRate: /d\(?elv?\)?\/dt/i,
  angularDiameter: /ang[-_]?diam/i,
  range: /^delta$/i,
  rangeRate: /^deldot$/i,
};

export function parseHorizonsCsvResponse(rawText: string): TopocentricEphemerisPoint[] {
  const soeIdx = rawText.indexOf('$$SOE');
  const eoeIdx = rawText.indexOf('$$EOE');
  if (soeIdx === -1 || eoeIdx === -1 || eoeIdx <= soeIdx) {
    throw new Error('Malformed Horizons response: Missing $$SOE or $$EOE delimiters');
  }

  const preSoeText = rawText.substring(0, soeIdx).trimEnd();
  const headerLines = preSoeText.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
  let headerLine = '';
  for (let i = headerLines.length - 1; i >= 0; i--) {
    const candidate = headerLines[i];
    if (!candidate.startsWith('*') && candidate.includes(',')) {
      headerLine = candidate;
      break;
    }
  }
  if (!headerLine) {
    throw new Error('Malformed Horizons response: Missing column header line preceding $$SOE');
  }

  const headerTokens = headerLine.split(',').map((t) => t.trim());
  const colMap: Partial<ColumnIndexMap> = {};

  for (const [key, pattern] of Object.entries(REQUIRED_COLUMN_PATTERNS) as [keyof ColumnIndexMap, RegExp][]) {
    const idx = headerTokens.findIndex((tok) => pattern.test(tok));
    if (idx === -1) {
      throw new Error(`Missing required column "${key}" in Horizons header: "${headerLine}"`);
    }
    colMap[key] = idx;
  }
  const resolvedMap = colMap as ColumnIndexMap;

  const dataBlock = rawText.substring(soeIdx + 5, eoeIdx).trim();
  if (!dataBlock) return [];

  const points: TopocentricEphemerisPoint[] = [];
  const lines = dataBlock.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);

  for (const line of lines) {
    const cols = line.split(',').map((c) => c.trim());
    const dateStr = cols[resolvedMap.date];
    const azDeg = parseFloat(cols[resolvedMap.azimuth]);
    const elDeg = parseFloat(cols[resolvedMap.elevation]);
    const dAzCosE = parseFloat(cols[resolvedMap.azimuthRate]);
    const dElDt = parseFloat(cols[resolvedMap.elevationRate]);
    const angDiam = parseFloat(cols[resolvedMap.angularDiameter]);
    const deltaKm = parseFloat(cols[resolvedMap.range]);
    const deldotKmS = parseFloat(cols[resolvedMap.rangeRate]);

    if (!Number.isFinite(azDeg) || !Number.isFinite(elDeg)) continue;

    const elRad = elDeg * (Math.PI / 180.0);
    const cosEl = Math.max(1e-6, Math.cos(elRad)); // Protect against zero division near zenith
    const elevationRateDegHr = dElDt / 60.0;
    const azimuthRateDegHr = dAzCosE / (60.0 * cosEl);
    const angularRadiusDeg = angDiam / 7200.0; // Equatorial radius in degrees

    // Parse dateStr (e.g., '2026-May-15 12:00') into epochMs
    const parsedEpochMs = Date.parse(`${dateStr.trim()} UTC`);
    const epochMs = Number.isFinite(parsedEpochMs) ? parsedEpochMs : Date.now();

    points.push({
      timestampUtc: dateStr,
      epochMs,
      azimuthDeg: ((azDeg % 360) + 360) % 360,
      elevationDeg: elDeg,
      azimuthRateDegHr,
      elevationRateDegHr,
      angularRadiusDeg,
      rangeKm: deltaKm,
      rangeRateKmS: deldotKmS,
    });
  }

  return points;
}

export function verifyEchoedHeader(
  rawText: string,
  expectedLonDeg: number,
  expectedLatDeg: number,
  expectedAltKm: number,
  tolerance = 0.05,
): boolean {
  const match = rawText.match(/Center geodetic\s*:\s*([^,{}\n]+),\s*([^,{}\n]+),\s*([^,{}\n]+)/i);
  if (!match) return false;

  const echoedLon = parseFloat(match[1]);
  const echoedLat = parseFloat(match[2]);
  const echoedAlt = parseFloat(match[3]);

  if (!Number.isFinite(echoedLon) || !Number.isFinite(echoedLat) || !Number.isFinite(echoedAlt)) {
    return false;
  }

  const dLon = Math.abs(echoedLon - expectedLonDeg);
  const dLat = Math.abs(echoedLat - expectedLatDeg);
  const dAlt = Math.abs(echoedAlt - expectedAltKm);

  return dLon <= tolerance && dLat <= tolerance && dAlt <= tolerance;
}
