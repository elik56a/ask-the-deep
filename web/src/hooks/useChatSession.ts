import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useCallback, useEffect, useRef, useState } from "react";
import { API_CHAT_URL } from "#/constants/api.constants";
import {
  HUMAN_CHECK_REQUIRED,
  MAX_HISTORY_MESSAGES,
  MESSAGES_STORAGE_KEY,
} from "#/constants/chat.constants";
import type { ChatMessage } from "#/types/chat.types";
import { chatRequestBody, isChatMessages, isWaiting } from "#/utils/chat.utils";
import { loadStored, saveStored } from "#/utils/storage.utils";

export function useChatSession(
  token: string | undefined,
  onSessionRejected: () => void,
) {
  const tokenRef = useRef(token);
  const rejectedRef = useRef(onSessionRejected);
  useEffect(() => {
    tokenRef.current = token;
    rejectedRef.current = onSessionRejected;
  }, [token, onSessionRejected]);

  const [transport] = useState(
    () =>
      new DefaultChatTransport<ChatMessage>({
        api: API_CHAT_URL,
        prepareSendMessagesRequest: ({ messages }) => ({
          body: chatRequestBody(messages, tokenRef.current ?? ""),
        }),
      }),
  );

  const { messages, setMessages, sendMessage, status, error } =
    useChat<ChatMessage>({
      transport,
      onData: (part) => {
        if (
          part.type === "data-event" &&
          part.data.event.type === "error" &&
          part.data.event.code === HUMAN_CHECK_REQUIRED
        ) {
          rejectedRef.current();
        }
      },
    });

  const busy = status === "submitted" || status === "streaming";

  useEffect(() => {
    const stored = loadStored("session", MESSAGES_STORAGE_KEY, isChatMessages);
    if (stored) setMessages(stored);
  }, [setMessages]);

  useEffect(() => {
    // Skipping empty saves keeps a fresh mount from wiping a stored chat.
    if (!busy && messages.length > 0) {
      saveStored(
        "session",
        MESSAGES_STORAGE_KEY,
        messages.slice(-MAX_HISTORY_MESSAGES),
      );
    }
  }, [messages, busy]);

  const send = useCallback(
    (text: string) => {
      const question = text.trim();
      if (question && !busy) sendMessage({ text: question });
    },
    [busy, sendMessage],
  );

  return {
    messages,
    send,
    busy,
    waiting: isWaiting(messages, status),
    failed: error !== undefined,
  };
}
