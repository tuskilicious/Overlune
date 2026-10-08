import { framePosition, type Settings } from "../settings/schema";
import { encode } from "../settings/url";

/** OBS's default Browser source CSS: a transparent page with no margin. */
const OBS_CSS = "body { background-color: rgba(0, 0, 0, 0); margin: 0px auto; overflow: hidden; }";
const MARGIN = 40;

interface Item {
  source: string;
  x: number;
  y: number;
}

/**
 * An OBS Studio scene collection (T6.90): Scene Collection → Import makes every Overlune scene, with each Browser source
 * already holding the streamer's link and size. Positions assume OBS's usual 1920×1080 canvas; on another canvas,
 * Transform → Fit to screen fixes a scene. Streamlabs uses a different format and keeps the guide's manual steps.
 */
export function sceneCollection(
  settings: Settings,
  origin: string,
  uuid: () => string = () => crypto.randomUUID(),
) {
  const hash = encode(settings);
  const { chat, frame } = settings;
  const browsers = [
    { name: "Starting Soon", route: "starting", width: 1920, height: 1080 },
    { name: "Be Right Back", route: "brb", width: 1920, height: 1080 },
    { name: "Stream Ending", route: "ending", width: 1920, height: 1080 },
    { name: "Offline", route: "offline", width: 1920, height: 1080 },
    { name: "Chat", route: "chat", width: chat.width, height: chat.height },
    framePosition(frame)
      ? { name: "Webcam frame", route: "frame", width: 1920, height: 1080 }
      : { name: "Webcam frame", route: "frame", width: frame.width, height: frame.height },
    { name: "Alerts", route: "alerts", width: 1920, height: 1080 },
  ].map((b) => ({ ...b, name: `Overlune ${b.name}`, uuid: uuid() }));
  const byName = (n: string) => browsers.find((b) => b.name === `Overlune ${n}`)!;

  const source = (b: (typeof browsers)[number]) => ({
    id: "browser_source",
    versioned_id: "browser_source",
    name: b.name,
    uuid: b.uuid,
    enabled: true,
    muted: false,
    volume: 1,
    settings: {
      url: `${origin}/o/${b.route}#${hash}`,
      width: b.width,
      height: b.height,
      fps: 30,
      css: OBS_CSS,
      // "Control audio via OBS", so viewers hear the alert sound (the guide's step 4).
      reroute_audio: b.route === "alerts",
    },
  });

  // Items are listed bottom first; Alerts goes last so it shows over everything.
  const scene = (name: string, items: Item[]) => ({
    id: "scene",
    versioned_id: "scene",
    name: `Overlune: ${name}`,
    uuid: uuid(),
    settings: {
      id_counter: items.length,
      custom_size: false,
      items: items.map((it, i) => {
        const b = byName(it.source);
        return {
          id: i + 1,
          name: b.name,
          source_uuid: b.uuid,
          visible: true,
          locked: false,
          pos: { x: it.x, y: it.y },
          rot: 0,
          scale: { x: 1, y: 1 },
          align: 5, // top left
          bounds_type: 0,
          bounds_align: 0,
          bounds: { x: 0, y: 0 },
        };
      }),
    },
  });
  const full = (s: string): Item => ({ source: s, x: 0, y: 0 });
  const scenes = [
    scene("Starting Soon", [full("Starting Soon"), full("Alerts")]),
    // The streamer adds their game and camera under these.
    scene("Live", [
      framePosition(frame)
        ? full("Webcam frame")
        : { source: "Webcam frame", x: MARGIN, y: 1080 - frame.height - MARGIN },
      { source: "Chat", x: 1920 - chat.width - MARGIN, y: 1080 - chat.height - MARGIN },
      full("Alerts"),
    ]),
    scene("Be Right Back", [full("Be Right Back"), full("Alerts")]),
    scene("Stream Ending", [full("Stream Ending"), full("Alerts")]),
    scene("Offline", [full("Offline")]),
  ];

  return {
    name: "Overlune",
    current_scene: scenes[0]!.name,
    current_program_scene: scenes[0]!.name,
    scene_order: scenes.map((s) => ({ name: s.name })),
    sources: [...browsers.map(source), ...scenes],
    groups: [],
    transitions: [],
    current_transition: "Fade",
    transition_duration: 300,
  };
}
