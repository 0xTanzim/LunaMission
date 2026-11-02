declare module 'bun:test' {
  export const test: any;
  export const expect: any;
  export const describe: any;
  export const beforeAll: any;
  export const afterAll: any;
  export const beforeEach: any;
  export const afterEach: any;
}

declare module '*.css' {
  const content: Record<string, string>;
  export default content;
}
