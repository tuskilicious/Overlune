import { useLayoutEffect, useRef, type CSSProperties, type ReactNode } from "react";
import type { LayoutElement, LayoutScene as SceneId, Settings } from "../settings/schema";
import { themes } from "../themes";
import type { ColorToken } from "../themes/types";
import { applyOverrides, themeVars } from "../themes/vars";
import { SceneSocials, SceneTicker, TwoTone } from "./SceneFrame";
import Countdown from "./starting/Countdown";
import "./scene.css";
import "./layouts.css";

const tokenVar: Record<ColorToken, string> = {
  bg: "--bg",
  surface: "--surface",
  primary: "--primary",
  accent: "--accent",
  text: "--text",
  textMuted: "--text-muted",
};

/** A layout color as CSS: a look token's variable, or the #rrggbb itself (the schema allows nothing else). */
const color = (c: string | undefined) =>
  c === undefined ? undefined : c.startsWith("#") ? c : `var(${tokenVar[c as ColorToken]})`;

const textStyle = (el: { size?: number; color?: string; align?: string }): CSSProperties => ({
  fontSize: el.size,
  color: color(el.color),
  textAlign: el.align as CSSProperties["textAlign"],
});

/** Shrinks a text element's font until it fits its box, like the composed scene's long titles (T6.26). */
function Fitted({
  className,
  style,
  children,
}: {
  className: string;
  style: CSSProperties;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    const box = el?.parentElement;
    if (!el || !box) return;
    const fit = () => {
      el.style.fontSize = "";
      const base = parseFloat(getComputedStyle(el).fontSize);
      for (let size = base; el.scrollHeight > box.clientHeight && size > base * 0.35;) {
        size = Math.round(size * 0.9);
        el.style.fontSize = `${size}px`;
      }
    };
    fit();
    void document.fonts?.ready.then(fit);
  });
  return (
    <div ref={ref} className={className} style={style}>
      {children}
    </div>
  );
}

function Part({ el, settings, scene }: { el: LayoutElement; settings: Settings; scene: SceneId }) {
  const words = settings[scene];
  switch (el.type) {
    case "title":
      return (
        <Fitted className="scene-title" style={textStyle(el)}>
          <TwoTone text={words.title} />
        </Fitted>
      );
    case "subtitle":
      return words.subtitle ? (
        <Fitted className="scene-subtitle" style={textStyle(el)}>
          {words.subtitle}
        </Fitted>
      ) : null;
    case "countdown":
      return scene === "starting" ? <Countdown starting={settings.starting} /> : null;
    case "socials": {
      const socials = settings.socials.filter((s) => s.handle.trim());
      return socials.length > 0 ? <SceneSocials socials={socials} /> : null;
    }
    case "logo":
      return settings.logo ? (
        <img className="scene-logo" src={settings.logo} alt="Channel logo" />
      ) : null;
    case "ticker":
      return (
        <SceneTicker
          settings={settings}
          socials={settings.socials.filter((s) => s.handle.trim())}
        />
      );
    case "text":
      return (
        <Fitted className={`layout-text layout-text-${el.font}`} style={textStyle(el)}>
          {el.text}
        </Fitted>
      );
    case "image":
      return <img className="layout-image" src={el.src} alt="" style={{ objectFit: el.fit }} />;
    case "shape":
      return (
        <div
          className={`layout-shape layout-shape-${el.kind}`}
          style={
            el.kind === "line"
              ? {
                  borderTopColor: color(el.stroke ?? el.fill),
                  borderTopWidth: Math.max(1, el.strokeWidth),
                }
              : {
                  background: color(el.fill),
                  borderColor: color(el.stroke ?? el.fill),
                  borderWidth: el.strokeWidth,
                  borderRadius: el.kind === "rect" ? el.radius : undefined,
                }
          }
        />
      );
  }
}

/**
 * A customized scene (T9.2, docs/STACK.md "Layout model"): the look's background and motif, then each element in its
 * box on the canvas, in list order. The elements reuse the composed scene's parts and class names, so each look's
 * type and styling carry over; only their places come from the layout.
 */
export default function LayoutScene({
  settings,
  scene,
  elements,
  error,
}: {
  settings: Settings;
  scene: SceneId;
  elements: LayoutElement[];
  error?: ReactNode;
}) {
  const theme = applyOverrides(themes[settings.theme], settings.advanced);
  const size = settings.layouts.landscape?.size ?? { width: 1920, height: 1080 };
  return (
    <div
      className="scene scene-layout"
      data-enter={theme.enter.id}
      data-bg={theme.bgEffect}
      data-theme={theme.id}
      style={{ ...themeVars(theme), width: size.width, height: size.height }}
    >
      {error}
      {elements
        .filter((el) => !el.hidden)
        .map((el) => (
          <div
            key={el.id}
            className={`layout-el layout-el-${el.type}`}
            data-id={el.id}
            style={{
              left: el.x,
              top: el.y,
              width: el.w,
              height: el.h,
              rotate: el.r ? `${el.r}deg` : undefined,
              opacity: el.o < 1 ? el.o : undefined,
            }}
          >
            <Part el={el} settings={settings} scene={scene} />
          </div>
        ))}
    </div>
  );
}

/** A scene's elements when it was customized for the landscape canvas, else null (the composed scene). */
export function customized(settings: Settings, scene: SceneId): LayoutElement[] | null {
  return settings.layouts.landscape?.scenes[scene] ?? null;
}
