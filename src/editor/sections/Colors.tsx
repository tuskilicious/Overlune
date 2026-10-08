import type { CSSProperties } from "react";
import { contrast } from "../../lib/contrast";
import type { Settings } from "../../settings/schema";
import { themes } from "../../themes";
import { colorTokens, fontIds, type ColorToken, type FontId } from "../../themes/types";
import { applyOverrides } from "../../themes/vars";
import { focusSoon, type SectionProps } from "./fields";

const colorNames: Record<ColorToken, string> = {
  bg: "Background",
  surface: "Boxes and cards",
  primary: "Titles",
  accent: "Highlights",
  text: "Text",
  textMuted: "Softer text",
};

/** Color pickers only take #rrggbb; a theme gradient background shows as black until overridden. */
const asHex = (c: string) => (/^#[0-9a-fA-F]{6}$/.test(c) ? c : "#000000");

/** Advanced: the look's colors and fonts, overridden. */
export default function Colors({ settings, setSettings, update }: SectionProps) {
  const updateAdvanced = (patch: Partial<Settings["advanced"]>) =>
    setSettings((s) => ({ ...s, advanced: { ...s.advanced, ...patch } }));
  const base = themes[settings.theme];
  const look = applyOverrides(base, settings.advanced);
  /** The look's own colors as swatches, once each, named by the tokens that use them ("Titles and text"). A gradient
   *  background isn't a single color, so it isn't one. */
  const palette = Object.values(
    colorTokens.reduce<Record<string, { hex: string; names: string }>>((all, t) => {
      const hex = base[t].toLowerCase();
      if (!/^#[0-9a-f]{6}$/.test(hex)) return all;
      const name = colorNames[t].toLowerCase();
      all[hex] = { hex, names: all[hex] ? `${all[hex].names} and ${name}` : name };
      return all;
    }, {}),
  );
  // Themes are checked for AA contrast in tests; only overrides can break it.
  const hardToRead =
    Object.keys(settings.advanced.colors).length > 0 &&
    (["text", "textMuted", "accent"] as const).some(
      (t) => contrast(asHex(look[t]), asHex(look.surface)) < 4.5,
    );
  return (
    <details id="part-colors" className="editor-advanced editor-part" tabIndex={-1}>
      <summary id="advanced-summary">Advanced: colors and fonts</summary>
      <div className="editor-disclosure">
        <div>
          <p className="editor-hint">
            The theme already looks good. Change these only if you want your own brand colors.
          </p>
          <fieldset>
            <legend>Colors</legend>
            {colorTokens.map((token) => {
              const current = asHex(look[token]).toLowerCase();
              const own = !palette.some((c) => c.hex === current);
              const pick = (hex: string) => {
                const colors = { ...settings.advanced.colors };
                // The look's own value for this token clears the override instead of storing a copy of it.
                if (hex === asHex(base[token]).toLowerCase()) delete colors[token];
                else colors[token] = hex;
                updateAdvanced({ colors });
              };
              return (
                <div
                  key={token}
                  className="editor-color"
                  role="group"
                  aria-labelledby={`color-name-${token}`}
                >
                  <span id={`color-name-${token}`} className="editor-color-name">
                    {colorNames[token]}
                  </span>
                  {/* Swatches from the look's own colors (T6.135), then your own color: the native picker. */}
                  <div className="editor-swatches">
                    {palette.map((c) => (
                      <button
                        key={c.hex}
                        type="button"
                        className="editor-swatch"
                        aria-label={`${colorNames[token]}: the look's ${c.names} color`}
                        aria-pressed={c.hex === current}
                        style={{ "--swatch": c.hex } as CSSProperties}
                        onClick={() => pick(c.hex)}
                      />
                    ))}
                    <label
                      className="editor-swatch editor-swatch-own"
                      data-picked={own || undefined}
                      style={own ? ({ "--swatch": current } as CSSProperties) : undefined}
                    >
                      <input
                        id={`color-${token}`}
                        type="color"
                        aria-label={`${colorNames[token]}: your own color`}
                        value={current}
                        onChange={(e) =>
                          updateAdvanced({
                            colors: { ...settings.advanced.colors, [token]: e.target.value },
                          })
                        }
                      />
                    </label>
                  </div>
                  <code className="editor-hex">{current.toUpperCase()}</code>
                  {settings.advanced.colors[token] && (
                    <button
                      type="button"
                      aria-label={`Reset ${colorNames[token]} to the theme`}
                      onClick={() => {
                        const colors = { ...settings.advanced.colors };
                        delete colors[token];
                        updateAdvanced({ colors });
                        focusSoon(`color-${token}`);
                      }}
                    >
                      Reset
                    </button>
                  )}
                </div>
              );
            })}
            <p className="editor-error" role="status">
              {hardToRead &&
                "Your text may be hard to read on stream. Try a lighter text color or a darker “Boxes and cards” color."}
            </p>
          </fieldset>
          <fieldset>
            <legend>Fonts</legend>
            {(["fontHeading", "fontBody"] as const).map((key) => (
              <label key={key}>
                {key === "fontHeading" ? "Heading font" : "Body font"}
                <select
                  value={settings.advanced[key] ?? ""}
                  onChange={(e) =>
                    updateAdvanced({ [key]: (e.target.value || null) as FontId | null })
                  }
                >
                  <option value="">Theme default ({themes[settings.theme][key]})</option>
                  {fontIds.map((f) => (
                    <option key={f}>{f}</option>
                  ))}
                </select>
              </label>
            ))}
          </fieldset>
          <button
            type="button"
            onClick={() => {
              update({ advanced: { colors: {}, fontHeading: null, fontBody: null } });
              focusSoon("advanced-summary");
            }}
          >
            Reset all to the theme
          </button>
        </div>
      </div>
    </details>
  );
}
