import { createServerApp } from '../../app';
import { createHandler } from '@nextrush/adapter-bun';

const app = createServerApp();
const handler = createHandler(app);
const dummyServer = {} as unknown as Parameters<typeof handler>[1];

type HandlerFn = (req: Request, s?: unknown) => Promise<Response>;
const invoke: HandlerFn = handler as unknown as HandlerFn;

export async function GET(request: Request): Promise<Response> {
  return invoke(request, dummyServer);
}
export async function POST(request: Request): Promise<Response> {
  return invoke(request, dummyServer);
}
export async function PUT(request: Request): Promise<Response> {
  return invoke(request, dummyServer);
}
export async function DELETE(request: Request): Promise<Response> {
  return invoke(request, dummyServer);
}
export async function OPTIONS(request: Request): Promise<Response> {
  return invoke(request, dummyServer);
}
