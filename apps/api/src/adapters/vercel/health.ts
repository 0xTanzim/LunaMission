import { createServerApp } from '../../app';
import { createHandler } from '@nextrush/adapter-bun';

const app = createServerApp();
const handler = createHandler(app);
const dummyServer = {} as unknown as Parameters<typeof handler>[1];

export async function GET(request: Request): Promise<Response> {
  return (handler as unknown as (req: Request, s?: unknown) => Promise<Response>)(request, dummyServer);
}
