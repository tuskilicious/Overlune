import { siDiscord, siInstagram, siTiktok, siTwitch, siX, siYoutube } from "simple-icons";
import type { Settings } from "../settings/schema";

type Platform = Settings["socials"][number]["platform"];

/** Platform logos from Simple Icons (CC0, docs/ASSETS.md), drawn in the text color. */
const icons: Record<Platform, { title: string; path: string }> = {
  twitch: siTwitch,
  youtube: siYoutube,
  tiktok: siTiktok,
  instagram: siInstagram,
  x: siX,
  discord: siDiscord,
};

export default function SocialIcon({ platform }: { platform: Platform }) {
  return (
    <svg className="scene-icon" viewBox="0 0 24 24" aria-hidden focusable="false">
      <path d={icons[platform].path} />
    </svg>
  );
}
