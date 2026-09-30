import { useEffect, useState, type ReactNode } from "react";
import type { Settings } from "../../settings/schema";
import { connectChat, type ChatStatus } from "../../twitch/irc";
import OverlayError from "../OverlayError";
import ChatView, { type ChatMessage } from "./ChatView";

/** Older messages are dropped past this, so a busy chat never grows the page. */
export const MAX_MESSAGES = 50;

function useChat(channel: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<ChatStatus>("connecting");
  useEffect(
    () =>
      connectChat(channel, {
        onStatus: setStatus,
        onEvent: (e) => {
          if (e.type === "chat") setMessages((m) => [...m.slice(1 - MAX_MESSAGES), e]);
        },
      }),
    [channel],
  );
  return { messages, status };
}

/** /o/chat: live Twitch chat for the channel in the link. */
export default function Chat({ settings, error }: { settings: Settings; error?: ReactNode }) {
  const { channel } = settings.chat;
  const { messages, status } = useChat(channel);
  return (
    <ChatView
      settings={settings}
      messages={messages}
      error={
        <>
          {error}
          {channel === "" ? (
            <OverlayError
              title="Chat needs your channel name"
              message="Open Overlune, type your Twitch channel name under Chat, then copy a fresh “Link to paste into OBS”."
            />
          ) : (
            status === "error" && (
              <OverlayError
                title="Can’t connect to chat"
                message={`Check that “${channel}” is your Twitch channel name in Overlune. Chat reconnects on its own.`}
              />
            )
          )}
        </>
      }
    />
  );
}
