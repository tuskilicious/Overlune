import type { ReactNode } from "react";
import type { Settings } from "../settings/schema";
import { themes } from "../themes";
import { themeVars } from "../themes/vars";
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
  children?: ReactNode;
}

/** Shared 1920×1080 scene layout for Starting Soon, BRB and Stream Ending. */
export default function SceneFrame({ settings, title, subtitle, children }: Props) {
  const theme = themes[settings.theme];
  return (
    <div className="scene" data-enter={theme.enter.id} style={themeVars(theme)}>
      <div className="scene-main">
        {settings.logo && <img className="scene-logo" src={settings.logo} alt="Channel logo" />}
        <h1 className="scene-title">{title}</h1>
        {subtitle && <p className="scene-subtitle">{subtitle}</p>}
        {children}
      </div>
      {settings.socials.length > 0 && (
        <ul className="scene-socials">
          {settings.socials.map((s, i) => (
            <li key={i}>
              <span className="scene-platform">{platformLabel[s.platform]}</span> {s.handle}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
