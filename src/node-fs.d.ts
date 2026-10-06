// The project has no @types/node (see tests/e2e/starting.visual.spec.ts). vite.config.ts and one unit test
// read public/_headers at build/test time, so declare just that one function.
declare module "node:fs" {
  export function readFileSync(path: string, encoding: "utf8"): string;
  /** Raw bytes (e2e: reading a downloaded PNG's size, T6.91). */
  export function readFileSync(path: string): Uint8Array;
}
