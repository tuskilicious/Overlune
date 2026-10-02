import { useCallback, useLayoutEffect, useRef, type ReactNode } from "react";
import type { Settings } from "../settings/schema";
import { themes } from "../themes";
import "../themes/fonts";
import { applyOverrides, themeVars } from "../themes/vars";
import SocialIcon from "./social-icons";
import "./scene.css";

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

/** Shared 1920×1080 scene layout for Starting Soon, BRB and Stream Ending. */
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
    // The last block in the flow; a theme may float its socials over the background (Neon Grid's floor).
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
  return (
    <div
      ref={scene}
      className="scene"
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
          {title}
        </h1>
        {subtitle && <p className="scene-subtitle">{subtitle}</p>}
        {children}
      </div>
      {socials.length > 0 && (
        <ul className="scene-socials">
          {socials.map((s, i) => (
            <li key={i}>
              <SocialIcon platform={s.platform} />
              <span className="scene-platform">{platformLabel[s.platform]}</span>{" "}
              <span className="scene-handle">{s.handle}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
