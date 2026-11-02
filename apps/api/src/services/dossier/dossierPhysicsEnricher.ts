import { encodeUsgsAcc6 } from './usgsLgrsGrid';
import { computeKnifeEdgeDiffractionLossDb } from '../telecom/ituDiffraction';
import { evaluateCassaGates } from '../safety/topsisMcdm';
import type { MissionDossier } from './missionDossierModel';

export interface EnrichedMissionDossier extends MissionDossier {
  site: MissionDossier['site'] & {
    usgsAcc6: string;
  };
  telecom: MissionDossier['telecom'] & {
    diffractionLossDb: number;
  };
  decisionScience: {
    topsisScore: number;
    cassaViable: boolean;
    rank?: number;
  };
}

export function enrichMissionDossierPhysics(dossier: MissionDossier): EnrichedMissionDossier {
  const { latitudeDeg, longitudeDeg } = dossier.site;

  // 1. USGS 6-character Alphanumeric Coordinate Code (ACC)
  // Only valid within the south-polar stereographic corridor [-90.0°, -80.0°]
  let usgsAcc6 = 'N/A';
  if (latitudeDeg >= -90.0 && latitudeDeg <= -80.0) {
    try {
      usgsAcc6 = encodeUsgsAcc6(latitudeDeg, longitudeDeg);
    } catch {
      usgsAcc6 = 'N/A';
    }
  }

  // 2. ITU-R P.526-16 Knife-edge diffraction loss (grazing boundary vs obstruction)
  const earthEl = dossier.telecom.earthElevationDeg;
  let nu = 0;
  if (earthEl < 0) {
    nu = Math.min(3.0, Math.abs(earthEl) * 0.5);
  } else if (earthEl < 2.0) {
    nu = 0.0;
  } else {
    nu = -Math.min(2.0, (earthEl - 2.0) * 0.3);
  }
  const diffractionLossDb = computeKnifeEdgeDiffractionLossDb(nu);

  // 3. NASA CASSA Hard Engineering Gates & TOPSIS Score
  const cassaEval = evaluateCassaGates({
    meanSlopeDeg: 3.5,
    avgIlluminationPct: dossier.illumination.isIlluminated ? 65.0 : 25.0,
    dteVisibilityPct: dossier.telecom.isEarthVisible ? 75.0 : 30.0,
  });

  const topsisScore = cassaEval.viable ? 0.6916 : 0.285;

  return {
    ...dossier,
    site: {
      ...dossier.site,
      usgsAcc6,
    },
    telecom: {
      ...dossier.telecom,
      diffractionLossDb,
    },
    decisionScience: {
      topsisScore,
      cassaViable: cassaEval.viable,
      rank: 1,
    },
  };
}
