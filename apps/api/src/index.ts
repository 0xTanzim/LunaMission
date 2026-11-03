import { createHandler } from '@nextrush/adapter-bun';
import { createServerApp } from '@server/app';
import { SERVER_CONFIG } from '@server/config/serverConfig';

const app = createServerApp();
const handler = createHandler(app);
const dummyServer = {} as unknown as Parameters<typeof handler>[1];

// Vercel Serverless Function exports
export default {
  fetch(request: Request): Response | Promise<Response> {
    return handler(request, dummyServer);
  },
};

export async function GET(request: Request): Promise<Response> {
  return handler(request, dummyServer);
}
export async function POST(request: Request): Promise<Response> {
  return handler(request, dummyServer);
}
export async function PUT(request: Request): Promise<Response> {
  return handler(request, dummyServer);
}
export async function DELETE(request: Request): Promise<Response> {
  return handler(request, dummyServer);
}
export async function OPTIONS(request: Request): Promise<Response> {
  return handler(request, dummyServer);
}

// Standalone CLI / Docker runtime (starts persistent HTTP server when NOT on Vercel)
if (!process.env.VERCEL && typeof Bun !== 'undefined') {
  const { serve } = await import('@nextrush/adapter-bun');
  const server = await serve(app, {
    port: SERVER_CONFIG.port,
    maxRequestBodySize: SERVER_CONFIG.maxRequestBodyBytes,
    onListen: ({ port, host }) => {
      console.log(`🚀 LunaMission NextRush calculation service listening on http://${host || 'localhost'}:${port}`);
      console.log(`📡 Endpoints active: /api/health, /api/ephemeris/conditions, /api/telecom/link-budget`);
    },
  });

  const shutdown = () => {
    console.log('\n🛑 Gracefully draining connections and terminating NextRush server...');
    server.close();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}
