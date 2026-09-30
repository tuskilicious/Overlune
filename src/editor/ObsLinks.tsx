import { useRef, useState } from "react";
import type { Settings } from "../settings/schema";
import { encode } from "../settings/url";

/** The full-screen scenes, with the Browser Source size to enter in OBS. */
export const overlays = {
  starting: { name: "Starting Soon", width: 1920, height: 1080 },
  brb: { name: "Be Right Back", width: 1920, height: 1080 },
  ending: { name: "Stream Ending", width: 1920, height: 1080 },
} as const;

export type OverlayId = keyof typeof overlays;

interface LinkInfo {
  id: string;
  name: string;
  width: number;
  height: number;
}

function LinkRow({ name, width, height, link }: LinkInfo & { link: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState("");

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setStatus("Copied!");
    } catch {
      input.current?.select();
      setStatus("Press Ctrl+C to copy");
    }
    setTimeout(() => setStatus(""), 3000);
  };

  return (
    <li className="editor-link">
      <label>
        <span>
          <strong>{name}</strong> · Width <strong>{width}</strong> · Height{" "}
          <strong>{height}</strong>
        </span>
        <input ref={input} readOnly value={link} onFocus={(e) => e.target.select()} />
      </label>
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
export default function ObsLinks({ settings }: { settings: Settings }) {
  const hash = encode(settings);
  // Every overlay that gets a link: the scenes plus chat (sized in the editor). Alerts add a row here.
  const links: LinkInfo[] = [
    ...(Object.keys(overlays) as OverlayId[]).map((id) => ({ id, ...overlays[id] })),
    { id: "chat", name: "Chat", width: settings.chat.width, height: settings.chat.height },
  ];
  return (
    <section id="obs-links" tabIndex={-1} className="editor-links" aria-labelledby="links-heading">
      <h2 id="links-heading">Links to paste into OBS</h2>
      <p>
        In OBS, add a <strong>Browser</strong> source, paste the link, and enter the width and
        height shown.
      </p>
      <ul>
        {links.map((l) => (
          <LinkRow key={l.id} {...l} link={`${location.origin}/o/${l.id}#${hash}`} />
        ))}
      </ul>
    </section>
  );
}
