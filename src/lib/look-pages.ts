import { themes } from "../themes";
import { blurbs } from "../themes/blurbs";
import { themeIds, type ThemeId } from "../themes/types";
import { lookPath, type Page } from "./page-meta";

/** Its Starting Soon on both canvases, pictured from the real overlay at build time (scripts/prerender.mjs). */
export const stills = (id: ThemeId) => ({
  landscape: `/images/looks/${id}.jpg`,
  portrait: `/images/looks/${id}-vertical.jpg`,
});

export const lookPages: Record<string, Page> = Object.fromEntries(
  themeIds.map((id) => {
    const { name } = themes[id];
    return [
      lookPath(id),
      {
        title: `${name}: a free stream overlay for OBS · Overlune`,
        description: `${blurbs[id]} Free matching scenes, chat and alerts for OBS, in 16:9 and vertical. No account needed.`,
        image: {
          url: `https://overlune.in${stills(id).landscape}`,
          alt: `${name}'s Starting Soon scene, with a countdown and social handles.`,
          width: 1920,
          height: 1080,
        },
      },
    ];
  }),
);
