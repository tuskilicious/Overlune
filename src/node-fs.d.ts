// The project has no @types/node (see tests/e2e/starting.visual.spec.ts). vite.config.ts and one unit test
// read public/_headers at build/test time, so declare just that one function.
declare module "node:fs" {
  export function readFileSync(path: string, encoding: "utf8"): string;
}
