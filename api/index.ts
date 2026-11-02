import { createHandler } from '@nextrush/adapter-bun';
import { createServerApp } from '@server/app';

const app = createServerApp();
const handler = createHandler(app);

export default {
  fetch: handler,
};
