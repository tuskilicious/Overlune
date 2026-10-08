import type { ReactNode } from "react";
import type { Settings } from "../settings/schema";
import SceneFrame from "./SceneFrame";

interface Props {
  scene: "chatting" | "brb" | "ending" | "offline";
  settings: Settings;
  error?: ReactNode;
}

/** Just Chatting, BRB, Stream Ending and Offline: title, subtitle and socials only. Just Chatting keeps its title small
 *  in a corner, so the camera and chat can go on top (T6.147). */
export default function TextScene({ scene, settings, error }: Props) {
  const { title, subtitle } = settings[scene];
  return (
    <SceneFrame
      settings={settings}
      title={title}
      subtitle={subtitle}
      error={error}
      compact={scene === "chatting"}
    />
  );
}
