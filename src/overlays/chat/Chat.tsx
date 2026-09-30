import { useEffect, useRef, useState, type ReactNode } from "react";
import type { Settings } from "../../settings/schema";
import { connectChat, type ChatStatus } from "../../twitch/irc";
import OverlayError from "../OverlayError";
import ChatView, { type ChatMessage } from "./ChatView";
import { applyEvent, expire, type ChatFilters } from "./filters";

function useChat(channel: string, filters: ChatFilters, fadeAfter: number) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<ChatStatus>("connecting");
  // Read through a ref so changing a filter never reconnects.
  const filtersRef = useRef(filters);
  useEffect(() => {
    filtersRef.current = filters;
  });
  useEffect(
    () =>
      connectChat(channel, {
        onStatus: setStatus,
        onEvent: (e) => setMessages((m) => applyEvent(m, e, filtersRef.current)),
      }),
    [channel],
  );
  useEffect(() => {
    if (fadeAfter <= 0) return;
    const id = setInterval(() => setMessages((m) => expire(m, Date.now(), fadeAfter)), 1000);
    return () => clearInterval(id);
  }, [fadeAfter]);
  return { messages, status };
}

/** /o/chat: live Twitch chat for the channel in the link. */
export default function Chat({ settings, error }: { settings: Settings; error?: ReactNode }) {
  const { channel } = settings.chat;
  const { messages, status } = useChat(channel, settings.chat, settings.chat.fadeAfter);
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
