import { IncomingMessage, ServerResponse } from 'node:http';
import { Readable } from 'node:stream';
import { createHandler } from '@nextrush/adapter-bun';
import { createServerApp } from '@server/app';
import { SERVER_CONFIG } from '@server/config/serverConfig';

const app = createServerApp();
const nextrushHandler = createHandler(app);
const dummyServer = {} as unknown as Parameters<typeof nextrushHandler>[1];

function handleWebRequest(request: Request): Response | Promise<Response> {
  return nextrushHandler(request, dummyServer);
}

async function handleNodeRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
  try {
    const protocol = (req.headers['x-forwarded-proto'] as string) || 'https';
    const host = (req.headers['x-forwarded-host'] as string) || req.headers.host || 'localhost';
    const url = new URL(req.url || '/', `${protocol}://${host}`);

    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (value !== undefined) {
        if (Array.isArray(value)) {
          for (const v of value) headers.append(key, v);
        } else {
          headers.set(key, value);
        }
      }
    }

    const init: RequestInit = {
      method: req.method || 'GET',
      headers,
    };

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      init.body = Readable.toWeb(req) as unknown as BodyInit;
      // @ts-ignore
      init.duplex = 'half';
    }

    const webRequest = new Request(url, init);
    const webResponse = await nextrushHandler(webRequest, dummyServer);

    res.statusCode = webResponse.status;
    res.statusMessage = webResponse.statusText;
    webResponse.headers.forEach((val, key) => {
      res.setHeader(key, val);
    });

    if (webResponse.body) {
      const reader = webResponse.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(value);
      }
    }
    res.end();
  } catch (err) {
    console.error('Server error in handleNodeRequest:', err);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({ error: 'Internal Server Error', message: String(err) }));
    }
  }
}

// Universal handler supporting both Vercel Web Fetch and Node (req, res) invocations
function universalHandler(arg1: any, arg2?: any): any {
  if (arg2 && typeof arg2.setHeader === 'function') {
    return handleNodeRequest(arg1, arg2);
  }
  return handleWebRequest(arg1);
}

universalHandler.fetch = handleWebRequest;

export default universalHandler;
export { handleWebRequest as fetch };

export async function GET(request: Request): Promise<Response> {
  return handleWebRequest(request);
}
export async function POST(request: Request): Promise<Response> {
  return handleWebRequest(request);
}
export async function PUT(request: Request): Promise<Response> {
  return handleWebRequest(request);
}
export async function DELETE(request: Request): Promise<Response> {
  return handleWebRequest(request);
}
export async function OPTIONS(request: Request): Promise<Response> {
  return handleWebRequest(request);
}

// Standalone CLI / Docker runtime (starts persistent HTTP server when NOT on Vercel)
if (!process.env.VERCEL) {
  if (typeof Bun !== 'undefined') {
    import('@nextrush/adapter-bun').then(({ serve }) => {
      serve(app, {
        port: SERVER_CONFIG.port,
        maxRequestBodySize: SERVER_CONFIG.maxRequestBodyBytes,
        onListen: ({ port, host }) => {
          console.log(`🚀 LunaMission NextRush service listening on http://${host || 'localhost'}:${port}`);
        },
      }).catch((err) => console.error('Failed to start Bun server:', err));
    });
  } else {
    import('node:http').then(({ createServer }) => {
      const server = createServer(handleNodeRequest);
      const port = process.env.PORT ? parseInt(process.env.PORT, 10) : SERVER_CONFIG.port;
      server.listen(port, () => {
        console.log(`🚀 LunaMission NextRush service listening on http://localhost:${port} (Node)`);
      });
    });
  }
}
