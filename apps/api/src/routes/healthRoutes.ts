import { createRouter } from '@nextrush/router';

export function createHealthRouter() {
  const router = createRouter();

  router.get('/health', (ctx) => {
    ctx.json({
      status: 'online',
      service: 'LunaMission Calculation Microservice',
      framework: 'NextRush',
      runtime: 'Bun',
      version: '1.0.0',
      uptimeSeconds: Math.round(process.uptime()),
      epoch: new Date().toISOString(),
      capabilities: [
        'lunar_ephemeris_analytical',
        'lola_dem_terrain_horizon',
        'dsn_rf_link_budget',
        'ground_station_handover_tracking',
      ],
    });
  });

  return router;
}
