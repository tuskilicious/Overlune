// The project has no @types/node (see tests/e2e/starting.visual.spec.ts). vite.config.ts and one unit test
// read public/_headers at build/test time, so declare just what they use.
declare module "node:fs" {
  export function readFileSync(path: string, encoding: "utf8"): string;
  /** Raw bytes (e2e: reading a downloaded PNG's size, T6.91). */
  export function readFileSync(path: string): Uint8Array;
  /** The live channel's test makes sure dist/ exists for the Worker's static files (T12.3). */
  export function mkdirSync(path: string, options: { recursive: true }): string | undefined;
}
