import { useRef, useState } from "react";
import { Link } from "react-router";
import { framePosition, type Settings } from "../settings/schema";
import { encode } from "../settings/url";
import { sceneCollection } from "./scene-collection";
import Icon from "../components/Icon";

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
  /** Not every stream needs it (the webcam frame), so it doesn't count toward "You're set". */
  optional?: boolean;
}

export function LinkRow({
  name,
  width,
  height,
  optional,
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
      setStatus("Copied.");
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
          {/* Kept on one line, so "(optional)" never drops below the name (T6.103). */}
          <span className="editor-link-name">
            <strong>{name}</strong>
            {optional && <span className="editor-optional"> (optional)</span>}
          </span>
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
        <span className="editor-link-done">
          <Icon name="check" /> Copied
        </span>
      ) : (
        copiedLink && (
          <span className="editor-link-stale">Changed since you copied it. Copy it again.</span>
        )
      )}
      <button type="button" onClick={copy} aria-label={`Copy ${name} link`}>
        Copy link
      </button>
      {/* See it full size before OBS (T6.114). Alerts wait for events, so their preview plays the samples. */}
      <a
        className="editor-link-open"
        href={link.replace("/o/alerts#", "/o/alerts?test=1#")}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Preview ${name} in a new tab`}
      >
        Preview
      </a>
      <span className="editor-link-status" role="status">
        {status}
      </span>
    </li>
  );
}

/** Saves the OBS scene collection (T6.90) as a file. */
function downloadCollection(settings: Settings) {
  const json = JSON.stringify(sceneCollection(settings, location.origin), null, 2);
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([json], { type: "application/json" }));
  a.download = "overlune-scenes.json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/** "Link to paste into OBS" for each overlay. Every link carries all settings. */
export default function ObsLinks({ settings, heading }: { settings: Settings; heading: string }) {
  const hash = encode(settings);
  // Every overlay that gets a link: the scenes, chat (sized in the editor), alerts and the webcam frame (T6.88).
  const links: LinkInfo[] = [
    ...(Object.keys(overlays) as OverlayId[]).map((id) => ({ id, ...overlays[id] })),
    { id: "chat", name: "Chat", width: settings.chat.width, height: settings.chat.height },
    { id: "alerts", name: "Alerts", width: 1920, height: 1080 },
    {
      id: "frame",
      name: "Webcam frame",
      // Placed in Overlune, the frame's overlay is full screen (T6.122).
      ...(framePosition(settings.frame)
        ? { width: 1920, height: 1080 }
        : { width: settings.frame.width, height: settings.frame.height }),
      optional: true,
    },
  ];
  /** Each link as last copied this visit; kept in memory only (no tracking, no storage). */
  const [copied, setCopied] = useState<Record<string, string>>({});
  const linkFor = (id: string) => `${location.origin}/o/${id}#${hash}`;
  const needed = links.filter((l) => !l.optional);
  const done = needed.filter((l) => copied[l.id] === linkFor(l.id)).length;

  // "Copy all links" (T6.70): one text block with each overlay's name, size and link, to keep in a note while
  // setting up OBS. If the clipboard is blocked, the block shows in a box, selected, to copy by hand.
  const allText = links
    .map((l) => `${l.name} (width ${l.width}, height ${l.height})\n${linkFor(l.id)}`)
    .join("\n\n");
  const [allStatus, setAllStatus] = useState("");
  const [allFallback, setAllFallback] = useState(false);
  const copyAll = async () => {
    try {
      await navigator.clipboard.writeText(allText);
      setAllFallback(false);
      setAllStatus(`Copied all ${links.length} links with their sizes.`);
      setCopied(Object.fromEntries(links.map((l) => [l.id, linkFor(l.id)])));
    } catch {
      setAllFallback(true);
      setAllStatus("Press Ctrl+C to copy the selected links.");
    }
  };
  return (
    <section id="obs-links" tabIndex={-1} className="editor-links" aria-labelledby="links-heading">
      <h2 id="links-heading">{heading}</h2>
      <p>
        <strong>What you’ll need:</strong> OBS Studio or Streamlabs Desktop. For chat and alerts,
        also your Twitch channel name.
      </p>
      {/* The OBS steps right next to the links, in plain words (T6.71). Open at first: beginners need it. */}
      <details className="editor-obs-help" open>
        <summary>How to paste a link into OBS</summary>
        <ol>
          <li>
            In OBS, find <strong>Sources</strong> at the bottom, press <strong>+</strong> and choose{" "}
            <strong>Browser</strong>. A Browser source shows a web page on your stream, like this
            overlay.
          </li>
          <li>
            Delete what’s in <strong>URL</strong> and paste your link.
          </li>
          <li>
            Type the <strong>Width</strong> and <strong>Height</strong> shown next to the link: the
            overlay’s size in pixels, so it fits your stream exactly.
          </li>
          <li>
            For Alerts, tick <strong>Control audio via OBS</strong> so your viewers hear the alert
            sound. Then press <strong>OK</strong>.
          </li>
        </ol>
        <img
          src="/images/guide/obs-properties.png"
          alt="OBS Browser source properties with the link pasted into URL, width 1920, height 1080 and Control audio via OBS ticked."
          width="791"
          height="618"
          loading="lazy"
        />
        <p>
          The <Link to="/guide">step-by-step setup guide</Link> has more pictures, Streamlabs steps
          and fixes.
        </p>
      </details>
      {/* One file instead of six pastes (T6.90). OBS Studio only: Streamlabs can't import it. */}
      <div className="editor-collection">
        <h3>Faster in OBS Studio: import every scene at once</h3>
        <p>One file makes all your Overlune scenes in OBS, with your links and sizes already in.</p>
        <button type="button" onClick={() => downloadCollection(settings)}>
          Download OBS scene collection
        </button>
        <ol>
          <li>
            In OBS, open the <strong>Scene Collection</strong> menu at the top and choose{" "}
            <strong>Import</strong>.
          </li>
          <li>
            Press <strong>…</strong> next to Collection Path, pick{" "}
            <strong>overlune-scenes.json</strong> and press <strong>Import</strong>.
          </li>
          <li>
            In the <strong>Scene Collection</strong> menu, choose <strong>Overlune</strong>.
          </li>
          <li>
            In <strong>Overlune: Live</strong>, add your game and camera with <strong>+</strong>{" "}
            under Sources, then drag them to the bottom of the list.
          </li>
        </ol>
        <p className="editor-hint">
          Made for OBS’s usual 1920×1080 canvas; on another size, right-click a source and choose
          Transform → Fit to screen. Changed something here? Download it again. Streamlabs can’t
          import this file, so paste the links below instead.
        </p>
      </div>
      {/* Streamers asked whether a look's update would break their setup (T6.69). */}
      <p>
        Your links never change. When a look gets an update, your overlays pick it up on their own.
      </p>
      <div className="editor-copy-all">
        <button type="button" onClick={copyAll}>
          Copy all links
        </button>
        <span role="status">{allStatus}</span>
      </div>
      {allFallback && (
        <textarea
          className="editor-copy-all-text"
          aria-label="All your links, to copy"
          readOnly
          value={allText}
          ref={(el) => el?.select()}
        />
      )}
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
          {done === needed.length ? (
            <>
              <strong>You’re set: all {needed.length} links copied.</strong> Paste each one into its
              own Browser source in OBS. The <Link to="/guide">setup guide</Link> shows how.
            </>
          ) : (
            `${done} of ${needed.length} links copied.`
          )}
        </p>
      )}
    </section>
  );
}
