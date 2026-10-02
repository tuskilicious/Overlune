import { useRef, useState } from "react";
import { Link } from "react-router";
import type { Settings } from "../settings/schema";
import { encode } from "../settings/url";

/** The full-screen scenes, with the Browser Source size to enter in OBS. */
export const overlays = {
  starting: { name: "Starting Soon", width: 1920, height: 1080 },
  brb: { name: "Be Right Back", width: 1920, height: 1080 },
  ending: { name: "Stream Ending", width: 1920, height: 1080 },
} as const;

export type OverlayId = keyof typeof overlays;

export interface LinkInfo {
  id: string;
  name: string;
  width: number;
  height: number;
}

export function LinkRow({
  name,
  width,
  height,
  link,
  copiedLink,
  onCopied,
}: LinkInfo & {
  link: string;
  /** The version of this link last copied, if any (T6.24). */
  copiedLink?: string;
  onCopied?: (link: string) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState("");

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setStatus("Copied!");
      onCopied?.(link);
    } catch {
      input.current?.select();
      setStatus("Press Ctrl+C to copy");
    }
    setTimeout(() => setStatus(""), 3000);
  };

  return (
    <li className="editor-link">
      <label>
        {/* The size shows as chips (T6.60); the dots stay for screen readers and the guide's size table. */}
        <span>
          <strong>{name}</strong>
          <span className="editor-sep"> · </span>
          <span className="editor-chip">
            Width <strong>{width}</strong>
          </span>
          <span className="editor-sep"> · </span>
          <span className="editor-chip">
            Height <strong>{height}</strong>
          </span>
        </span>
        <input ref={input} readOnly value={link} onFocus={(e) => e.target.select()} />
      </label>
      {/* A link carries the settings, so after an edit the copy in OBS is out of date. */}
      {copiedLink === link ? (
        <span className="editor-link-done">✓ Copied</span>
      ) : (
        copiedLink && (
          <span className="editor-link-stale">Changed since you copied it. Copy it again.</span>
        )
      )}
      <button type="button" onClick={copy} aria-label={`Copy ${name} link`}>
        Copy link
      </button>
      <span className="editor-link-status" role="status">
        {status}
      </span>
    </li>
  );
}

/** "Link to paste into OBS" for each overlay. Every link carries all settings. */
export default function ObsLinks({ settings, heading }: { settings: Settings; heading: string }) {
  const hash = encode(settings);
  // Every overlay that gets a link: the scenes, chat (sized in the editor) and alerts.
  const links: LinkInfo[] = [
    ...(Object.keys(overlays) as OverlayId[]).map((id) => ({ id, ...overlays[id] })),
    { id: "chat", name: "Chat", width: settings.chat.width, height: settings.chat.height },
    { id: "alerts", name: "Alerts", width: 1920, height: 1080 },
  ];
  /** Each link as last copied this visit; kept in memory only (no tracking, no storage). */
  const [copied, setCopied] = useState<Record<string, string>>({});
  const linkFor = (id: string) => `${location.origin}/o/${id}#${hash}`;
  const done = links.filter((l) => copied[l.id] === linkFor(l.id)).length;
  return (
    <section id="obs-links" tabIndex={-1} className="editor-links" aria-labelledby="links-heading">
      <h2 id="links-heading">{heading}</h2>
      <p>
        In OBS, add a <strong>Browser</strong> source, paste the link, and enter the width and
        height shown. New to OBS? Follow the <Link to="/guide">step-by-step setup guide</Link>.
      </p>
      <ul>
        {links.map((l) => (
          <LinkRow
            key={l.id}
            {...l}
            link={linkFor(l.id)}
            copiedLink={copied[l.id]}
            onCopied={(link) => setCopied((c) => ({ ...c, [l.id]: link }))}
          />
        ))}
      </ul>
      {done > 0 && (
        <p className="editor-links-progress">
          {done === links.length ? (
            <>
              <strong>You’re set: all {links.length} links copied.</strong> Paste each one into its
              own Browser source in OBS. The <Link to="/guide">setup guide</Link> shows how.
            </>
          ) : (
            `${done} of ${links.length} links copied.`
          )}
        </p>
      )}
    </section>
  );
}
