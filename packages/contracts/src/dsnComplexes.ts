import { z } from 'zod';

export const dsnComplexSchema = z.object({
  id: z.enum(['goldstone', 'madrid', 'canberra']),
  name: z.string(),
  country: z.string(),
  latitudeDeg: z.number(),
  longitudeDeg: z.number(),
  primary70mDish: z.string(),
});

export type DsnComplex = z.infer<typeof dsnComplexSchema>;

export const DSN_COMPLEXES: DsnComplex[] = [
  {
    id: 'goldstone',
    name: 'Goldstone Deep Space Communications Complex',
    country: 'United States (California)',
    latitudeDeg: 35.4266,
    longitudeDeg: -116.89,
    primary70mDish: 'DSS-14 (Mars antenna)',
  },
  {
    id: 'madrid',
    name: 'Madrid Deep Space Communications Complex',
    country: 'Spain (Robledo de Chavela)',
    latitudeDeg: 40.4273,
    longitudeDeg: -4.2497,
    primary70mDish: 'DSS-63 (70m)',
  },
  {
    id: 'canberra',
    name: 'Canberra Deep Space Communication Complex',
    country: 'Australia (Tidbinbilla)',
    latitudeDeg: -35.4014,
    longitudeDeg: 148.9817,
    primary70mDish: 'DSS-43 (Southern Hemisphere 70m)',
  },
];
