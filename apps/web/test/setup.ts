import { registerDynamicSites } from '@/domain/sites/catalog';
import { CANDIDATE_SITES } from '@luna/contracts';

// Preload test fixtures into the dynamic in-memory catalog for unit tests
registerDynamicSites(CANDIDATE_SITES);
