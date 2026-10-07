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
  const look = applyOverrides(themes[settings.theme], settings.advanced);
  // Themes are checked for AA contrast in tests; only overrides can break it.
  const hardToRead =
    Object.keys(settings.advanced.colors).length > 0 &&
    (["text", "textMuted", "accent"] as const).some(
      (t) => contrast(asHex(look[t]), asHex(look.surface)) < 4.5,
    );
  return (
    <details id="part-colors" className="editor-advanced editor-part" tabIndex={-1}>
      <summary id="advanced-summary">Advanced: colors and fonts</summary>
      <p className="editor-hint">
        The theme already looks good. Change these only if you want your own brand colors.
      </p>
      <fieldset>
        <legend>Colors</legend>
        {colorTokens.map((token) => (
          <div key={token} className="editor-color">
            <label>
              <input
                id={`color-${token}`}
                type="color"
                value={asHex(look[token])}
                onChange={(e) =>
                  updateAdvanced({
                    colors: { ...settings.advanced.colors, [token]: e.target.value },
                  })
                }
              />
              {colorNames[token]}
            </label>
            <code className="editor-hex">{asHex(look[token]).toUpperCase()}</code>
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
        ))}
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
              onChange={(e) => updateAdvanced({ [key]: (e.target.value || null) as FontId | null })}
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
    </details>
  );
}
