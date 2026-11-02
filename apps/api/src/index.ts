import { serve } from '@nextrush/adapter-bun';
import { createServerApp } from '@server/app';
import { SERVER_CONFIG } from '@server/config/serverConfig';

const app = createServerApp();

const server = await serve(app, {
  port: SERVER_CONFIG.port,
  maxRequestBodySize: SERVER_CONFIG.maxRequestBodyBytes,
  onListen: ({ port, host }) => {
    console.log(`🚀 LunaMission NextRush calculation service listening on http://${host || 'localhost'}:${port}`);
    console.log(`📡 Endpoints active: /api/health, /api/ephemeris/conditions, /api/telecom/link-budget`);
  },
});

// Graceful OS signal termination
function shutdown() {
  console.log('\n🛑 Gracefully draining connections and terminating NextRush server...');
  server.close();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
