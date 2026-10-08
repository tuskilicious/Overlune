import type { ReactNode } from "react";
import type { Settings } from "../settings/schema";
import SceneFrame from "./SceneFrame";

interface Props {
  scene: "brb" | "ending" | "offline";
  settings: Settings;
  error?: ReactNode;
}

/** BRB, Stream Ending and Offline: title, subtitle and socials only. */
export default function TextScene({ scene, settings, error }: Props) {
  const { title, subtitle } = settings[scene];
  return <SceneFrame settings={settings} title={title} subtitle={subtitle} error={error} />;
}
