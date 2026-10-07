import { defaultBots, type Settings } from "../../settings/schema";
import { botsFromInput } from "../../overlays/chat/filters";
import { channelFromInput } from "../../twitch/irc";
import { NumberField, same, type SectionProps } from "./fields";

const fadeOptions = [
  [0, "Never"],
  [15, "15 seconds"],
  [30, "30 seconds"],
  [60, "1 minute"],
  [120, "2 minutes"],
] as const;

/** The chat overlay. The bots box keeps its own text in EditorPage, so undo and load can refill it. */
export default function Chat({
  settings,
  setSettings,
  fresh,
  resetButton,
  botsInput,
  setBotsInput,
}: SectionProps & { botsInput: string; setBotsInput: (v: string) => void }) {
  const updateChat = (patch: Partial<Settings["chat"]>) =>
    setSettings((s) => ({ ...s, chat: { ...s.chat, ...patch } }));
  return (
    <fieldset id="part-chat" className="editor-part" tabIndex={-1}>
      <legend>Chat</legend>
      {resetButton(
        "Chat settings",
        !same({ ...settings.chat, channel: "" }, { ...fresh.chat, channel: "" }),
        () => {
          setSettings((st) => ({
            ...st,
            chat: { ...fresh.chat, channel: st.chat.channel },
          }));
          setBotsInput(fresh.chat.bots.join("\n"));
        },
      )}
      <label>
        Your Twitch channel name
        <input
          value={settings.chat.channel}
          maxLength={60}
          autoComplete="off"
          spellCheck={false}
          aria-describedby="chat-hint"
          onChange={(e) => updateChat({ channel: channelFromInput(e.target.value) })}
        />
      </label>
      <p id="chat-hint" className="editor-hint">
        The name in your channel link, e.g. twitch.tv/<strong>yourname</strong>. You can paste the
        whole link.
      </p>
      <label className="editor-check">
        <input
          type="checkbox"
          checked={settings.chat.hideCommands}
          onChange={(e) => updateChat({ hideCommands: e.target.checked })}
        />
        Hide chat commands (messages starting with !)
      </label>
      {/* Rarely changed, so tucked away (T6.20). */}
      <details className="editor-more">
        <summary>More chat options</summary>
        <div className="editor-disclosure">
          <div>
            <label className="editor-check">
              <input
                type="checkbox"
                checked={settings.chat.showBadges}
                onChange={(e) => updateChat({ showBadges: e.target.checked })}
              />
              Show badges (Mod, Sub, VIP) before names
            </label>
            <label>
              Bots to hide (one name per line)
              <textarea
                value={botsInput}
                rows={6}
                spellCheck={false}
                aria-describedby="bots-hint"
                onChange={(e) => {
                  setBotsInput(e.target.value);
                  updateChat({ bots: botsFromInput(e.target.value) });
                }}
              />
            </label>
            <p id="bots-hint" className="editor-hint">
              Messages from these accounts won’t show in your chat. Remove a name to show that bot.
            </p>
            <button
              id="reset-bots"
              type="button"
              onClick={() => {
                setBotsInput(defaultBots.join("\n"));
                updateChat({ bots: [...defaultBots] });
              }}
            >
              Reset to the usual bots
            </button>
            <div className="editor-size">
              <NumberField
                label="Chat box width"
                value={settings.chat.width}
                min={250}
                max={1920}
                describedBy="size-hint"
                onChange={(width) => updateChat({ width })}
              />
              <NumberField
                label="Chat box height"
                value={settings.chat.height}
                min={200}
                max={1080}
                describedBy="size-hint"
                onChange={(height) => updateChat({ height })}
              />
            </div>
            <p id="size-hint" className="editor-hint">
              Enter the same width and height in OBS. They’re shown next to the Chat link.
            </p>
            <label>
              Text size
              <select
                value={settings.chat.fontScale}
                onChange={(e) => updateChat({ fontScale: Number(e.target.value) })}
              >
                {[0.75, 1, 1.25, 1.5, 2].map((v) => (
                  <option key={v} value={v}>
                    {v * 100}%
                  </option>
                ))}
              </select>
            </label>
            <label>
              Hide messages after
              <select
                value={settings.chat.fadeAfter}
                onChange={(e) => updateChat({ fadeAfter: Number(e.target.value) })}
              >
                {fadeOptions.map(([v, label]) => (
                  <option key={v} value={v}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </details>
    </fieldset>
  );
}
