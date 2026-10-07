import { useRef, useState, type CSSProperties } from "react";
import SceneFrame from "../overlays/SceneFrame";
import type { Settings } from "../settings/schema";
import { themes } from "../themes";
import { applyOverrides, themeVars } from "../themes/vars";
import Preview from "./Preview";
import "./channel.css";

const defaultPanels = ["About me", "Schedule", "Rules", "Socials"];
/** Twitch shows panels 320px wide; a header strip this tall leaves room for the text under it on Twitch. */
const PANEL = { width: 320, height: 96 };
/** If a picture (like a logo on another website) can't be copied into the PNG, leave its spot empty. */
const EMPTY_GIF = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

const fileName = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "panel";

/** Turns an element into a PNG and saves it. html-to-image loads only now, so overlays and first visits never carry it. */
async function savePng(el: HTMLElement, name: string, width: number, height: number) {
  const { toPng } = await import("html-to-image");
  // html-to-image leaves out pictures drawn by ::after (Vaporwave's palms). For the capture only, a real element
  // copies that layer and the ::after hides; the overlays themselves never change.
  const after = getComputedStyle(el, "::after");
  let standIn: HTMLDivElement | null = null;
  if (after.backgroundImage.includes("url(")) {
    standIn = document.createElement("div");
    for (const p of [
      "position",
      "inset",
      "z-index",
      "background-image",
      "background-size",
      "background-position",
      "background-repeat",
      "opacity", // Session's grain is a faint multiply layer, not a solid one
      "mix-blend-mode",
    ] as const)
      standIn.style.setProperty(p, after.getPropertyValue(p));
    el.dataset.shot = "";
    el.appendChild(standIn);
  }
  let url: string;
  try {
    url = await toPng(el, {
      width,
      height,
      pixelRatio: 1,
      style: { transform: "none", margin: "0" }, // the preview scales the scene down; the file is full size
      imagePlaceholder: EMPTY_GIF,
    });
  } finally {
    standIn?.remove();
    delete el.dataset.shot;
  }
  const a = document.createElement("a");
  a.href = url;
  a.download = `overlune-${name}.png`;
  a.click();
}

/** Twitch panel headers and an offline banner in the streamer's look (T6.91). Pictures only: nothing goes in the link. */
export default function ChannelPage({ settings }: { settings: Settings }) {
  const theme = applyOverrides(themes[settings.theme], settings.advanced);
  const [panelsInput, setPanelsInput] = useState(defaultPanels.join("\n"));
  const panels = panelsInput
    .split("\n")
    .map((p) => p.trim())
    .filter(Boolean)
    .slice(0, 8);
  const [title, setTitle] = useState("Offline right now");
  const [subtitle, setSubtitle] = useState("Follow to catch the next stream");
  const [status, setStatus] = useState("");
  const banner = useRef<HTMLDivElement>(null);

  const save = async (el: HTMLElement | null | undefined, name: string, w: number, h: number) => {
    if (!el) return;
    setStatus("Making your picture…");
    try {
      await savePng(el, name, w, h);
      setStatus("Saved. Check your downloads.");
    } catch {
      setStatus("Couldn’t make that picture. Try again, or take a screenshot of the preview.");
    }
  };

  // Pixel fonts are very wide, so their panel titles are smaller.
  const panelFont = theme.fontHeading === "Press Start 2P" ? 17 : 30;
  return (
    <fieldset id="part-channel" className="editor-part" tabIndex={-1}>
      <legend>Channel page</legend>
      <p className="editor-hint">
        Pictures for your Twitch channel in your look. Download them here, then add them on Twitch.
      </p>

      <h3 className="editor-subhead">Panels</h3>
      <label>
        Panel names (one per line)
        <textarea
          value={panelsInput}
          rows={4}
          aria-describedby="panels-hint"
          onChange={(e) => setPanelsInput(e.target.value)}
        />
      </label>
      <p id="panels-hint" className="editor-hint">
        On Twitch, open your channel, choose <strong>About</strong>, turn on{" "}
        <strong>Edit Panels</strong>, add a panel and upload the picture. Write the panel’s text
        there too.
      </p>
      <ul className="editor-panels">
        {panels.map((p, i) => (
          <li key={`${i}-${p}`}>
            {/* Shown smaller here so the list stays short; the download is full size (T6.103). */}
            <div className="channel-panel-thumb">
              <div
                className="channel-panel"
                data-theme={theme.id}
                style={{ ...themeVars(theme), "--panel-font": `${panelFont}px` } as CSSProperties}
              >
                <span className="channel-panel-bar" />
                <span className="channel-panel-title">{p}</span>
              </div>
            </div>
            <button
              type="button"
              aria-label={`Download the ${p} panel`}
              onClick={(e) =>
                save(
                  e.currentTarget.parentElement?.querySelector<HTMLElement>(".channel-panel"),
                  `panel-${fileName(p)}`,
                  PANEL.width,
                  PANEL.height,
                )
              }
            >
              Download
            </button>
          </li>
        ))}
      </ul>

      <h3 className="editor-subhead">Offline banner</h3>
      <label>
        Banner title
        <input value={title} maxLength={60} onChange={(e) => setTitle(e.target.value)} />
      </label>
      <label>
        Line under it
        <input value={subtitle} maxLength={120} onChange={(e) => setSubtitle(e.target.value)} />
      </label>
      {/* Held still, so the picture never catches a scene halfway through its entrance. */}
      <div className="editor-shot editor-banner" ref={banner}>
        <Preview>
          <SceneFrame settings={settings} title={title} subtitle={subtitle} />
        </Preview>
      </div>
      <p className="editor-hint">
        On Twitch, it goes under <strong>Settings → Channel → Brand → Video Player Banner</strong>,
        and shows when you’re offline. It’s 1920×1080.
      </p>
      <button
        type="button"
        onClick={() =>
          save(banner.current?.querySelector<HTMLElement>(".scene"), "offline-banner", 1920, 1080)
        }
      >
        Download offline banner
      </button>
      <p className="editor-link-status" role="status">
        {status}
      </p>
    </fieldset>
  );
}
