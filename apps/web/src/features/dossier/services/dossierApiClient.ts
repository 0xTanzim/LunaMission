/**
 * Executive Mission Dossier Client Adapter
 *
 * Communicates with the NextRush calculation microservice (POST /api/dossier/generate).
 * Zero local analytical fallbacks or synthetic physics fabrication.
 */

import type { DossierInput, MissionDossier } from '@luna/contracts';

export interface DossierProvenance {
  generator: string;
  runtime: string;
  generatedAt: string;
  source: 'nextrush_server';
}

export interface DossierApiResponse {
  dossier: MissionDossier;
  markdown: string;
  jsonTelemetry: string;
  provenance: DossierProvenance;
}

const DEFAULT_BASE_URL = typeof window !== 'undefined' ? '/api' : 'http://localhost:3001/api';
const TIMEOUT_MS = 3000;

export async function requestMissionDossier(
  input: DossierInput,
  baseUrl = DEFAULT_BASE_URL,
): Promise<DossierApiResponse> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(`${baseUrl}/dossier/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(input),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`NextRush API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    if (data && data.dossier && data.markdown) {
      return {
        dossier: data.dossier,
        markdown: data.markdown,
        jsonTelemetry: data.jsonTelemetry,
        provenance: {
          ...data.provenance,
          source: 'nextrush_server',
        },
      };
    }

    throw new Error('Malformed dossier payload from server');
  } finally {
    clearTimeout(timer);
  }
}
