import { useRef, useState } from "react";
import type { Settings } from "../settings/schema";
import { encode } from "../settings/url";

/** Every overlay the editor makes, with the Browser Source size to enter in OBS. Chat and alerts add rows here. */
export const overlays = {
  starting: { name: "Starting Soon", width: 1920, height: 1080 },
  brb: { name: "Be Right Back", width: 1920, height: 1080 },
  ending: { name: "Stream Ending", width: 1920, height: 1080 },
} as const;

export type OverlayId = keyof typeof overlays;

function LinkRow({ id, link }: { id: OverlayId; link: string }) {
  const { name, width, height } = overlays[id];
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
  return (
    <section className="editor-links" aria-labelledby="links-heading">
      <h2 id="links-heading">Links to paste into OBS</h2>
      <p>
        In OBS, add a <strong>Browser</strong> source, paste the link, and enter the width and
        height shown.
      </p>
      <ul>
        {(Object.keys(overlays) as OverlayId[]).map((id) => (
          <LinkRow key={id} id={id} link={`${location.origin}/o/${id}#${hash}`} />
        ))}
      </ul>
    </section>
  );
}
