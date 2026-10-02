import type { CSSProperties, ReactNode } from "react";
import { readableOn } from "../../lib/contrast";
import type { Settings } from "../../settings/schema";
import { themes } from "../../themes";
import "../../themes/fonts";
import { applyOverrides, themeVars } from "../../themes/vars";
import { emoteUrl, splitMessage } from "../../twitch/emotes";
import type { TwitchEvent } from "../../twitch/parse";
import "./chat.css";

/** A chat event, plus when it arrived (ms) for fade-out. Sample messages have no `at`. */
export type ChatMessage = Extract<TwitchEvent, { type: "chat" }> & { at?: number };

/** Theme-styled role badges (Helix badge images need a login, docs/STACK.md). Shown in this order. */
const roles = [
  ["broadcaster", "Streamer"],
  ["moderator", "Mod"],
  ["vip", "VIP"],
  ["subscriber", "Sub"],
] as const;

interface Props {
  settings: Settings;
  messages: ChatMessage[];
  /** Error cards (<OverlayError />) shown above the messages. */
  error?: ReactNode;
}

/** The chat box, newest message at the bottom. All chat text renders as React text or <img>; never as HTML. */
export default function ChatView({ settings, messages, error }: Props) {
  const theme = applyOverrides(themes[settings.theme], settings.advanced);
  const { width, height, fontScale, fadeAfter } = settings.chat;
  const style = {
    ...themeVars(theme),
    width,
    height,
    "--chat-scale": fontScale,
    "--fade-ms": `${fadeAfter * 1000}ms`,
  } as CSSProperties;
  return (
    <div
      className="chat"
      data-enter={theme.enter.id}
      data-layout={theme.layout ?? "classic"}
      data-fade={fadeAfter > 0 || undefined}
      style={style}
    >
      {error}
      <ol className="chat-list">
        {messages.map((m) => (
          <li key={m.id} className="chat-msg">
            {roles.map(
              ([badge, label]) =>
                (m.badges[badge] !== undefined ||
                  (badge === "subscriber" && m.badges.founder !== undefined)) && (
                  <span key={badge} className="chat-badge" data-style={theme.badgeStyle}>
                    {label}
                  </span>
                ),
            )}
            <span
              className="chat-name"
              style={{ color: readableOn(m.color ?? theme.accent, theme.surface, theme.text) }}
            >
              {m.displayName}
            </span>
            {m.action ? " " : ": "}
            <span className={m.action ? "chat-text chat-action" : "chat-text"}>
              {splitMessage(m.text, m.emotes).map((p, i) =>
                "emoteId" in p ? (
                  <img key={i} className="chat-emote" src={emoteUrl(p.emoteId)} alt={p.name} />
                ) : (
                  p.text
                ),
              )}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
