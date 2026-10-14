import { useContext, type ReactNode } from "react";
import type { Settings } from "../../settings/schema";
import LayoutScene, { customized } from "../LayoutScene";
import { CanvasContext } from "../measure";
import SceneFrame from "../SceneFrame";
import Countdown from "./Countdown";

export default function StartingSoon({
  settings,
  error,
}: {
  settings: Settings;
  error?: ReactNode;
}) {
  const { title, subtitle, endsAt, repeat } = settings.starting;
  const layout = customized(settings, "starting", useContext(CanvasContext));
  if (layout)
    return <LayoutScene settings={settings} scene="starting" elements={layout} error={error} />;
  return (
    <SceneFrame settings={settings} title={title} subtitle={subtitle} error={error}>
      {(endsAt !== null || repeat.mode !== "off") && <Countdown starting={settings.starting} />}
    </SceneFrame>
  );
}
