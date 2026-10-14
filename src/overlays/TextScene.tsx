import { useContext, type ReactNode } from "react";
import type { Settings } from "../settings/schema";
import LayoutScene, { customized } from "./LayoutScene";
import { CanvasContext } from "./measure";
import SceneFrame from "./SceneFrame";

interface Props {
  scene: "brb" | "ending" | "offline";
  settings: Settings;
  error?: ReactNode;
}

/** BRB, Stream Ending and Offline: title, subtitle and socials only. */
export default function TextScene({ scene, settings, error }: Props) {
  const { title, subtitle } = settings[scene];
  const layout = customized(settings, scene, useContext(CanvasContext));
  if (layout)
    return <LayoutScene settings={settings} scene={scene} elements={layout} error={error} />;
  return <SceneFrame settings={settings} title={title} subtitle={subtitle} error={error} />;
}
