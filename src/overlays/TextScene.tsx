import { useMemo } from "react";
import { useLocation } from "react-router";
import { decode } from "../settings/url";
import OverlayError from "./OverlayError";
import SceneFrame from "./SceneFrame";

/** BRB and Stream Ending: title, subtitle and socials only. */
export default function TextScene({ scene }: { scene: "brb" | "ending" }) {
  const { hash } = useLocation();
  const { settings, ok } = useMemo(() => decode(hash), [hash]);
  const { title, subtitle } = settings[scene];
  return (
    <SceneFrame
      settings={settings}
      title={title}
      subtitle={subtitle}
      error={!ok && <OverlayError />}
    />
  );
}
