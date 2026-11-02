import { createServerApp } from '../../app';
import { createHandler } from '@nextrush/adapter-bun';

const app = createServerApp();
const handler = createHandler(app);

// Mock Bun server object for Vercel serverless environment
const dummyServer = {} as unknown as Parameters<typeof handler>[1];

export async function GET(request: Request): Promise<Response> {
  return (handler as unknown as (req: Request, s?: unknown) => Promise<Response>)(request, dummyServer);
}

export async function POST(request: Request): Promise<Response> {
  return (handler as unknown as (req: Request, s?: unknown) => Promise<Response>)(request, dummyServer);
}

export async function PUT(request: Request): Promise<Response> {
  return (handler as unknown as (req: Request, s?: unknown) => Promise<Response>)(request, dummyServer);
}

export async function DELETE(request: Request): Promise<Response> {
  return (handler as unknown as (req: Request, s?: unknown) => Promise<Response>)(request, dummyServer);
}

export async function OPTIONS(request: Request): Promise<Response> {
  return (handler as unknown as (req: Request, s?: unknown) => Promise<Response>)(request, dummyServer);
}
