import {
  Fragment,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  type CSSProperties,
  type ReactNode,
} from "react";
import type { Settings } from "../settings/schema";
import { themes } from "../themes";
import "../themes/fonts";
import { applyOverrides, themeVars } from "../themes/vars";
import SocialIcon from "./social-icons";
import "./scene.css";
import "./layouts.css";

const platformLabel: Record<Settings["socials"][number]["platform"], string> = {
  twitch: "Twitch",
  youtube: "YouTube",
  tiktok: "TikTok",
  instagram: "Instagram",
  x: "X",
  discord: "Discord",
};

interface Props {
  settings: Settings;
  title: string;
  subtitle: string;
  /** Shown above the content (e.g. <OverlayError />), which moves down to make room. */
  error?: ReactNode;
  children?: ReactNode;
}

/** A two-tone headline (T6.107): the last word takes the accent color. Each word is its own span so the entrance
 *  can land them one after another (T6.117). Plain text, rendered as React elements. */
function TwoTone({ text }: { text: string }) {
  const words = text.trim().split(/\s+/);
  return words.map((w, i) => (
    <Fragment key={i}>
      {i > 0 && " "}
      <span
        className={i > 0 && i === words.length - 1 ? "scene-word scene-title-end" : "scene-word"}
        style={{ "--i": i } as CSSProperties}
      >
        {w}
      </span>
    </Fragment>
  ));
}

/** Shared 1920×1080 scene layout for Starting Soon, BRB, Stream Ending and Offline. */
export default function SceneFrame({ settings, title, subtitle, error, children }: Props) {
  const theme = applyOverrides(themes[settings.theme], settings.advanced);
  // A row added in the editor but not filled in yet would show as a bare "Twitch" box on stream (T6.27).
  const socials = settings.socials.filter((s) => s.handle.trim());
  const scene = useRef<HTMLDivElement>(null);
  const titleEl = useRef<HTMLHeadingElement>(null);
  /** Long titles shrink until everything fits in 1920×1080 (T6.26): wide fonts like Arcade's wrap to many lines,
   *  which pushed the countdown and socials off screen. Short titles keep the theme's size. */
  const fit = useCallback(() => {
    const box = scene.current;
    const t = titleEl.current;
    // The last block in the flow: the content, under any error notice.
    const last = [...(box?.children ?? [])]
      .reverse()
      .find((el) => getComputedStyle(el).position !== "absolute") as HTMLElement | undefined;
    if (!box || !t || !last) return;
    // Layout offsets, not scroll sizes: entrance animations transform the content and would look like overflow.
    const bottom = () =>
      (last.offsetParent === box ? 0 : -box.offsetTop) + last.offsetTop + last.offsetHeight;
    const room = box.clientHeight - parseFloat(getComputedStyle(box).paddingBottom);
    t.style.fontSize = "";
    const base = parseFloat(getComputedStyle(t).fontSize);
    // ponytail: step search, at most ~10 layouts; binary search if the title limit ever grows a lot
    for (let size = base; bottom() > room && size > base * 0.35;) {
      size = Math.round(size * 0.9);
      t.style.fontSize = `${size}px`;
    }
  }, []);
  // Only when the text or settings change: the countdown ticks every second and must not cost a re-fit.
  useLayoutEffect(() => {
    fit();
    void document.fonts?.ready.then(fit); // web fonts change the wrap once they load
  }, [fit, title, subtitle, settings]);
  // ...or when the title's column changes width: the countdown card grows as it ticks ("2d 0h 0m" becomes
  // "1d 23h 59m"), and the narrower column wraps a long title onto more lines (T6.52). Height changes are the
  // fit's own doing, so only a new width counts.
  useEffect(() => {
    const t = titleEl.current;
    if (!t) return;
    let width = t.clientWidth;
    const ro = new ResizeObserver(() => {
      if (t.clientWidth === width) return;
      width = t.clientWidth;
      fit();
    });
    ro.observe(t);
    return () => ro.disconnect();
  }, [fit]);
  const { show, label, extra } = settings.ticker;
  const ticker = show && (socials.length > 0 || extra.trim() !== "" || label.trim() !== "");
  return (
    <div
      ref={scene}
      className="scene"
      data-ticker={ticker ? "" : undefined}
      data-enter={theme.enter.id}
      data-bg={theme.bgEffect}
      data-theme={theme.id}
      style={themeVars(theme)}
    >
      {error}
      <div className="scene-main">
        {settings.logo && (
          <img className="scene-logo" src={settings.logo} alt="Channel logo" onLoad={fit} />
        )}
        <h1 ref={titleEl} className="scene-title">
          <TwoTone text={title} />
        </h1>
        {subtitle && <p className="scene-subtitle">{subtitle}</p>}
        {(children || socials.length > 0) && (
          <div className="scene-side">
            {children}
            {socials.length > 0 && (
              <ul className="scene-socials">
                {socials.map((s, i) => (
                  <li key={i} style={{ "--i": i } as CSSProperties}>
                    <SocialIcon platform={s.platform} />
                    <span className="scene-platform">{platformLabel[s.platform]}</span>{" "}
                    <span className="scene-handle">{s.handle}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
      {ticker && (
        <div className="scene-ticker">
          {label.trim() && <span className="scene-ticker-tab">{label}</span>}
          {/* Two copies, each at least as wide as the band, slide left by one copy: a seamless loop. The second copy
              is only there for the loop, so screen readers skip it. */}
          <div className="scene-ticker-rail">
            <div
              className="scene-ticker-track"
              style={
                { "--ticker-s": `${Math.max(24, (socials.length + 1) * 9)}s` } as CSSProperties
              }
            >
              {[0, 1].map((copy) => (
                <ul key={copy} aria-hidden={copy === 1 || undefined}>
                  {socials.map((s, i) => (
                    <li key={i}>
                      <SocialIcon platform={s.platform} />
                      {s.handle}
                    </li>
                  ))}
                  {extra.trim() && <li>{extra}</li>}
                </ul>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
