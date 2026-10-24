"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError } from "../lib/api";
import {
  topics,
  type Session,
  type PracticeOptions,
  type Topic,
  type Transcript,
} from "../lib/types";

const STORAGE_KEY = "parlons-session";
function storedSession(
  storageKey: string,
): { id: string; topic: Topic } | null {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || "null");
    return saved &&
      typeof saved.id === "string" &&
      topics.some((t) => t.id === saved.topic)
      ? saved
      : null;
  } catch {
    return null;
  }
}
function saveSession(id: string, topic: Topic, storageKey: string) {
  try {
    localStorage.setItem(storageKey, JSON.stringify({ id, topic }));
  } catch {
    // Storage may be disabled. The current session still works in memory.
  }
}
export function useConversation(client = api, storageKey = STORAGE_KEY) {
  const [session, setSession] = useState<Session | null>(null);
  const [input, setInput] = useState("");
  const [transcript, setTranscript] = useState<Transcript | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const generation = useRef(0);
  const sending = useRef(false);

  const start = useCallback(
    async (topic?: Topic, options?: PracticeOptions) => {
      const current = ++generation.current;
      const saved = topic ? null : storedSession(storageKey);
      const selection = saved || {
        id: crypto.randomUUID(),
        topic: topic || "daily",
      };
      // Save before the request: retries, refreshes and StrictMode reuse the same ID.
      saveSession(selection.id, selection.topic, storageKey);
      setBusy(true);
      setSession(null);
      setError("");
      setInput("");
      setTranscript(null);
      try {
        const result = await client.session(
          selection.id,
          selection.topic,
          options,
        );
        if (current === generation.current) setSession(result);
      } catch {
        if (current === generation.current)
          setError("无法载入会话，请重试。 / Unable to load conversation.");
      } finally {
        if (current === generation.current) setBusy(false);
      }
    },
    [client, storageKey],
  );

  useEffect(() => {
    void start();
    const activeGeneration = generation;
    return () => {
      activeGeneration.current++;
    };
  }, [start]);

  async function send(): Promise<string | null> {
    if (!session || !input.trim() || busy || sending.current) return null;
    sending.current = true;
    const current = generation.current;
    const value = input; // Keep edited text separately from the immutable transcript.
    setBusy(true);
    setError("");
    try {
      const result = await client.chat(session.id, value, transcript?.id);
      const updated = await client.history(session.id);
      if (current !== generation.current) return null;
      setSession(updated);
      setInput("");
      setTranscript(null);
      return result.reply;
    } catch (error) {
      if (current === generation.current)
        setError(
          (error instanceof ApiError ? `${error.message} ` : "") +
            "回复失败，草稿已保留。请检查会话记录后再重试。 / Reply failed; draft retained.",
        );
      return null;
    } finally {
      sending.current = false;
      if (current === generation.current) setBusy(false);
    }
  }

  function acceptTranscript(value: Transcript) {
    setTranscript(value);
    setInput(value.original_text);
  }
  function discard() {
    setInput("");
    setTranscript(null);
  }
  return {
    session,
    input,
    setInput,
    transcript,
    busy,
    error,
    setError,
    start,
    send,
    acceptTranscript,
    discard,
  };
}
