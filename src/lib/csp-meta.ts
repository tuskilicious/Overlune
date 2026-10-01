/**
 * The CSP from public/_headers, made fit for a <meta> tag. Hosts that ignore _headers (Antideploy)
 * still get the policy this way. frame-ancestors is dropped: browsers ignore it in a meta tag and
 * log a warning. Used by vite.config.ts at build time only.
 */
export function cspForMeta(headersFile: string): string {
  const line = headersFile.split("\n").find((l) => /^\s*Content-Security-Policy:/i.test(l));
  if (!line) throw new Error("public/_headers has no Content-Security-Policy line");
  return line
    .slice(line.indexOf(":") + 1)
    .split(";")
    .map((d) => d.trim())
    .filter((d) => d && !/^frame-ancestors\b/i.test(d))
    .join("; ");
}
