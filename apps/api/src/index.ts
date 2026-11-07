import { createServerApp } from '@server/app';
import { SERVER_CONFIG } from '@server/config/serverConfig';
import { createVercelHandler, listenIfStandalone } from '@nextrush/adapter-serverless';

const app = createServerApp();

const handler = createVercelHandler(app);

// Universal default export (handles Web Request, Vercel Edge, and Node req/res)
export default handler;

// Named route handler exports for Vercel Web Route Handlers
export const { GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS, fetch } = handler;

// Standalone runner (starts HTTP server when NOT on Vercel)
listenIfStandalone(handler, {
  port: SERVER_CONFIG.port,
  onListen: ({ port, host }) => {
    console.log(`🚀 LunaMission NextRush service listening on http://${host || 'localhost'}:${port}`);
  },
});
